// 编辑器路由层单元测试（A1 避让/分道 + B5 放置防呆 + wireAudit 口径）
// 只测纯函数，不依赖 DOM；覆盖「端点不变 / 45°-90° / 不越界 / 纯函数无副作用 / 缓存不改变语义」。
import { describe, expect, it } from 'vitest';
import {
  buildWireSegments, filterRelevantBoxes, route45, route45Avoid,
  type Pt, type Rect, type WireSegment, type WireRouteContext,
} from './routing';
import {
  WORKSPACE, buildCircuitWireSegments, clampComponentToWorkspace, clearWireRouteCache,
  componentPlaceBlocked, findFreeComponentSpot,
} from './wireRoutes';
import { adjacencyRun, auditWires, coincidentSegmentLength, coverageBy } from './wireAudit';
import type { CircuitSpec, ComponentSpec } from '@/engine/types';

const ptsKey = (pts: readonly Pt[]) => pts.map(p => `${p.x},${p.y}`).join(' ');
const is45or90 = (pts: readonly Pt[]) =>
  pts.every((p, i) => i === 0 || (() => {
    const dx = Math.abs(p.x - pts[i - 1].x), dy = Math.abs(p.y - pts[i - 1].y);
    return (dx < 1e-9 && dy > 1e-9) || (dy < 1e-9 && dx > 1e-9) || Math.abs(dx - dy) < 1e-4;
  })());
const insideBounds = (pts: readonly Pt[], r: Rect) =>
  pts.every(p => p.x >= r.x - 1e-9 && p.x <= r.x + r.w + 1e-9 && p.y >= r.y - 1e-9 && p.y <= r.y + r.h + 1e-9);

describe('route45 基础几何（兼容性）', () => {
  it('水平优先：H 段 + 45° 斜线，端点不变', () => {
    const p = route45({ x: 0, y: 0 }, { x: 100, y: 50 });
    expect(p).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 50 }]);
    expect(is45or90(p)).toBe(true);
  });
  it('垂直优先：V 段 + 45° 斜线', () => {
    const p = route45({ x: 0, y: 0 }, { x: 50, y: 100 });
    expect(p).toEqual([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 50, y: 100 }]);
    expect(is45or90(p)).toBe(true);
  });
  it('同轴直连', () => {
    expect(route45({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    expect(route45({ x: 0, y: 0 }, { x: 0, y: 100 })).toEqual([{ x: 0, y: 0 }, { x: 0, y: 100 }]);
  });
});

describe('route45Avoid（A1 避让/分道）', () => {
  it('没有上下文时逐点等于 route45（旧行为零变化）', () => {
    const a = { x: 16, y: 32 }, b = { x: 208, y: 96 };
    expect(route45Avoid(a, b)).toEqual(route45(a, b));
    expect(route45Avoid(a, b, { existing: [], boxes: [] })).toEqual(route45(a, b));
  });

  it('与既有导线完全共线时自动分道：端点不变、仍 45°/90°、不再叠线/贴线', () => {
    const a = { x: 0, y: 0 }, b = { x: 200, y: 0 };
    const existing = [[{ x: 0, y: 0 }, { x: 200, y: 0 }]];
    const out = route45Avoid(a, b, { existing });
    expect(out[0]).toEqual(a);
    expect(out[out.length - 1]).toEqual(b);
    expect(is45or90(out)).toBe(true);
    expect(ptsKey(out)).not.toBe(ptsKey(existing[0]));
    expect(coverageBy(out, existing[0])).toBeLessThan(0.15);
    expect(adjacencyRun(out, existing[0])).toBeLessThan(90);
  });

  it('不与任何东西冲突时保持原路径（不为了避让而绕路）', () => {
    const a = { x: 0, y: 0 }, b = { x: 200, y: 0 };
    const existing = [[{ x: 0, y: 400 }, { x: 200, y: 400 }]];
    expect(ptsKey(route45Avoid(a, b, { existing }))).toBe(ptsKey(route45(a, b)));
  });

  it('候选不得越出画布可用区：越界候选被丢弃，结果仍在 bounds 内', () => {
    const a = { x: 0, y: 0 }, b = { x: 200, y: 0 };
    const existing = [[{ x: 0, y: 0 }, { x: 200, y: 0 }]];
    const bounds: Rect = { x: 0, y: 0, w: 200, h: 12 };
    const out = route45Avoid(a, b, { existing, bounds });
    expect(insideBounds(out, bounds)).toBe(true);
    expect(is45or90(out)).toBe(true);
  });

  it('纯函数、无副作用：不修改入参 existing/boxes', () => {
    const a = { x: 0, y: 0 }, b = { x: 200, y: 0 };
    const existing = [[{ x: 0, y: 0 }, { x: 200, y: 0 }]];
    const boxes: Rect[] = [{ x: 60, y: -20, w: 40, h: 40 }];
    const beforeExisting = JSON.stringify(existing);
    const beforeBoxes = JSON.stringify(boxes);
    route45Avoid(a, b, { existing, boxes });
    expect(JSON.stringify(existing)).toBe(beforeExisting);
    expect(JSON.stringify(boxes)).toBe(beforeBoxes);
  });

  it('障碍预筛只剔除走廊外包围盒（走廊内保留）', () => {
    const boxes: Rect[] = [
      { x: 40, y: -10, w: 20, h: 20 },   // 压线走廊内
      { x: 900, y: 900, w: 20, h: 20 },  // 远处
    ];
    const kept = filterRelevantBoxes({ x: 0, y: 0 }, { x: 200, y: 0 }, boxes);
    expect(kept.length).toBe(1);
    expect(kept[0].x).toBe(40);
  });
});

describe('buildWireSegments：四层链段与过孔换层（既有 API 回归）', () => {
  it('hole 过孔后逐段换层 top→in1→in2', () => {
    const segs: WireSegment[] = buildWireSegments(
      { x: 0, y: 0 },
      [{ x: 32, y: 0, hole: true }, { x: 64, y: 0, hole: true }],
      { x: 96, y: 0 },
      'top',
    );
    expect(segs.map(s => s.layer)).toEqual(['top', 'in1', 'in2']);
    expect(segs[0].pts[0]).toEqual({ x: 0, y: 0 });
    expect(segs[segs.length - 1].pts[segs[segs.length - 1].pts.length - 1]).toEqual({ x: 96, y: 0 });
  });
});

describe('wireRoutes：电路级串行布线 + 缓存语义', () => {
  const comps: ComponentSpec[] = [
    { id: 'BT1', type: 'battery', x: 64, y: 176 },
    { id: 'R1', type: 'resistor', x: 240, y: 176 },
    { id: 'GND1', type: 'gnd', x: 400, y: 272 },
  ];
  const circuit: CircuitSpec = {
    components: comps,
    wires: [
      { id: 'w1', from: { comp: 'R1', port: 'b' }, to: { comp: 'GND1', port: 'gnd' } },
      { id: 'w2', from: { comp: 'BT1', port: 'neg' }, to: { comp: 'GND1', port: 'gnd' } },
    ],
  };
  it('缓存命中与冷启动结果完全一致，且不改变已有线路径', () => {
    clearWireRouteCache();
    const cold = buildCircuitWireSegments(circuit);
    const warm = buildCircuitWireSegments(circuit);
    for (const id of ['w1', 'w2']) {
      expect(warm.get(id)).toEqual(cold.get(id));
    }
    // 末尾追加一条新线：已有两条线的路径必须一字不变
    const extended = buildCircuitWireSegments({
      ...circuit,
      wires: [...circuit.wires, { id: 'w3', from: { comp: 'BT1', port: 'pos' }, to: { comp: 'R1', port: 'a' } }],
    });
    for (const id of ['w1', 'w2']) {
      expect(extended.get(id)).toEqual(cold.get(id));
    }
    expect((extended.get('w3') ?? []).length).toBeGreaterThan(0);
  });
});

describe('B5 元件放置防呆', () => {
  const R: ComponentSpec = { id: 'R1', type: 'resistor', x: 240, y: 240 };
  const circuit: CircuitSpec = { components: [R], wires: [] };
  const newComp: ComponentSpec = { id: 'NEW-R', type: 'resistor', x: 0, y: 0 };

  it('目标位置被占用时自动换到不重叠的最近空位', () => {
    expect(componentPlaceBlocked(circuit, newComp, { x: 240, y: 240 })).toBe(true);
    const spot = findFreeComponentSpot(circuit, newComp, { x: 240, y: 240 }, 40);
    expect([spot.x, spot.y]).not.toEqual([240, 240]);
    expect(componentPlaceBlocked(circuit, newComp, spot)).toBe(false);
  });

  it('空位直接使用；拖出画布时钳回可用区', () => {
    const free = findFreeComponentSpot(circuit, newComp, { x: 640, y: 640 }, 40);
    expect(free).toEqual({ x: 640, y: 640 });
    const clamped = clampComponentToWorkspace(newComp, { x: -99999, y: -99999 }, 40);
    expect(clamped.x).toBeGreaterThan(WORKSPACE.x - 1);
    expect(clamped.y).toBeGreaterThan(WORKSPACE.y - 1);
    expect(componentPlaceBlocked(circuit, newComp, clamped)).toBe(false);
  });
});

describe('wireAudit 口径（A4 断言用的就是这套函数）', () => {
  it('完全重合：覆盖率 1、伴随 ≥90、同网重合段 > 0', () => {
    const a = { id: 'a', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const b = { id: 'b', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    expect(coverageBy(a.pts, b.pts)).toBeCloseTo(1, 5);
    expect(adjacencyRun(a.pts, b.pts)).toBeGreaterThanOrEqual(90);
    expect(coincidentSegmentLength(a.pts, b.pts)).toBeCloseTo(100, 5);
    const r = auditWires([a, b], { sameNetPairs: () => true });
    expect(r.overlaps).toHaveLength(1);
    expect(r.adjacencies).toHaveLength(1);
    expect(r.coincidences).toHaveLength(1);
  });
  it('相距 40px 的平行线：覆盖率 0、伴随 0、不报重合', () => {
    const a = { id: 'a', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const b = { id: 'b', pts: [{ x: 0, y: 40 }, { x: 100, y: 40 }] };
    const r = auditWires([a, b], { sameNetPairs: () => true });
    expect(r.overlaps).toEqual([]);
    expect(r.adjacencies).toEqual([]);
    expect(r.coincidences).toEqual([]);
  });
  it('间距 30px 的反向共线段不算重合（方向相反但不同位置）', () => {
    const a = { id: 'a', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const b = { id: 'b', pts: [{ x: 100, y: 30 }, { x: 0, y: 30 }] };
    expect(coincidentSegmentLength(a.pts, b.pts)).toBe(0);
  });
});

describe('WireRouteContext 类型自检', () => {
  it('laneStep 会改变分道间距（语义可用）', () => {
    const a = { x: 0, y: 0 }, b = { x: 200, y: 0 };
    const ctx: WireRouteContext = { existing: [[{ x: 0, y: 0 }, { x: 200, y: 0 }]], laneStep: 8 };
    const out = route45Avoid(a, b, ctx);
    expect(is45or90(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});
