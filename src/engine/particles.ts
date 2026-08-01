// 回路工坊 — 电流粒子系统（Canvas 2D）
// 粒子速度 ∝ 支路电流（0.5–4 px/frame 映射），同屏上限 120，过流变 danger 色。
export interface WirePath {
  id: string;
  /** 屏幕坐标折线点 */
  points: { x: number; y: number }[];
  /** 折线总长（px，缓存） */
  length: number;
}

export type WireFlowState = 'idle' | 'normal' | 'warn' | 'danger';

interface Particle {
  wire: number; // WirePath 下标
  dist: number; // 沿折线位置
  speed: number; // px/frame（带符号方向）
}

const COLORS: Record<Exclude<WireFlowState, 'idle'>, string> = {
  normal: '#6FE3A1', // pcb-300
  warn: '#FFB020',
  danger: '#FF5263',
};
const MAX_PARTICLES = 120;
/** 电流→速度映射：0→0.5，≥50mA→4 px/frame */
function speedFor(i: number): number {
  const a = Math.min(Math.abs(i) / 0.05, 1);
  return (0.5 + 3.5 * a) * Math.sign(i || 1);
}

export class ParticleSystem {
  private wires: WirePath[] = [];
  private currents: number[] = [];
  private states: WireFlowState[] = [];
  private particles: Particle[] = [];
  enabled = true;

  /** 每帧（或电路变化时）更新导线几何与电流 */
  setWires(paths: WirePath[], currents: Map<string, number>, states: Map<string, WireFlowState>) {
    this.wires = paths;
    this.currents = paths.map(p => currents.get(p.id) ?? 0);
    this.states = paths.map(p => states.get(p.id) ?? 'idle');
    // 剔除已不存在导线的粒子
    this.particles = this.particles.filter(pt => pt.wire < paths.length);
    for (const pt of this.particles) {
      if (pt.dist > (this.wires[pt.wire]?.length ?? 0)) pt.dist = 0;
    }
  }

  /** 推进一帧（帧率无关：frames=经过的 60fps 帧数） */
  update(frames = 1) {
    if (!this.enabled) return;
    // 目标粒子数：每根有电流的导线按电流大小分配
    for (let w = 0; w < this.wires.length; w++) {
      const i = Math.abs(this.currents[w]);
      if (this.states[w] === 'idle' || i < 1e-6) continue;
      const want = Math.min(6, Math.max(1, Math.round(i / 0.004)));
      const have = this.particles.filter(p => p.wire === w).length;
      for (let k = have; k < want && this.particles.length < MAX_PARTICLES; k++) {
        this.particles.push({ wire: w, dist: Math.random() * this.wires[w].length, speed: speedFor(this.currents[w]) });
      }
    }
    // 移动 + 回收
    this.particles = this.particles.filter(p => {
      const path = this.wires[p.wire];
      if (!path || Math.abs(this.currents[p.wire]) < 1e-6 || this.states[p.wire] === 'idle') return false;
      p.speed = speedFor(this.currents[p.wire]);
      p.dist += p.speed * frames;
      if (p.dist > path.length) p.dist -= path.length;
      if (p.dist < 0) p.dist += path.length;
      return true;
    });
    // 超上限时随机淘汰
    while (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(Math.floor(Math.random() * this.particles.length), 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.enabled) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const path = this.wires[p.wire];
      if (!path || path.points.length < 2) continue;
      const { x, y } = pointAt(path, p.dist);
      const st = this.states[p.wire];
      const color = COLORS[st === 'idle' ? 'normal' : st];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

/** 折线上距起点 d 处的坐标 */
export function pointAt(path: WirePath, d: number): { x: number; y: number } {
  let rest = d;
  const pts = path.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    if (rest <= len && len > 0) {
      const t = rest / len;
      return { x: pts[i].x + dx * t, y: pts[i].y + dy * t };
    }
    rest -= len;
  }
  return pts[pts.length - 1] ?? { x: 0, y: 0 };
}

export function pathLength(points: { x: number; y: number }[]): number {
  let L = 0;
  for (let i = 0; i < points.length - 1; i++) L += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  return L;
}

/* ---------------- 故障演出：烧毁烟雾粒子（一次性） ---------------- */

export interface SmokePuff {
  x: number; y: number;
  vx: number; vy: number;
  life: number; // 0..1
}

export class SmokeSystem {
  private puffs: SmokePuff[] = [];
  emit(x: number, y: number, n = 8) {
    for (let i = 0; i < n; i++) {
      this.puffs.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.6 - Math.random() * 0.7,
        life: 1,
      });
    }
  }
  update(frames = 1) {
    for (const p of this.puffs) {
      p.x += p.vx * frames;
      p.y += p.vy * frames;
      p.life -= (1 / 72) * frames; // ≈1.2s @60fps
    }
    this.puffs = this.puffs.filter(p => p.life > 0);
  }
  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.puffs) {
      ctx.fillStyle = `rgba(142,137,118,${(p.life * 0.55).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + (1 - p.life) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  get active() {
    return this.puffs.length > 0;
  }
}
