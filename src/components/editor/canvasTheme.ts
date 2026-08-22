// 编辑器 — 原理图画布明/暗双主题
// 持久化：localStorage（key: cc-canvas-theme，经 safeStorage 降级兜底），默认 dark。
// 同步：同页多实例（沙盒 / 关卡页）靠自定义事件 'cc-canvas-theme-change' 广播，
// 跨标签页靠原生 storage 事件；hook 返回当前主题对象与切换函数。
import { useCallback, useEffect, useState } from 'react';
import type { WireLayer } from '@/engine/types';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type CanvasThemeName = 'dark' | 'light';

export interface CanvasTheme {
  /** 画布底色 */
  bg: string;
  /** 网格点（细 / 粗） */
  gridMinor: string;
  gridMajor: string;
  /** 导线：常态 / 有电流 / 选中 / 过流 */
  wire: string;
  wireActive: string;
  wireSelected: string;
  wireOver: string;
  /** 底层导线（蓝色系，wave6 双层走线） */
  wireBottom: string;
  /** 内层1 导线（琥珀/金黄系，editorx7 四层板） */
  wireIn1: string;
  /** 内层2 导线（品红/紫系，editorx7 四层板） */
  wireIn2: string;
  /** 过孔标记圆环 */
  viaRing: string;
  /** 示教重影 */
  ghost: string;
  /** 连线橡皮筋预览 */
  rubber: string;
  /** 元件符号描边 / 烧毁描边 */
  symbol: string;
  symbolBurned: string;
  /** 位号 / 参数 / 浮动电压 / 角落装饰 文字 */
  idText: string;
  paramText: string;
  auxText: string;
  cornerText: string;
  /** 端口圆点 / 磁吸高亮 */
  port: string;
  portSnap: string;
  /** 选中导线端点（拐点）手柄 */
  selMarkFill: string;
  selMarkStroke: string;
  /** MCU 引脚电平指示 */
  pinOn: string;
  pinOff: string;
  pinStroke: string;
  pinTextOn: string;
  pinTextOff: string;
  /** 角落主题切换按钮 */
  btnBg: string;
  btnBorder: string;
  btnText: string;
}

export const CANVAS_THEMES: Record<CanvasThemeName, CanvasTheme> = {
  dark: {
    bg: '#060A08',
    gridMinor: 'rgba(63,196,127,0.10)',
    gridMajor: 'rgba(63,196,127,0.22)',
    wire: '#E0A458',
    wireActive: '#3FC47F',
    wireSelected: '#45DCE8',
    wireOver: '#FF5263',
    wireBottom: '#5B8DEF',
    wireIn1: '#F5C542', // 琥珀金：与顶层铜橙拉开色相
    wireIn2: '#E56BD6', // 品红：与底层蓝拉开色相
    viaRing: '#F0C078',
    ghost: '#6FE3A1',
    rubber: '#F2EFE3',
    symbol: '#F2EFE3',
    symbolBurned: '#55524A',
    idText: '#45DCE8',
    paramText: '#CFC9B4',
    auxText: '#FFB84D',
    cornerText: '#55524A',
    port: '#45DCE8',
    portSnap: '#43E08A',
    selMarkFill: '#45DCE8',
    selMarkStroke: '#060A08',
    pinOn: '#6FE3A1',
    pinOff: '#8E8976',
    pinStroke: '#060A08',
    pinTextOn: '#060A08',
    pinTextOff: '#F2EFE3',
    btnBg: 'rgba(14,22,17,0.9)',
    btnBorder: '#26402F',
    btnText: '#CFC9B4',
  },
  light: {
    // 暖白底 + 全套加深反差，杜绝浅底白字
    bg: '#F7F5EE',
    gridMinor: 'rgba(31,122,76,0.12)',
    gridMajor: 'rgba(31,122,76,0.24)',
    wire: '#9A5E28',
    wireActive: '#1F7A4C',
    wireSelected: '#0E8CA8',
    wireOver: '#D43D4C',
    wireBottom: '#2F5FBE',
    wireIn1: '#A87C00', // 深琥珀：浅底上保持反差且异于顶层棕
    wireIn2: '#B03A9E', // 深品红：浅底上可辨
    viaRing: '#8A5A22',
    ghost: '#2E9E63',
    rubber: '#4A4636',
    symbol: '#38342A',
    symbolBurned: '#B3AC97',
    idText: '#0E8CA8',
    paramText: '#6B6452',
    auxText: '#B5711C',
    cornerText: '#A39C88',
    port: '#0E8CA8',
    portSnap: '#1F9E57',
    selMarkFill: '#0E8CA8',
    selMarkStroke: '#F7F5EE',
    pinOn: '#2E9E63',
    pinOff: '#8E8976',
    pinStroke: '#F7F5EE',
    pinTextOn: '#F7F5EE',
    pinTextOff: '#F7F5EE',
    btnBg: 'rgba(255,255,255,0.85)',
    btnBorder: '#D8D2C0',
    btnText: '#55524A',
  },
};

/** 层 → 导线颜色（四层板按段着色统一入口：落线 / 橡皮筋预览 / 层按钮色点共用） */
export function layerWireColor(t: CanvasTheme, layer: WireLayer): string {
  switch (layer) {
    case 'in1': return t.wireIn1;
    case 'in2': return t.wireIn2;
    case 'bottom': return t.wireBottom;
    default: return t.wire;
  }
}

const STORAGE_KEY = 'cc-canvas-theme';
const CHANGE_EVENT = 'cc-canvas-theme-change';

export function getCanvasThemeName(): CanvasThemeName {
  return safeGetItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function setCanvasThemeName(name: CanvasThemeName): void {
  safeSetItem(STORAGE_KEY, name);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** 当前画布主题（name + 配色 + toggle），多实例实时同步 */
export function useCanvasTheme(): { name: CanvasThemeName; theme: CanvasTheme; toggle: () => void } {
  const [name, setName] = useState<CanvasThemeName>(getCanvasThemeName);
  useEffect(() => {
    const sync = () => setName(getCanvasThemeName());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) sync(); };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const toggle = useCallback(() => {
    setCanvasThemeName(getCanvasThemeName() === 'dark' ? 'light' : 'dark');
  }, []);
  return { name, theme: CANVAS_THEMES[name], toggle };
}
