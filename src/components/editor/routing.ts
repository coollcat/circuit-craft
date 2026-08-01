// 编辑器 — 45°/90° 折线自动布线
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
