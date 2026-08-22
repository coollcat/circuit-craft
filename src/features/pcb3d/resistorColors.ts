// 3D PCB —— 电阻色环计算（4 环制：数字1 数字2 倍率 误差）
// 依据 IEC 60062 标准色码。

/** 色环颜色表（0-9） */
export const BAND_COLORS = [
  '#1A1A1A', // 0 黑
  '#7B4B2A', // 1 棕
  '#D33F2F', // 2 红
  '#F08A24', // 3 橙
  '#F2D13C', // 4 黄
  '#3F9E4D', // 5 绿
  '#2D6FC0', // 6 蓝
  '#8A4FA8', // 7 紫
  '#8C8C8C', // 8 灰
  '#F2EFE3', // 9 白
] as const;

const GOLD = '#D8B25A';
const SILVER = '#C0C4C8';

/**
 * 由阻值（Ω）计算 4 色环颜色（hex）。
 * 返回 [digit1, digit2, multiplier, tolerance]。
 * 覆盖 1Ω ~ 99MΩ，超出范围时钳位。
 */
export function resistorBands(ohms: number): [string, string, string, string] {
  const r = Math.max(1, Math.min(ohms, 99e6));
  // 归一化到 10 ~ 99 之间的两位有效数字
  let exp = Math.floor(Math.log10(r)) - 1;
  exp = Math.max(-2, Math.min(exp, 7)); // 倍率指数范围（0.01 ~ 10M 倍率）
  const sig = Math.round(r / Math.pow(10, exp));
  const d1 = Math.floor(sig / 10) % 10;
  const d2 = sig % 10;
  const mult =
    exp === -2 ? SILVER : exp === -1 ? GOLD : BAND_COLORS[exp] ?? BAND_COLORS[7];
  return [BAND_COLORS[d1] ?? BAND_COLORS[0], BAND_COLORS[d2] ?? BAND_COLORS[0], mult, GOLD]; // ±5% 金
}
