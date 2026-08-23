// 关卡数据自动审查：结构完整性 + 「照抄解法」可通关性仿真
// · 结构检查：目标引用的元件/端口必须存在，palette/preset id 不冲突，星标定义合法
// · 可通关性检查：preset ∪ 全部 palette 放置 + 闭合开关 + 目标连线 + 参数取中值
//   + 地网合并/电源回流启发式 → solveDC → evaluateGoals，
//   非动态关（无电容/电感/晶振/信号源）要求全部可校验目标转绿（防卡关硬保证）
import { describe, expect, it } from 'vitest';
import { LEVELS, SIDE_QUESTS, getLevel } from './index';
import { DEFAULT_PARAMS, PORT_NAMES, evaluateGoals, solveDC } from '@/engine/solver';
import { buildSolutionCircuit } from '@/content/solution';
import { buildWirePolyline, type Pt } from '@/components/editor/routing';
import { portWorldPos } from '@/components/editor/symbols';
import type { ComponentSpec, GoalCheck, LevelDef, PortRef } from '@/engine/types';

const ALL: LevelDef[] = [...LEVELS, ...SIDE_QUESTS];

const DYNAMIC_TYPES = ['capacitor', 'inductor', 'crystal', 'funcgen'];
const isDynamicLevel = (l: LevelDef) =>
  [...l.preset.components, ...l.palette].some(c => DYNAMIC_TYPES.includes(c.type));

function allComps(level: LevelDef): ComponentSpec[] {
  return [...level.preset.components, ...level.palette];
}

function compMap(level: LevelDef): Map<string, ComponentSpec> {
  const map = new Map<string, ComponentSpec>();
  for (const c of allComps(level)) if (!map.has(c.id)) map.set(c.id, c);
  return map;
}

/** 目标引用到的全部元件 id（connected 两端 / param / node-voltage / branch-current / led-lit） */
function goalCompIds(g: GoalCheck): string[] {
  switch (g.kind) {
    case 'connected': return [g.a.comp, g.b.comp];
    case 'component-placed': return [];
    case 'param': return [g.comp];
    case 'node-voltage': return [g.node.comp];
    case 'branch-current': return [g.comp];
    case 'led-lit': return [g.comp];
    case 'custom': return [];
  }
}

function portOf(g: GoalCheck): PortRef[] {
  switch (g.kind) {
    case 'connected': return [g.a, g.b];
    case 'node-voltage': return [g.node];
    default: return [];
  }
}

/* ============================== 结构完整性 ============================== */

describe('关卡数据结构完整性', () => {
  it('关卡 id 全局唯一且 getLevel 可命中', () => {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const l of ALL) {
      if (seen.has(l.id)) dup.push(l.id);
      seen.add(l.id);
    }
    expect(dup, `重复关卡 id: ${dup.join(', ')}`).toEqual([]);
    for (const l of ALL) expect(getLevel(l.id)?.id).toBe(l.id);
  });

  it('同轨道内 chapter+index 唯一（解锁链依赖排序）', () => {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const l of ALL) {
      const key = `${l.track}#${l.chapter}-${l.index}`;
      if (seen.has(key)) dup.push(`${l.id} (${key})`);
      seen.add(key);
    }
    expect(dup, `chapter/index 冲突: ${dup.join(', ')}`).toEqual([]);
  });

  it('palette 与 preset 的元件 id 无冲突、palette 内部无重复', () => {
    const bad: string[] = [];
    for (const l of ALL) {
      const presetIds = new Set(l.preset.components.map(c => c.id));
      const seenP = new Set<string>();
      for (const p of l.palette) {
        if (presetIds.has(p.id)) bad.push(`${l.id}: ${p.id} 与 preset 冲突`);
        if (seenP.has(p.id)) bad.push(`${l.id}: palette 重复 ${p.id}`);
        seenP.add(p.id);
      }
    }
    expect(bad).toEqual([]);
  });

  it('每个目标引用的元件存在、端口合法、param 键存在于默认参数表', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      const comps = compMap(l);
      for (const g of l.goals) {
        for (const id of goalCompIds(g)) {
          if (!comps.has(id)) errs.push(`${l.id}: 目标 ${JSON.stringify(g)} 引用不存在的元件「${id}」`);
        }
        for (const p of portOf(g)) {
          const c = comps.get(p.comp);
          if (c && !PORT_NAMES[c.type].includes(p.port)) {
            errs.push(`${l.id}: ${p.comp}(${c.type}) 没有端口「${p.port}」`);
          }
        }
        if (g.kind === 'param') {
          const c = comps.get(g.comp);
          // 键在元件实例参数或默认参数表任一处存在即可（如 ic 的 imax 由 preset 携带）
          if (c && c.params?.[g.param] === undefined && DEFAULT_PARAMS[c.type][g.param] === undefined) {
            errs.push(`${l.id}: ${g.comp}(${c.type}) 没有参数键「${g.param}」`);
          }
        }
      }
    }
    expect(errs).toEqual([]);
  });

  it('component-placed 目标的数量可由 preset+palette 满足', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      for (const g of l.goals) {
        if (g.kind !== 'component-placed') continue;
        const need = g.count ?? 1;
        const got = allComps(l).filter(c => c.type === g.type).length;
        if (got < need) errs.push(`${l.id}: 需要 ${need} 个 ${g.type}，但 preset+palette 只有 ${got} 个`);
      }
    }
    expect(errs).toEqual([]);
  });

  it('星标定义合法（time 星必须有正数值）', () => {
    const errs: string[] = [];
    const LEGAL = ['no-hint', 'first-try', 'time', 'custom'];
    for (const l of ALL) {
      for (const s of l.stars) {
        if (!LEGAL.includes(s.check)) errs.push(`${l.id}: 非法 star check「${s.check}」`);
        if (s.check === 'time' && (s.value ?? 0) <= 0) errs.push(`${l.id}: time 星缺少有效 value`);
      }
    }
    expect(errs).toEqual([]);
  });

  it('sim.probes 引用的探针点位存在', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      const comps = compMap(l);
      for (const p of l.sim?.probes ?? []) {
        const c = comps.get(p.comp);
        if (!c) { errs.push(`${l.id}: probe 元件「${p.comp}」不存在`); continue; }
        if (!PORT_NAMES[c.type].includes(p.port)) errs.push(`${l.id}: probe ${p.comp} 端口「${p.port}」非法`);
      }
    }
    expect(errs).toEqual([]);
  });
});

/* ============================== 可通关性（防卡关） ============================== */

describe('关卡可通关性：照抄解法仿真', () => {
  const report: string[] = [];

  it.each(ALL.map(l => [l.id, l] as const))('%s', (_id, level) => {
    const built = buildSolutionCircuit(level);
    const res = solveDC(built);

    // 求解器爆炸 = 真卡关（短路/奇异矩阵），无论玩家怎么搭都过不了
    expect(res.ok, `[${level.id}] 解法电路无法求解: ${res.error}`).toBe(true);

    const statuses = evaluateGoals(level.goals, built, res, undefined);
    const countable = statuses.filter(s => !s.detail.includes('无法自动校验'));
    const failed = countable.filter(s => !s.ok);

    if (isDynamicLevel(level)) {
      // 动态关（RC/波形类）DC 工作点不代表瞬态结果，只记录不判死
      if (failed.length > 0) {
        report.push(`[动态][${level.id}] ${failed.map(f => f.detail).join('；')}`);
      }
      expect(true).toBe(true);
    } else {
      // 静态关：照抄解法必须全绿 —— 这是「不会卡关」的硬保证
      expect(
        failed,
        `[${level.id}] 以下目标在参考解法下未通过:\n${failed.map(f => `  - ${f.detail}`).join('\n')}`,
      ).toEqual([]);
    }
  });

  it('输出动态关审查报告', () => {
    if (report.length) console.log('\n【动态关 DC 参考解法报告（仅记录）】\n' + report.join('\n'));
    expect(true).toBe(true);
  });
});

/* ============================== 布线质量：参考解法不得有完全重合的线 ============================== */

describe('布线布局：照抄解法无完全重合导线', () => {
  const EPS = 0.01;

  function polyKey(pts: Pt[]): string {
    return pts.map(p => `${Math.round(p.x)}:${Math.round(p.y)}`).join('|');
  }

  function polyLen(pts: Pt[]): number {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return L;
  }

  /** 折线 A 被 B 覆盖的比例：沿 A 等弧长采样，落在 B 上（<0.5px）即计入 */
  function coverageBy(a: Pt[], b: Pt[]): number {
    const total = polyLen(a);
    if (total < EPS) return 1;
    let covered = 0;
    const STEP = 2;
    for (let d = 0; d < total; d += STEP) {
      let remain = d;
      let p: Pt = a[0];
      for (let i = 1; i < a.length; i++) {
        const segL = Math.hypot(a[i].x - a[i - 1].x, a[i].y - a[i - 1].y);
        if (remain <= segL) {
          const f = segL === 0 ? 0 : remain / segL;
          p = { x: a[i - 1].x + (a[i].x - a[i - 1].x) * f, y: a[i - 1].y + (a[i].y - a[i - 1].y) * f };
          break;
        }
        remain -= segL;
      }
      if (distToSegs(p, b) < 0.5) covered += STEP;
    }
    return Math.min(1, covered / total);
  }

  function distToSegs(p: Pt, b: Pt[]): number {
    let best = Infinity;
    for (let i = 1; i < b.length; i++) {
      const ax = b[i - 1], bx2 = b[i];
      const vx = bx2.x - ax.x, vy = bx2.y - ax.y;
      const l2 = vx * vx + vy * vy;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - ax.x) * vx + (p.y - ax.y) * vy) / l2));
      best = Math.min(best, Math.hypot(p.x - (ax.x + t * vx), p.y - (ax.y + t * vy)));
    }
    return best;
  }

  it.each(ALL.map(l => [l.id, l] as const))('%s', (_id, level) => {
    const built = buildSolutionCircuit(level);
    const byId = new Map(built.components.map(c => [c.id, c]));

    interface W { id: string; label: string; pts: Pt[] }
    const wires: W[] = built.wires.map(w => {
      const pa = portWorldPos(byId.get(w.from.comp)!, w.from.port);
      const pb = portWorldPos(byId.get(w.to.comp)!, w.to.port);
      return {
        id: w.id,
        label: `${w.from.comp}:${w.from.port} ↔ ${w.to.comp}:${w.to.port}`,
        pts: buildWirePolyline({ x: pa.x, y: pa.y }, [], { x: pb.x, y: pb.y }),
      };
    });

    const problems: string[] = [];
    for (let i = 0; i < wires.length; i++) {
      for (let j = i + 1; j < wires.length; j++) {
        const A = wires[i], B = wires[j];
        // 端点对完全相同的重复线
        const dup =
          (A.label === B.label) ||
          (A.pts.length &&
            polyKey(A.pts) === polyKey([...B.pts].reverse()));
        const covA = coverageBy(A.pts, B.pts);
        const covB = coverageBy(B.pts, A.pts);
        if (dup || (covA > 0.999 && covB > 0.999)) {
          problems.push(`${A.label} 与 ${B.label} 完全重合`);
        } else if (covA > 0.9 || covB > 0.9) {
          // 单向被吞 90%+ 也算叠线（短边完全骑在长边上）
          problems.push(`${covA > covB ? A.label : B.label} 几乎完全被另一条线覆盖 (${Math.max(covA, covB).toFixed(2)})`);
        }
      }
    }
    expect(problems, `[${level.id}] 存在重合布线:\n${problems.map(s => `  - ${s}`).join('\n')}`).toEqual([]);
  });
});

