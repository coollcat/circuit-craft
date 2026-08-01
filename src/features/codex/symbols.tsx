/* eslint-disable react-refresh/only-export-components */
// IEC 风格自绘元件原理图符号
// 统一约定：viewBox 0 0 96 48，2px 线宽，silk-100(#F2EFE3) 描边，端口圆点 sig-cyan(#45DCE8)
import type { JSX } from 'react';

const SILK = '#F2EFE3';
const CYAN = '#45DCE8';
const SW = 2;

function Port({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill={CYAN} />;
}

function Frame({ children, ports }: { children: React.ReactNode; ports: [number, number][] }) {
  return (
    <svg viewBox="0 0 96 48" className="h-full w-full" aria-hidden>
      <g stroke={SILK} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
      {ports.map(([x, y], i) => (
        <Port key={i} x={x} y={y} />
      ))}
    </svg>
  );
}

/** 电阻（IEC 矩形） */
export const SymResistor = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26" />
    <rect x="26" y="15" width="44" height="18" />
    <path d="M70 24 H90" />
  </Frame>
);

/** 电容（无极性，两平行极板） */
export const SymCapacitor = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H44" />
    <path d="M44 10 V38" />
    <path d="M52 10 V38" />
    <path d="M52 24 H90" />
  </Frame>
);

/** 电感（四段半圆弧） */
export const SymInductor = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H24" />
    <path d="M24 24 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0" />
    <path d="M72 24 H90" />
  </Frame>
);

/** 二极管（1N4148 类） */
export const SymDiode = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H36" />
    <path d="M36 12 L36 36 L62 24 Z" fill={SILK} />
    <path d="M62 12 V36" />
    <path d="M62 24 H90" />
  </Frame>
);

/** LED（二极管 + 出光箭头） */
export const SymLed = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H36" />
    <path d="M36 12 L36 36 L62 24 Z" fill={SILK} />
    <path d="M62 12 V36" />
    <path d="M62 24 H90" />
    <path d="M46 10 L56 2 M56 2 l-6 1 M56 2 l-1 6" />
    <path d="M56 14 L66 6 M66 6 l-6 1 M66 6 l-1 6" />
  </Frame>
);

/** 稳压管（阴极横杠两端折角） */
export const SymZener = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H36" />
    <path d="M36 12 L36 36 L62 24 Z" fill={SILK} />
    <path d="M68 8 L62 12 V36 L56 40" />
    <path d="M62 24 H90" />
  </Frame>
);

/** 开关（断开态） */
export const SymSwitch = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26" />
    <circle cx="30" cy="24" r="2.5" fill={SILK} />
    <path d="M30 24 L62 10" />
    <circle cx="66" cy="24" r="2.5" fill={SILK} />
    <path d="M70 24 H90" />
  </Frame>
);

/** 电位器（电阻体 + 滑动箭头） */
export const SymPot = () => (
  <Frame ports={[[6, 24], [90, 24], [48, 4]]}>
    <path d="M6 24 H26" />
    <rect x="26" y="15" width="44" height="18" />
    <path d="M70 24 H90" />
    <path d="M48 38 L48 12" />
    <path d="M48 12 l-4 6 M48 12 l4 6" />
    <path d="M48 12 V6" />
  </Frame>
);

/** NPN 三极管（发射极箭头朝外） */
export const SymNpn = () => (
  <Frame ports={[[6, 24], [90, 10], [90, 38]]}>
    <circle cx="46" cy="24" r="17" />
    <path d="M6 24 H38" />
    <path d="M38 13 V35" />
    <path d="M38 19 L68 10 H90" />
    <path d="M38 29 L64 37" />
    <path d="M64 37 l-8 -1 M64 37 l-2 -7" />
    <path d="M64 37 H90" />
  </Frame>
);

/** NMOS（体二极管箭头指向沟道） */
export const SymNmos = () => (
  <Frame ports={[[6, 24], [90, 10], [90, 38]]}>
    <path d="M6 24 H30" />
    <path d="M32 12 V36" />
    <path d="M38 12 V20 M38 22 V26 M38 28 V36" />
    <path d="M38 16 H66 V10 H90" />
    <path d="M38 24 H52" />
    <path d="M52 20 L52 28 L44 24 Z" fill={SILK} />
    <path d="M52 24 H66 V38 H90" />
  </Frame>
);

/** PMOS（栅极反相圈 + 箭头背向沟道） */
export const SymPmos = () => (
  <Frame ports={[[6, 24], [90, 10], [90, 38]]}>
    <path d="M6 24 H22" />
    <circle cx="27" cy="24" r="3.5" />
    <path d="M32 12 V36" />
    <path d="M38 12 V20 M38 22 V26 M38 28 V36" />
    <path d="M38 16 H66 V10 H90" />
    <path d="M38 24 H46" />
    <path d="M46 20 L46 28 L54 24 Z" fill={SILK} />
    <path d="M54 24 H66 V38 H90" />
  </Frame>
);

/** 运放（三角，上 − 下 +） */
export const SymOpamp = () => (
  <Frame ports={[[6, 15], [6, 33], [90, 24]]}>
    <path d="M24 6 L24 42 L74 24 Z" />
    <path d="M6 15 H24 M6 33 H24" />
    <path d="M74 24 H90" />
    <path d="M28 15 h7" />
    <path d="M28 33 h7 M31.5 29.5 v7" />
  </Frame>
);

/** 晶振（两电极夹晶体片） */
export const SymCrystal = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26" />
    <path d="M26 12 V36" />
    <rect x="34" y="8" width="28" height="32" />
    <path d="M70 12 V36" />
    <path d="M70 24 H90" />
  </Frame>
);

/** 天线（辐射弧） */
export const SymAntenna = () => (
  <Frame ports={[[48, 44]]}>
    <path d="M48 44 V26" />
    <path d="M48 26 L34 12 M48 26 L62 12" />
    <path d="M40 20 a12 12 0 0 1 16 0" transform="translate(0,-12)" />
    <path d="M34 12 a20 20 0 0 1 28 0" transform="translate(0,-8)" />
  </Frame>
);

/** 保险丝（IEC 矩形穿线） */
export const SymFuse = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H90" />
    <rect x="26" y="14" width="44" height="20" />
  </Frame>
);

/** ESP32 模组（IC 块 + 天线区 + 两侧引脚） */
export const SymEsp32 = () => (
  <Frame ports={[[14, 14], [14, 24], [14, 34], [82, 14], [82, 24], [82, 34]]}>
    <rect x="22" y="6" width="52" height="36" rx="3" />
    <path d="M14 14 H22 M14 24 H22 M14 34 H22" />
    <path d="M74 14 H82 M74 24 H82 M74 34 H82" />
    <path d="M30 12 h10 M30 18 h16" strokeWidth={1.5} />
    <path d="M60 34 a6 6 0 0 1 8 0 M58 30 a10 10 0 0 1 12 0" strokeWidth={1.5} />
    <text
      x="34"
      y="33"
      fill={SILK}
      stroke="none"
      fontSize="9"
      fontFamily="JetBrains Mono, monospace"
    >
      ESP32
    </text>
  </Frame>
);

export const SYMBOLS: Record<string, () => JSX.Element> = {
  resistor: SymResistor,
  capacitor: SymCapacitor,
  inductor: SymInductor,
  diode: SymDiode,
  led: SymLed,
  zener: SymZener,
  switch: SymSwitch,
  pot: SymPot,
  npn: SymNpn,
  pmos: SymPmos,
  nmos: SymNmos,
  opamp: SymOpamp,
  crystal: SymCrystal,
  antenna: SymAntenna,
  fuse: SymFuse,
  esp32: SymEsp32,
};

export function ComponentSymbol({ id, className }: { id: string; className?: string }) {
  const Sym = SYMBOLS[id] ?? SymResistor;
  return (
    <div className={className}>
      <Sym />
    </div>
  );
}
