// 图鉴 3D —— 条目 → pcb3d 模型工厂参数映射
// 模型本体全部复用 features/pcb3d/models.ts 的 buildComponent()，这里只给参数。
import type { ComponentSpec } from '@/engine/types';

const BASE = { id: 'codex3d-preview', x: 0, y: 0 } as const;

/** 16 个图鉴条目 → ComponentSpec（type 即 models.ts 的模型分支） */
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
};

/**
 * 取条目的 3D 模型参数。
 * 返回 null 表示无对应模型（未来新增条目时），由影棚场景用通用贴片造型兜底。
 */
export function specForEntry(entryId: string): ComponentSpec | null {
  return MAP[entryId] ?? null;
}
