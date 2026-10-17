// 回路工坊 — 误解定向反馈（W5 / P7）
//
// 纯函数：输入 (goal, circuit, res, level) → 输出 1~2 条「学生到底错在哪」的中文提示。
// 只做提示文本、不做任何判定、不写状态；验收台（W4）只在目标未达成时展示。
//
// 设计口径：
//   · 先看电流/电压的「量级特征」（≈0 / 偏大 / 偏小），再结合元件类型与关卡上下文给出方向性建议；
//   · 每条提示都尽量带「往哪个方向调多少」，但不替玩家把答案写死（答案仍在 hints 里）；
//   · 拿不到仿真结果时只提示「先运行」，不猜测。
import type { CircuitSpec, GoalCheck, LevelDef, PortRef } from '@/engine/types';
import type { GoalStatus, SolveResult } from '@/engine/solver';

export interface Diagnosis {
  goal: GoalCheck;
  /** 1~2 条中文提示（按重要性排序） */
  hints: string[];
}

/** 数值显示：整数不带小数，小数最多 3 位有效数字 */
function fmt(v: number, unit = ''): string {
  if (!Number.isFinite(v)) return `—${unit}`;
  const a = Math.abs(v);
  let s: string;
  if (a === 0) s = '0';
  else if (a >= 100) s = v.toFixed(0);
  else if (a >= 1) s = v.toFixed(a >= 10 ? 1 : 2);
  else if (a >= 0.01) s = v.toFixed(3);
  else s = v.toExponential(1);
  return `${s}${unit}`;
}

function compOf(circuit: CircuitSpec, id: string) {
  return circuit.components.find(c => c.id === id);
}

function portV(res: SolveResult | null, p: PortRef): number | null {
  if (!res?.ok) return null;
  const net = res.netOf.get(`${p.comp}:${p.port}`);
  if (net === undefined) return p.port === 'gnd' ? 0 : null;
  return res.nodeVoltages.get(net) ?? 0;
}

function branchA(res: SolveResult | null, compId: string): number | null {
  if (!res?.ok) return null;
  const i = res.branchCurrents.get(compId);
  return i === undefined ? null : Math.abs(i);
}

/** 关卡里是否有某种元件（用于把提示落到本关的具体结构上） */
function levelHas(level: LevelDef, type: string): boolean {
  return [...level.preset.components, ...level.palette].some(c => c.type === type);
}

/** 本关与目标里出现的第一个「开关/按键」类元件 id（提示「按键没按」用） */
function switchIds(level: LevelDef): string[] {
  return [...level.preset.components, ...level.palette]
    .filter(c => c.type === 'switch' || c.type === 'button')
    .map(c => c.id);
}

function paramValue(circuit: CircuitSpec, compId: string, key: string): number | undefined {
  const c = compOf(circuit, compId);
  const raw = c?.params?.[key];
  return typeof raw === 'number' ? raw : undefined;
}

const RUN_FIRST = '先点 ▶ 运行，拿到仿真结果才能判断问题出在哪。';

/**
 * 单个目标的定向反馈。
 * @returns 1~2 条中文提示；目标已达成或无从判断时返回空数组
 */
export function diagnoseGoal(
  goal: GoalCheck,
  circuit: CircuitSpec,
  res: SolveResult | null,
  level: LevelDef,
): string[] {
  switch (goal.kind) {
    case 'param': {
      const v = paramValue(circuit, goal.comp, goal.param);
      const mid = goal.min !== undefined && goal.max !== undefined ? (goal.min + goal.max) / 2 : undefined;
      if (v === undefined) {
        return [`${goal.comp} 的「${goal.param}」还没设置：双击元件，在参数框里填一个值。`];
      }
      if (goal.min !== undefined && v < goal.min) {
        const need = mid !== undefined ? `建议直接设成 ${fmt(mid)} 附近` : `至少要 ≥ ${fmt(goal.min)}`;
        return [
          `当前 ${goal.param} = ${fmt(v)}，比下限 ${fmt(goal.min)} 还小 ${fmt(goal.min - v)}——${need}。`,
          '参数偏小通常意味着电流偏大、分压偏低或驱动过强：先想清楚「想让它是多少」，再反过来选值。',
        ];
      }
      if (goal.max !== undefined && v > goal.max) {
        const need = mid !== undefined ? `建议直接设成 ${fmt(mid)} 附近` : `至少要 ≤ ${fmt(goal.max)}`;
        return [
          `当前 ${goal.param} = ${fmt(v)}，超出上限 ${fmt(goal.max)} 共 ${fmt(v - goal.max)}——${need}。`,
          '参数偏大通常意味着电流偏小、分压偏高或驱动不足：按公式反推目标值，别靠猜。',
        ];
      }
      return [];
    }

    case 'node-voltage': {
      if (!res?.ok) return [RUN_FIRST];
      const v = portV(res, goal.node);
      if (v === null) return [`读不到 ${goal.node.comp}:${goal.node.port} 的电位：这一端可能还没连进电路。`];
      if (v < goal.min) {
        const hints: string[] = [
          `实测 ${fmt(v, 'V')}，比目标下限 ${fmt(goal.min, 'V')} 低 ${fmt(goal.min - v, 'V')}。`,
        ];
        if (v < 0.05) {
          hints[0] = `实测 ≈ ${fmt(v, 'V')}：先确认电路有「地」参考（GND 要接电源负极），再看这个点是不是真的接通了。`;
        }
        const comp = compOf(circuit, goal.node.comp);
        if (comp?.type === 'pot') hints.push('电位器抽头电压 V_w = Vcc × wiper：把 wiper 往电压更高的那一端调。');
        else if (comp?.type === 'opamp') hints.push('运放输出偏低：检查反馈电阻是否接在 out↔inn 之间，增益 G = 1 + R2/R1 是否够大。');
        else hints.push('分压偏低：把下臂电阻调大、或上臂电阻调小（Vout = Vin × R下 ÷ (R上+R下)）。');
        return hints.slice(0, 2);
      }
      if (v > goal.max) {
        const hints: string[] = [
          `实测 ${fmt(v, 'V')}，比目标上限 ${fmt(goal.max, 'V')} 高 ${fmt(v - goal.max, 'V')}。`,
        ];
        const comp = compOf(circuit, goal.node.comp);
        if (comp?.type === 'pot') hints.push('电位器抽头电压 V_w = Vcc × wiper：把 wiper 往电压更低的那一端调。');
        else if (comp?.type === 'opamp') hints.push('运放输出偏高：反馈电阻是否过大？G = 1 + R2/R1，先算出需要的倍数再选阻值。');
        else hints.push('分压偏高：把下臂电阻调小、或上臂电阻调大（Vout = Vin × R下 ÷ (R上+R下)）。');
        return hints.slice(0, 2);
      }
      return [];
    }

    case 'branch-current': {
      if (!res?.ok) return [RUN_FIRST];
      const iMa = (branchA(res, goal.comp) ?? 0) * 1000;
      const comp = compOf(circuit, goal.comp);
      if (iMa <= 0.01) {
        const hints: string[] = [`流过 ${goal.comp} 的电流 ≈ 0：这条支路根本没通。`];
        if (comp?.type === 'led' || comp?.type === 'diode' || comp?.type === 'schottky' || comp?.type === 'zener') {
          hints.push(`${comp.type === 'led' ? 'LED' : '二极管'}是单向的：确认阳极 a 朝向电源正方向（LED 长脚）、回路闭合、限流电阻没有大到把电流掐死。`);
        } else if (levelHas(level, 'npn')) {
          const sw = switchIds(level);
          hints.push(`这条支路由三极管控制：基极要有驱动电流（${sw.length ? `先确认 ${sw.join('、')} 已按下/闭合，` : ''}基极电阻不能过大）。`);
        } else {
          hints.push('按「电源正极 → 元件 → 回到负极」的顺序检查有没有缺口，导线要连到端口上。');
        }
        return hints.slice(0, 2);
      }
      if (iMa > goal.max) {
        const target = (goal.min + goal.max) / 2;
        const scale = iMa / Math.max(target, 0.001);
        return [
          `电流 ${fmt(iMa, 'mA')} 超过上限 ${fmt(goal.max, 'mA')}：限流不足。`,
          `把串联电阻按大约 ${fmt(scale, '')} 倍调大（目标取中值 ${fmt(target, 'mA')}）；有 LED/二极管时用 R = (Vcc − Vf) ÷ I 重算。`,
        ];
      }
      if (iMa < goal.min) {
        const target = (goal.min + goal.max) / 2;
        const scale = iMa / Math.max(target, 0.001);
        const hints = [
          `电流 ${fmt(iMa, 'mA')} 低于下限 ${fmt(goal.min, 'mA')}：这条支路「通而不畅」。`,
          `把串联电阻按大约 ${fmt(scale, '')} 倍调小（目标取中值 ${fmt(target, 'mA')}）；也可能是多串了元件、或三极管没进入饱和。`,
        ];
        if (levelHas(level, 'npn')) hints[1] = `把串联电阻按大约 ${fmt(scale, '')} 倍调小（目标 ${fmt(target, 'mA')}）；若是三极管支路，还要确认基极驱动足够（Ib ≥ Ic/β）。`;
        return hints;
      }
      return [];
    }

    case 'led-lit': {
      if (!res?.ok) return [RUN_FIRST];
      const iMa = (branchA(res, goal.comp) ?? 0) * 1000;
      if (iMa <= 1) {
        return [
          `${goal.comp} 没亮（电流 ${fmt(iMa, 'mA')}）：先查极性——电流只能从阳极 a 流向阴极 k，接反一点都不通。`,
          '再看回路：电源正极 → 限流电阻 → LED → 电源负极，缺一段都不亮；电阻过大同样会「亮不起来」。',
        ];
      }
      const imax = (paramValue(circuit, goal.comp, 'imax') ?? 0.02) * 1000;
      if (iMa > imax * 1.5) {
        return [
          `${goal.comp} 过流：${fmt(iMa, 'mA')} 已超过额定 ${fmt(imax, 'mA')}，再跑就要烧了。`,
          '立刻加大限流电阻：R = (Vcc − Vf) ÷ I，按额定的 40~60% 取目标电流。',
        ];
      }
      return [];
    }

    case 'connected': {
      return [
        `${goal.a.comp}:${goal.a.port} 与 ${goal.b.comp}:${goal.b.port} 还不是同一个网络——电流要有完整回路。`,
        '从这两个端口之间拉一条导线（经过必要的元件），再运行确认。',
      ];
    }

    case 'component-placed': {
      return [`还缺元件：从元件盒把「${goal.type}」拖进画布（需要 ${goal.count ?? 1} 个）。`];
    }

    case 'custom': {
      return [`「${goal.description || goal.id}」由布局类规则判定，先按本关提示把布局/接线做完，再点运行复核。`];
    }

    default:
      return [];
  }
}

/**
 * 一关全部未达成目标的定向反馈（验收台用）。
 * 入参是 evaluateGoals 的结果，`ok === true` 的目标会被静默过滤；
 * 这样调用方不需要自己判断达成状态（本模块也绝不改判定）。
 */
export function diagnoseGoals(
  statuses: GoalStatus[],
  circuit: CircuitSpec,
  res: SolveResult | null,
  level: LevelDef,
): Diagnosis[] {
  return statuses
    .filter(s => !s.ok)
    .map(s => ({ goal: s.goal, hints: diagnoseGoal(s.goal, circuit, res, level) }))
    .filter(d => d.hints.length > 0);
}
