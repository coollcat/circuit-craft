// 关卡数据自动审查：结构完整性 + 「照抄解法」可通关性仿真
// · 结构检查：目标引用的元件/端口必须存在，palette/preset id 不冲突，星标定义合法
// · 可通关性检查：preset ∪ 全部 palette 放置 + 闭合开关 + 目标连线 + 参数取中值
//   + 地网合并/电源回流启发式 → solveDC → evaluateGoals，
//   非动态关（无电容/电感/晶振/信号源）要求全部可校验目标转绿（防卡关硬保证）
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LEVELS, SIDE_QUESTS, getLevel } from './index';
import { useProgress } from '@/store/progress';
import { DEFAULT_PARAMS, PORT_NAMES, evaluateGoal, evaluateGoals, solveDC } from '@/engine/solver';
import { CircuitSimulator } from '@/engine/simulator';
import { buildFactoryCircuit, buildSolutionCircuit } from '@/content/solution';
import { CONCEPTS } from '@/content/concepts';
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
      // 动态关（RC/波形/谐振）：DC 工作点不代表瞬态结果，所以上面那次 DC 判定不算数。
      // 但"不算数"不等于"不检查"——早期版本这里写的是 expect(true).toBe(true)，
      // 结果动态关的回归（参考解法不再收敛、或瞬态压根到不了目标区间）永远绿灯。
      // 现在跑真实瞬态并在窗口内持续采样：只要在有限时间内稳定达标就算可通关，
      // 这正是玩家实际会做的事（一直跑着，等指标进区间）。
      //
      // 步长：有信号源（funcgen/sensor）或电感时，节奏由器件决定，必须用引擎的自适应 dt；
      // 只有 RC 纯充电关（无源、无电感）才允许把 dt 放宽到 window/6000 ——
      // 否则 τ=1s 的关卡按引擎默认 10µs 步长要跑 60 万步，测试会慢到不可用（数值上仍远高于稳定要求）。
      const comps = allComps(level);
      const hasSource = comps.some(c => c.type === 'funcgen' || c.type === 'sensor');
      const hasInductor = comps.some(c => c.type === 'inductor');
      const naive = new CircuitSimulator(built);
      const durationSec = (level.sim?.duration ?? 50) / 1000;
      const windowSec = Math.max(durationSec, 0.12);
      const dt = hasSource || hasInductor ? naive.dt : Math.max(naive.dt, windowSec / 6000);
      const sim = dt === naive.dt ? naive : new CircuitSimulator(built, dt);
      const cap = Math.min(200_000, Math.max(1, Math.ceil(windowSec / sim.dt)));
      const stride = Math.max(1, Math.ceil(cap / 60));
      let lastFailed: string[] = ['（未取到瞬态结果）'];
      let passed = false;
      let steps = 0;
      while (steps < cap && !passed) {
        sim.runSteps(Math.min(stride, cap - steps));
        steps += stride;
        if (sim.error) {
          expect(sim.error, `[${level.id}] 瞬态仿真报错`).toBeNull();
        }
        const statuses = evaluateGoals(level.goals, built, sim.latest, sim.state).filter(
          s => !s.detail.includes('无法自动校验'),
        );
        const failedNow = statuses.filter(s => !s.ok);
        lastFailed = failedNow.map(f => f.detail);
        passed = failedNow.length === 0;
      }
      if (failed.length > 0) report.push(`[动态][${level.id}] DC: ${failed.map(f => f.detail).join('；')}`);
      if (passed) {
        const settledMs = steps * sim.dt * 1000;
        if (settledMs > durationSec * 1000 + 1) {
          report.push(`[动态][${level.id}] 瞬态 ${settledMs.toFixed(0)}ms 后达标（关卡 sim.duration=${durationSec * 1000}ms）`);
        }
      }
      expect(
        passed,
        `[${level.id}] 动态关参考解法在 ${windowSec * 1000}ms 瞬态窗口内未达成目标（${steps} 步 × ${(sim.dt * 1e6).toFixed(1)}µs）:\n` +
          lastFailed.map(t => `  - ${t}`).join('\n'),
      ).toBe(true);
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

/* ============================== 内容审计：免费绿灯 ============================== */

/** 玩家必须亲手算/调的数值目标种类（其余 connected/component-placed/led-lit 属机械动作） */
const NUMERIC_GOAL_KINDS: ReadonlySet<GoalCheck['kind']> = new Set(['param', 'node-voltage', 'branch-current']);

/** 数值目标的稳定标识：白名单键 + 失败信息都用它 */
function goalKey(level: LevelDef, g: GoalCheck): string {
  switch (g.kind) {
    case 'param': return `${level.id}#param:${g.comp}.${g.param}`;
    case 'node-voltage': return `${level.id}#node:${g.node.comp}.${g.node.port}`;
    case 'branch-current': return `${level.id}#current:${g.comp}`;
    default: return `${level.id}#${g.kind}`;
  }
}

/**
 * 免费绿灯白名单 —— 尚未修完的关卡目标（键 = goalKey）。
 * 规则（由下方断言强制）：
 *   1. 白名单之外的数值目标，在「出厂参数 + 已完成接线」下必须为 false；
 *   2. 每条都必须写清「原因」与「TODO」，不允许静默忽略；
 *   3. 一旦某条不再免费，必须从表里删掉（反向断言会提醒）。
 * 已修复的 5 处（c7-2 U1.imax / c5-3 RP1.wiper / c3-1 RP2.resistance / c2-3 RP1.resistance / c1-3 候选阻值）
 * 一律不得出现在此表中。
 */
export const KNOWN_FREE_GREEN: Record<string, string> = {
  // —— 以下 12 条都是「拓扑/读数」类数值目标：出厂参数下必然成立，但与玩家要计算的那个量无关。
  //    它们不是「答案被预先给出」，而是「接通/读数正确性」的校验；修掉它们需要改关卡机制或引擎能力，故先登记。
  'c1-1#current:R1':
    '原因：第 1 关的教学目标是「把回路接起来」，R1=1kΩ 是 preset 教具，5mA 只是接通后的结果读数，不是计算目标；TODO：若将来要玩家算阻值，需把 R1 改为 palette 可变件并加 param 目标（会牺牲手把手定位）。',
  'c1-2#node:BT1.pos':
    '原因：电压表测量关，9V 是电池标称值，读数为测量结果；本关技能（并联跨接、表笔极性）由 connected/component-placed 目标考核；TODO：改成「读出读数后作答」的 param 目标需 W4 支持数值输入。',
  'c2-1#node:C1.a':
    '原因：RC 充电关的 DC 稳态必然等于电源 5V，数值是充电过程的结果而非玩家算出的量；TODO：把验收改成 t≈1.61s（1τ）的瞬态节点电压窗口（需引擎瞬态判定），或加「τ 数值作答」目标。',
  'c2-3#current:LED1':
    '原因：主通道电流由 preset R2=330Ω 与 LED 决定，与玩家要算的基极电阻无关；本关计算目标已收在 param:RP1 窗口（P1 已修，出厂 10kΩ 不再达标）；TODO：若要连电流也计算，需把 R2 改为 palette 件并加 param 目标。',
  'c2-4#current:LED1':
    '原因：电感稳态关，13.6mA 由 preset 220Ω 决定，教学点是「电流爬升」的过程；TODO：改为瞬态判定（如 5τ 内达到 90% 稳态）或把限流电阻交给玩家调。',
  'c6-4#current:U1':
    '原因：MCU 静态电流是 preset 固定值 30mA，属于读账本（28~32mA 窗口只是核对数据手册标称），玩家的计算点在 LED 支路（已修为 8~22mA）；TODO：把静态电流做成选型参数让玩家按手册填，需界面支持。',
  'c7-2#node:U1.out':
    '原因：LDO 输入足够时输出恒为 3.3V，与玩家任何参数选择无关，属稳压功能校验；真正的选型计算由 imax（P1 已修）与功耗决定；TODO：若要可计算的数值目标，可改为「压差×负载」的功耗作答目标。',
  'c7-4#node:U1.out':
    '原因：同 c7-2，章底综合关的 LDO 输出恒为 3.3V，是链路功能校验；TODO：同上，需要新增「功耗/效率」类可作答目标。',
  'sa-3#node:U1.p1':
    '原因：上拉电阻开路分压的对象是无穷大输入阻抗，任何 R 都得到 3.3V；数值只证明拓扑接对，选型由 param 窗口（8~12kΩ，P1 已修）考核；TODO：改成「按下瞬间电流」或「并联负载后的电平」目标才能让数值随 R 变化。',
  'sa-5#node:U1.p1':
    '原因：同 sa-3（中断关复用上拉结构），节点电压与上拉阻值无关；TODO：同 sa-3。',
  'sb-2#node:CP1.a':
    '原因：RC 低通对直流的增益恒为 1，DC 工作点 0.5V 与电容取值无关；滤波效果只能由动态纹波体现；TODO：用纹波峰峰值/噪声残余做验收（需引擎瞬态支持），或加「fc 数值作答」目标。',
  'sb-4#node:R2.a':
    '原因：迟滞比较器的阈值中心由 R1/R2 分压决定（1.65V），与玩家要算的反馈电阻 RP2 无关；TODO：新增「迟滞窗口宽度（上下阈值差）」作为目标，才能把 ±79mV 纳入计算考核。',
};

/** 出厂电路下已经达成的数值目标（module 级缓存，供两条断言共用） */
const FACTORY_FREE = new Map<string, string>();
for (const l of ALL) {
  const built = buildFactoryCircuit(l);
  const res = solveDC(built);
  for (const g of l.goals) {
    if (!NUMERIC_GOAL_KINDS.has(g.kind)) continue;
    const st = evaluateGoal(g, built, res);
    if (st.ok) FACTORY_FREE.set(goalKey(l, g), `[${l.id}] ${st.detail}`);
  }
}

describe('内容审计：数值目标不得被出厂参数提前满足（防免费绿灯）', () => {
  it('白名单之外不存在免费绿灯', () => {
    const unlisted = [...FACTORY_FREE.keys()].filter(k => !(k in KNOWN_FREE_GREEN)).sort();
    expect(
      unlisted,
      `以下数值目标在「preset + palette 出厂参数 + 已接线」下已经达成，玩家不必计算：\n` +
        unlisted.map(k => `  - ${k}  ${FACTORY_FREE.get(k)}`).join('\n') +
        `\n请修改该关出厂参数，或登记进 KNOWN_FREE_GREEN（必须写原因 + TODO）。`,
    ).toEqual([]);
  });

  it('白名单条目仍然免费、原因与 TODO 齐备', () => {
    const errs: string[] = [];
    for (const [k, reason] of Object.entries(KNOWN_FREE_GREEN)) {
      if (!FACTORY_FREE.has(k)) {
        errs.push(`${k}: 已不再是免费绿灯（很可能刚修好）——请从 KNOWN_FREE_GREEN 移除`);
        continue;
      }
      if (!reason.includes('原因') || !reason.includes('TODO')) {
        errs.push(`${k}: 白名单必须写明「原因」与「TODO」（当前：${reason}）`);
      }
    }
    expect(errs).toEqual([]);
  });
});

/* ============================== 内容审计：教学元数据 / 概念 / custom 评估器 ============================== */

describe('内容审计：教学元数据与概念一致性', () => {
  it('关卡总数与分轨数量符合内容口径（与 index.ts 注释同步）', () => {
    expect(LEVELS.filter(l => l.track === 'main').length, '主线关数').toBe(30);
    expect(LEVELS.length, 'LEVELS = 主线 30').toBe(30);
    expect(SIDE_QUESTS.filter(l => l.track === 'side-a').length, '支线 A 关数').toBe(6);
    expect(SIDE_QUESTS.filter(l => l.track === 'side-b').length, '支线 B 关数').toBe(8);
    expect(SIDE_QUESTS.length, 'SIDE_QUESTS = 支线 A 6 + B 8').toBe(14);
    expect(ALL.length, '总关数').toBe(44);
  });

  it('每关都有 formula，且 expr / vars / note 三要素齐全', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      const f = l.formula;
      if (!f) { errs.push(`${l.id}: 缺少 formula（P2 要求每关都有本关主导公式）`); continue; }
      if (!f.expr?.trim()) errs.push(`${l.id}: formula.expr 为空`);
      if (!f.vars?.trim()) errs.push(`${l.id}: formula.vars 为空（要说明符号含义）`);
      if (!f.note?.trim()) errs.push(`${l.id}: formula.note 为空（要写一句话用法）`);
    }
    expect(errs).toEqual([]);
  });

  it('每关 concept 为 1~3 个、不重复、且已在 concepts.ts 注册', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      const cs = l.concept ?? [];
      if (cs.length < 1) { errs.push(`${l.id}: 没有 concept 标签`); continue; }
      if (cs.length > 3) errs.push(`${l.id}: concept 超过 3 个（${cs.join('、')}）`);
      if (new Set(cs).size !== cs.length) errs.push(`${l.id}: concept 有重复（${cs.join('、')}）`);
      for (const c of cs) {
        if (!(c in CONCEPTS)) errs.push(`${l.id}: concept「${c}」未在 src/content/concepts.ts 注册`);
      }
    }
    expect(errs).toEqual([]);
  });

  it('concept 必须在验收目标/观测探针里有证据（防「教 A 考 B」）', () => {
    const errs: string[] = [];
    for (const l of ALL) {
      for (const c of l.concept ?? []) {
        const evidence = CONCEPTS[c];
        if (!evidence) continue; // 未注册已由上一条报出
        const bad = evidence(l);
        if (bad) errs.push(`${l.id}「${c}」：${bad}`);
      }
    }
    expect(errs).toEqual([]);
  });

  it('custom 目标必须有已注册评估器（否则会被静默排除出胜利条件）', () => {
    const errs: string[] = [];
    let customCount = 0;
    for (const l of ALL) {
      const built = buildFactoryCircuit(l);
      const res = solveDC(built);
      for (const g of l.goals) {
        if (g.kind !== 'custom') continue;
        customCount++;
        const st = evaluateGoal(g, built, res);
        if (st.detail.includes('无法自动校验')) {
          errs.push(`${l.id}: custom「${g.id}」没有注册评估器——请 registerCustomGoalEvaluator 或改用标准目标`);
        }
      }
    }
    // 当前内容全部使用标准目标（customCount === 0 时本用例仍守住「将来新增不许静默忽略」）
    expect(errs, `共 ${customCount} 个 custom 目标`).toEqual([]);
  });

  it('custom 审计探针本身有效：未注册的 custom 一定会被判为「无法自动校验」', () => {
    const probe: GoalCheck = { kind: 'custom', id: '__w5_audit_probe__', description: '审计探针' };
    const st = evaluateGoal(probe, { components: [], wires: [] }, null);
    expect(st.detail).toContain('无法自动校验');
  });
});

/* ============================== 解锁顺序与星数语义（W5 · P5/P6，覆盖 store/progress.ts） ============================== */

describe('解锁顺序：支线门槛与历史存档兼容', () => {
  // node 环境没有 localStorage：给 safeStorage 一个内存桩，避免测试输出里刷「存储不可用」告警
  beforeAll(() => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  const mainIds = (upToChapter: number) =>
    LEVELS.filter(l => l.track === 'main' && l.chapter <= upToChapter).map(l => l.id);
  const sideIds = (track: LevelDef['track']) => SIDE_QUESTS.filter(l => l.track === track).map(l => l.id);
  const isUnlocked = (completed: string[], id: string) => {
    useProgress.setState({ completed, stars: {}, hintsUsed: {} });
    return useProgress.getState().isLevelUnlocked(id);
  };

  afterEach(() => useProgress.setState({ completed: [], stars: {}, hintsUsed: {} }));

  it('side-a 需第 2 章完成；sa-6 额外需第 6 章完成', () => {
    expect(isUnlocked(mainIds(1), 'sa-1'), '只过第 1 章不该开 side-a').toBe(false);
    expect(isUnlocked(mainIds(2), 'sa-1'), '第 2 章完成后 side-a 开放').toBe(true);
    // sa-1..sa-5 全通、但主线只到第 5 章 → sa-6（无线关）仍锁
    const throughSa5 = [...mainIds(5), ...sideIds('side-a').slice(0, 5)];
    expect(isUnlocked(throughSa5, 'sa-6'), 'sa-6 用第 6 章知识，未过第 6 章不得开放').toBe(false);
    expect(isUnlocked([...mainIds(6), ...sideIds('side-a').slice(0, 5)], 'sa-6'), '第 6 章完成后开放').toBe(true);
  });

  it('side-b 需第 6 章完成（不再只要求第 5 章）', () => {
    expect(isUnlocked(mainIds(5), 'sb-1'), '过完第 5 章不该开 side-b').toBe(false);
    expect(isUnlocked(mainIds(6), 'sb-1'), '第 6 章完成后 side-b 开放').toBe(true);
  });

  it('历史存档不被新门槛回收：已通关的关卡保持解锁', () => {
    expect(isUnlocked(['sb-8'], 'sb-8'), '旧存档里已通关的 sb-8 不能因门槛提高被锁').toBe(true);
    expect(isUnlocked(['sa-6'], 'sa-6'), '旧存档里已通关的 sa-6 不能因门槛提高被锁').toBe(true);
  });

  it('0 星通关与未通关可区分，星数夹取 0~3', () => {
    useProgress.setState({ completed: [], stars: {}, hintsUsed: {} });
    const store = () => useProgress.getState();
    store().completeLevel('c1-1', 0);
    expect(store().completed, '0 星也要记入 completed').toContain('c1-1');
    expect(store().stars['c1-1'], '0 星要落库为 0').toBe(0);
    expect(store().stars['c1-2'], '未通关必须没有键（undefined），与 0 星区分').toBeUndefined();
    expect(store().totalStars()).toBe(0);
    store().completeLevel('c1-1', 9);
    expect(store().stars['c1-1'], '越界星数夹到 3').toBe(3);
    store().completeLevel('c1-2', Number.NaN);
    expect(store().stars['c1-2'], 'NaN 星数按 0 处理').toBe(0);
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

