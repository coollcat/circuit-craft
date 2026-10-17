// 编辑器 — 电路级走线：按画布上的导线顺序「串行布线」，后画的线避让先画的线。
// 渲染、命中测试、电流粒子、橡皮筋预览全部走这里（同一组折线），保证「看得见的点得中、画什么样落什么样」。
// 纯函数：给定相同 CircuitSpec 一定得到相同路径；不修改入参。
import type { CircuitSpec, ComponentSpec } from '@/engine/types';
import { PORT_GEOM, rotatePt, portWorldPos } from './symbols';
import {
  buildWireSegments, filterRelevantBoxes, flattenSegments,
  type Pt, type Rect, type WireRouteContext, type WireSegment,
} from './routing';

/** 画布可用区（世界坐标）：元件中心 / 导线都留在这里面，防呆「不许拖出画布/绕出画布」 */
export const WORKSPACE: Rect = { x: -192, y: -160, w: 1728, h: 1216 };

/** 元件本体包围盒的最小半宽/半高（小元件也要有实体感，别让线从符号正中穿过） */
const BODY_MIN = 10;
/** 端口包围盒向内收一圈 ≈ 引脚引线长度，避免把焊盘引线当成障碍 */
const BODY_INSET = 10;
/** 放置防呆：两个元件本体之间至少留的间距 */
export const PLACE_GAP = 10;

/** 元件符号本体包围盒（按旋转后的端口范围收缩；作为走线障碍 + 放置防呆的占位检测） */
export function componentBodyRect(comp: ComponentSpec): Rect {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  for (const g of PORT_GEOM[comp.type] ?? []) {
    const r = rotatePt(g.x, g.y, comp.rotation ?? 0);
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y);
  }
  const left = Math.min(-BODY_MIN, minX + BODY_INSET);
  const right = Math.max(BODY_MIN, maxX - BODY_INSET);
  const top = Math.min(-BODY_MIN, minY + BODY_INSET);
  const bottom = Math.max(BODY_MIN, maxY - BODY_INSET);
  return { x: comp.x + left, y: comp.y + top, w: right - left, h: bottom - top };
}

/** 本体包围盒按世界坐标平移 */
function bodyRectAt(comp: ComponentSpec, pos: Pt): Rect {
  const r = componentBodyRect(comp);
  return { x: r.x - comp.x + pos.x, y: r.y - comp.y + pos.y, w: r.w, h: r.h };
}

function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** 把元件中心钳位在画布可用区内：本体包围盒与点击半径一起考虑，符号/位号不会露到画布外 */
export function clampComponentToWorkspace(comp: ComponentSpec, pos: Pt, radius: number): Pt {
  const r = componentBodyRect({ ...comp, x: 0, y: 0 }); // 相对中心的本体包围盒
  const left = Math.min(r.x, -radius);
  const right = Math.max(r.x + r.w, radius);
  const top = Math.min(r.y, -radius);
  const bottom = Math.max(r.y + r.h, radius);
  return {
    x: clamp(pos.x, WORKSPACE.x - left, WORKSPACE.x + WORKSPACE.w - right),
    y: clamp(pos.y, WORKSPACE.y - top, WORKSPACE.y + WORKSPACE.h - bottom),
  };
}

/** 该位置是否与画布上其它元件本体重叠（放置防呆用） */
export function componentPlaceBlocked(circuit: CircuitSpec, comp: ComponentSpec, pos: Pt, ignoreId?: string): boolean {
  const want = bodyRectAt(comp, pos);
  for (const other of circuit.components) {
    if (other.id === ignoreId || other.id === comp.id) continue;
    if (rectsOverlap(want, componentBodyRect(other), PLACE_GAP)) return true;
  }
  return false;
}

/**
 * 元件放置防呆：目标位置被占用时，按 16px 网格一圈圈找最近的空位；
 * 找不到空位就退回（钳位后的）目标位置。纯函数，不修改入参。
 */
export function findFreeComponentSpot(circuit: CircuitSpec, comp: ComponentSpec, want: Pt, radius: number): Pt {
  const start = clampComponentToWorkspace(comp, want, radius);
  if (!componentPlaceBlocked(circuit, comp, start)) return start;
  const GRID = 16;
  const inside = (p: Pt) =>
    p.x - radius >= WORKSPACE.x && p.x + radius <= WORKSPACE.x + WORKSPACE.w &&
    p.y - radius >= WORKSPACE.y && p.y + radius <= WORKSPACE.y + WORKSPACE.h;
  for (let ring = 1; ring <= 24; ring++) {
    const offsets: Pt[] = [];
    for (let i = -ring; i <= ring; i++) {
      offsets.push({ x: i * GRID, y: -ring * GRID });
      offsets.push({ x: i * GRID, y: ring * GRID });
    }
    for (let j = -ring + 1; j <= ring - 1; j++) {
      offsets.push({ x: -ring * GRID, y: j * GRID });
      offsets.push({ x: ring * GRID, y: j * GRID });
    }
    // 近的先试（同环内按距离排序，结果稳定）
    offsets.sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y));
    for (const off of offsets) {
      const p = { x: start.x + off.x, y: start.y + off.y };
      if (!inside(p)) continue;
      if (!componentPlaceBlocked(circuit, comp, p)) return p;
    }
  }
  return start;
}

export interface CircuitRouteOptions {
  /** 画布可用区；缺省 WORKSPACE（测试与编辑器必须一致，否则「测的线」和「画的线」会对不上） */
  bounds?: Rect;
  /** 分道步长（px，默认 8） */
  laneStep?: number;
}

/**
 * 布线结果缓存（纯函数的结果缓存，键包含全部输入：端点/via/层/障碍集合/前缀路径）。
 * 目的：拖动元件时不必重算整张画布 —— 只有端点或障碍真正变化的线才会 miss。
 * 缓存值是只读的，调用方不要原地修改返回的 pts。
 */
const ROUTE_CACHE_MAX = 4000;
const routeCache = new Map<string, WireSegment[]>();

/** 清空布线缓存（测试用；正常运行时无需手动调用） */
export function clearWireRouteCache(): void {
  routeCache.clear();
}

/**
 * 电路级串行布线：按数组顺序逐条布线，后面的线把前面的线当既有障碍。
 * 追加一条新线时，已有线的路径完全不变（它们的上下文没变），只有新线自己避让 ——
 * 这是「预览路径 = 落线路径」得以成立的前提。
 */
export function buildCircuitWireSegments(circuit: CircuitSpec, opts?: CircuitRouteOptions): Map<string, WireSegment[]> {
  const byId = new Map(circuit.components.map(c => [c.id, c]));
  const bounds = opts?.bounds ?? WORKSPACE;
  const result = new Map<string, WireSegment[]>();
  const existing: Pt[][] = [];
  // 前缀签名：前 i 条线的完整路径。它 + 端点 + via + 层 + 障碍集合 唯一决定第 i 条的路径，
  // 因此可以安全缓存 —— 拖动某个元件时，只有真正受影响的线会重算。
  let prefixSig = '';
  for (const wire of circuit.wires) {
    const a = byId.get(wire.from.comp);
    const b = byId.get(wire.to.comp);
    if (!a || !b) {
      result.set(wire.id, []);
      continue;
    }
    const pa = portWorldPos(a, wire.from.port);
    const pb = portWorldPos(b, wire.to.port);
    // 起/终点所在元件不能当成障碍（否则导线走不出自己的焊盘）
    const boxes: Rect[] = [];
    for (const c of circuit.components) {
      if (c.id === a.id || c.id === b.id) continue;
      boxes.push(componentBodyRect(c));
    }
    const baseCtx: WireRouteContext = { existing, boxes, bounds, laneStep: opts?.laneStep };
    const relevant = filterRelevantBoxes(pa, pb, boxes, baseCtx);
    const boxesKey = relevant.map(r => `${r.x}|${r.y}|${r.w}|${r.h}`).join(';');
    const viaKey = (wire.via ?? []).map(p => `${p.x},${p.y},${p.hole ? 1 : 0}`).join(';');
    const cacheKey = `${wire.from.comp}:${wire.from.port}>${wire.to.comp}:${wire.to.port}`
      + `|${pa.x},${pa.y}>${pb.x},${pb.y}` // 端点世界坐标必须进键：不同关卡可能用同一位号但坐标不同
      + `|${viaKey}|${wire.layer ?? 'top'}`
      + `|${bounds.x},${bounds.y},${bounds.w},${bounds.h}|${opts?.laneStep ?? ''}|${boxesKey}|${prefixSig}`;

    const cached = routeCache.get(cacheKey);
    const segs = cached ?? buildWireSegments(pa, wire.via ?? [], pb, wire.layer ?? 'top', baseCtx);
    if (!cached) {
      if (routeCache.size >= ROUTE_CACHE_MAX) routeCache.clear();
      routeCache.set(cacheKey, segs);
    }
    result.set(wire.id, segs);
    const flat = flattenSegments(segs);
    existing.push(flat);
    prefixSig += `#${flat.map(p => `${p.x},${p.y}`).join(' ')}`;
  }
  return result;
}

/** 电路级走线（扁平折线版）：渲染、命中、粒子、测试共用 */
export function buildCircuitWireRoutes(circuit: CircuitSpec, opts?: CircuitRouteOptions): Map<string, Pt[]> {
  const segsMap = buildCircuitWireSegments(circuit, opts);
  const routes = new Map<string, Pt[]>();
  for (const [id, segs] of segsMap) routes.set(id, flattenSegments(segs));
  return routes;
}

/**
 * 给「正在画但还没落地」的新导线构造与落线完全一致的上下文：
 * existing = 当前电路全部已布线（= 新线追加后它前面的那些线），
 * boxes = 除起/终点元件外的所有元件本体。
 * 预览调用方必须用这个上下文 + buildWireSegments，落线路径才能与预览逐点一致（A2/A3）。
 */
export function buildWireRouteContext(
  circuit: CircuitSpec,
  segsMap: Map<string, WireSegment[]>,
  excludeIds: readonly string[] = [],
  opts?: CircuitRouteOptions,
): WireRouteContext {
  const exclude = new Set(excludeIds);
  const existing: Pt[][] = [];
  for (const wire of circuit.wires) {
    const pts = flattenSegments(segsMap.get(wire.id) ?? []);
    if (pts.length >= 2) existing.push(pts);
  }
  return {
    existing,
    boxes: circuit.components.filter(c => !exclude.has(c.id)).map(componentBodyRect),
    bounds: opts?.bounds ?? WORKSPACE,
    laneStep: opts?.laneStep,
  };
}
