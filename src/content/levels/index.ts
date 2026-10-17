// 回路工坊 — 关卡数据入口（API 签名冻结：LEVELS / SIDE_QUESTS / getLevel）
// 主线 7 章 30 关 + 支线 A 6 关 + 支线 B 8 关 = 44 个 LevelDef
//
// 引擎契约（已由引擎组确认）：
// - 单位：node-voltage 伏特(V)、branch-current 毫安(mA)、freq/fs 赫兹(Hz)、resistance 欧姆(Ω)、capacitance 法拉(F)
// - LED Vf=2V，二极管 Vf=0.7V，NPN Vbe=0.7V / Vce(sat)=0.2V / β=100
// - 端口命名：vsrc/battery/voltmeter=pos|neg；gnd=gnd；funcgen=out|gnd；
//   resistor/capacitor/inductor/fuse/switch/button/ammeter/ldr/thermistor/buzzer/speaker=a|b；pot=a|b|w；
//   diode/schottky/led/zener=a(阳)|k(阴)；npn=c|b|e；opamp=inp|inn|out|vcc|vee；
//   sensor=vcc|gnd|out；antenna=a；ic(LDO)=in|out|gnd；mcu=vcc|gnd|p0..p3；module=in|out|vcc|gnd；
//   transformer=p1|p2|s1|s2（原边/副边）
// - palette 元件拖入画布后保留原 id（每种 palette 元件限放一个）
// - node-voltage 参考地：任一 gnd 元件；无 gnd 时以电源 neg 为 0V
// - GoalCheck 仅使用标准种类（connected/component-placed/param/node-voltage/branch-current/led-lit），无 custom
import type { LevelDef } from '@/engine/types';
import { C1_LEVELS } from './c1';
import { C2_LEVELS } from './c2';
import { C3_LEVELS } from './c3';
import { C4_LEVELS } from './c4';
import { C5_LEVELS } from './c5';
import { C6_LEVELS } from './c6';
import { C7_LEVELS } from './c7';
import { SIDE_A_LEVELS } from './sideA';
import { SIDE_B_LEVELS } from './sideB';

export const LEVELS: LevelDef[] = [
  ...C1_LEVELS,
  ...C2_LEVELS,
  ...C3_LEVELS,
  ...C4_LEVELS,
  ...C5_LEVELS,
  ...C6_LEVELS,
  ...C7_LEVELS,
];

export const SIDE_QUESTS: LevelDef[] = [...SIDE_A_LEVELS, ...SIDE_B_LEVELS];

export function getLevel(id: string) {
  return [...LEVELS, ...SIDE_QUESTS].find(l => l.id === id);
}
