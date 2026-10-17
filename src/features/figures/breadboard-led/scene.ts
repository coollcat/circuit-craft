// 面包板 LED 限流电路 —— 场景尺寸与相机（几何、指针助手、离线预览、站点组件共用的唯一布局来源）
// 单位 ≈ 1mm（面包板孔距 6 个单位 = 放大的教学比例，真实为 2.54mm；放大是为了让 LED 在图上读得出来）。
import * as k from '../kit/iso-kit';

export const WIDTH = 760;
export const HEIGHT = 500;

export const BASE = { x: -148, y: -96, w: 296, d: 204, r: 12 };
export const BASE_H = 14;
export const FOOT_H = 5;

export const BOARD = { x: -144, y: -72, w: 176, d: 110, r: 4 };
export const BOARD_H = 12;
export const COLS = 24;
export const COL0 = -136;
export const COL_STEP = 6;
export const ROWS_TOP = [-58, -52, -46, -40, -34];
export const ROWS_BOT = [0, 6, 12, 18, 24];
export const TRENCH_Y = -17;
export const RAIL_TOP_Y = -65;
export const RAIL_BOT_Y = 31;

export const BOX = { x: 44, y: -72, w: 96, d: 110, r: 6 };
export const BOX_H = 46;
export const DIAL_R = 13;
export const DIAL_H = 9;
export const DIAL_Z = BOX_H; // 拨盘坐在箱体顶面
export const DIAL_TOP = DIAL_Z + 1.2 + DIAL_H; // 拨盘顶面（指针所在平面）

export const METER = [100, 70] as const;
export const METER_R = 32;
export const METER_H = 12;
export const METER_Z = METER_H;
export const METER_FACE = METER_Z + 1.4; // 表盘面（指针所在平面）
export const NEEDLE_LEN = METER_R - 7;

export const BATT = { x: -140, y: 56, w: 44, d: 28, r: 2 };
export const BATT_H = 52;

export const LED_POS = [-62, -46] as const;
export const LED_Z = BOARD_H;
export const LED_SCREEN_Z = LED_Z + 9;

export const POSTS: [number, number][] = [
  [58, -66],
  [126, -66],
];

/** 拨盘位置（左上 ×1000，右上 ×100，左下 ×10，右下 ×1） */
export const DIAL_POS: [number, number][] = [
  [68, -50],
  [116, -50],
  [68, -4],
  [116, -4],
];

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [BOX.x + BOX.w, BOX.y + BOX.d, BOX_H],
    [METER[0] + METER_R, METER[1] + METER_R, METER_FACE],
    [BATT.x, BATT.y + BATT.d, BATT_H + 10],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

/** 世界点 → 屏幕点 */
export const at = (p: [number, number, number]): k.Flat => k.iso(p, P);
