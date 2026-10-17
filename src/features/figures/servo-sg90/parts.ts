// SG90 舵机 —— 可动零件的路径生成器
// 关键约束：hornArmPath / hornHoles / pwmPath 必须「零依赖」（只用传入的参数与 ctx），
// 这样离线预览可以把函数源码 toString() 内联进页面，站点组件与图鉴实验直接 import —— 三处永远不会漂移。
import * as k from '../kit/iso-kit';
import { HORN_HOLE_R, HORN_LEN, HORN_W, HORN_Z, KNOB, KNOB_H, KNOB_R, P, SCREEN, SCREEN_Z, SHAFT, TESTER_H } from './scene';
import { PERIOD_MS } from './model';

/** 旋钮指针所在平面高度 */
export const KNOB_TOP_Z = TESTER_H + KNOB_H;

type Plane = [number, number];
/** 内联时由页面注入（离线预览）或直接传 kit 函数（站点） */
export interface PathCtx {
  onTop: (points: Plane[], z: number, proj: unknown, closed?: boolean) => string;
  proj: unknown;
}

/** 手臂轮廓（圆角矩形，绕输出轴旋转）：0° 指向 +y，90° 指向 +x，180° 指向 −y */
export function hornArmPath(angle: number, cx: number, cy: number, len: number, w: number, z: number, ctx: PathCtx): string {
  const ROUND = 2.2; // 函数内自足：内联进页面时不依赖模块作用域
  const phi = ((90 - angle) * Math.PI) / 180;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const rot = (x: number, y: number): Plane => [cx + x * c - y * s, cy + x * s + y * c];
  const hw = w / 2;
  const pts: Plane[] = [];
  const arc = (ax: number, ay: number, from: number, to: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = from + ((to - from) * i) / 4;
      pts.push(rot(ax + Math.cos(a) * ROUND, ay + Math.sin(a) * ROUND));
    }
  };
  pts.push(rot(ROUND, -hw));
  pts.push(rot(len - ROUND, -hw));
  arc(len - ROUND, -hw + ROUND, -Math.PI / 2, 0);
  arc(len - ROUND, hw - ROUND, 0, Math.PI / 2);
  arc(ROUND, hw - ROUND, Math.PI / 2, Math.PI);
  arc(ROUND, -hw + ROUND, Math.PI, Math.PI * 1.5);
  return ctx.onTop(pts, z, ctx.proj, true);
}

/** 手臂上的两个减重孔（跟着手臂转） */
export function hornHoles(angle: number, cx: number, cy: number, len: number, r: number, z: number, ctx: PathCtx): string[] {
  const phi = ((90 - angle) * Math.PI) / 180;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const out: string[] = [];
  for (const [lx, ly] of [[len - 4.5, 0], [len * 0.58, 0]] as const) {
    const wx = cx + lx * c - ly * s;
    const wy = cy + lx * s + ly * c;
    const ring: Plane[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ring.push([wx + Math.cos(a) * r, wy + Math.sin(a) * r]);
    }
    out.push(ctx.onTop(ring, z + 0.1, ctx.proj, true));
  }
  return out;
}

/** 测试仪屏幕上的 50Hz PWM 波形（两个周期，脉宽随旋钮变化） */
export function pwmPath(pulseMs: number, box: { x: number; y: number; w: number; d: number }, z: number, ctx: PathCtx): string {
  const x0 = box.x + (box.w - (box.w - 6)) / 2;
  const span = box.w - 6;
  const high = box.y + 5;
  const low = box.y + box.d - 6;
  const px = (phase: number) => x0 + (phase / 2) * span;
  const duty = Math.max(0.005, Math.min(0.995, pulseMs / PERIOD_MS));
  const pts: Plane[] = [];
  for (let period = 0; period < 2; period++) {
    pts.push([px(period), low]);
    pts.push([px(period), high]);
    pts.push([px(period + duty), high]);
    pts.push([px(period + duty), low]);
  }
  pts.push([px(2), low]);
  return ctx.onTop(pts, z + 0.15, ctx.proj, false);
}

/* ------------------------------- 画布绑定版本 ------------------------------- */
const CTX: PathCtx = { onTop: k.onTop as unknown as PathCtx['onTop'], proj: P };

export const hornAt = (angle: number): string =>
  hornArmPath(angle, SHAFT[0], SHAFT[1], HORN_LEN, HORN_W, HORN_Z, CTX);

export const hornHolesAt = (angle: number): string[] =>
  hornHoles(angle, SHAFT[0], SHAFT[1], HORN_LEN, HORN_HOLE_R, HORN_Z, CTX);

export const pwmAt = (pulseMs: number): string => pwmPath(pulseMs, SCREEN, SCREEN_Z, CTX);

/** 旋钮指针：t ∈ [−1,1] 映射到 −60°..+60°（零依赖，便于内联） */
export function knobPointerPath(t: number, cx: number, cy: number, r: number, z: number, ctx: PathCtx): string {
  const a = -Math.PI / 3 + Math.max(-1, Math.min(1, t)) * ((Math.PI * 2) / 3) * 0.5;
  const sx = Math.sin(a);
  const sy = -Math.cos(a);
  return ctx.onTop([[cx + sx * 2.6, cy + sy * 2.6], [cx + sx * (r - 2.2), cy + sy * (r - 2.2)]], z + 0.15, ctx.proj, false);
}

export const knobAt = (t: number): string => knobPointerPath(t, KNOB[0], KNOB[1], KNOB_R, KNOB_TOP_Z, CTX);

/** 运行期内联时需要的数据 */
export const RUNTIME_GEOMETRY = {
  shaft: [SHAFT[0], SHAFT[1]] as [number, number],
  hornLen: HORN_LEN,
  hornW: HORN_W,
  hornZ: HORN_Z,
  holeR: HORN_HOLE_R,
  screen: SCREEN,
  screenZ: SCREEN_Z,
  knob: [KNOB[0], KNOB[1]] as [number, number],
  knobR: KNOB_R,
  knobZ: KNOB_TOP_Z,
};
