// 面包板 LED 限流电路 —— 可动零件的路径生成器
// 关键约束：pointerPath / needlePath 必须「零依赖」——只用传入的参数与 lineOnTop，
// 这样离线预览可以把函数源码 toString() 内联进页面、站点组件直接 import，两边永远不会漂移。
import * as k from '../kit/iso-kit';
import { DIAL_R, DIAL_TOP, METER, METER_FACE, NEEDLE_LEN, P } from './scene';
import type { Digits } from './model';

/** 出厂拨盘位置：470Ω → I = (9−2)/(470+5) = 14.7mA，灯正常亮 */
export const DIAL_SET: Digits = [0, 4, 7, 0];

export function digitOf(digits: Digits, index: number): number {
  return digits[index] ?? 0;
}

type Flat = [number, number];
type Plane = [number, number];
type LineOnTop = (from: Plane, to: Plane, z: number, projection: unknown) => string;

/** 拨盘指针：0..9 → −150°..+150°（0 指向 −y，顺时针为正） */
export function pointerPath(cx: number, cy: number, digit: number, dialR: number, dialTop: number, lineOnTop: LineOnTop, proj: unknown): string {
  const a = ((-150 + (digit / 9) * 300) * Math.PI) / 180;
  const sx = Math.sin(a);
  const sy = -Math.cos(a);
  return lineOnTop([cx + sx * 3.2, cy + sy * 3.2], [cx + sx * (dialR - 2.6), cy + sy * (dialR - 2.6)], dialTop + 0.15, proj);
}

/** 表针：needle 0..1 → −48°..+48° */
export function needlePath(needle: number, cx: number, cy: number, len: number, face: number, lineOnTop: LineOnTop, proj: unknown): string {
  const a = ((-48 + needle * 96) * Math.PI) / 180;
  const sx = Math.sin(a);
  const sy = -Math.cos(a);
  return lineOnTop([cx - sx * 4.5, cy - sy * 4.5], [cx + sx * len, cy + sy * len], face + 0.15, proj);
}

/** 画布上用的绑定版本（几何模块用） */
export const pointerAt = (cx: number, cy: number, digit: number): string =>
  pointerPath(cx, cy, digit, DIAL_R, DIAL_TOP, k.lineOnTop as unknown as LineOnTop, P);

export const needleAt = (needle: number): string =>
  needlePath(needle, METER[0], METER[1], NEEDLE_LEN, METER_FACE, k.lineOnTop as unknown as LineOnTop, P);

/** 表盘面在屏幕上的中心（旋转参考点） */
export const METER_SCREEN: Flat = k.iso([METER[0], METER[1], METER_FACE], P);

/** 运行期内联时需要的数据 */
export const RUNTIME_GEOMETRY = {
  dialR: DIAL_R,
  dialTop: DIAL_TOP,
  meter: [METER[0], METER[1]] as [number, number],
  needleLen: NEEDLE_LEN,
  meterFace: METER_FACE,
};
