// 回路工坊 — 关卡参考解法推导（L4「直接通关」提示与可通关性审查测试共用）
// 目标数据能推导的（连线 / 参数区间 / GPIO 置高）全部自动推导；
// 只有目标里完全没编码的信息（如 c1-4 的阻值只存在于提示文本）才写进 SOLUTION_PARAMS 覆盖表。
import { PORT_NAMES } from '@/engine/solver';
import type { CircuitSpec, ComponentSpec, GoalCheck, LevelDef, PortRef, WireSpec } from '@/engine/types';

/** 每关参数覆盖：目标无法推导时的内容组补充（与该关提示文本口径一致） */
export const LEVEL_SOLUTION_PARAMS: Record<string, Record<string, Record<string, number | string | boolean>>> = {
  // c1-4 只给了 branch-current [10,18]mA，未给 param 区间；按提示 R = (5−2)/13.6mA ≈ 220Ω
  'c1-4': { RP1: { resistance: 220 } },
};

const PIN_KEYS = ['p0', 'p1', 'p2', 'p3'] as const;

/* ---------------- 迷你并查集（仅用于解法推导，不参与仿真） ---------------- */
class Uf {
  private parent = new Map<string, string>();
  find(x: string): string {
    let r = this.parent.get(x);
    if (r === undefined) { this.parent.set(x, x); return x; }
    if (r !== x) { r = this.find(r); this.parent.set(x, r); }
    return r;
  }
  union(a: string, b: string) { this.parent.set(this.find(a), this.find(b)); }
}

function key(p: PortRef): string { return `${p.comp}:${p.port}`; }

/** 解法回溯时视为「内部导通」的双向无源件；LED/二极管等单向件不导通，避免跨过结点误判 */
const TRACE_CONDUCTIVE = ['resistor', 'pot', 'inductor', 'fuse', 'ammeter'];

function goalCompRefs(g: GoalCheck): string[] {
  switch (g.kind) {
    case 'connected': return [g.a.comp, g.b.comp];
    case 'param': return [g.comp];
    case 'node-voltage': return [g.node.comp];
    case 'branch-current': return [g.comp];
    case 'led-lit': return [g.comp];
    default: return [];
  }
}

/**
 * 推导需要置高的 MCU GPIO：
 * led-lit 目标的 LED 阳极网，经「导线 + 双向无源件」回溯到哪个 GPIO，就置高哪个；
 * 输入型引脚（上拉/按键/ADC）不在任何 led-lit 阳极网上，天然保持高阻输入。
 */
export function deriveHighPins(level: LevelDef): Set<string> {
  const uf = new Uf();
  const comps = [...level.preset.components, ...level.palette];
  for (const c of comps) for (const p of PORT_NAMES[c.type]) uf.find(`${c.id}:${p}`);
  for (const w of level.preset.wires) uf.union(key(w.from), key(w.to));
  for (const g of level.goals) if (g.kind === 'connected') uf.union(key(g.a), key(g.b));
  for (const c of comps) {
    const conductive =
      TRACE_CONDUCTIVE.includes(c.type) ||
      ((c.type === 'switch' || c.type === 'button') && c.params?.closed === true);
    if (!conductive) continue;
    const ports = PORT_NAMES[c.type];
    for (let i = 1; i < ports.length; i++) uf.union(`${c.id}:${ports[0]}`, `${c.id}:${ports[i]}`);
  }
  const high = new Set<string>();
  for (const g of level.goals) {
    if (g.kind !== 'led-lit') continue;
    const anode = uf.find(`${g.comp}:a`);
    for (const c of comps) {
      if (c.type !== 'mcu') continue;
      for (const pin of PIN_KEYS) {
        if (uf.find(`${c.id}:${pin}`) === anode) high.add(`${c.id}:${pin}`);
      }
    }
  }
  return high;
}

/** param 目标 → 建议参数值：双边界取中值，单边界取边界值 */
export function paramTargetValue(g: Extract<GoalCheck, { kind: 'param' }>): number | undefined {
  if (g.min !== undefined && g.max !== undefined) return (g.min + g.max) / 2;
  if (g.min !== undefined) return g.min;
  if (g.max !== undefined) return g.max;
  return undefined;
}

/** 解法需要的 palette 元件 id：被任意目标引用，或按 component-placed 目标的类型补齐所需数量 */
export function paletteNeeded(level: LevelDef): Set<string> {
  const need = new Set<string>();
  const byType = new Map<string, number>();
  for (const g of level.goals) {
    if (g.kind === 'component-placed') {
      byType.set(g.type, Math.max(byType.get(g.type) ?? 0, g.count ?? 1));
      continue;
    }
    for (const id of goalCompRefs(g)) need.add(id);
  }
  for (const [type, count] of byType) {
    let have = level.preset.components.filter(c => c.type === type).length;
    for (const p of level.palette) {
      if (have >= count) break;
      if (p.type === type) { need.add(p.id); have += 1; }
    }
  }
  return need;
}

/** 在已有元件旁找不重叠的落点：两行交错布局（奇偶件错开纵向相位），
 *  避免多颗新件同基线排开 —— 否则它们到同一目标（地/公共引脚）的斜线会完全重合 */
function freeSlot(components: ComponentSpec[], index: number): { x: number; y: number } {
  const taken = new Set(components.map(c => `${Math.round(c.x)}:${Math.round(c.y)}`));
  for (let i = index; i < index + 200; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    // 行内再按奇偶上下错位 40px：相邻元件不同基线，route45 到共点的斜线自然分离
    const x = 128 + col * 160;
    const y = 464 + row * 152 + (i % 2) * 40;
    if (!taken.has(`${x}:${y}`)) return { x, y };
  }
  return { x: 96, y: 480 };
}

/**
 * 组装「照抄解法」电路。
 * base 省略时从关卡 preset 出发（审查测试用）；传入玩家当前电路时保留已放元件及其位置，
 * 只补缺失的元件与连线 —— 运行时 L4「一键照抄」用。
 */
export function buildSolutionCircuit(level: LevelDef, base?: CircuitSpec): CircuitSpec {
  const src: CircuitSpec = base ?? level.preset;
  const components: ComponentSpec[] = src.components.map(c => ({ ...c, params: { ...(c.params ?? {}) } }));
  const wires: WireSpec[] = src.wires.map(w => ({ id: w.id, from: { ...w.from }, to: { ...w.to } }));

  const byId = new Map(components.map(c => [c.id, c]));
  const setParam = (compId: string, k: string, v: number | string | boolean) => {
    const c = byId.get(compId);
    if (c) c.params = { ...c.params, [k]: v };
  };

  /* 1) 放置解法需要的 palette 元件（目标引用或 component-placed 补齐），空位摆放 */
  const needed = paletteNeeded(level);
  let slot = 0;
  for (const p of level.palette) {
    if (byId.has(p.id) || !needed.has(p.id)) continue;
    const pos = freeSlot(components, slot++);
    const comp: ComponentSpec = { ...p, params: { ...(p.params ?? {}) }, x: pos.x, y: pos.y };
    components.push(comp);
    byId.set(comp.id, comp);
  }

  /* 2) 参数：param 目标区间 → 覆盖表 → GPIO 置高（后者优先级最低、互不冲突） */
  for (const g of level.goals) {
    if (g.kind !== 'param') continue;
    const v = paramTargetValue(g);
    if (v !== undefined && Number.isFinite(v)) setParam(g.comp, g.param, v);
  }
  const overrides = LEVEL_SOLUTION_PARAMS[level.id];
  if (overrides) {
    for (const [compId, kv] of Object.entries(overrides)) {
      for (const [k, v] of Object.entries(kv)) setParam(compId, k, v);
    }
  }
  const highPins = deriveHighPins(level);
  for (const c of components) {
    if (c.type !== 'mcu') continue;
    for (const pin of PIN_KEYS) if (highPins.has(`${c.id}:${pin}`)) setParam(c.id, pin, true);
  }

  /* 3) 连线：net 感知去重 —— 两端已同网的目标不再重复铺线 */
  const netUf = new Uf();
  for (const c of components) for (const p of PORT_NAMES[c.type]) netUf.find(`${c.id}:${p}`);
  for (const w of wires) netUf.union(key(w.from), key(w.to));
  let n = 0;
  const addNetWire = (a: PortRef, b: PortRef) => {
    const ka = key(a), kb = key(b);
    if (!byId.has(a.comp) || !byId.has(b.comp)) return;
    if (netUf.find(ka) === netUf.find(kb)) return;
    netUf.union(ka, kb);
    wires.push({ id: `sol-${n++}`, from: { ...a }, to: { ...b } });
  };
  for (const g of level.goals) {
    if (g.kind !== 'connected') continue;
    addNetWire(g.a, g.b);
  }

  /* 4) 地网合并 + 电源回流（启发式，仅当存在 gnd 元件；玩家已连通的自动跳过） */
  const gnds = components.filter(c => c.type === 'gnd');
  if (gnds.length > 0) {
    const g0: PortRef = { comp: gnds[0].id, port: 'gnd' };
    for (const g of gnds.slice(1)) addNetWire({ comp: g.id, port: 'gnd' }, g0);
    for (const s of components) {
      if (s.type === 'battery' || s.type === 'vsrc') addNetWire({ comp: s.id, port: 'neg' }, g0);
      else if (s.type === 'funcgen' || s.type === 'mcu' || s.type === 'sensor') addNetWire({ comp: s.id, port: 'gnd' }, g0);
    }
  }

  return { components, wires };
}

export interface SolutionStep { kind: 'place' | 'param' | 'pin' | 'wire'; text: string }

/** L4 抽屉展示的分步清单（与 buildSolutionCircuit 同一套规则，纯展示用） */
export function deriveSolutionSteps(level: LevelDef): SolutionStep[] {
  const steps: SolutionStep[] = [];
  const needed = paletteNeeded(level);
  const placed = level.palette.filter(p => needed.has(p.id));
  if (placed.length > 0) {
    steps.push({
      kind: 'place',
      text: `从元件盒放入：${placed.map(p => p.id).join('、')}。`,
    });
  }
  for (const g of level.goals) {
    if (g.kind !== 'param') continue;
    const v = paramTargetValue(g);
    if (v === undefined) continue;
    const range = g.min !== undefined && g.max !== undefined ? `${g.min}~${g.max}` : `${v}`;
    steps.push({ kind: 'param', text: `双击 ${g.comp}，把 ${g.param} 设为 ${v}（验收范围 ${range}）。` });
  }
  const overrides = LEVEL_SOLUTION_PARAMS[level.id];
  if (overrides) {
    for (const [compId, kv] of Object.entries(overrides)) {
      for (const [k, v] of Object.entries(kv)) steps.push({ kind: 'param', text: `双击 ${compId}，把 ${k} 设为 ${v}。` });
    }
  }
  const highPins = deriveHighPins(level);
  if (highPins.size > 0) {
    steps.push({
      kind: 'pin',
      text: `双击 MCU，勾选输出高：${[...highPins].map(k => k.replace(':', ' 的 ')).join('、')}。`,
    });
  }
  const wireGoals = level.goals.filter((g): g is Extract<GoalCheck, { kind: 'connected' }> => g.kind === 'connected');
  if (wireGoals.length > 0) {
    steps.push({
      kind: 'wire',
      text: `连好 ${wireGoals.length} 条线：${wireGoals.map(g => `${key(g.a)} ↔ ${key(g.b)}`).join('，')}。`,
    });
    steps.push({ kind: 'wire', text: '别忘了电源回路：电池/信号源的负端（gnd）要接回 GND。' });
  }
  return steps;
}
