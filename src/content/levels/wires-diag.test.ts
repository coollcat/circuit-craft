// 临时诊断：打印关卡参考解法的导线折线与两两共享占比（WIRE_DIAG_IDS=c2-3,c3-1 npx vitest run 本文件）
import { it } from 'vitest';
import { buildSolutionCircuit } from '@/content/solution';
import { buildWirePolyline, type Pt } from '@/components/editor/routing';
import { portWorldPos } from '@/components/editor/symbols';
import { getLevel } from './index';
import type { LevelDef } from '@/engine/types';

function polyLen(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}
function distToSegs(p: Pt, b: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < b.length; i++) {
    const ax = b[i - 1], bx = b[i];
    const vx = bx.x - ax.x, vy = bx.y - ax.y;
    const l2 = vx * vx + vy * vy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - ax.x) * vx + (p.y - ax.y) * vy) / l2));
    best = Math.min(best, Math.hypot(p.x - (ax.x + t * vx), p.y - (ax.y + t * vy)));
  }
  return best;
}
function coverageBy(a: Pt[], b: Pt[]): number {
  const total = polyLen(a);
  if (total < 0.01) return 1;
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

it('diag', () => {
  const ids = (process.env.WIRE_DIAG_IDS ?? 'c2-3').split(',');
  for (const id of ids) {
    const level: LevelDef | undefined = getLevel(id.trim());
    if (!level) continue;
    const built = buildSolutionCircuit(level);
    const byId = new Map(built.components.map(c => [c.id, c]));
    console.log(`\n=== ${level.id} ${level.title} ===`);
    for (const c of built.components) console.log(`  comp ${c.id}(${c.type}) @ (${c.x},${c.y}) rot=${c.rotation ?? 0}`);
    const wires = built.wires.map(w => {
      const pa = portWorldPos(byId.get(w.from.comp)!, w.from.port);
      const pb = portWorldPos(byId.get(w.to.comp)!, w.to.port);
      return {
        label: `${w.from.comp}:${w.from.port} -> ${w.to.comp}:${w.to.port}`,
        pts: buildWirePolyline({ x: pa.x, y: pa.y }, [], { x: pb.x, y: pb.y }),
      };
    });
    // 近距平行伴随：沿 A 采样，与 B 距离 <10px 的最长连续弧长 —— 视觉上"贴着走/叠着走"
    function adjacencyRun(a: Pt[], b: Pt[]): number {
      let best = 0, run = 0;
      for (let d = 0; d < polyLen(a); d += 2) {
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
        if (distToSegs(p, b) < 10) { run += 2; best = Math.max(best, run); } else run = 0;
      }
      return best;
    }
    for (const w of wires) {
      console.log(`  wire ${w.label}  len=${polyLen(w.pts).toFixed(0)}  [${w.pts.map(p => `(${p.x},${p.y})`).join(' ')}]`);
    }
    for (let i = 0; i < wires.length; i++) {
      for (let j = i + 1; j < wires.length; j++) {
        const cab = coverageBy(wires[i].pts, wires[j].pts);
        const cba = coverageBy(wires[j].pts, wires[i].pts);
        if (cab > 0.15 || cba > 0.15) {
          console.log(`  OVERLAP? [${wires[i].label}] vs [${wires[j].label}]  cov=${cab.toFixed(2)}/${cba.toFixed(2)}`);
        }
        const adj = Math.max(adjacencyRun(wires[i].pts, wires[j].pts), adjacencyRun(wires[j].pts, wires[i].pts));
        if (adj >= 90) {
          console.log(`  PARALLEL? [${wires[i].label}] vs [${wires[j].label}]  伴随 ${adj.toFixed(0)}px (<10px 间距)`);
        }
      }
    }
  }
});
