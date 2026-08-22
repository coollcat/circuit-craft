/* eslint-disable react-refresh/only-export-components */
// ComponentChip 元件芯片卡（design.md 6.7）：元件面板与图鉴共用
import type { ComponentType } from '@/engine/types';
import { cn } from '@/lib/utils';

/** 位号前缀映射（R1/C3/U2 习惯） */
export const REFDES_PREFIX: Partial<Record<ComponentType, string>> = {
  vsrc: 'V',
  battery: 'BT',
  gnd: 'GND',
  resistor: 'R',
  capacitor: 'C',
  inductor: 'L',
  pot: 'RP',
  diode: 'D',
  led: 'LED',
  zener: 'ZD',
  switch: 'SW',
  button: 'KEY',
  npn: 'Q',
  pmos: 'Q',
  nmos: 'Q',
  opamp: 'U',
  crystal: 'X',
  antenna: 'ANT',
  sensor: 'SEN',
  mcu: 'U',
  ic: 'U',
  fuse: 'F',
  funcgen: 'FG',
  voltmeter: 'VM',
  ammeter: 'AM',
  module: 'MOD',
};

export interface ComponentChipProps {
  type: ComponentType;
  name: string;
  /** 元件符号缩略图（SVG 节点），缺省显示通用占位符号 */
  symbol?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export default function ComponentChip({
  type,
  name,
  symbol,
  draggable,
  onDragStart,
  className,
}: ComponentChipProps) {
  const prefix = REFDES_PREFIX[type] ?? 'U';
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      title={`${name}（位号前缀 ${prefix}）`}
      className={cn(
        'group flex w-[72px] flex-col items-center gap-1 rounded-md border border-ink-700 bg-ink-850 p-1.5',
        'transition-colors duration-200 hover:border-pcb-400',
        draggable && 'cursor-grab active:cursor-grabbing',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center text-silk-100">
        {symbol ?? (
          <svg viewBox="0 0 48 48" className="h-full w-full">
            <rect x="10" y="10" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="24" r="2" fill="#45DCE8" />
            <circle cx="42" cy="24" r="2" fill="#45DCE8" />
            <path d="M10 24 H6 M38 24 H42" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </div>
      <div className="w-full text-center text-[11px] leading-tight text-silk-300">{name}</div>
      <div className="font-mono text-[10px] leading-none text-sig-cyan">{prefix}?</div>
    </div>
  );
}
