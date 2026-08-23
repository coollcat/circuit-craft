// 图鉴 3D —— 条目 → 模型映射
// 优先复用 features/pcb3d/models.ts 的 buildComponent()（引擎 ComponentType 分支）；
// 非引擎类型的条目（relay/dcmotor/servo/seg7/ldo7805）由本层 extras.ts 实物重建。
import type { ComponentSpec } from '@/engine/types';
import type { ExtraModelKind } from './extras';

const BASE = { id: 'codex3d-preview', x: 0, y: 0 } as const;

/** 条目模型：ComponentSpec（pcb3d 分支）或 extra 类型 token */
export type EntryModel = ComponentSpec | ExtraModelKind;

/** 图鉴条目 → pcb3d 模型分支参数 */
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
  switch: { ...BASE, type: 'button' }, // 本条目讲的是 6×6 轻触按键，用按键造型
  pot: { ...BASE, type: 'pot' }, // 3296 多圈电位器造型
  fuse: { ...BASE, type: 'fuse' },
  antenna: { ...BASE, type: 'antenna' },
  vsrc: { ...BASE, type: 'vsrc' }, // 与 battery 共用 9V 方电池造型
  battery: { ...BASE, type: 'battery' }, // 9V 方电池造型（非 18650）
  gnd: { ...BASE, type: 'gnd' }, // 接地桩造型
  voltmeter: { ...BASE, type: 'voltmeter' }, // 表头造型
  ammeter: { ...BASE, type: 'ammeter' }, // 表头造型
  funcgen: { ...BASE, type: 'funcgen' }, // BNC 插座造型
  sensor: { ...BASE, type: 'sensor' },
  mcu: { ...BASE, type: 'mcu' }, // QFP 贴片芯片造型
  ic: { ...BASE, type: 'ic' }, // DIP 直插芯片造型
  module: { ...BASE, type: 'module' }, // 通用功能模组（基板 + 排针）
  ldr: { ...BASE, type: 'ldr' }, // 光敏电阻：陶瓷圆盘 + 蛇形电极（原误映射 sensor）
  thermistor: { ...BASE, type: 'thermistor' }, // NTC 玻璃珠（原误映射 sensor）
  buzzer: { ...BASE, type: 'buzzer' }, // 黑色圆柱腔体 + 顶部发音孔（原误映射 sensor）
  schottky: { ...BASE, type: 'schottky' }, // 双白环阴极二极管（原误映射 diode）
  transformer: { ...BASE, type: 'transformer' }, // EI 铁芯变压器（原走通用兜底）
  speaker: { ...BASE, type: 'speaker' }, // 盆架 + 纸盆 + 磁缸（原走通用兜底）
};

/** 非 ComponentType 的条目 → extras 实物重建模型 */
const EXTRA_MAP: Record<string, ExtraModelKind> = {
  relay: 'relay',
  dcmotor: 'dcmotor',
  servo: 'servo',
  seg7: 'seg7',
  ldo7805: 'ldo7805',
};

/**
 * 取条目的 3D 模型：ComponentSpec、extra 类型 token，或 null。
 * null 表示无任何模型（未来新增条目时），由影棚场景用通用贴片造型兜底。
 */
export function modelForEntry(entryId: string): EntryModel | null {
  return MAP[entryId] ?? EXTRA_MAP[entryId] ?? null;
}
