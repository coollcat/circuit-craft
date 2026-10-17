// SG90 舵机 + 舵机测试仪 —— 静态几何（离线预览、站点组件、图鉴实验共用）
// 教学点：舵机角度不是"给个电压"决定的，而是由 50Hz PWM 的脉宽决定（0.5ms=0°、1.5ms=90°、2.5ms=180°）。
import * as k from '../kit/iso-kit';
import { hornAt, hornHolesAt, knobAt, pwmAt } from './parts';
import { angleOf } from './model';
import {
  BASE, BASE_H, FOOT_H, HEADER, HORN_W, KNOB, KNOB_H, KNOB_R, P, SCALE_R, SCREEN, SCREEN_Z,
  SERVO, SERVO_H, SHAFT, SHAFT_R, TESTER, TESTER_H, WIDTH, HEIGHT, at,
} from './scene';

export { WIDTH, HEIGHT, P, at };

const S = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style);
const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
const byDepth = (points: k.Plane[]) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------------------------------- 工作台垫 ---------------------------------- */
function bench(): string {
  const out: string[] = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 18))) {
    out.push(S(k.cylinder(x, y, 6, -BASE_H - FOOT_H, 1.5, P, 24), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 4.6, -BASE_H - FOOT_H + 1.5, FOOT_H - 1.5, P, 24), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.4), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P, 10), { tone: 'faint' }));
  out.push(L(k.corners(BASE, 8).map(([x, y]) => k.ring(x, y, 2, 0, P, 14)).join(''), { tone: 'faint' }));
  out.push(k.dotsSvg(k.corners(BASE, 8).map(([x, y]) => at([x, y, 0])), { size: 0.45, tone: 'lo' }));
  return out.join('');
}

/* ---------------------------------- SG90 本体 ---------------------------------- */
function servo(): string {
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(SERVO, 0, 0.2, P)}"/>`);
  // 下壳 / 上壳（真实 SG90 是上下两半的蓝色塑料壳）
  out.push(S(k.slabOf(SERVO, 0, SERVO_H * 0.55, P, 5, 1), { tone: 'hi' }));
  out.push(S(k.slabOf(k.insetPlan(SERVO, 0.4), SERVO_H * 0.55, SERVO_H * 0.45 - 2, P, 5, 1), { tone: 'hi', crease: 'lo' }));
  out.push(L(k.planOutline(SERVO, SERVO_H - 2, P, 5), { tone: 'lo' }));
  out.push(S(k.slabOf(k.insetPlan(SERVO, 2.5), SERVO_H - 2, 2, P, 5), { tone: 'mid', crease: 'none' }));
  // 两侧安装耳（真实 SG90 是底部的扁平耳朵 + 一个沉头孔，不要做成柱子）
  for (const [x, y] of [[SERVO.x - 7, SERVO.y + 5], [SERVO.x + SERVO.w, SERVO.y + 5]] as const) {
    out.push(S(k.slabOf({ x, y, w: 7, d: 10, r: 1 }, 1, 4, P, 3, 0.4), { tone: 'hi' }));
    out.push(L(k.ring(x + 3.5, y + 5, 2, 5, P, 14), { tone: 'faint' }));
    out.push(k.dotsSvg([at([x + 3.5, y + 5, 5])], { size: 0.4, tone: 'lo' }));
  }
  // 顶面刻度盘：0° / 90° / 180°（静态，给手臂一个参照）
  const ticks = k.radialTicks(SHAFT[0], SHAFT[1], SCALE_R, 12, 3, SERVO_H - 2.05, [2, 3.6], P, -Math.PI / 2, Math.PI);
  out.push(L(ticks.minor, { tone: 'faint' }), L(ticks.major, { tone: 'lo' }));
  for (const [label, frac] of [['0°', 0], ['90°', 0.5], ['180°', 1]] as const) {
    const a = -Math.PI / 2 + frac * Math.PI;
    const lx = SHAFT[0] + Math.cos(a) * (SCALE_R + 3.6);
    const ly = SHAFT[1] + Math.sin(a) * (SCALE_R + 3.6);
    out.push(k.faceTextSvg(k.topMatrix([lx, ly], SERVO_H - 2, P), label, { size: 3, tone: 'lo', anchor: 'middle' }));
  }
  // 输出轴 + 轴套
  out.push(S(k.cylinder(SHAFT[0], SHAFT[1], SHAFT_R, SERVO_H - 2, 4, P, 28, 0.5), { tone: 'mid' }));
  out.push(L(k.knurl(SHAFT[0], SHAFT[1], SHAFT_R, SERVO_H + 0.4, SERVO_H + 1.6, 24, P, 0.3), { tone: 'faint' }));
  // 手臂（可动）：填充 + 轮廓 + 两个减重孔 + 中心毂
  out.push(
    k.groupSvg(
      [
        `<path class="iso-fill" data-part="horn" d="${hornAt(90)}"/>`,
        `<path class="iso-line" data-part="horn-edge" data-tone="lit" d="${hornAt(90)}"/>`,
        ...hornHolesAt(90).map((d, i) => `<path class="iso-line" data-part="horn-hole-${i}" data-tone="mid" d="${d}"/>`),
      ].join(''),
      { 'data-part': 'horn-group' },
    ),
  );
  out.push(S(k.cylinder(SHAFT[0], SHAFT[1], 5.4, SERVO_H - 2, 6, P, 24, 0.6), { tone: 'hi' }));
  out.push(L(k.ring(SHAFT[0], SHAFT[1], 5.4, SERVO_H + 4, P, 24), { tone: 'lo' }));
  out.push(k.dotsSvg([at([SHAFT[0], SHAFT[1], SERVO_H + 4])], { size: 0.55, tone: 'hi' }));
  // 型号铭牌
  const label = k.topMatrix([SERVO.x + 4, SERVO.y + SERVO.d - 5], SERVO_H - 2, P);
  out.push(k.faceTextSvg(label, 'SG90', { size: 3.4, tone: 'lo' }));
  return out.join('');
}

/* --------------------------------- 三线电缆 --------------------------------- */
function cable(): string {
  const out: string[] = [];
  const from: [number, number, number] = [SERVO.x + 1, SERVO.y + 4, SERVO_H * 0.42];
  const to: [number, number, number] = [HEADER[0][0], HEADER[0][1], TESTER_H + 3];
  const tones: k.Tone[] = ['mid', 'hi', 'lo']; // 棕 / 红 / 橙（按明度区分，保持单色系）
  for (let i = 0; i < 3; i++) {
    const a: [number, number, number] = [from[0], from[1] + i * 1.6, from[2] + i * 0.6];
    const b: [number, number, number] = [to[0] + i * 8 - 8, to[1] + i * 1.2, to[2]];
    const c: [number, number, number] = [(a[0] + b[0]) / 2 - 6, (a[1] + b[1]) / 2 + 16, (a[2] + b[2]) / 2 + 20];
    const pts: k.Flat[] = [];
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const u = 1 - t;
      pts.push(at([
        u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
        u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
      ]));
    }
    out.push(`<g class="iso-wire" data-tone="${tones[i]}">${L(k.pathOf(pts), { tone: tones[i] })}<circle class="iso-wire-end" cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" r="1.3"/><circle class="iso-wire-end" cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="1.3"/></g>`);
  }
  return out.join('');
}

/* ------------------------------- 舵机测试仪 ------------------------------- */
function tester(): string {
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TESTER, 0, 0.2, P)}"/>`);
  out.push(S(k.slabOf(TESTER, 0, TESTER_H, P, 6, 1.2), { tone: 'hi' }));
  out.push(L(k.planOutline(k.insetPlan(TESTER, 3), TESTER_H, P, 6), { tone: 'faint' }));
  out.push(L(k.corners(k.insetPlan(TESTER, 5), 0).map(([x, y]) => k.ring(x, y, 1.7, TESTER_H, P, 12)).join(''), { tone: 'faint' }));
  out.push(k.dotsSvg(k.corners(k.insetPlan(TESTER, 5), 0).map(([x, y]) => at([x, y, TESTER_H])), { size: 0.36, tone: 'lo' }));
  // 屏幕 + 波形（可动）
  out.push(S(k.slabOf(SCREEN, TESTER_H, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  out.push(L(k.planOutline(SCREEN, SCREEN_Z, P, 3), { tone: 'faint' }));
  out.push(`<path class="iso-line" data-part="pwm" data-tone="hi" d="${pwmAt(1.5)}"/>`);
  out.push(k.faceTextSvg(k.topMatrix([SCREEN.x + 3, SCREEN.y + SCREEN.d - 1.5], SCREEN_Z, P), 'PWM 50Hz', { size: 2.6, tone: 'faint' }));
  // 旋钮（可动视角的静态部分：外圈 + 滚花）
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, TESTER_H, KNOB_H, P, 36, 0.8), { tone: 'hi', crease: 'lo' }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, TESTER_H + 1.2, TESTER_H + KNOB_H - 0.8, 36, P, 0.35), { tone: 'faint' }));
  out.push(L(k.ring(KNOB[0], KNOB[1], KNOB_R - 1.4, TESTER_H + KNOB_H, P, 36), { tone: 'lo' }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], 3, TESTER_H + KNOB_H, 1.4, P, 20), { tone: 'mid' }));
  // 旋钮指针 + 刻度（−60°..+60° 对应脉宽最小值..最大值）
  const kTicks = k.radialTicks(KNOB[0], KNOB[1], KNOB_R - 1.6, 10, 5, TESTER_H + KNOB_H, [1.2, 2.2], P, -Math.PI / 3, (Math.PI * 2) / 3);
  out.push(L(kTicks.minor, { tone: 'faint' }), L(kTicks.major, { tone: 'lo' }));
  out.push(`<path class="iso-line" data-part="knob-pointer" data-tone="hi" d="${knobPointerAt(0)}"/>`);
  out.push(k.dotsSvg([at([KNOB[0], KNOB[1], TESTER_H + KNOB_H])], { size: 0.5, tone: 'hi' }));
  out.push(k.faceTextSvg(k.topMatrix([KNOB[0] - 7, KNOB[1] + KNOB_R + 6], TESTER_H, P), '0.5~2.5ms', { size: 2.6, tone: 'lo' }));
  // 3 针排针
  HEADER.forEach(([x, y], i) => {
    out.push(S(k.cylinder(x, y, 1.6, TESTER_H, 5, P, 12), { tone: 'mid' }));
    out.push(k.dotsSvg([at([x, y, TESTER_H + 5])], { size: 0.4, tone: 'lo' }));
    if (i === 1) out.push(L(k.ring(x, y, 1.9, TESTER_H + 4.4, P, 12), { tone: 'faint' }));
  });
  out.push(k.faceTextSvg(k.topMatrix([TESTER.x + 4, TESTER.y + TESTER.d - 4], TESTER_H, P), 'SERVO TESTER', { size: 3.2, tone: 'lo' }));
  return out.join('');
}

/** 旋钮指针：−1..+1（脉宽 0.3~2.7ms）映射到 −60°..+60° */
export const knobPointerAt = (t: number): string => knobAt(t);

/* ----------------------------------- 组装 ----------------------------------- */
export interface ServoParts {
  body: string;
  label: string;
  caption: string;
  hint: string;
  keys: { mark: 'lit' | 'raised' | 'flat'; label: string }[];
  runtime: {
    shaftScreen: k.Flat;
    knobScreen: k.Flat;
    initialPulse: number;
    hornW: number;
  };
}

export function buildParts(pulseMs = 1.5): ServoParts {
  return {
    body: [bench(), tester(), cable(), servo()].join(''),
    label:
      'An SG90 micro servo on a bench, driven by a servo tester. The tester outputs a 50 Hz PWM signal; the pulse width sets the shaft angle — 0.5 ms is 0°, 1.5 ms is 90° and 2.5 ms is 180°. Turning the knob changes the pulse width, the on-screen waveform and the angle of the white horn together.',
    hint: '拖动 / 方向键转动旋钮，看脉宽、波形与手臂角度',
    caption:
      '舵机不是"给多少电压转多少度"：它每一格 20ms 都在等一个 0.5~2.5ms 的高电平脉冲，脉宽决定目标角度，内部电位器把实际角度反馈回去直到对齐。把旋钮拧过 2.5ms，舵机顶到限位就开始嗡嗡响、电流从 10mA 冲到 700mA —— 这就是堵转。',
    keys: [
      { mark: 'lit', label: '白色手臂：角度由脉宽决定' },
      { mark: 'raised', label: '测试仪屏幕：50Hz PWM 波形，高电平宽度 = 脉宽' },
      { mark: 'flat', label: '三线电缆：棕 GND / 红 +5V / 橙 信号' },
    ],
    runtime: {
      shaftScreen: at([SHAFT[0], SHAFT[1], SERVO_H + 4]),
      knobScreen: at([KNOB[0], KNOB[1], TESTER_H + KNOB_H]),
      initialPulse: pulseMs,
      hornW: HORN_W,
    },
  };
}

/** 供离线预览内联的初始角度 */
export const INITIAL_ANGLE = angleOf(1.5);
