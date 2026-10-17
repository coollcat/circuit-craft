// 回路工坊 — 「代入演算」教学模块
// 把 MNA 求解结果翻译成「通式 + 代入数字 + 结论」，供验收台/万用表/结算弹窗展示。
// 设计约束：只读求解结果（solveDC / simulator.latest），不做任何仿真，纯函数、无副作用。
// 单位口径与引擎契约一致：节点电压 V、支路电流 A（展示时按 mA/A 自动换算）。
import { COMP_META, formatSI, numParam, passiveR, PORT_NAMES, type SolveResult } from './solver';
import type { CircuitSpec, ComponentSpec, GoalCheck } from './types';

export interface Derivation {
  compId: string;
  /** 元件中文名 */
  name: string;
  /** 通式（未代入） */
  formula: string;
  /** 代入数字的演算步骤，逐行展示 */
  lines: string[];
  /** 一句结论 */
  result: string;
}

/** 取端口电压（V）；结果不可用时返回 null；'gnd' 端口按参考地 0V 处理 */
function vPort(res: SolveResult | null, comp: ComponentSpec, port: string): number | null {
  if (!res?.ok) return null;
  const net = res.netOf.get(`${comp.id}:${port}`);
  if (net === undefined) return port === 'gnd' ? 0 : null;
  return res.nodeVoltages.get(net) ?? 0;
}

function iOf(res: SolveResult | null, compId: string): number | null {
  if (!res?.ok) return null;
  const i = res.branchCurrents.get(compId);
  return i === undefined ? null : i;
}

/** 主端口对（决定「元件两端电压」与功耗口径） */
const MAIN_PAIR: Record<string, [string, string]> = {
  vsrc: ['pos', 'neg'], battery: ['pos', 'neg'], gnd: ['gnd', 'gnd'],
  resistor: ['a', 'b'], capacitor: ['a', 'b'], inductor: ['a', 'b'],
  ldr: ['a', 'b'], thermistor: ['a', 'b'], fuse: ['a', 'b'],
  switch: ['a', 'b'], button: ['a', 'b'], buzzer: ['a', 'b'], speaker: ['a', 'b'],
  ammeter: ['a', 'b'], voltmeter: ['pos', 'neg'],
  diode: ['a', 'k'], schottky: ['a', 'k'], led: ['a', 'k'], zener: ['a', 'k'],
  npn: ['c', 'e'], pmos: ['d', 's'], nmos: ['d', 's'],
  opamp: ['out', 'vee'], ic: ['in', 'out'], crystal: ['a', 'b'],
  antenna: ['a', 'gnd'], sensor: ['out', 'gnd'], mcu: ['vcc', 'gnd'],
  funcgen: ['out', 'gnd'], module: ['in', 'out'], transformer: ['p1', 'p2'],
};

function mainVoltage(res: SolveResult | null, comp: ComponentSpec): number | null {
  const pair = MAIN_PAIR[comp.type];
  if (!pair || pair[0] === pair[1]) return numParam(comp, ['voltage', 'v'], 0);
  const a = vPort(res, comp, pair[0]);
  const b = vPort(res, comp, pair[1]);
  if (a === null || b === null) return null;
  return a - b;
}

/** 元件功耗 P = V·I（W）；无电流口径的元件返回 null */
export function powerOf(compId: string, circuit: CircuitSpec, res: SolveResult | null): number | null {
  const comp = circuit.components.find(c => c.id === compId);
  if (!comp || !res?.ok) return null;
  const v = mainVoltage(res, comp);
  const i = iOf(res, comp.id);
  if (v === null || i === null) return null;
  return Math.abs(v * i);
}

/** 三位有效数字的 SI 格式化（比 formatSI 更适合「代入式」里的短数字） */
function f(v: number, unit = ''): string {
  return formatSI(v, unit, 3);
}

/** 数值原样显示（不带词头），用于代入式中的整数/常用值 */
function raw(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2);
  return Number(v.toFixed(digits)).toString();
}

function ohmText(r: number): string {
  return formatSI(r, 'Ω');
}

/**
 * 单个元件的「代入演算」。
 * @returns 无法演算（无元件 / 无解 / 无电流口径）时返回 null
 */
export function explainComponent(
  compId: string,
  circuit: CircuitSpec,
  res: SolveResult | null,
): Derivation | null {
  const comp = circuit.components.find(c => c.id === compId);
  if (!comp) return null;
  const name = COMP_META[comp.type]?.name ?? comp.type;
  const v = mainVoltage(res, comp);
  const i = iOf(res, comp.id);

  switch (comp.type) {
    case 'resistor':
    case 'ldr':
    case 'thermistor':
    case 'buzzer':
    case 'speaker': {
      if (v === null || i === null) return null;
      const R = comp.type === 'resistor' ? numParam(comp, ['resistance', 'r'], 220) : passiveR(comp);
      const a = vPort(res, comp, 'a') ?? 0;
      const b = vPort(res, comp, 'b') ?? 0;
      return {
        compId, name,
        formula: 'I = (V_a − V_b) / R      P = V·I',
        lines: [
          `V_a − V_b = ${raw(a)} V − ${raw(b)} V = ${raw(v)} V`,
          `R = ${ohmText(R)}`,
          `I = ${raw(v)} V ÷ ${ohmText(R)} = ${f(Math.abs(i), 'A')}`,
          `P = ${raw(Math.abs(v))} V × ${f(Math.abs(i), 'A')} = ${f(Math.abs(v * i), 'W')}`,
        ],
        result: `流过 ${f(Math.abs(i), 'A')}，耗散 ${f(Math.abs(v * i), 'W')}`,
      };
    }

    case 'capacitor':
    case 'crystal': {
      if (v === null) return null;
      const C = numParam(comp, ['capacitance', 'c'], comp.type === 'crystal' ? 12e-12 : 1e-6);
      const q = C * v;
      const e = 0.5 * C * v * v;
      return {
        compId, name,
        formula: 'Q = C·V      E = ½·C·V²',
        lines: [
          `C = ${f(C, 'F')}，两端电压 V = ${raw(v)} V`,
          `Q = ${f(C, 'F')} × ${raw(v)} V = ${f(q, 'C')}`,
          `E = ½ × ${f(C, 'F')} × (${raw(v)} V)² = ${f(e, 'J')}`,
        ],
        result: `存储 ${f(q, 'C')} 电荷 / ${f(e, 'J')} 能量`,
      };
    }

    case 'inductor': {
      if (v === null || i === null) return null;
      const L = numParam(comp, ['inductance', 'l'], 1e-3);
      const e = 0.5 * L * i * i;
      return {
        compId, name,
        formula: 'V = L·(di/dt)      E = ½·L·I²',
        lines: [
          `L = ${f(L, 'H')}，两端电压 V = ${raw(v)} V`,
          `I = ${f(Math.abs(i), 'A')}`,
          `E = ½ × ${f(L, 'H')} × (${f(Math.abs(i), 'A')})² = ${f(e, 'J')}`,
        ],
        result: `储能 ${f(e, 'J')}；稳态时电感相当于一根导线（${raw(v)} V 上的压降来自它的直流电阻）`,
      };
    }

    case 'pot': {
      if (v === null) return null;
      const R = numParam(comp, ['resistance', 'r'], 10000);
      const w = Math.min(Math.max(numParam(comp, ['wiper', 'ratio'], 0.5), 0.001), 0.999);
      const va = vPort(res, comp, 'a') ?? 0;
      const vb = vPort(res, comp, 'b') ?? 0;
      const vw = vPort(res, comp, 'w') ?? 0;
      return {
        compId, name,
        formula: 'R_a→w = R·(1−w)      R_w→b = R·w      V_w = V_b + (V_a − V_b)·w',
        lines: [
          `R = ${ohmText(R)}，抽头位置 w = ${raw(w, 2)}（0 = 靠 b 端，1 = 靠 a 端）`,
          `R_a→w = ${ohmText(R)} × (1 − ${raw(w, 2)}) = ${ohmText(R * (1 - w))}`,
          `R_w→b = ${ohmText(R)} × ${raw(w, 2)} = ${ohmText(R * w)}`,
          `V_w = ${raw(vb)} V + (${raw(va)} V − ${raw(vb)} V) × ${raw(w, 2)} = ${raw(vw)} V`,
        ],
        result: `抽头输出 ${raw(vw)} V（实测）`,
      };
    }

    case 'diode':
    case 'schottky':
    case 'led': {
      if (v === null) return null;
      const vf = numParam(comp, 'vf', comp.type === 'led' ? 2 : comp.type === 'schottky' ? 0.3 : 0.7);
      const rOn = numParam(comp, 'rOn', 5);
      const on = v > vf;
      const a = vPort(res, comp, 'a') ?? 0;
      const k = vPort(res, comp, 'k') ?? 0;
      return {
        compId, name,
        formula: '导通判据：V_a − V_k > V_f      导通后 I = (V_a − V_k − V_f) / r_on',
        lines: [
          `V_a − V_k = ${raw(a)} V − ${raw(k)} V = ${raw(v)} V`,
          `V_f = ${raw(vf)} V，${on ? `${raw(v)} V > ${raw(vf)} V → 导通` : `${raw(v)} V ≤ ${raw(vf)} V → 截止（无电流）`}`,
          ...(on ? [`I = (${raw(v)} V − ${raw(vf)} V) ÷ ${ohmText(rOn)} = ${f(Math.abs(i ?? 0), 'A')}`] : []),
        ],
        result: on ? `正向导通，电流 ${f(Math.abs(i ?? 0), 'A')}` : '反向/欠压截止，本体相当于开路',
      };
    }

    case 'zener': {
      if (v === null) return null;
      const vf = numParam(comp, 'vf', 0.7);
      const vz = numParam(comp, 'vz', 5.1);
      const rz = numParam(comp, 'rz', 10);
      const mode = v > vf ? '正向导通' : v < -vz ? '反向击穿（稳压）' : '截止';
      return {
        compId, name,
        formula: '正向同二极管 V_f；反向击穿后 V_a − V_k ≈ −(V_z + I·r_z)',
        lines: [
          `V_a − V_k = ${raw(v)} V；V_f = ${raw(vf)} V，V_z = ${raw(vz)} V`,
          mode === '反向击穿（稳压）'
            ? `进入稳压区：钳位在 ${raw(vz)} V 附近，动态电阻 r_z = ${ohmText(rz)}`
            : `当前工作区：${mode}`,
        ],
        result: `${mode}，实测压降 ${raw(v)} V`,
      };
    }

    case 'npn': {
      if (v === null) return null;
      const vf = numParam(comp, 'vf', 0.7);
      const beta = numParam(comp, 'beta', 100);
      const vbe = (vPort(res, comp, 'b') ?? 0) - (vPort(res, comp, 'e') ?? 0);
      const vce = v;
      return {
        compId, name,
        formula: 'I_c = β·I_b（放大区）      I_c = (V_cc − V_ce(sat)) / R_c（饱和区）',
        lines: [
          `V_be = ${raw(vbe)} V（导通门槛 ${raw(vf)} V）`,
          `V_ce = ${raw(vce)} V，β = ${raw(beta, 0)}`,
          `集电极电流 I_c = ${f(Math.abs(i ?? 0), 'A')}`,
        ],
        result: vbe > vf
          ? (vce <= numParam(comp, 'vceSat', 0.2) + 0.05 ? '已饱和（当开关用：导通压降最小、发热最少）' : '工作在放大区，I_c ≈ β·I_b')
          : '截止（基极没有驱动电流）',
      };
    }

    case 'nmos':
    case 'pmos': {
      if (v === null) return null;
      const vt = numParam(comp, 'vt', 1.5);
      const vgs = (vPort(res, comp, 'g') ?? 0) - (vPort(res, comp, 's') ?? 0);
      const on = comp.type === 'nmos' ? vgs > vt : vgs < -vt;
      return {
        compId, name,
        formula: comp.type === 'nmos' ? 'V_gs > V_th → 导通' : 'V_gs < −V_th → 导通',
        lines: [
          `V_gs = ${raw(vgs)} V，V_th = ${raw(vt)} V`,
          `判据：${on ? '满足' : '不满足'} → ${on ? '导通' : '截止'}`,
        ],
        result: on ? `导通，I_d = ${f(Math.abs(i ?? 0), 'A')}` : '截止（栅极像电容，不耗直流电流）',
      };
    }

    case 'ic': {
      const vin = vPort(res, comp, 'in') ?? 0;
      const vout = vPort(res, comp, 'out') ?? 0;
      return {
        compId, name,
        formula: 'P_ldo = (V_in − V_out) × I_out',
        lines: [
          `V_in = ${raw(vin)} V，V_out = ${raw(vout)} V，压差 = ${raw(vin - vout)} V`,
          `I_out = ${f(Math.abs(i ?? 0), 'A')}`,
          `P = ${raw(vin - vout)} V × ${f(Math.abs(i ?? 0), 'A')} = ${f(Math.abs((vin - vout) * (i ?? 0)), 'W')}（全部变成热）`,
        ],
        result: `LDO 自身发热 ${f(Math.abs((vin - vout) * (i ?? 0)), 'W')}`,
      };
    }

    case 'vsrc':
    case 'battery': {
      const vv = numParam(comp, ['voltage', 'v'], 5);
      return {
        compId, name,
        formula: 'V = 恒压源      P = V·I',
        lines: [
          `V = ${raw(vv)} V`,
          `输出电流 I = ${f(Math.abs(i ?? 0), 'A')}`,
          `输出功率 P = ${f(Math.abs(vv * (i ?? 0)), 'W')}`,
        ],
        result: i === null ? '等待仿真结果' : `正在输出 ${f(Math.abs(vv * (i ?? 0)), 'W')}`,
      };
    }

    case 'fuse': {
      const rating = numParam(comp, 'rating', 0.5);
      return {
        compId, name,
        formula: 'I > I_rating → 熔断',
        lines: [`I = ${f(Math.abs(i ?? 0), 'A')}，额定 ${f(rating, 'A')}`],
        result: Math.abs(i ?? 0) > rating ? '已超过额定，即将熔断' : `留有 ${f(rating - Math.abs(i ?? 0), 'A')} 余量`,
      };
    }

    case 'opamp': {
      const gain = numParam(comp, 'gain', 1e5);
      return {
        compId, name,
        formula: 'V_out = A·(V_inp − V_inn)，限幅到电源轨',
        lines: [
          `V_inp = ${raw(vPort(res, comp, 'inp') ?? 0)} V，V_inn = ${raw(vPort(res, comp, 'inn') ?? 0)} V`,
          `开环增益 A = ${raw(gain, 0)}，V_out = ${raw(vPort(res, comp, 'out') ?? 0)} V`,
        ],
        result: '负反馈下的增益只看外接电阻比：G = 1 + R_f/R_g（同相）或 −R_f/R_in（反相）',
      };
    }

    default: {
      if (v === null) return null;
      return {
        compId, name,
        formula: 'V = 两端电位差      I 取支路电流',
        lines: [`两端电压 = ${raw(v)} V`, `支路电流 = ${f(Math.abs(i ?? 0), 'A')}`],
        result: `${f(Math.abs(v), 'V')} / ${f(Math.abs(i ?? 0), 'A')}`,
      };
    }
  }
}

/** 求解得到的全部网络电压（供「电路状态表」展示；地永远为 0V） */
export function netVoltageTable(
  circuit: CircuitSpec,
  res: SolveResult | null,
): { net: number; label: string; v: number }[] {
  if (!res?.ok) return [];
  // 每个网络取第一个遇到的端口作为标签（"R1.a" 这种），便于学习者对上画布
  const labels = new Map<number, string>();
  for (const c of circuit.components) {
    for (const p of PORT_NAMES[c.type]) {
      const net = res.netOf.get(`${c.id}:${p}`);
      if (net === undefined || labels.has(net)) continue;
      labels.set(net, net === 0 ? 'GND' : `${c.id}.${p}`);
    }
  }
  return [...labels.entries()]
    .map(([net, label]) => ({ net, label, v: res.nodeVoltages.get(net) ?? 0 }))
    .sort((a, b) => b.v - a.v);
}

/** 功率账本：ΣP 应≈0（电源发出 = 元件耗散），用于结算弹窗「能量守恒自检」 */
export function powerLedger(
  circuit: CircuitSpec,
  res: SolveResult | null,
): { rows: { id: string; name: string; p: number; source: boolean }[]; total: number } {
  const rows: { id: string; name: string; p: number; source: boolean }[] = [];
  if (!res?.ok) return { rows, total: 0 };
  for (const c of circuit.components) {
    const p = powerOf(c.id, circuit, res);
    if (p === null || p < 1e-9) continue;
    const source = c.type === 'vsrc' || c.type === 'battery' || c.type === 'funcgen' || c.type === 'sensor';
    rows.push({ id: c.id, name: COMP_META[c.type]?.name ?? c.type, p, source });
  }
  rows.sort((a, b) => b.p - a.p);
  const total = rows.reduce((s, r) => s + (r.source ? -r.p : r.p), 0);
  return { rows, total };
}

/**
 * 单个验收目标的「代入式」一行说明：实测值 vs 目标区间 + 调整方向。
 * 供验收台在目标未达成时告诉学习者「差多少、往哪边调」。
 */
export function explainGoal(
  goal: GoalCheck,
  circuit: CircuitSpec,
  res: SolveResult | null,
): string | null {
  if (!res?.ok) return null;
  const dir = (v: number, min?: number, max?: number): string => {
    if (min !== undefined && v < min) return `偏小 ${raw(min - v)}`;
    if (max !== undefined && v > max) return `偏大 ${raw(v - max)}`;
    return '在范围内';
  };
  switch (goal.kind) {
    case 'param': {
      const comp = circuit.components.find(c => c.id === goal.comp);
      if (!comp) return null;
      const v = Number(comp.params?.[goal.param]);
      if (!Number.isFinite(v)) return `${goal.comp}.${goal.param} 尚未设置`;
      return `${goal.comp}.${goal.param} = ${raw(v)}（目标 ${goal.min ?? '−∞'}~${goal.max ?? '+∞'}，${dir(v, goal.min, goal.max)}）`;
    }
    case 'node-voltage': {
      const net = res.netOf.get(`${goal.node.comp}:${goal.node.port}`);
      const v = net === undefined ? 0 : res.nodeVoltages.get(net) ?? 0;
      return `V(${goal.node.comp}:${goal.node.port}) 实测 ${raw(v)} V，目标 ${goal.min}~${goal.max} V（${dir(v, goal.min, goal.max)} V）`;
    }
    case 'branch-current': {
      const iMa = Math.abs(res.branchCurrents.get(goal.comp) ?? 0) * 1000;
      return `I(${goal.comp}) 实测 ${raw(iMa)} mA，目标 ${goal.min}~${goal.max} mA（${dir(iMa, goal.min, goal.max)} mA）`;
    }
    case 'led-lit': {
      const i = Math.abs(res.branchCurrents.get(goal.comp) ?? 0);
      const comp = circuit.components.find(c => c.id === goal.comp);
      const imax = comp ? numParam(comp, 'imax', 0.02) : 0.02;
      if (i <= 1e-3) return `${goal.comp} 几乎没有电流（${f(i, 'A')}）——检查极性是否接反、回路是否闭合、限流电阻是否过大`;
      if (i > imax) return `${goal.comp} 电流 ${f(i, 'A')} 超过额定 ${f(imax, 'A')}——把限流电阻 R = (V_cc − V_f) / I_f 调大`;
      return `${goal.comp} 电流 ${f(i, 'A')}，在安全区间内`;
    }
    default:
      return null;
  }
}
