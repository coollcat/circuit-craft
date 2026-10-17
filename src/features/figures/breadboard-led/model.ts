// 面包板 LED 限流电路 —— 纯物理模型（离线预览与站点组件共用同一份，保证读数与画出来的东西一致）
// 口径刻意与站点引擎一致：crrent 引擎 LED 模型 Vf=2V、rOn=5Ω、额定 imax=20mA、
// 超过 3×额定并持续 0.1s 烧毁（见 src/engine/solver.ts 的 led 与 updateFailures）。
export const SUPPLY_V = 9; // 9V 电池
export const LED_VF = 2; // 红光 LED 正向压降
export const LED_RON = 5; // 等效串联电阻（引擎同款）
export const LED_IMAX = 0.02; // 额定 20mA
export const BURN_FACTOR = 3; // I > 3×额定 且持续 BURN_SECONDS → 烧毁
export const BURN_SECONDS = 0.1;
export const METER_FS = 0.1; // 毫安表满量程 100mA

/** 电阻箱四位拨盘（×1000 / ×100 / ×10 / ×1），每位 0..9 */
export type Digits = [number, number, number, number];

export const DIGIT_WEIGHTS = [1000, 100, 10, 1] as const;

export function resistanceOf(digits: Digits): number {
  return digits.reduce((sum, digit, index) => sum + digit * DIGIT_WEIGHTS[index], 0);
}

export interface OperatingPoint {
  /** 总电阻 Ω */
  r: number;
  /** 回路电流 A（R=0 时为短路电流，会立刻烧灯） */
  i: number;
  /** LED 功率 W */
  p: number;
  /** 电流是否超过额定 */
  over: boolean;
  /** 是否达到烧毁阈值（还需持续 BURN_SECONDS） */
  lethal: boolean;
  /** 0..1 的相对亮度（按额定电流归一） */
  glow: number;
  /** 表针位置 0..1（相对满量程） */
  needle: number;
  /** 人话描述 */
  verdict: string;
}

/**
 * 直流工作点：I = (V_cc − V_f) / (R + r_on)。
 * 这是本插图唯一的「真相来源」：表针、亮度、读数、烧灯判定全部由它导出。
 */
export function operatingPoint(digits: Digits, burned = false): OperatingPoint {
  const r = resistanceOf(digits);
  const i = (SUPPLY_V - LED_VF) / (r + LED_RON);
  const p = LED_VF * i + i * i * LED_RON;
  const over = i > LED_IMAX;
  const lethal = i > LED_IMAX * BURN_FACTOR;
  const glow = burned ? 0 : Math.max(0, Math.min(1, i / LED_IMAX));
  const needle = Math.max(0, Math.min(1, i / METER_FS));
  const verdict = burned
    ? 'LED 已烧毁 —— 更换后再试'
    : lethal
      ? `危险：${(i * 1000).toFixed(1)} mA，超过 3× 额定（${(LED_IMAX * BURN_FACTOR * 1000).toFixed(0)} mA），灯会烧`
      : over
        ? `偏亮：${(i * 1000).toFixed(1)} mA，超过额定 ${(LED_IMAX * 1000).toFixed(0)} mA`
        : i < 0.001
          ? '几乎不亮：电阻太大'
          : `正常点亮：${(i * 1000).toFixed(1)} mA`;
  return { r, i, p, over, lethal, glow, needle, verdict };
}

/** 表针角度（度）：−48° 为零位，+48° 为满量程 */
export const NEEDLE_SWEEP = 96;
export function needleAngle(needle: number): number {
  return -NEEDLE_SWEEP / 2 + needle * NEEDLE_SWEEP;
}

/** 拨盘指针角度：0..9 对应 −150°..+150° */
export function dialAngle(digit: number): number {
  return -150 + (digit / 9) * 300;
}
