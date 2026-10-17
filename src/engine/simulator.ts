// 回路工坊 — 时域步进仿真器：梯形法伴随模型 + 环形缓冲历史（供示波器）
// 默认 dt=1e-5s；存在 funcgen 或带噪声的 sensor 时自适应 dt = min(1e-5, 1/(200·fmax))。
// C9：sensor 的 noiseFreq（如 sb-7 的 159kHz）过去不在步长决策里，会被 1e-5s 步长混叠成数值假象。
// 崩溃保护：求解失败自动降步长重试 2 次，仍失败则置 error 并暂停（绝不白屏）。
import type { CircuitSpec, ComponentSpec, PortRef } from './types';
import {
  compileCircuit, maxSignalFreq, newDynState, numParam, portKey, solveCompiled,
  updateFailures, type Compiled, type DynState, type FailureEvent, type SolveResult,
} from './solver';

export const HISTORY_CAP = 32768; // 环形缓冲容量（采样点数）

/** 单通道环形缓冲（Float64 类型数组） */
export class RingBuffer {
  readonly cap: number;
  buf: Float64Array;
  head = 0; // 下一个写入位置
  size = 0;
  constructor(cap = HISTORY_CAP) {
    this.cap = cap;
    this.buf = new Float64Array(cap);
  }
  push(v: number) {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.cap;
    if (this.size < this.cap) this.size++;
  }
  /** idx=0 为最新，向过去递增 */
  at(back: number): number {
    if (back >= this.size) return this.buf[(this.head - this.size + this.cap) % this.cap];
    return this.buf[(this.head - 1 - back + this.cap) % this.cap];
  }
  clear() {
    this.head = 0;
    this.size = 0;
  }
}

export interface SimSnapshot {
  time: number;
  result: SolveResult;
  failures: FailureEvent[];
  /** 烧毁/熔断的元件 */
  blown: Set<string>;
}

export class CircuitSimulator {
  circuit: CircuitSpec;
  compiled: Compiled;
  state: DynState;
  dt: number;
  time = 0;
  latest: SolveResult | null = null;
  error: string | null = null;
  /** netId -> 电压历史；compId -> 电流历史 */
  nodeHist = new Map<number, RingBuffer>();
  currentHist = new Map<string, RingBuffer>();
  timeHist = new RingBuffer();
  failures: FailureEvent[] = [];
  /** 自上次取读以来新发生的故障 */
  pendingFailures: FailureEvent[] = [];
  /** 已模拟的采样总数 */
  samples = 0;
  /**
   * P1-2 传感器噪声建模：out(t) = output + noise × sin(2π·noiseFreq·t)。
   * 仅作用于带 noise 参数的 sensor（克隆副本，绝不改写外部电路数据）；
   * 无 noise 参数时该列表为空，行为与旧版完全一致。
   */
  private noisySensors: { comp: ComponentSpec; base: number; noise: number; freq: number }[] = [];

  constructor(circuit: CircuitSpec, dt?: number) {
    this.circuit = this.prepareCircuit(circuit);
    this.compiled = compileCircuit(this.circuit);
    this.state = newDynState();
    this.dt = dt ?? CircuitSimulator.autoDt(this.circuit);
    if (this.compiled.error) this.error = this.compiled.error;
  }

  /** 自适应步长：最快信号（funcgen 频率 ∪ sensor 噪声频率）每周期 ≥200 个采样点，上限 1e-5s */
  static autoDt(circuit: CircuitSpec): number {
    const fmax = maxSignalFreq(circuit);
    return fmax > 0 ? Math.min(1e-5, 1 / (200 * fmax)) : 1e-5;
  }

  /** 找出带噪声的传感器并换成私有克隆（避免污染关卡定义/编辑器电路） */
  private prepareCircuit(circuit: CircuitSpec): CircuitSpec {
    this.noisySensors = [];
    const noisy = circuit.components.filter(c => c.type === 'sensor' && numParam(c, 'noise', 0) > 0);
    if (noisy.length === 0) return circuit;
    const cloneById = new Map<string, ComponentSpec>();
    for (const c of noisy) {
      const clone: ComponentSpec = { ...c, params: { ...(c.params ?? {}) } };
      this.noisySensors.push({
        comp: clone,
        base: numParam(c, ['output', 'value'], 1.65),
        noise: numParam(c, 'noise', 0),
        freq: numParam(c, 'noiseFreq', 1000),
      });
      cloneById.set(c.id, clone);
    }
    return { ...circuit, components: circuit.components.map(c => cloneById.get(c.id) ?? c) };
  }

  /** 按当前仿真时间刷新传感器输出（叠加正弦噪声） */
  private applySensorNoise() {
    for (const s of this.noisySensors) {
      s.comp.params!.output = s.base + s.noise * Math.sin(2 * Math.PI * s.freq * this.time);
    }
  }

  /** 推进一步；返回是否成功 */
  step(): boolean {
    if (this.error) return false;
    this.applySensorNoise();
    let res = solveCompiled(this.compiled, { time: this.time, dt: this.dt, state: this.state });
    // 崩溃保护：降步长重试 2 次
    for (let retry = 0; !res.ok && retry < 2; retry++) {
      const saveDt = this.dt;
      this.dt = saveDt / 4;
      res = solveCompiled(this.compiled, { time: this.time, dt: this.dt, state: this.state });
      if (!res.ok) this.dt = saveDt;
    }
    if (!res.ok) {
      this.error = res.error ?? '仿真器不收敛';
      return false;
    }
    this.latest = res;
    const evts = updateFailures(this.circuit, res, this.state, this.dt);
    if (evts.length) {
      this.failures.push(...evts);
      this.pendingFailures.push(...evts);
    }
    // 记录历史
    this.time += this.dt;
    this.samples++;
    this.timeHist.push(this.time);
    for (const [net, v] of res.nodeVoltages) {
      let rb = this.nodeHist.get(net);
      if (!rb) { rb = new RingBuffer(); this.nodeHist.set(net, rb); }
      rb.push(v);
    }
    for (const [id, i] of res.branchCurrents) {
      let rb = this.currentHist.get(id);
      if (!rb) { rb = new RingBuffer(); this.currentHist.set(id, rb); }
      rb.push(i);
    }
    return true;
  }

  runSteps(n: number) {
    for (let k = 0; k < n; k++) if (!this.step()) break;
  }

  /** 端口电压历史（RingBuffer，可能不存在） */
  nodeSeries(p: PortRef): RingBuffer | undefined {
    const net = this.compiled.netOf.get(portKey(p));
    return net !== undefined ? this.nodeHist.get(net) : undefined;
  }
  netSeries(net: number): RingBuffer | undefined {
    return this.nodeHist.get(net);
  }
  currentSeries(compId: string): RingBuffer | undefined {
    return this.currentHist.get(compId);
  }

  /** 取最新窗口数据：[{t, v}]，windowSec 为回看时长 */
  window(series: RingBuffer, windowSec: number): { t: number; v: number }[] {
    const n = Math.min(series.size, Math.max(2, Math.floor(windowSec / this.dt)));
    const out: { t: number; v: number }[] = [];
    for (let back = n - 1; back >= 0; back--) {
      out.push({ t: this.timeHist.at(back), v: series.at(back) });
    }
    return out;
  }

  drainFailures(): FailureEvent[] {
    const e = this.pendingFailures;
    this.pendingFailures = [];
    return e;
  }

  reset(circuit?: CircuitSpec) {
    // circuit === this.circuit 时已是 prepareCircuit 的产物（噪声克隆的 base 完好），直接复用；
    // 只有外部传入新电路对象时才重新克隆，避免把「叠过噪声的 output」误当基准值。
    if (circuit && circuit !== this.circuit) {
      this.circuit = this.prepareCircuit(circuit);
      this.compiled = compileCircuit(this.circuit);
      this.dt = CircuitSimulator.autoDt(this.circuit);
    }
    this.state = newDynState();
    this.time = 0;
    this.samples = 0;
    this.latest = null;
    this.error = this.compiled.error ?? null;
    this.failures = [];
    this.pendingFailures = [];
    this.timeHist.clear();
    this.nodeHist.clear();
    this.currentHist.clear();
  }

  /** 电路结构变化时调用（保留时间轴清空） */
  updateCircuit(circuit: CircuitSpec) {
    this.reset(circuit);
  }
}

/** 波形统计：Vpp / Vavg / 频率 / 占空比（从环形缓冲最近 windowSec 估计） */
export function waveStats(series: RingBuffer, dt: number, windowSec: number): {
  vpp: number; vavg: number; freq: number; duty: number;
} {
  const n = Math.min(series.size, Math.max(2, Math.floor(windowSec / dt)));
  if (n < 2) return { vpp: 0, vavg: 0, freq: 0, duty: 0 };
  let min = Infinity, max = -Infinity, sum = 0, hi = 0;
  let crossings = 0;
  let prev = series.at(n - 1);
  let firstMean = 0;
  // 先求均值作过零阈值
  for (let back = n - 1; back >= 0; back--) firstMean += series.at(back);
  const mean = firstMean / n;
  for (let back = n - 1; back >= 0; back--) {
    const v = series.at(back);
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    if (v > mean) hi++;
    if ((prev - mean) * (v - mean) < 0) crossings++;
    prev = v;
  }
  const span = n * dt;
  const freq = crossings >= 2 ? crossings / 2 / span : 0;
  return { vpp: max - min, vavg: sum / n, freq, duty: hi / n };
}
