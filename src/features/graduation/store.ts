// 毕业设计向导状态（毕业设计专属，独立于全局关卡进度）
// localStorage 键 cc-graduation-v1，可中断续做
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStateStorage } from '@/lib/safeStorage';

export interface BomSelection {
  ldo: string | null;
  crystal: string | null;
  usb: string | null;
  passives: string | null;
  button: string | null;
}

export interface GradState {
  /** 0 需求工单 · 1 原理图 · 2 选型 BOM · 3 PCB · 4 Gerber+下单 · 5 证书 */
  step: number;
  orderAccepted: boolean;
  reviewsPassed: number[]; // 已通过的评审轮 [1,2,3]
  bom: BomSelection;
  bomCost: number; // 单片成本（元）
  bomFrozen: boolean;
  used0402: boolean; // 彩蛋：坚持手焊 0402
  extremeSaver: boolean; // 彩蛋：极限降本 ≤¥22
  drcClean: boolean;
  gerberExported: boolean;
  orderPlaced: boolean;
  orderNo: string | null;
  /** 毕业证书编号：下单时一次性生成并持久化，刷新页面不再漂移 */
  certNo: string | null;
  boardColor: string;
  orderPrice: number;
  startedAt: number;
  finishedAt: number | null;

  set: (patch: Partial<GradState>) => void;
  resetGrad: () => void;
}

const initial = {
  step: 0,
  orderAccepted: false,
  reviewsPassed: [] as number[],
  bom: { ldo: null, crystal: null, usb: null, passives: null, button: null } as BomSelection,
  bomCost: 0,
  bomFrozen: false,
  used0402: false,
  extremeSaver: false,
  drcClean: false,
  gerberExported: false,
  orderPlaced: false,
  orderNo: null as string | null,
  certNo: null as string | null,
  boardColor: 'green',
  orderPrice: 0,
  startedAt: Date.now(),
  finishedAt: null as number | null,
};

export const useGrad = create<GradState>()(
  persist(
    set => ({
      ...initial,
      set: patch => set(patch),
      resetGrad: () => set({ ...initial, startedAt: Date.now() }),
    }),
    { name: 'cc-graduation-v1', storage: createJSONStorage(safeStateStorage) },
  ),
);

/** 主线前 6 章关卡 id（design.md 内容架构：c1×4 c2×4 c3×5 c4×5 c5×4 c6×4） */
export const MAIN_GATE_IDS: string[] = (() => {
  const chapters: [number, number][] = [
    [1, 4],
    [2, 4],
    [3, 5],
    [4, 5],
    [5, 4],
    [6, 4],
  ];
  return chapters.flatMap(([ch, n]) => Array.from({ length: n }, (_, i) => `c${ch}-${i + 1}`));
})();

export function isGraduationUnlocked(completed: string[]): boolean {
  return MAIN_GATE_IDS.every(id => completed.includes(id));
}

export const STEP_LABELS = ['需求工单', '原理图考核', '选型 BOM', 'PCB 布局', 'Gerber 下单', '毕业证书'];
