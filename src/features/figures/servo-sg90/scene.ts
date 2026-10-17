// SG90 舵机 —— 场景尺寸与相机（几何、可动零件、离线预览、站点组件、图鉴实验共用的唯一布局来源）
// 单位 ≈ 1mm；舵机本体按公开尺寸 22.8×12×22.5 放大到约 1.5 倍，让手臂与刻度在图上读得出来。
import * as k from '../kit/iso-kit';

export const WIDTH = 760;
export const HEIGHT = 450;

export const BASE = { x: -104, y: -66, w: 208, d: 132, r: 9 };
export const BASE_H = 12;
export const FOOT_H = 4;

/* --------------------------------- 舵机本体 --------------------------------- */
export const SERVO = { x: -68, y: -14, w: 46, d: 28, r: 3 };
export const SERVO_H = 36;
export const SHAFT = [-45, 0] as const;
export const SHAFT_R = 5;
export const HORN_Z = SERVO_H + 5; // 手臂所在平面
export const HORN_LEN = 30;
export const HORN_W = 9;
export const HORN_HOLE_R = 1.7;
/** 顶部刻度盘半径（画在舵机顶面，标 0°/90°/180°） */
export const SCALE_R = 18;

/* ------------------------------- 舵机测试仪 ------------------------------- */
export const TESTER = { x: 4, y: -54, w: 96, d: 60, r: 4 };
export const TESTER_H = 10;
export const KNOB = [30, -32] as const;
export const KNOB_R = 10;
export const KNOB_H = 9;
export const SCREEN = { x: 48, y: -50, w: 46, d: 34, r: 2 };
export const SCREEN_Z = TESTER_H + 0.6;
export const HEADER: [number, number][] = [
  [14, -6],
  [23, -6],
  [32, -6],
];

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [TESTER.x + TESTER.w, TESTER.y + TESTER.d, TESTER_H + KNOB_H],
    [SERVO.x, SERVO.y, SERVO_H + 6],
    [SHAFT[0] + HORN_LEN, SHAFT[1] + HORN_LEN, HORN_Z],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 38 },
);

/** 世界点 → 屏幕点 */
export const at = (p: [number, number, number]): k.Flat => k.iso(p, P);
