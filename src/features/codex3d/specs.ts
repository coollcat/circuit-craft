// 图鉴 3D —— 条目 → pcb3d 模型工厂参数映射
// 模型本体全部复用 features/pcb3d/models.ts 的 buildComponent()，这里只给参数。
import type { ComponentSpec } from '@/engine/types';

const BASE = { id: 'codex3d-preview', x: 0, y: 0 } as const;

/** 26 个图鉴条目 → ComponentSpec（type 即 models.ts 的模型分支） */
const MAP: Record<string, ComponentSpec> = {
  resistor: { ...BASE, type: 'resistor', params: { resistance: 220 } }, // 220Ω 色环：红红棕金
  capacitor: { ...BASE, type: 'capacitor', params: { capacitance: 10e-6 } }, // ≥1µF → 铝电解造型
  inductor: { ...BASE, type: 'inductor' },
  crystal: { ...BASE, type: 'crystal' },
  diode: { ...BASE, type: 'diode' },
  led: { ...BASE, type: 'led', params: { vf: 2 } }, // 红色 LED
  zener: { ...BASE, type: 'zener' },
  npn: { ...BASE, type: 'npn' },
  nmos: { ...BASE, type: 'nmos' },
  pmos: { ...BASE, type: 'pmos' },
  opamp: { ...BASE, type: 'opamp' }, // DIP-8
  esp32: { ...BASE, type: 'module' }, // RF 模组：基板 + 屏蔽罩 + 馈点
  switch: { ...BASE, type: 'button' }, // 6×6 轻触按键造型
  pot: { ...BASE, type: 'pot' }, // 3296 多圈电位器造型
  fuse: { ...BASE, type: 'fuse' },
  antenna: { ...BASE, type: 'antenna' },
  // —— 第三批条目：models.ts 均有对应分支，直接复用 ——
  vsrc: { ...BASE, type: 'vsrc' }, // 直流电源：圆形源造型
  battery: { ...BASE, type: 'battery', params: { voltage: 3.7 } }, // 18650 电芯造型
  gnd: { ...BASE, type: 'gnd' }, // 接地桩符号造型
  voltmeter: { ...BASE, type: 'voltmeter' }, // 表头造型
  ammeter: { ...BASE, type: 'ammeter' }, // 表头造型
  funcgen: { ...BASE, type: 'funcgen' }, // 台式信号源造型
  sensor: { ...BASE, type: 'sensor' }, // 传感器小黑头/模组造型
  mcu: { ...BASE, type: 'mcu' }, // QFP 贴片芯片造型
  ic: { ...BASE, type: 'ic' }, // DIP 直插芯片造型
  module: { ...BASE, type: 'module' }, // 通用功能模组（基板 + 排针）
  // —— Wave 8 新增条目：复用最接近的模型分支 ——
  ldr: { ...BASE, type: 'sensor' }, // 光敏电阻 → 传感器小黑头造型
  thermistor: { ...BASE, type: 'sensor' }, // 热敏电阻 → 传感器小黑头造型
  buzzer: { ...BASE, type: 'sensor' }, // 蜂鸣器 → 黑色圆柱小模组造型
  schottky: { ...BASE, type: 'diode' }, // 肖特基 → 二极管造型
  ldo7805: { ...BASE, type: 'ic' }, // 7805 → 直插芯片造型（近似 TO-220）
  timer555: { ...BASE, type: 'ic' }, // 555 → DIP-8 直插芯片造型
  seg7: { ...BASE, type: 'module' }, // 数码管 → 模组基板造型
  // relay / dcmotor / servo / transformer / speaker 暂无贴近模型，走通用贴片兜底
};

/**
 * 取条目的 3D 模型参数。
 * 返回 null 表示无对应模型（未来新增条目时），由影棚场景用通用贴片造型兜底。
 */
export function specForEntry(entryId: string): ComponentSpec | null {
  return MAP[entryId] ?? null;
}
