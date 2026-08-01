// 编辑器 — 45°/90° 折线自动布线
import type { ViaPoint, WireLayer } from '@/engine/types';

export interface Pt { x: number; y: number }

/**
 * 经典 H-D-H / V-D-V 45° 布线：
 * 先直（水平或垂直）再 45° 斜线再直，路径至多 3 点（含端点 2~3 段）。
 */
export function route45(a: Pt, b: Pt): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) return [a, b];
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx >= ady) {
    // 水平 — 斜 — 水平
    const midX = a.x + Math.sign(dx) * (adx - ady);
    return [a, { x: midX, y: a.y }, b];
  }
  // 垂直 — 斜 — 垂直
  const midY = a.y + Math.sign(dy) * (ady - adx);
  return [a, { x: a.x, y: midY }, b];
}

export const flipLayer = (l: WireLayer): WireLayer => (l === 'top' ? 'bottom' : 'top');

export interface WireSegment { pts: Pt[]; layer: WireLayer }

/**
 * 按链段拆分导线路径并标注每段所在层：
 * 链 = 端口A → via… → 端口B，相邻链点用 route45 桥接；
 * 段 i 的层 = 起始层被前面 hole 过孔数奇偶翻转。
 * 画线预览与落线渲染必须共用本函数（或其展开形式 buildWirePolyline），保证逐段一致。
 */
export function buildWireSegments(a: Pt, via: ViaPoint[], b: Pt, startLayer: WireLayer = 'top'): WireSegment[] {
  const chain: Pt[] = [a, ...via, b];
  const segs: WireSegment[] = [];
  let layer = startLayer;
  for (let i = 0; i < chain.length - 1; i++) {
    segs.push({ pts: route45(chain[i], chain[i + 1]), layer });
    if (via[i]?.hole) layer = flipLayer(layer); // chain[i+1] 是过孔：后续段换层
  }
  return segs;
}

/** 预览与落线共用的完整折线（buildWireSegments 的扁平化，层信息丢弃） */
export function buildWirePolyline(a: Pt, via: ViaPoint[], b: Pt): Pt[] {
  const pts: Pt[] = [];
  const segs = buildWireSegments(a, via, b);
  for (let i = 0; i < segs.length; i++) pts.push(...(i === 0 ? segs[i].pts : segs[i].pts.slice(1)));
  return pts;
}

export function ptsToPath(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

/** 点到折线最短距离（命中测试） */
export function distToPolyline(p: Pt, points: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
    const dx = p.x - (a.x + t * vx), dy = p.y - (a.y + t * vy);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}
