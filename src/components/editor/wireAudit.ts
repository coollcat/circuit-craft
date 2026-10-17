// 编辑器 — 走线质量审计（可复用纯函数）
// wires-diag.test.ts 用它对全部关卡参考解法做断言；将来也可以在编辑器里做「布线体检」。
// 口径：
//  · coverageBy：折线 A 有多少弧长落在折线 B 上（<0.5px），用于抓「大段重叠」；
//  · adjacencyRun：A 与 B 距离 <NEAR(10px) 的最长连续伴随弧长，用于抓「贴线平行走」；
//  · coincidentSegments：同网络内两条线是否存在「完全重合」的段（共线且投影重叠 ≥MIN_COINCIDENT_RUN）。
import { distToPolyline, polylineLength, type Pt } from './routing';

/** 视觉上「叠住」的距离阈值（px） */
export const OVERLAP_DIST = 0.5;
/** 视觉上「贴着走」的距离阈值（px） */
export const NEAR_DIST = 10;
/** 贴线判死的最大连续伴随弧长（px）：= 验收标准 A4(b) */
export const MAX_ADJACENCY_RUN = 90;
/**
 * 同网「完全重合段」的最小判定长度（px）。
 * 两根线汇入同一个焊盘（例如都接到 GND1:gnd）时，末端必然有一小段收敛到同一点；
 * 这类 <8px 的短桩在画布上被焊盘盖住、视觉不可分辨，也不构成「白铺铜」。
 * ≥8px 的共线重叠才是真重合（重复布线 / 平行贴死），一律判死。
 */
export const MIN_COINCIDENT_RUN = 8;

const STEP = 2;

export interface WireLike {
  id: string;
  label?: string;
  pts: Pt[];
}

export interface PairIssue {
  a: string;
  b: string;
  value: number;
  detail: string;
}

export interface WireAuditReport {
  /** 互相覆盖超过 15%（大段/完全重叠）的线对，value = 较大的一侧覆盖率 */
  overlaps: PairIssue[];
  /** 近距伴随 ≥ MAX_ADJACENCY_RUN 的线对，value = 最长伴随弧长 */
  adjacencies: PairIssue[];
  /** 同网络内存在完全重合段的线对，value = 最长重合弧长 */
  coincidences: PairIssue[];
  /** 任意一对线的最大覆盖率（便于整体观察） */
  maxCoverage: number;
  /** 任意一对线的最大伴随弧长 */
  maxAdjacency: number;
}

/** 沿折线等弧长采样（只返回采样点，适合外部自己用） */
export function samplePolyline(pts: readonly Pt[], step: number = STEP): Pt[] {
  const out: Pt[] = [];
  const total = polylineLength(pts);
  if (pts.length === 0) return out;
  if (total < 1e-9) return [{ ...pts[0] }];
  for (let d = 0; d <= total; d += step) {
    let remain = d;
    let p: Pt = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const segL = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (remain <= segL) {
        const f = segL === 0 ? 0 : remain / segL;
        p = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
        break;
      }
      remain -= segL;
    }
    out.push(p);
  }
  return out;
}

/** 折线 A 被折线 B 覆盖的比例（沿 A 采样，与 B 的距离 < OVERLAP_DIST 即计入） */
export function coverageBy(a: readonly Pt[], b: readonly Pt[]): number {
  const total = polylineLength(a);
  if (total < 0.01) return 1;
  let covered = 0;
  for (const p of samplePolyline(a, STEP)) {
    if (distToPolyline(p, b as Pt[]) < OVERLAP_DIST) covered += STEP;
  }
  return Math.min(1, covered / total);
}

/** A 与 B 距离 < NEAR_DIST 的最长连续伴随弧长（px） */
export function adjacencyRun(a: readonly Pt[], b: readonly Pt[]): number {
  let best = 0;
  let run = 0;
  for (const p of samplePolyline(a, STEP)) {
    if (distToPolyline(p, b as Pt[]) < NEAR_DIST) {
      run += STEP;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * 同网络内「完全重合段」检测：返回两条折线共线且投影重叠的总弧长（px）。
 * 用于 A4(c)：同一网络内部不允许有段完全重合（等于白铺铜、还会让电流粒子重影）。
 */
export function coincidentSegmentLength(a: readonly Pt[], b: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < a.length; i++) {
    const p = a[i - 1], q = a[i];
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len, uy = dy / len;
    for (let j = 1; j < b.length; j++) {
      const r = b[j - 1], s = b[j];
      const ex = s.x - r.x, ey = s.y - r.y;
      const elen = Math.hypot(ex, ey);
      if (elen < 1e-6) continue;
      // 方向必须平行（含反向）
      const cross = Math.abs(ux * (ey / elen) - uy * (ex / elen));
      if (cross > 1e-3) continue;
      // 两端点到对方直线的距离都必须 ≈0（共线）
      const d1 = Math.abs((r.x - p.x) * uy - (r.y - p.y) * ux);
      const d2 = Math.abs((s.x - p.x) * uy - (s.y - p.y) * ux);
      if (d1 > 0.5 || d2 > 0.5) continue;
      // 投影到 A 方向求重叠区间
      const projR = (r.x - p.x) * ux + (r.y - p.y) * uy;
      const projS = (s.x - p.x) * ux + (s.y - p.y) * uy;
      const lo = Math.max(0, Math.min(projR, projS));
      const hi = Math.min(len, Math.max(projR, projS));
      if (hi - lo > 1) total += hi - lo;
    }
  }
  return total;
}

export interface AuditOptions {
  /** 覆盖率上限（默认 0.15，= A4(a)） */
  maxCoverage?: number;
  /** 伴随弧长上限（默认 90px，= A4(b)） */
  maxAdjacency?: number;
  /** 同网络线对 id（同网络线对额外查完全重合段；缺省时不做 c 项） */
  sameNetPairs?: (a: WireLike, b: WireLike) => boolean;
}

/** 对一组导线做完整审计（两两比较，O(n²) 只限导线数量级） */
export function auditWires(wires: readonly WireLike[], opts?: AuditOptions): WireAuditReport {
  const maxCoverage = opts?.maxCoverage ?? 0.15;
  const maxAdjacency = opts?.maxAdjacency ?? MAX_ADJACENCY_RUN;
  const overlaps: PairIssue[] = [];
  const adjacencies: PairIssue[] = [];
  const coincidences: PairIssue[] = [];
  let peakCoverage = 0;
  let peakAdjacency = 0;
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const A = wires[i], B = wires[j];
      if (A.pts.length < 2 || B.pts.length < 2) continue;
      const cab = coverageBy(A.pts, B.pts);
      const cba = coverageBy(B.pts, A.pts);
      const cov = Math.max(cab, cba);
      if (cov > peakCoverage) peakCoverage = cov;
      if (cov > maxCoverage) {
        overlaps.push({
          a: A.id, b: B.id, value: cov,
          detail: `${labelOf(A)} ↔ ${labelOf(B)} 覆盖率 ${cab.toFixed(2)}/${cba.toFixed(2)} > ${maxCoverage}`,
        });
      }
      const adj = Math.max(adjacencyRun(A.pts, B.pts), adjacencyRun(B.pts, A.pts));
      if (adj > peakAdjacency) peakAdjacency = adj;
      if (adj >= maxAdjacency) {
        adjacencies.push({
          a: A.id, b: B.id, value: adj,
          detail: `${labelOf(A)} ↔ ${labelOf(B)} 近距伴随 ${adj.toFixed(0)}px（<${NEAR_DIST}px 间距）≥ ${maxAdjacency}`,
        });
      }
      if (opts?.sameNetPairs?.(A, B)) {
        const co = coincidentSegmentLength(A.pts, B.pts);
        if (co >= MIN_COINCIDENT_RUN) {
          coincidences.push({
            a: A.id, b: B.id, value: co,
            detail: `${labelOf(A)} ↔ ${labelOf(B)} 同网络完全重合 ${co.toFixed(0)}px（≥${MIN_COINCIDENT_RUN}px 判死）`,
          });
        }
      }
    }
  }
  return { overlaps, adjacencies, coincidences, maxCoverage: peakCoverage, maxAdjacency: peakAdjacency };
}

function labelOf(w: WireLike): string {
  return w.label ? `${w.id}(${w.label})` : w.id;
}
