// 走线质量验收（A4）：对全部 44 关的参考解法做真实断言（不再只 console.log）
//   (a) 任意两条导线互相覆盖率 < 0.15 —— 抓完全重叠 / 大段叠线
//   (b) 近距（<10px）连续伴随 < 90px —— 抓「贴着走」的近平行走线
//   (c) 同一网络内部不允许出现 ≥8px 的完全重合段 —— 白铺铜 + 电流粒子重影
//       （<8px 的共线短桩只可能出现在「两根线汇入同一焊盘」的末端收敛处，被焊盘盖住、视觉不可分辨）
// 路径取「编辑器真正渲染的那一份」：buildCircuitWireRoutes（全局串行布线 + 避让分道），
// 因此这些断言同时守卫关卡参考解法与画布渲染、示教重影（ghost 走同一函数）。
import { describe, expect, it } from 'vitest';
import { buildSolutionCircuit } from '@/content/solution';
import {
  buildCircuitWireRoutes, buildCircuitWireSegments, buildWireRouteContext,
} from '@/components/editor/wireRoutes';
import { buildWireSegments, flattenSegments, type Pt } from '@/components/editor/routing';
import { portWorldPos } from '@/components/editor/symbols';
import { auditWires, MAX_ADJACENCY_RUN, MIN_COINCIDENT_RUN, type WireLike } from '@/components/editor/wireAudit';
import { getLevel, LEVELS, SIDE_QUESTS } from './index';
import type { LevelDef } from '@/engine/types';

const ALL: LevelDef[] = [...LEVELS, ...SIDE_QUESTS];

/** 参考解法的导线 → 与画布完全一致的折线 + 「同网络」判定 */
function solutionWires(level: LevelDef): { wires: WireLike[]; sameNet: (a: WireLike, b: WireLike) => boolean } {
  const built = buildSolutionCircuit(level);
  const routes = buildCircuitWireRoutes(built);

  // 简易并查集：判两根线是否属于同一电气网络（c 项只在同网络内查完全重合段）
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (p === undefined) { parent.set(x, x); return x; }
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const w of built.wires) union(`${w.from.comp}:${w.from.port}`, `${w.to.comp}:${w.to.port}`);

  const netOfWire = new WeakMap<WireLike, string>();
  const wires: WireLike[] = built.wires.map(w => {
    const item: WireLike = {
      id: w.id,
      label: `${w.from.comp}:${w.from.port}→${w.to.comp}:${w.to.port}`,
      pts: routes.get(w.id) ?? [],
    };
    netOfWire.set(item, find(`${w.from.comp}:${w.from.port}`));
    return item;
  });
  return {
    wires,
    sameNet: (a, b) => netOfWire.get(a) !== undefined && netOfWire.get(a) === netOfWire.get(b),
  };
}

/** 折线必须是 45°/90°，端点必须严格落在两个焊盘坐标上（避让不许改动端点） */
function geometryProblems(w: WireLike, from: Pt, to: Pt): string[] {
  const bad: string[] = [];
  const pts = w.pts;
  if (pts.length < 2) return [`${w.label}: 路径为空（渲染/命中会取不到导线）`];
  if (pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) bad.push(`${w.label}: 路径含 NaN`);
  const d0 = Math.hypot(pts[0].x - from.x, pts[0].y - from.y);
  const d1 = Math.hypot(pts[pts.length - 1].x - to.x, pts[pts.length - 1].y - to.y);
  if (d0 > 1e-6 || d1 > 1e-6) bad.push(`${w.label}: 端点被避让改动（起 ${d0.toFixed(2)}px / 终 ${d1.toFixed(2)}px）`);
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    if (dx < 1e-6 && dy < 1e-6) { bad.push(`${w.label}: 出现零长段`); break; }
    if (dx > 1e-6 && dy > 1e-6 && Math.abs(dx - dy) > 1e-4) {
      bad.push(`${w.label}: 段 ${i} 既非水平/垂直也非 45°（Δ=${dx.toFixed(2)},${dy.toFixed(2)}）`);
      break;
    }
  }
  return bad;
}

describe('走线几何：45°/90° 与端点不变（A1）', () => {
  it.each(ALL.map(l => [l.id, l] as const))('%s', (_id, level) => {
    const built = buildSolutionCircuit(level);
    const byId = new Map(built.components.map(c => [c.id, c]));
    const routes = buildCircuitWireRoutes(built);
    const problems: string[] = [];
    for (const w of built.wires) {
      const a = byId.get(w.from.comp);
      const b = byId.get(w.to.comp);
      if (!a || !b) { problems.push(`${w.id}: 引用了不存在的元件`); continue; }
      const item: WireLike = { id: w.id, label: `${w.from.comp}:${w.from.port}→${w.to.comp}:${w.to.port}`, pts: routes.get(w.id) ?? [] };
      problems.push(...geometryProblems(item, portWorldPos(a, w.from.port), portWorldPos(b, w.to.port)));
    }
    expect(problems, `[${level.id}] 走线几何不合法:\n${problems.map(s => `  - ${s}`).join('\n')}`).toEqual([]);
  });
});

describe('走线质量：参考解法逐关断言（A4）', () => {
  it.each(ALL.map(l => [l.id, l] as const))('%s', (_id, level) => {
    const { wires, sameNet } = solutionWires(level);
    const report = auditWires(wires, { sameNetPairs: sameNet });
    const lines: string[] = [];
    for (const x of report.overlaps) lines.push(`[覆盖] ${x.detail}`);
    for (const x of report.adjacencies) lines.push(`[贴线] ${x.detail}`);
    for (const x of report.coincidences) lines.push(`[同网重合] ${x.detail}`);
    expect(
      lines,
      `[${level.id}] 参考解法走线不达标（最多 ${wires.length} 根线，峰值覆盖 ${report.maxCoverage.toFixed(2)} / 峰值伴随 ${report.maxAdjacency.toFixed(0)}px）:\n${lines.map(s => `  - ${s}`).join('\n')}`,
    ).toEqual([]);
  });

  it('覆盖全部 44 关且断言口径未被放水', () => {
    // 防止「悄悄只测一关」或阈值被改大
    expect(ALL.length).toBe(44);
    expect(MAX_ADJACENCY_RUN).toBe(90);
    expect(MIN_COINCIDENT_RUN).toBe(8);
    const ids = new Set(ALL.map(l => l.id));
    expect(ids.size).toBe(44);
    for (const level of ALL) expect(getLevel(level.id)?.id).toBe(level.id);
  });

  it('全部 44 关整体统计（便于发现退化趋势）', () => {
    let worstCoverage = 0;
    let worstAdjacency = 0;
    let worstCoverageLevel = '';
    let worstAdjacencyLevel = '';
    let wireCount = 0;
    for (const level of ALL) {
      const { wires, sameNet } = solutionWires(level);
      wireCount += wires.length;
      const r = auditWires(wires, { sameNetPairs: sameNet });
      if (r.maxCoverage > worstCoverage) { worstCoverage = r.maxCoverage; worstCoverageLevel = level.id; }
      if (r.maxAdjacency > worstAdjacency) { worstAdjacency = r.maxAdjacency; worstAdjacencyLevel = level.id; }
    }
    console.log(
      `\n【走线质量统计】44 关 / ${wireCount} 根参考导线：` +
      `峰值互相覆盖 ${worstCoverage.toFixed(3)}（${worstCoverageLevel}），` +
      `峰值近距伴随 ${worstAdjacency.toFixed(0)}px（${worstAdjacencyLevel}）` +
      `；阈值：覆盖 <0.15、伴随 <90px`,
    );
    expect(worstCoverage).toBeLessThan(0.15);
    expect(worstAdjacency).toBeLessThan(MAX_ADJACENCY_RUN);
  });
});

describe('预览与落线一致（A2/A3）', () => {
  it('橡皮筋预览路径 = 同一条线落线后的路径（逐点一致）', () => {
    const level = getLevel('c2-1');
    expect(level).toBeTruthy();
    const built = buildSolutionCircuit(level!);
    const segMap = buildCircuitWireSegments(built);
    // 挑一对还没连过、且不会短路/重复的端口：BT1:pos → R1:a（该关存在这两个元件）
    const comps = new Map(built.components.map(c => [c.id, c]));
    const from = { comp: 'BT1', port: 'pos' };
    const to = { comp: 'R1', port: 'a' };
    const a = comps.get(from.comp)!;
    const b = comps.get(to.comp)!;
    const pa = portWorldPos(a, from.port);
    const pb = portWorldPos(b, to.port);
    // 预览：用「已布线表 + 排除起/终点元件」构造的上下文（CircuitEditor 里的同一做法）
    const ctx = buildWireRouteContext(built, segMap, [from.comp, to.comp]);
    const preview = flattenSegments(buildWireSegments(pa, [], pb, 'top', ctx));
    // 落线：把新线追加到电路末尾后再做一次全局串行布线（新线排在最后，已有线路径不变）
    const committedSegs = buildCircuitWireSegments({
      ...built,
      wires: [...built.wires, { id: '__new__', from, to, layer: 'top' }],
    });
    const committed = flattenSegments(committedSegs.get('__new__') ?? []);
    expect(preview.length).toBeGreaterThanOrEqual(2);
    expect(committed.length).toBeGreaterThanOrEqual(2);
    expect(preview).toEqual(committed);
    // 已有导线的路径不允许因为「追加了一条新线」而漂移（否则画布会整体抖动）
    const before = buildCircuitWireSegments(built);
    for (const [id, segs] of before) {
      expect(flattenSegments(committedSegs.get(id) ?? [])).toEqual(flattenSegments(segs));
    }
  });
});
