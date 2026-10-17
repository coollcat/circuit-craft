// 编辑器 — 45°/90° 折线自动布线
// 两层 API：
//  · route45 / buildWireSegments：纯几何基础布线（保持既有行为，旧调用方零改动）；
//  · route45Avoid / buildWireSegments(ctx)：避让/分道层 —— 新路径与已有导线共线/近平行时按 lane 步长错开，
//    与元件本体包围盒相交时优先绕行；端点不变、45°/90° 风格不变、纯函数无副作用。
import type { ViaPoint, WireLayer } from '@/engine/types';

export interface Pt { x: number; y: number }

/** 轴对齐矩形（世界坐标） */
export interface Rect { x: number; y: number; w: number; h: number }

/**
 * 避让布线上下文（全部可选；缺省即退化为纯 route45，保证旧行为）：
 *  · existing：已布好的折线集合（按布线顺序传入；后画的线避让先画的线）；
 *  · boxes：元件本体包围盒（起/终点所在元件应由调用方排除）；
 *  · laneStep：分道步长（px，默认 8，取 8 的整数倍）；
 *  · maxLanes：最多尝试几档分道（默认 5 → ±40px）；
 *  · clearance：近距/贴线判定阈值（px，默认 10）；
 *  · bounds：画布可用区，候选路径一律不得越出（越界候选直接丢弃）。
 */
export interface WireRouteContext {
  existing?: readonly (readonly Pt[])[];
  boxes?: readonly Rect[];
  laneStep?: number;
  maxLanes?: number;
  clearance?: number;
  bounds?: Rect;
}

/** 近距（贴线）判定阈值：与已存在段距离小于此值即视为视觉上「贴着走」 */
const NEAR_CLEARANCE = 10;
/** 分道步长：8px 整数倍 */
const LANE_STEP = 8;
/** 分道档数上限（±maxLanes × laneStep） */
const MAX_LANES = 5;
const EPS = 1e-6;

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

/* ---------------------------------- 几何小工具 ---------------------------------- */

const samePt = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const finitePt = (p: Pt) => Number.isFinite(p.x) && Number.isFinite(p.y);

/** 去掉相邻重复点（route45 在纯 45° 时会返回 [a, a, b]；保持渲染兼容但内部需要干净路径） */
function cleanPath(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    if (!finitePt(p)) continue;
    const last = out[out.length - 1];
    if (!last || !samePt(last, p)) out.push({ x: p.x, y: p.y });
  }
  return out;
}

/** 折线总长 */
export function polylineLength(pts: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return total;
}

function pathKey(pts: readonly Pt[]): string {
  return pts.map(p => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`).join('|');
}

/** 每段必须是水平 / 垂直 / 45°（±1 斜率），且端点保持 a、b 不变 */
function is45or90Path(pts: readonly Pt[]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    if (dx < EPS && dy < EPS) return false;
    if (dx > EPS && dy > EPS && Math.abs(dx - dy) > 1e-4) return false;
  }
  return true;
}

function bboxOfPts(pts: readonly Pt[]): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function expandRect(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** 线段与矩形的交叠长度（Liang–Barsky 裁剪，精确值；无交叠返回 0） */
function clipSegRectLen(p: Pt, q: Pt, r: Rect): number {
  const dx = q.x - p.x, dy = q.y - p.y;
  let t0 = 0, t1 = 1;
  const edges: [number, number][] = [
    [-dx, p.x - r.x],
    [dx, r.x + r.w - p.x],
    [-dy, p.y - r.y],
    [dy, r.y + r.h - p.y],
  ];
  for (const [pp, qq] of edges) {
    if (Math.abs(pp) < 1e-12) {
      if (qq < -1e-9) return 0;
      continue;
    }
    const t = qq / pp;
    if (pp < 0) {
      if (t > t1) return 0;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return 0;
      if (t < t1) t1 = t;
    }
  }
  return Math.max(0, t1 - t0) * Math.hypot(dx, dy);
}

/** 折线完全落在矩形外的长度（bounds 用） */
function outsideLen(pts: readonly Pt[], r: Rect): number {
  let out = 0;
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    out += Math.max(0, segLen - clipSegRectLen(pts[i - 1], pts[i], r));
  }
  return out;
}

/* ---------------------------------- 路径指标评估 ---------------------------------- */

interface PathMetrics {
  /** 与已有导线「重合」的弧长（距离 <0.5px，视觉上完全叠住） */
  overlap: number;
  /** 与已有导线「近距」的弧长（距离 < clearance） */
  near: number;
  /** 最长的近距连续伴随弧长（贴线走；wires-diag 断言 <90px） */
  adjRun: number;
  /** 与某一条已有导线的最大互相覆盖率（≥0.15 直接判不合格，与 A4(a) 同口径） */
  worstCoverage: number;
  /** 与元件本体包围盒相交的弧长 */
  box: number;
  /** 越出画布可用区的长度 */
  outside: number;
  length: number;
}

interface ExistingMeta { pts: readonly Pt[]; bbox: Rect }

const OVERLAP_DIST = 0.5;
/** 精细评估采样步长（px）：与审计口径一致，保证选出来的线真的达标 */
const FINE_STEP = 2;
/** 粗筛采样步长（px）：候选多时先用它排名，只对前几名做精细评估 */
const COARSE_STEP = 8;
/** 粗筛后进入精细评估的候选数 */
const FINE_CANDIDATES = 4;

/** 沿线段等距采样并回调（含首尾点） */
function eachSample(a: Pt, b: Pt, step: number, fn: (p: Pt, inc: number) => void) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(len / step));
  const inc = len / steps;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    fn({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, inc);
  }
}

function metricsOf(
  path: readonly Pt[],
  existing: readonly ExistingMeta[],
  boxes: readonly Rect[],
  bounds: Rect | undefined,
  clearance: number,
  step: number,
): PathMetrics {
  const length = polylineLength(path);
  const outside = bounds ? outsideLen(path, bounds) : 0;
  const bbox = expandRect(bboxOfPts(path), clearance);
  let box = 0;
  for (const r of boxes) {
    if (!rectsOverlap(bbox, r)) continue;
    for (let i = 1; i < path.length; i++) box += clipSegRectLen(path[i - 1], path[i], r);
  }
  let overlap = 0, near = 0, adjRun = 0, worstCoverage = 0;
  for (const e of existing) {
    if (!rectsOverlap(bbox, e.bbox)) continue;
    // 正向：沿候选路径采样，量它有多少贴着已有导线
    let run = 0;
    let overlapHere = 0;
    for (let i = 1; i < path.length; i++) {
      eachSample(path[i - 1], path[i], step, (p, inc) => {
        const d = distToPolyline(p, e.pts as Pt[]);
        if (d < OVERLAP_DIST) { overlap += inc; near += inc; run += inc; overlapHere += inc; }
        else if (d < clearance) { near += inc; run += inc; }
        else run = 0;
        if (run > adjRun) adjRun = run;
      });
    }
    // 反向：沿已有导线采样，量它有多少贴着候选路径（对称的贴线也计入伴随，也更贴近审计口径）
    let run2 = 0;
    let overlapBack = 0;
    for (let i = 1; i < e.pts.length; i++) {
      eachSample(e.pts[i - 1], e.pts[i], step, (p, inc) => {
        const d = distToPolyline(p, path as Pt[]);
        if (d < clearance) { run2 += inc; if (run2 > adjRun) adjRun = run2; }
        else run2 = 0;
        if (d < OVERLAP_DIST) overlapBack += inc;
      });
    }
    // 互相覆盖率（与 wires-diag 的 coverageBy 同口径）：取两侧比例的较大者
    const eLen = polylineLength(e.pts);
    const covA = length > 0.01 ? overlapHere / length : 1;
    const covB = eLen > 0.01 ? overlapBack / eLen : 1;
    worstCoverage = Math.max(worstCoverage, covA, covB);
  }
  return { overlap, near, adjRun, worstCoverage, box, outside, length };
}

/** 是否值得尝试避让（基准路径已经出现真问题才生成候选，避免无谓改线） */
function shouldReroute(m: PathMetrics): boolean {
  return m.worstCoverage > 0.15 || m.overlap > 0.4 || m.box > 6 || m.adjRun >= 72 || m.outside > 0;
}


/** 候选路径评分：先「是否踩验收红线」（覆盖率 ≥0.15 / 伴随 ≥90），再比重叠、压件、近距、绕行长度 */
function scoreMetrics(m: PathMetrics): number {
  const violations = (m.worstCoverage > 0.15 ? 1 : 0) + (m.adjRun >= 90 ? 1 : 0);
  return (
    violations * 5000 +
    m.overlap * 18 +
    Math.max(0, m.adjRun - 60) * 3 +
    m.adjRun * 0.4 +
    m.near * 0.12 +
    m.box * 1.6 +
    m.outside * 60 +
    m.length * 0.02
  );
}

/* ---------------------------------- 避让候选生成 ---------------------------------- */

/**
 * 在「主轴水平」的局部坐标里生成分道候选，再翻回世界坐标（垂直主轴时只交换 x/y）。
 * 形态只有两类，都能保证 45°/90° 且端点不变：
 *  · A（V-H-D）：起点处先垂直让位 laneStep，水平走一段，再 45° 斜线收尾；
 *  · B（D-H-V）：先 45° 斜线，水平让位 laneStep，到终点处垂直收尾。
 * 另有反向 route45（D-H/V-D）与两个 90° L 形兜底形态，用于错开「最后一跳」方向。
 */
function laneCandidates(a: Pt, b: Pt, laneStep: number, maxLanes: number): Pt[][] {
  const out: Pt[][] = [];
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return out;
  // 反向 route45：先斜后直，改变末段方向，专门对付「多根线挤同一焊盘的最后一跳」
  out.push([...route45(b, a)].reverse());
  // 两个 90° L 形兜底
  out.push([a, { x: b.x, y: a.y }, b]);
  out.push([a, { x: a.x, y: b.y }, b]);

  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const al: Pt = horizontal ? a : { x: a.y, y: a.x };
  const bl: Pt = horizontal ? b : { x: b.y, y: b.x };
  const sx = Math.sign(bl.x - al.x) || 1;
  const back = (p: Pt): Pt => (horizontal ? { x: p.x, y: p.y } : { x: p.y, y: p.x });
  for (let lane = 1; lane <= maxLanes; lane++) {
    for (const delta of [lane * laneStep, -lane * laneStep]) {
      // 形态 A（V-H-D）
      const y2 = al.y + delta;
      const jx = bl.x - sx * Math.abs(bl.y - y2);
      if ((jx - al.x) * sx >= -EPS) {
        out.push([a, back({ x: al.x, y: y2 }), back({ x: jx, y: y2 }), b]);
      }
      // 形态 B（D-H-V）
      const y3 = bl.y + delta;
      const jx2 = al.x + sx * Math.abs(y3 - al.y);
      if ((bl.x - jx2) * sx >= -EPS) {
        out.push([a, back({ x: jx2, y: y3 }), back({ x: bl.x, y: y3 }), b]);
      }
    }
  }
  return out;
}

/** 候选合法性：干净化后端点不变、全程 45°/90°、不越出画布可用区 */
function normalizeCandidate(raw: readonly Pt[], a: Pt, b: Pt, bounds: Rect | undefined): Pt[] | null {
  const path = cleanPath(raw);
  if (path.length < 2) return null;
  if (!samePt(path[0], a) || !samePt(path[path.length - 1], b)) return null;
  if (!is45or90Path(path)) return null;
  if (bounds && outsideLen(path, bounds) > 0.01) return null;
  return path;
}

/**
 * 走线障碍预筛：只保留可能影响 [a,b] 走线的元件本体。
 * 候选路径一定落在 bbox(a,b) 外扩 maxLanes×laneStep 的走廊内，走廊外的包围盒对评分
 * 没有任何影响 —— 提前剔除既省时间，也让「预览 / 落线 / 结果缓存」看到同一份障碍集合。
 */
export function filterRelevantBoxes(a: Pt, b: Pt, boxes: readonly Rect[], ctx?: WireRouteContext): Rect[] {
  if (boxes.length === 0) return [];
  const laneStep = ctx?.laneStep ?? LANE_STEP;
  const maxLanes = ctx?.maxLanes ?? MAX_LANES;
  const clearance = ctx?.clearance ?? NEAR_CLEARANCE;
  const corridor = expandRect(bboxOfPts([a, b]), maxLanes * laneStep + clearance + 4);
  return boxes.filter(r => rectsOverlap(corridor, r));
}

/**
 * 避让/分道布线：与 route45 同构返回 Pt[]（起点 a、终点 b 不变，全程 45°/90°）。
 * 纯函数、无副作用；只在基准路径真的出现「叠线 / 长距离贴线 / 压元件」时才生成候选，
 * 因此绝大多数线（含已人工调好的关卡布线）保持原样、不会有视觉抖动。
 * 候选先用 8px 采样粗筛排名、只对前几名做 2px 精细评估，避免密集画布下的卡顿。
 */
export function route45Avoid(a: Pt, b: Pt, ctx?: WireRouteContext): Pt[] {
  const base = cleanPath(route45(a, b));
  const existingRaw = ctx?.existing ?? [];
  const boxes = filterRelevantBoxes(a, b, ctx?.boxes ?? [], ctx);
  if (existingRaw.length === 0 && boxes.length === 0 && !ctx?.bounds) return base;

  const clearance = ctx?.clearance ?? NEAR_CLEARANCE;
  const existing: ExistingMeta[] = [];
  for (const pts of existingRaw) {
    if (pts.length < 2) continue;
    existing.push({ pts, bbox: expandRect(bboxOfPts(pts), clearance) });
  }
  const baseMetrics = metricsOf(base, existing, boxes, ctx?.bounds, clearance, FINE_STEP);
  const baseScore = scoreMetrics(baseMetrics);
  if (!shouldReroute(baseMetrics)) return base;

  // 生成候选（去重 + 合法性校验）
  const cands: Pt[][] = [];
  const seen = new Set<string>([pathKey(base)]);
  const laneStep = ctx?.laneStep ?? LANE_STEP;
  const maxLanes = ctx?.maxLanes ?? MAX_LANES;
  for (const raw of laneCandidates(a, b, laneStep, maxLanes)) {
    const cand = normalizeCandidate(raw, a, b, ctx?.bounds);
    if (!cand) continue;
    const key = pathKey(cand);
    if (seen.has(key)) continue;
    seen.add(key);
    cands.push(cand);
  }
  // 粗筛（8px 采样）→ 精细评估（2px 采样）
  const ranked = cands
    .map(path => ({ path, score: scoreMetrics(metricsOf(path, existing, boxes, ctx?.bounds, clearance, COARSE_STEP)) }))
    .sort((p, q) => p.score - q.score);
  let best = base;
  let bestScore = baseScore;
  for (const { path } of ranked.slice(0, FINE_CANDIDATES)) {
    const score = scoreMetrics(metricsOf(path, existing, boxes, ctx?.bounds, clearance, FINE_STEP));
    if (score < bestScore - 1e-9) {
      best = path;
      bestScore = score;
    }
  }
  return best;
}

/* ---------------------------------- 层序 / 链段 ---------------------------------- */

/** 四层板层序：top → in1 → in2 → bottom（V 键换层 / hole 过孔都沿此序循环） */
export const LAYER_ORDER: readonly WireLayer[] = ['top', 'in1', 'in2', 'bottom'];

/** 循环到下一层：top→in1→in2→bottom→top */
export const nextLayer = (l: WireLayer): WireLayer =>
  LAYER_ORDER[(Math.max(0, LAYER_ORDER.indexOf(l)) + 1) % LAYER_ORDER.length];

export interface WireSegment { pts: Pt[]; layer: WireLayer }

/**
 * 按链段拆分导线路径并标注每段所在层：
 * 链 = 端口A → via… → 端口B，相邻链点用 route45（或 route45Avoid）桥接；
 * 段 i 的层 = 起始层索引 + 前面 hole 过孔数，沿 LAYER_ORDER 递增取模 4。
 * 画线预览与落线渲染必须共用本函数（或其展开形式 buildWirePolyline），保证逐段一致。
 */
export function buildWireSegments(
  a: Pt,
  via: ViaPoint[],
  b: Pt,
  startLayer: WireLayer = 'top',
  ctx?: WireRouteContext,
): WireSegment[] {
  const chain: Pt[] = [a, ...via, b];
  const segs: WireSegment[] = [];
  let layerIdx = Math.max(0, LAYER_ORDER.indexOf(startLayer));
  // 同一条链内也自我避让：前面几段已是既定事实，不要让后续段压上去
  const localExisting: (readonly Pt[])[] = ctx?.existing ? [...ctx.existing] : [];
  for (let i = 0; i < chain.length - 1; i++) {
    const pts = ctx
      ? route45Avoid(chain[i], chain[i + 1], { ...ctx, existing: localExisting })
      : route45(chain[i], chain[i + 1]);
    segs.push({ pts, layer: LAYER_ORDER[layerIdx] });
    if (ctx) localExisting.push(pts);
    if (via[i]?.hole) layerIdx = (layerIdx + 1) % LAYER_ORDER.length; // chain[i+1] 是过孔：后续段循环到下一层
  }
  return segs;
}

/** 把分段折线拼成一条完整折线（相邻段共享端点只保留一次） */
export function flattenSegments(segs: readonly WireSegment[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (const p of segs[i].pts) {
      const last = pts[pts.length - 1];
      if (!last || !samePt(last, p)) pts.push(p);
    }
  }
  return pts;
}

/** 预览与落线共用的完整折线（buildWireSegments 的扁平化，层信息丢弃） */
export function buildWirePolyline(a: Pt, via: ViaPoint[], b: Pt, ctx?: WireRouteContext): Pt[] {
  const segs = buildWireSegments(a, via, b, 'top', ctx);
  return flattenSegments(segs);
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
