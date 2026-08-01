// 回路工坊 — 时域步进仿真器：梯形法伴随模型 + 环形缓冲历史（供示波器）
// 默认 dt=1e-5s；存在 funcgen 时自适应 dt = min(1e-5, 1/(200·fmax))。
// 崩溃保护：求解失败自动降步长重试 2 次，仍失败则置 error 并暂停（绝不白屏）。
import type { CircuitSpec, PortRef } from './types';
import {
  compileCircuit, maxFuncgenFreq, newDynState, portKey, solveCompiled,
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

  constructor(circuit: CircuitSpec, dt?: number) {
    this.circuit = circuit;
    this.compiled = compileCircuit(circuit);
    this.state = newDynState();
    const fmax = maxFuncgenFreq(circuit);
    this.dt = dt ?? (fmax > 0 ? Math.min(1e-5, 1 / (200 * fmax)) : 1e-5);
    if (this.compiled.error) this.error = this.compiled.error;
  }

  /** 推进一步；返回是否成功 */
  step(): boolean {
    if (this.error) return false;
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
    if (circuit) {
      this.circuit = circuit;
      this.compiled = compileCircuit(circuit);
      const fmax = maxFuncgenFreq(circuit);
      this.dt = fmax > 0 ? Math.min(1e-5, 1 / (200 * fmax)) : 1e-5;
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
