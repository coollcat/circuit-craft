// 回路工坊 — MNA（改进节点分析）DC 工作点求解器 + GoalCheck 求值
// 教学向准物理模型：非线性元件用分段线性 + 牛顿式迭代，数值稳定下限 gmin=1e-12。
//
// 【内容组契约】
// · 单位：node-voltage = 伏特(V)，branch-current = 毫安(mA)
// · LED Vf=2V / 二极管 Vf=0.7V / NPN Vbe=0.7V、Vce(sat)=0.2V、β=100
// · 端口命名见 PORT_NAMES；参数键名见 DEFAULT_PARAMS（兼容少量别名）
// · node-voltage 参考地：任一 gnd 元件；无 gnd 时以 battery/vsrc 的 neg 为 0V
import type { CircuitSpec, ComponentSpec, ComponentType, GoalCheck, PortRef } from './types';

/* ---------------------------------- 端口与参数定义 ---------------------------------- */

export const PORT_NAMES: Record<ComponentType, string[]> = {
  vsrc: ['pos', 'neg'],
  battery: ['pos', 'neg'],
  gnd: ['gnd'],
  resistor: ['a', 'b'],
  capacitor: ['a', 'b'],
  inductor: ['a', 'b'],
  pot: ['a', 'b', 'w'],
  diode: ['a', 'k'],
  led: ['a', 'k'],
  zener: ['a', 'k'],
  switch: ['a', 'b'],
  button: ['a', 'b'],
  npn: ['c', 'b', 'e'],
  pmos: ['d', 'g', 's'],
  nmos: ['d', 'g', 's'],
  opamp: ['inp', 'inn', 'out', 'vcc', 'vee'],
  crystal: ['a', 'b'],
  antenna: ['a'],
  sensor: ['vcc', 'gnd', 'out'],
  mcu: ['vcc', 'gnd', 'p0', 'p1', 'p2', 'p3'],
  ic: ['in', 'out', 'gnd'], // LDO 教学模型
  fuse: ['a', 'b'],
  funcgen: ['out', 'gnd'],
  voltmeter: ['pos', 'neg'],
  ammeter: ['a', 'b'],
  module: ['in', 'out', 'vcc', 'gnd'], // RF 模块教学模型
};

export const DEFAULT_PARAMS: Record<ComponentType, Record<string, number | string | boolean>> = {
  vsrc: { voltage: 5 },
  battery: { voltage: 9 },
  gnd: {},
  resistor: { resistance: 220 },
  capacitor: { capacitance: 1e-6 },
  inductor: { inductance: 1e-3 },
  pot: { resistance: 10000, wiper: 0.5 },
  diode: { vf: 0.7, rOn: 2 },
  led: { vf: 2.0, rOn: 5, imax: 0.02 },
  zener: { vf: 0.7, vz: 5.1, rOn: 2, rz: 10 },
  switch: { closed: false },
  button: { closed: false },
  npn: { vf: 0.7, vceSat: 0.2, beta: 100, rOn: 2 },
  pmos: { vt: 1.5, rOn: 5 },
  nmos: { vt: 1.5, rOn: 5 },
  opamp: { gain: 100000 },
  crystal: { capacitance: 12e-12 },
  antenna: { impedance: 50 },
  sensor: { output: 1.65 },
  mcu: { pinVoltage: 3.3, current: 20, p0: false, p1: false, p2: false, p3: false },
  ic: { vout: 3.3 },
  fuse: { rating: 0.5 },
  funcgen: { waveform: 'sine', freq: 1000, vmin: 0, vmax: 5, duty: 0.5 },
  voltmeter: {},
  ammeter: {},
  module: {},
};

export interface CompMeta {
  name: string;
  group: string;
  /** 额定电流（A），超过进入 warn / 烧毁判定 */
  maxCurrent?: number;
  note?: string;
}

/** 教学简化模型的近似假设（fixtures 中同步注明） */
export const COMP_META: Record<ComponentType, CompMeta> = {
  vsrc: { name: '直流电源', group: '电源' },
  battery: { name: '电池', group: '电源' },
  gnd: { name: '接地', group: '电源' },
  resistor: { name: '电阻', group: '无源', maxCurrent: 0.25 },
  capacitor: { name: '电容', group: '无源', note: 'DC 开路；时域用梯形法伴随模型' },
  inductor: { name: '电感', group: '无源', note: 'DC 视为 1mΩ 小电阻' },
  pot: { name: '电位器', group: '无源', note: '分压双电阻模型，wiper=抽头比例' },
  diode: { name: '二极管', group: '半导体', maxCurrent: 1, note: '分段线性：Vf=0.7V + rOn' },
  led: { name: 'LED', group: '半导体', note: '分段线性 Vf=2V；I>3×额定持续 0.1s 烧毁' },
  zener: { name: '稳压管', group: '半导体', note: '正向同二极管，反向击穿 vz + rz' },
  switch: { name: '开关', group: '机电', note: '开=1GΩ / 合=1mΩ' },
  button: { name: '按键', group: '机电', note: '开=1GΩ / 合=1mΩ' },
  npn: { name: 'NPN 三极管', group: '半导体', note: '简化开关模型：Vbe>0.7 且 B 有电流 → C-E 饱和（Vce(sat)≈0.2V 等效 rOn）' },
  pmos: { name: 'PMOS', group: '半导体', note: '开关模型：Vgs<-vt 导通' },
  nmos: { name: 'NMOS', group: '半导体', note: '开关模型：Vgs>vt 导通' },
  opamp: { name: '运算放大器', group: '集成', note: '理想 VCVS 增益 1e5，输出限幅于电源轨' },
  crystal: { name: '晶振', group: '机电', note: '教学近似：12pF 电容（不起振）' },
  antenna: { name: '天线', group: '无线', note: '教学近似：对地 50Ω 纯阻负载（impedance 可调）' },
  sensor: { name: '传感器', group: '集成', note: '教学近似：out 输出理想电压源（output 参数）' },
  mcu: { name: '单片机', group: '集成', note: '教学近似：静态电流 current(mA) + GPIO 电平源 pinVoltage' },
  ic: { name: 'LDO 稳压器', group: '集成', note: '教学近似：vin>vout+0.8V 时 out=vout，否则跟随 vin-0.8V' },
  fuse: { name: '保险丝', group: '机电', note: 'I>rating 熔断开路' },
  funcgen: { name: '函数发生器', group: '电源', note: '正弦/方波/三角波：freq + vmin/vmax + duty' },
  voltmeter: { name: '电压表', group: '仪器', note: '内阻 1GΩ' },
  ammeter: { name: '电流表', group: '仪器', note: '内阻 1mΩ' },
  module: { name: 'RF 模块', group: '集成', note: '教学近似：out 跟随 in 的单位增益缓冲 + 1kΩ 供电负载' },
};

const GMIN = 1e-12;
const R_OPEN = 1e9;
const R_SHORT = 1e-3;

/* ---------------------------------- 工具函数 ---------------------------------- */

export function portKey(p: PortRef): string {
  return `${p.comp}:${p.port}`;
}

/** 读取数值参数：按 keys 顺序取第一个存在的（主键 + 别名） */
export function numParam(c: ComponentSpec, keys: string | string[], fallback: number): number {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    const v = c.params?.[k] ?? DEFAULT_PARAMS[c.type][k];
    if (v === undefined) continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
export function boolParam(c: ComponentSpec, key: string): boolean {
  return c.params?.[key] === true;
}
export function strParam(c: ComponentSpec, keys: string | string[], fallback: string): string {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    const v = c.params?.[k] ?? DEFAULT_PARAMS[c.type][k];
    if (typeof v === 'string') return v;
  }
  return fallback;
}

const SI_PREFIX: [number, string][] = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'],
];
export function formatSI(v: number, unit: string, digits = 3): string {
  if (!Number.isFinite(v)) return `— ${unit}`;
  const a = Math.abs(v);
  if (a === 0) return `0 ${unit}`;
  for (const [scale, prefix] of SI_PREFIX) {
    if (a >= scale * 0.999) {
      const val = v / scale;
      const str = Math.abs(val) >= 100 ? val.toFixed(0) : Math.abs(val) >= 10 ? val.toFixed(1) : val.toFixed(digits - 1);
      return `${str} ${prefix}${unit}`;
    }
  }
  return `${(v * 1e12).toFixed(1)} p${unit}`;
}

/* ---------------------------------- 网络（节点）解析：并查集 ---------------------------------- */

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let r = this.parent.get(x);
    if (r === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (r !== x) {
      r = this.find(r);
      this.parent.set(x, r);
    }
    return r;
  }
  union(a: string, b: string) {
    this.parent.set(this.find(a), this.find(b));
  }
}

export interface Compiled {
  circuit: CircuitSpec;
  /** "comp:port" -> netId（0 = 地） */
  netOf: Map<string, number>;
  /** netId 列表（含 0） */
  nets: number[];
  nodeIndex: Map<number, number>;
  nodeCount: number;
  /** 需要电流未知量的电压源型支路 */
  vsrcBranches: { comp: ComponentSpec; kind: string; netP: number; netN: number; port?: string }[];
  floatingNets: Set<number>;
  error?: string;
}

export function compileCircuit(circuit: CircuitSpec): Compiled {
  const uf = new UnionFind();
  for (const c of circuit.components) {
    for (const p of PORT_NAMES[c.type]) uf.find(`${c.id}:${p}`);
  }
  for (const w of circuit.wires) {
    uf.union(portKey(w.from), portKey(w.to));
  }
  // 地网络：优先 gnd 元件；否则第一个 battery/vsrc/funcgen 的负端；再否则第一个元件首端口
  let groundRoot: string | undefined;
  const gndComp = circuit.components.find(c => c.type === 'gnd');
  if (gndComp) groundRoot = uf.find(`${gndComp.id}:gnd`);
  else {
    const src = circuit.components.find(c => ['vsrc', 'battery'].includes(c.type));
    if (src) groundRoot = uf.find(`${src.id}:neg`);
    else {
      const fg = circuit.components.find(c => c.type === 'funcgen');
      if (fg) groundRoot = uf.find(`${fg.id}:gnd`);
    }
  }
  if (!groundRoot && circuit.components.length > 0) {
    const c0 = circuit.components[0];
    groundRoot = uf.find(`${c0.id}:${PORT_NAMES[c0.type][0]}`);
  }

  const netOf = new Map<string, number>();
  const rootToNet = new Map<string, number>();
  let next = 1;
  for (const c of circuit.components) {
    for (const p of PORT_NAMES[c.type]) {
      const root = uf.find(`${c.id}:${p}`);
      if (groundRoot && root === groundRoot) {
        netOf.set(`${c.id}:${p}`, 0);
      } else {
        if (!rootToNet.has(root)) rootToNet.set(root, next++);
        netOf.set(`${c.id}:${p}`, rootToNet.get(root)!);
      }
    }
  }
  if (groundRoot) rootToNet.set(groundRoot, 0);
  const nets = [0, ...Array.from({ length: next - 1 }, (_, i) => i + 1)];
  const nodeIndex = new Map<number, number>();
  for (let i = 1; i < next; i++) nodeIndex.set(i, i - 1);
  const nodeCount = next - 1;

  const usage = new Map<number, number>();
  for (const n of netOf.values()) usage.set(n, (usage.get(n) ?? 0) + 1);
  const floatingNets = new Set<number>();
  for (const [n, cnt] of usage) if (n !== 0 && cnt === 1) floatingNets.add(n);

  const vsrcBranches: Compiled['vsrcBranches'] = [];
  let error: string | undefined;
  const netOfPort = (c: ComponentSpec, p: string) => netOf.get(`${c.id}:${p}`) ?? 0;
  for (const c of circuit.components) {
    if (c.type === 'vsrc' || c.type === 'battery') {
      const np = netOfPort(c, 'pos');
      const nn = netOfPort(c, 'neg');
      if (np === nn) error = `「${c.id}」的正负极被导线直接短路了——电流喜欢抄近路，但这条路会烧掉一切。`;
      vsrcBranches.push({ comp: c, kind: 'vsrc', netP: np, netN: nn });
    } else if (c.type === 'funcgen') {
      const np = netOfPort(c, 'out');
      const nn = netOfPort(c, 'gnd');
      if (np === nn) error = `函数发生器「${c.id}」输出被短接到地。`;
      vsrcBranches.push({ comp: c, kind: 'funcgen', netP: np, netN: nn });
    } else if (c.type === 'sensor') {
      vsrcBranches.push({ comp: c, kind: 'sensor', netP: netOfPort(c, 'out'), netN: 0 });
    } else if (c.type === 'mcu') {
      for (const pin of ['p0', 'p1', 'p2', 'p3']) {
        vsrcBranches.push({ comp: c, kind: 'mcu-io', netP: netOfPort(c, pin), netN: 0, port: pin });
      }
    } else if (c.type === 'ic') {
      vsrcBranches.push({ comp: c, kind: 'ldo', netP: netOfPort(c, 'out'), netN: 0 });
    } else if (c.type === 'module') {
      vsrcBranches.push({ comp: c, kind: 'rf-buf', netP: netOfPort(c, 'out'), netN: 0 });
    } else if (c.type === 'opamp') {
      vsrcBranches.push({ comp: c, kind: 'opamp', netP: netOfPort(c, 'out'), netN: 0 });
    }
  }

  return { circuit, netOf, nets, nodeIndex, nodeCount, vsrcBranches, floatingNets, error };
}

/* ---------------------------------- 动态元件状态（电容/电感/熔断） ---------------------------------- */

export interface DynState {
  capV: Map<string, number>;
  capI: Map<string, number>;
  indI: Map<string, number>;
  indV: Map<string, number>;
  /** 已熔断保险丝 / 已烧毁 LED */
  blown: Set<string>;
  /** LED 过流计时（秒） */
  ledStress: Map<string, number>;
}
export function newDynState(): DynState {
  return {
    capV: new Map(), capI: new Map(), indI: new Map(), indV: new Map(),
    blown: new Set(), ledStress: new Map(),
  };
}

/* ---------------------------------- 函数发生器波形 ---------------------------------- */

export function funcgenValue(c: ComponentSpec, t: number): number {
  const freq = Math.max(1e-3, numParam(c, ['freq', 'fs'], 1000));
  // 幅值/偏置：优先 vmin/vmax（契约），兼容 amp/offset
  const vmin = numParam(c, 'vmin', NaN);
  const vmax = numParam(c, 'vmax', NaN);
  let amp: number, offset: number;
  if (Number.isFinite(vmin) && Number.isFinite(vmax)) {
    amp = (vmax - vmin) / 2;
    offset = (vmax + vmin) / 2;
  } else {
    amp = numParam(c, 'amp', 1);
    offset = numParam(c, 'offset', 0);
  }
  const duty = Math.min(Math.max(numParam(c, 'duty', 0.5), 0.01), 0.99);
  const wave = strParam(c, ['waveform', 'wave'], 'sine');
  const phase = ((t * freq) % 1 + 1) % 1;
  if (wave === 'square') return offset + (phase < duty ? amp : -amp);
  if (wave === 'triangle') return offset + amp * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
  return offset + amp * Math.sin(2 * Math.PI * phase);
}

/** 电路中 funcgen 的最高频率（自适应步长用）；无则 0 */
export function maxFuncgenFreq(circuit: CircuitSpec): number {
  let f = 0;
  for (const c of circuit.components) {
    if (c.type === 'funcgen') f = Math.max(f, numParam(c, ['freq', 'fs'], 1000));
  }
  return f;
}

/* ---------------------------------- 线性求解：高斯消元（部分主元） ---------------------------------- */

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-13) return null; // 奇异
    if (piv !== col) [M[piv], M[col]] = [M[col], M[piv]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

/* ---------------------------------- 求解主流程 ---------------------------------- */

export interface SolveResult {
  ok: boolean;
  error?: string;
  /** netId -> 电压（含 0 号地，单位 V） */
  nodeVoltages: Map<number, number>;
  netOf: Map<string, number>;
  /** compId -> 主支路电流（单位 A；方向 pos/a/阳极 → neg/b/阴极；npn 为集电极电流） */
  branchCurrents: Map<string, number>;
  /** 运放/LDO 输出电压 compId -> V */
  opampOut: Map<string, number>;
  iterations: number;
}

export interface SolveOptions {
  time?: number;
  /** >0 时电容/电感使用梯形法伴随模型；否则 DC（C 开路 / L 短路） */
  dt?: number;
  state?: DynState;
  applyFailure?: boolean;
}

export function solveCompiled(cp: Compiled, opts: SolveOptions = {}): SolveResult {
  const { time = 0, dt = 0, state, applyFailure = true } = opts;
  const fail = (error: string): SolveResult => ({
    ok: false, error, nodeVoltages: new Map([[0, 0]]), netOf: cp.netOf,
    branchCurrents: new Map(), opampOut: new Map(), iterations: 0,
  });
  if (cp.error) return fail(cp.error);
  if (cp.circuit.components.length === 0) {
    return { ok: true, nodeVoltages: new Map([[0, 0]]), netOf: cp.netOf, branchCurrents: new Map(), opampOut: new Map(), iterations: 0 };
  }

  const N = cp.nodeCount;
  const B = cp.vsrcBranches.length;
  const dim = N + B;
  const netOfPort = (c: ComponentSpec, p: string) => cp.netOf.get(`${c.id}:${p}`) ?? 0;
  const idx = (net: number) => (net === 0 ? -1 : cp.nodeIndex.get(net)!);
  const nodeV = (net: number, x: number[]) => (net === 0 ? 0 : x[cp.nodeIndex.get(net) ?? 0] ?? 0);

  let vPrev = new Array<number>(dim).fill(0);
  const opampMode = new Map<string, number>(); // 0=线性 1=上限幅 -1=下限幅
  let x = vPrev;
  let xPrevGlobal: number[] | null = null;
  let iterations = 0;

  for (let iter = 0; iter < 40; iter++) {
    iterations = iter + 1;
    const A: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
    const b = new Array<number>(dim).fill(0);
    const stampG = (n1: number, n2: number, g: number) => {
      const i = idx(n1), j = idx(n2);
      if (i >= 0) A[i][i] += g;
      if (j >= 0) A[j][j] += g;
      if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g; }
    };
    /** 电流从 n2 流向 n1（注入 n1） */
    const stampI = (n1: number, n2: number, i: number) => {
      const a = idx(n1), cc = idx(n2);
      if (a >= 0) b[a] += i;
      if (cc >= 0) b[cc] -= i;
    };

    cp.vsrcBranches.forEach((br, k) => {
      const row = N + k;
      const i = idx(br.netP), j = idx(br.netN);
      if (i >= 0) { A[i][row] += 1; A[row][i] += 1; }
      if (j >= 0) { A[j][row] -= 1; A[row][j] -= 1; }
      const c = br.comp;
      switch (br.kind) {
        case 'vsrc': b[row] = numParam(c, ['voltage', 'v'], 5); break;
        case 'funcgen': b[row] = funcgenValue(c, time); break;
        case 'sensor': b[row] = numParam(c, ['output', 'value'], 1.65); break;
        case 'mcu-io': {
          const hi = boolParam(c, br.port ?? 'p0');
          b[row] = hi ? numParam(c, 'pinVoltage', 3.3) : 0;
          break;
        }
        case 'ldo': {
          const vout = numParam(c, 'vout', 3.3);
          const vin = nodeV(netOfPort(c, 'in'), vPrev);
          b[row] = vin > vout + 0.8 ? vout : Math.max(vin - 0.8, 0);
          break;
        }
        case 'rf-buf': {
          const vin = nodeV(netOfPort(c, 'in'), vPrev);
          const vcc = nodeV(netOfPort(c, 'vcc'), vPrev);
          b[row] = Math.min(Math.max(vin, 0), Math.abs(vcc) > 0.5 ? vcc : 5);
          break;
        }
        case 'opamp': {
          const mode = opampMode.get(c.id) ?? 0;
          if (mode === 0) {
            const gain = numParam(c, 'gain', 1e5);
            const ip = idx(netOfPort(c, 'inp')), im = idx(netOfPort(c, 'inn'));
            if (ip >= 0) A[row][ip] -= gain;
            if (im >= 0) A[row][im] += gain;
          } else {
            const vccRaw = nodeV(netOfPort(c, 'vcc'), vPrev);
            const veeRaw = nodeV(netOfPort(c, 'vee'), vPrev);
            const railHi = Math.abs(vccRaw) > 0.5 ? vccRaw : 12;
            const railLo = Math.abs(veeRaw) > 0.5 ? veeRaw : 0;
            b[row] = mode > 0 ? railHi : railLo;
          }
          break;
        }
      }
    });

    for (const c of cp.circuit.components) {
      const blown = applyFailure && state?.blown.has(c.id);
      const R = (r: number) => 1 / Math.min(Math.max(r, 1e-6), 1e12);
      switch (c.type) {
        case 'resistor': stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), R(numParam(c, ['resistance', 'r'], 220))); break;
        case 'fuse': stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), blown ? GMIN : R(0.05)); break;
        case 'voltmeter': stampG(netOfPort(c, 'pos'), netOfPort(c, 'neg'), R(R_OPEN)); break;
        case 'ammeter': stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), R(R_SHORT)); break;
        case 'switch':
        case 'button':
          stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), boolParam(c, 'closed') ? R(R_SHORT) : GMIN);
          break;
        case 'antenna': stampG(netOfPort(c, 'a'), 0, R(numParam(c, ['impedance', 'r'], 50))); break;
        case 'ic': stampG(netOfPort(c, 'in'), 0, R(100000)); break; // LDO 静态电流 ~µA
        case 'module': stampG(netOfPort(c, 'vcc'), netOfPort(c, 'gnd'), R(1000)); break;
        case 'mcu': {
          // 静态电流：current(mA) 恒流 sink vcc→gnd
          stampI(0, netOfPort(c, 'vcc'), numParam(c, 'current', 20) / 1000);
          break;
        }
        case 'capacitor':
        case 'crystal': {
          const defC = c.type === 'crystal' ? 12e-12 : 1e-6;
          if (dt > 0 && state) {
            const C = Math.max(numParam(c, ['capacitance', 'c'], defC), 1e-15);
            const g = (2 * C) / dt;
            const vP = state.capV.get(c.id) ?? 0;
            const iP = state.capI.get(c.id) ?? 0;
            stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), g);
            stampI(netOfPort(c, 'b'), netOfPort(c, 'a'), -g * vP - iP);
          } else {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), GMIN);
          }
          break;
        }
        case 'inductor': {
          if (dt > 0 && state) {
            const L = Math.max(numParam(c, ['inductance', 'l'], 1e-3), 1e-12);
            const g = dt / (2 * L);
            const iP = state.indI.get(c.id) ?? 0;
            const vP = state.indV.get(c.id) ?? 0;
            stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), g);
            stampI(netOfPort(c, 'b'), netOfPort(c, 'a'), iP + g * vP);
          } else {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'b'), R(R_SHORT));
          }
          break;
        }
        case 'pot': {
          const rT = Math.max(numParam(c, ['resistance', 'r'], 10000), 1);
          const w = Math.min(Math.max(numParam(c, ['wiper', 'ratio'], 0.5), 0.001), 0.999);
          stampG(netOfPort(c, 'a'), netOfPort(c, 'w'), R(rT * w));
          stampG(netOfPort(c, 'w'), netOfPort(c, 'b'), R(rT * (1 - w)));
          break;
        }
        case 'diode':
        case 'led': {
          const vf = numParam(c, 'vf', c.type === 'led' ? 2 : 0.7);
          const rOn = numParam(c, 'rOn', 5);
          const vd = nodeV(netOfPort(c, 'a'), vPrev) - nodeV(netOfPort(c, 'k'), vPrev);
          if (!blown && vd > vf * 0.95) {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'k'), R(rOn));
            stampI(netOfPort(c, 'a'), netOfPort(c, 'k'), vf / rOn);
          } else {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'k'), GMIN);
          }
          break;
        }
        case 'zener': {
          const vf = numParam(c, 'vf', 0.7);
          const vz = numParam(c, 'vz', 5.1);
          const rOn = numParam(c, 'rOn', 2);
          const rz = numParam(c, 'rz', 10);
          const vd = nodeV(netOfPort(c, 'a'), vPrev) - nodeV(netOfPort(c, 'k'), vPrev);
          if (vd > vf * 0.95) {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'k'), R(rOn));
            stampI(netOfPort(c, 'a'), netOfPort(c, 'k'), vf / rOn);
          } else if (vd < -vz * 0.98) {
            stampG(netOfPort(c, 'a'), netOfPort(c, 'k'), R(rz));
            stampI(netOfPort(c, 'k'), netOfPort(c, 'a'), vz / rz);
          } else stampG(netOfPort(c, 'a'), netOfPort(c, 'k'), GMIN);
          break;
        }
        case 'npn': {
          // 简化开关模型：Vbe>0.7 → B-E 导通（rOn 50Ω + Vf 源）且 C-E 饱和（Vce(sat)≈0.2V 等效小电阻）
          const vf = numParam(c, 'vf', 0.7);
          const vbe = nodeV(netOfPort(c, 'b'), vPrev) - nodeV(netOfPort(c, 'e'), vPrev);
          if (vbe > vf * 0.95) {
            stampG(netOfPort(c, 'b'), netOfPort(c, 'e'), R(50));
            stampI(netOfPort(c, 'b'), netOfPort(c, 'e'), vf / 50);
            stampG(netOfPort(c, 'c'), netOfPort(c, 'e'), R(numParam(c, 'rOn', 2)));
            stampI(netOfPort(c, 'c'), netOfPort(c, 'e'), numParam(c, 'vceSat', 0.2) / numParam(c, 'rOn', 2));
          } else {
            stampG(netOfPort(c, 'b'), netOfPort(c, 'e'), GMIN);
            stampG(netOfPort(c, 'c'), netOfPort(c, 'e'), GMIN);
          }
          break;
        }
        case 'nmos':
        case 'pmos': {
          const vt = numParam(c, 'vt', 1.5);
          const vgs = nodeV(netOfPort(c, 'g'), vPrev) - nodeV(netOfPort(c, 's'), vPrev);
          const on = c.type === 'nmos' ? vgs > vt : vgs < -vt;
          stampG(netOfPort(c, 'd'), netOfPort(c, 's'), on ? R(numParam(c, 'rOn', 5)) : GMIN);
          break;
        }
        case 'gnd': case 'vsrc': case 'battery': case 'funcgen':
        case 'sensor': case 'opamp': break;
      }
    }

    for (let n = 1; n <= N; n++) stampG(n, 0, GMIN);

    const solved = solveLinear(A, b);
    if (!solved) {
      const floating = [...cp.floatingNets][0];
      const hint = floating !== undefined ? `（节点 #${floating} 可能完全悬空）` : '';
      return fail(`电路无法求解：矩阵奇异${hint}。检查是否有元件引脚悬空、或电压源被短路。`);
    }
    x = solved;

    let clampChanged = false;
    for (const br of cp.vsrcBranches) {
      if (br.kind !== 'opamp') continue;
      const c = br.comp;
      if ((opampMode.get(c.id) ?? 0) !== 0) continue;
      const vccRaw = nodeV(netOfPort(c, 'vcc'), x);
      const veeRaw = nodeV(netOfPort(c, 'vee'), x);
      const railHi = Math.abs(vccRaw) > 0.5 ? vccRaw : 12;
      const railLo = Math.abs(veeRaw) > 0.5 ? veeRaw : 0;
      const vout = nodeV(br.netP, x);
      if (vout > railHi + 1e-6) { opampMode.set(c.id, 1); clampChanged = true; }
      else if (vout < railLo - 1e-6) { opampMode.set(c.id, -1); clampChanged = true; }
    }

    let maxDelta = xPrevGlobal ? 0 : Infinity;
    if (xPrevGlobal) for (let i = 0; i < dim; i++) maxDelta = Math.max(maxDelta, Math.abs(x[i] - xPrevGlobal[i]));
    xPrevGlobal = [...x];
    vPrev = x;
    if (maxDelta < 1e-7 && !clampChanged) break;
  }

  const nodeVoltages = new Map<number, number>();
  nodeVoltages.set(0, 0);
  for (let n = 1; n <= N; n++) nodeVoltages.set(n, nodeV(n, x));
  const branchCurrents = new Map<string, number>();
  const opampOut = new Map<string, number>();
  const V = (c: ComponentSpec, p: string) => nodeV(netOfPort(c, p), x);

  cp.vsrcBranches.forEach((br, k) => {
    const i = x[N + k] ?? 0;
    if (br.kind === 'mcu-io') {
      branchCurrents.set(`${br.comp.id}:${br.port}`, i);
      return;
    }
    branchCurrents.set(br.comp.id, i);
    if (br.kind === 'opamp' || br.kind === 'ldo') opampOut.set(br.comp.id, nodeV(br.netP, x));
  });

  for (const c of cp.circuit.components) {
    if (branchCurrents.has(c.id)) continue;
    const blown = applyFailure && state?.blown.has(c.id);
    let i = 0;
    switch (c.type) {
      case 'resistor': i = (V(c, 'a') - V(c, 'b')) / Math.max(numParam(c, ['resistance', 'r'], 220), 1e-6); break;
      case 'fuse': i = blown ? 0 : (V(c, 'a') - V(c, 'b')) / 0.05; break;
      case 'voltmeter': i = (V(c, 'pos') - V(c, 'neg')) / R_OPEN; break;
      case 'ammeter': i = (V(c, 'a') - V(c, 'b')) / R_SHORT; break;
      case 'switch': case 'button':
        i = boolParam(c, 'closed') ? (V(c, 'a') - V(c, 'b')) / R_SHORT : 0; break;
      case 'antenna': i = V(c, 'a') / numParam(c, ['impedance', 'r'], 50); break;
      case 'module': i = (V(c, 'vcc') - V(c, 'gnd')) / 1000; break;
      case 'mcu': i = numParam(c, 'current', 20) / 1000; break;
      case 'capacitor': case 'crystal': {
        if (dt > 0 && state) {
          const defC = c.type === 'crystal' ? 12e-12 : 1e-6;
          const C = Math.max(numParam(c, ['capacitance', 'c'], defC), 1e-15);
          const g = (2 * C) / dt;
          i = g * (V(c, 'a') - V(c, 'b')) - g * (state.capV.get(c.id) ?? 0) - (state.capI.get(c.id) ?? 0);
        }
        break;
      }
      case 'inductor': {
        if (dt > 0 && state) {
          const L = Math.max(numParam(c, ['inductance', 'l'], 1e-3), 1e-12);
          const g = dt / (2 * L);
          i = g * (V(c, 'a') - V(c, 'b')) + (state.indI.get(c.id) ?? 0) + g * (state.indV.get(c.id) ?? 0);
        } else i = (V(c, 'a') - V(c, 'b')) / R_SHORT;
        break;
      }
      case 'pot': {
        const rT = Math.max(numParam(c, ['resistance', 'r'], 10000), 1);
        const w = Math.min(Math.max(numParam(c, ['wiper', 'ratio'], 0.5), 0.001), 0.999);
        i = (V(c, 'a') - V(c, 'w')) / Math.max(rT * w, 1e-6);
        break;
      }
      case 'diode': case 'led': {
        const vf = numParam(c, 'vf', c.type === 'led' ? 2 : 0.7);
        const rOn = numParam(c, 'rOn', 5);
        const vd = V(c, 'a') - V(c, 'k');
        i = !blown && vd > vf ? (vd - vf) / rOn : vd * GMIN;
        break;
      }
      case 'zener': {
        const vf = numParam(c, 'vf', 0.7); const vz = numParam(c, 'vz', 5.1);
        const vd = V(c, 'a') - V(c, 'k');
        if (vd > vf) i = (vd - vf) / numParam(c, 'rOn', 2);
        else if (vd < -vz) i = (vd + vz) / numParam(c, 'rz', 10);
        else i = vd * GMIN;
        break;
      }
      case 'npn': {
        const vbe = V(c, 'b') - V(c, 'e');
        i = vbe > numParam(c, 'vf', 0.7) ? Math.max(V(c, 'c') - V(c, 'e') - numParam(c, 'vceSat', 0.2), 0) / numParam(c, 'rOn', 2) : 0;
        break;
      }
      case 'nmos': case 'pmos': {
        const vt = numParam(c, 'vt', 1.5);
        const vgs = V(c, 'g') - V(c, 's');
        const on = c.type === 'nmos' ? vgs > vt : vgs < -vt;
        i = on ? (V(c, 'd') - V(c, 's')) / numParam(c, 'rOn', 5) : 0;
        break;
      }
      case 'ic': break; // LDO 电流取支路未知量（已记录）
    }
    branchCurrents.set(c.id, i);
  }

  if (dt > 0 && state) {
    for (const c of cp.circuit.components) {
      if (c.type === 'capacitor' || c.type === 'crystal') {
        state.capV.set(c.id, V(c, 'a') - V(c, 'b'));
        state.capI.set(c.id, branchCurrents.get(c.id) ?? 0);
      } else if (c.type === 'inductor') {
        state.indV.set(c.id, V(c, 'a') - V(c, 'b'));
        state.indI.set(c.id, branchCurrents.get(c.id) ?? 0);
      }
    }
  }

  return { ok: true, nodeVoltages, netOf: cp.netOf, branchCurrents, opampOut, iterations };
}

/** 便捷 DC 求解（电容开路 / 电感短路） */
export function solveDC(circuit: CircuitSpec, time = 0): SolveResult {
  return solveCompiled(compileCircuit(circuit), { time });
}

/* ---------------------------------- 故障（过流 / 烧毁）判定 ---------------------------------- */

export interface FailureEvent {
  compId: string;
  type: 'led-burn' | 'fuse-blow' | 'overcurrent';
  message: string;
}

export function updateFailures(circuit: CircuitSpec, res: SolveResult, state: DynState, dt: number): FailureEvent[] {
  const events: FailureEvent[] = [];
  if (!res.ok) return events;
  for (const c of circuit.components) {
    if (state.blown.has(c.id)) continue;
    const i = Math.abs(res.branchCurrents.get(c.id) ?? 0);
    if (c.type === 'led') {
      const imax = numParam(c, 'imax', 0.02);
      if (i > imax * 3) {
        const t = (state.ledStress.get(c.id) ?? 0) + Math.max(dt, 1e-4);
        state.ledStress.set(c.id, t);
        if (t >= 0.1) {
          state.blown.add(c.id);
          events.push({
            compId: c.id, type: 'led-burn',
            message: `LED「${c.id}」烧掉了！它承受了 ${formatSI(i, 'A')}——额定只有 ${formatSI(imax, 'A')}。串联一个限流电阻吧：R = (Vcc − Vf) / If。`,
          });
        }
      } else {
        state.ledStress.set(c.id, Math.max(0, (state.ledStress.get(c.id) ?? 0) - Math.max(dt, 1e-4) * 2));
      }
    } else if (c.type === 'fuse') {
      const rating = numParam(c, 'rating', 0.5);
      if (i > rating) {
        state.blown.add(c.id);
        events.push({ compId: c.id, type: 'fuse-blow', message: `保险丝「${c.id}」熔断了（${formatSI(i, 'A')} > 额定 ${formatSI(rating, 'A')}）。` });
      }
    }
  }
  return events;
}

/** 元件过流告警（未烧毁但超额定） */
export function overcurrentSet(circuit: CircuitSpec, res: SolveResult, state?: DynState): Set<string> {
  const set = new Set<string>();
  if (!res.ok) return set;
  for (const c of circuit.components) {
    if (state?.blown.has(c.id)) continue;
    const meta = COMP_META[c.type];
    const limit = c.type === 'led' ? numParam(c, 'imax', 0.02) : c.type === 'fuse' ? numParam(c, 'rating', 0.5) : meta.maxCurrent;
    if (limit && Math.abs(res.branchCurrents.get(c.id) ?? 0) > limit) set.add(c.id);
  }
  return set;
}

/* ---------------------------------- GoalCheck 求值 ---------------------------------- */

export interface GoalStatus {
  goal: GoalCheck;
  ok: boolean;
  /** 人类可读的当前值/原因 */
  detail: string;
}

/** 自定义目标求值器：布局/BOM/积木类目标由对应玩法页面注册实现 */
export type CustomGoalEvaluator = (ctx: {
  goal: Extract<GoalCheck, { kind: 'custom' }>;
  circuit: CircuitSpec;
  res: SolveResult | null;
  state?: DynState;
}) => GoalStatus;

const customEvaluators = new Map<string, CustomGoalEvaluator>();
export function registerCustomGoalEvaluator(id: string, fn: CustomGoalEvaluator) {
  customEvaluators.set(id, fn);
}

/** 内置：single-gnd-plane —— 有且仅有统一地参考（所有 gnd 元件天然同 net 0） */
function evalSingleGndPlane(circuit: CircuitSpec, res: SolveResult | null): GoalStatus | null {
  const gnds = circuit.components.filter(c => c.type === 'gnd');
  if (gnds.length === 0) return null;
  if (!res) return null;
  const nets = new Set(gnds.map(g => res.netOf.get(`${g.id}:gnd`) ?? -1));
  return nets.size === 1 && nets.has(0)
    ? { goal: { kind: 'custom', id: 'single-gnd-plane', description: '' }, ok: true, detail: `统一地平面（${gnds.length} 个接地点同网）` }
    : { goal: { kind: 'custom', id: 'single-gnd-plane', description: '' }, ok: false, detail: '存在割裂的地网络' };
}

export function evaluateGoal(goal: GoalCheck, circuit: CircuitSpec, res: SolveResult | null, state?: DynState): GoalStatus {
  switch (goal.kind) {
    case 'connected': {
      // 回路连通性：导线合并 + 导电元件内部视为通路（电容/电压表/断开的开关视为开路）
      const uf = new UnionFind();
      for (const c of circuit.components) for (const p of PORT_NAMES[c.type]) uf.find(`${c.id}:${p}`);
      for (const w of circuit.wires) uf.union(portKey(w.from), portKey(w.to));
      for (const c of circuit.components) {
        const ports = PORT_NAMES[c.type];
        const blown = state?.blown.has(c.id);
        let conductive = true;
        if (['capacitor', 'crystal', 'voltmeter', 'opamp', 'mcu'].includes(c.type)) conductive = false;
        if ((c.type === 'switch' || c.type === 'button') && !boolParam(c, 'closed')) conductive = false;
        if ((c.type === 'fuse' || c.type === 'led') && blown) conductive = false;
        if (c.type === 'gnd' || c.type === 'antenna') conductive = false; // 单端口
        if (!conductive) continue;
        for (let i = 1; i < ports.length; i++) uf.union(`${c.id}:${ports[0]}`, `${c.id}:${ports[i]}`);
      }
      const ok = uf.find(portKey(goal.a)) === uf.find(portKey(goal.b));
      return { goal, ok, detail: ok ? '已连通' : '未连通' };
    }
    case 'component-placed': {
      const need = goal.count ?? 1;
      const got = circuit.components.filter(c => c.type === goal.type).length;
      return { goal, ok: got >= need, detail: `已放置 ${got}/${need} 个${COMP_META[goal.type].name}` };
    }
    case 'param': {
      const comp = circuit.components.find(c => c.id === goal.comp);
      if (!comp) return { goal, ok: false, detail: `未找到元件 ${goal.comp}` };
      const v = Number(comp.params?.[goal.param] ?? DEFAULT_PARAMS[comp.type][goal.param]);
      const okMin = goal.min === undefined || v >= goal.min;
      const okMax = goal.max === undefined || v <= goal.max;
      return { goal, ok: Number.isFinite(v) && okMin && okMax, detail: `${goal.param} = ${formatSI(v, '')}` };
    }
    case 'node-voltage': {
      if (!res?.ok) return { goal, ok: false, detail: '等待仿真结果' };
      const net = res.netOf.get(portKey(goal.node));
      const v = net !== undefined ? res.nodeVoltages.get(net) ?? 0 : NaN;
      const ok = Number.isFinite(v) && v >= goal.min && v <= goal.max;
      return { goal, ok, detail: `V = ${formatSI(v, 'V')}（目标 ${goal.min}~${goal.max}V）` };
    }
    case 'branch-current': {
      // 契约单位：min/max 为毫安(mA)
      if (!res?.ok) return { goal, ok: false, detail: '等待仿真结果' };
      const iMa = Math.abs(res.branchCurrents.get(goal.comp) ?? 0) * 1000;
      const ok = iMa >= goal.min && iMa <= goal.max;
      return { goal, ok, detail: `I = ${formatSI(iMa / 1000, 'A')}（目标 ${goal.min}~${goal.max}mA）` };
    }
    case 'led-lit': {
      if (!res?.ok) return { goal, ok: false, detail: '等待仿真结果' };
      const comp = circuit.components.find(c => c.id === goal.comp);
      const imax = comp ? numParam(comp, 'imax', 0.02) : 0.02;
      const i = Math.abs(res.branchCurrents.get(goal.comp) ?? 0);
      const burned = state?.blown.has(goal.comp) ?? false;
      const ok = !burned && i > 1e-3 && i <= imax * 1.5;
      return {
        goal, ok,
        detail: burned ? 'LED 已烧毁，重置后重试' : ok ? `点亮！I = ${formatSI(i, 'A')}` : i <= 1e-3 ? '未点亮（电流 < 1mA）' : `过流 ${formatSI(i, 'A')}，危险！`,
      };
    }
    case 'custom': {
      // 内置可判定项
      if (goal.id === 'single-gnd-plane') {
        const builtin = evalSingleGndPlane(circuit, res);
        if (builtin) return { ...builtin, goal };
      }
      const fn = customEvaluators.get(goal.id);
      if (fn) return fn({ goal, circuit, res, state });
      return {
        goal, ok: false,
        detail: `「${goal.description || goal.id}」由布局/BOM/积木数据判定，电路仿真无法自动校验`,
      };
    }
  }
}

export function evaluateGoals(goals: GoalCheck[], circuit: CircuitSpec, res: SolveResult | null, state?: DynState): GoalStatus[] {
  return goals.map(g => evaluateGoal(g, circuit, res, state));
}
