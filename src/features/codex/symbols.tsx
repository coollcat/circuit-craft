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

/** 直流电源（圆圈 + 正负号） */
export const SymVsrc = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H32" />
    <circle cx="48" cy="24" r="16" />
    <path d="M64 24 H90" />
    <path d="M42 14 h8 M46 10 v8" />
    <path d="M42 36 h8" />
  </Frame>
);

/** 电池（长短极板对） */
export const SymBattery = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H36" />
    <path d="M36 12 V36" />
    <path d="M44 18 V30" strokeWidth={4} />
    <path d="M52 12 V36" />
    <path d="M60 18 V30" strokeWidth={4} />
    <path d="M60 24 H90" />
    <path d="M28 8 h6 M31 5 v6" strokeWidth={1.5} />
    <path d="M62 8 h6" strokeWidth={1.5} />
  </Frame>
);

/** 接地（倒塔三线） */
export const SymGnd = () => (
  <Frame ports={[[48, 6]]}>
    <path d="M48 6 V22" />
    <path d="M32 22 H64" />
    <path d="M38 30 H58" />
    <path d="M44 38 H52" />
  </Frame>
);

/** 电压表（圆圈 V） */
export const SymVoltmeter = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H32" />
    <circle cx="48" cy="24" r="16" />
    <path d="M64 24 H90" />
    <path d="M41 17 L48 32 L55 17" />
  </Frame>
);

/** 电流表（圆圈 A） */
export const SymAmmeter = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H32" />
    <circle cx="48" cy="24" r="16" />
    <path d="M64 24 H90" />
    <path d="M42 32 L48 16 L54 32 M44.5 26.5 H51.5" />
  </Frame>
);

/** 函数发生器（方框内正弦波） */
export const SymFuncgen = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26" />
    <rect x="26" y="8" width="44" height="32" rx="3" />
    <path d="M70 24 H90" />
    <path d="M32 24 q6 -12 12 0 q6 12 12 0" />
  </Frame>
);

/** 传感器（方框 + 斜向感知箭头） */
export const SymSensor = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26" />
    <rect x="26" y="12" width="44" height="24" />
    <path d="M70 24 H90" />
    <path d="M34 32 L62 16" />
    <path d="M62 16 l-8 1 M62 16 l-1 8" />
  </Frame>
);

/** 单片机（方框两侧排针 + MCU 字样） */
export const SymMcu = () => (
  <Frame ports={[[10, 14], [10, 24], [10, 34], [86, 14], [86, 24], [86, 34]]}>
    <rect x="24" y="6" width="48" height="36" rx="2" />
    <path d="M10 14 H24 M10 24 H24 M10 34 H24" />
    <path d="M72 14 H86 M72 24 H86 M72 34 H86" />
    <text x="34" y="29" fill={SILK} stroke="none" fontSize="10" fontFamily="JetBrains Mono, monospace">
      MCU
    </text>
  </Frame>
);

/** 通用 IC（方框 + 1 脚定位缺口） */
export const SymIc = () => (
  <Frame ports={[[14, 14], [14, 24], [14, 34], [82, 14], [82, 24], [82, 34]]}>
    <rect x="22" y="6" width="52" height="36" rx="2" />
    <path d="M14 14 H22 M14 24 H22 M14 34 H22" />
    <path d="M74 14 H82 M74 24 H82 M74 34 H82" />
    <path d="M44 6 a4 4 0 0 0 8 0" />
    <circle cx="30" cy="13" r="1.5" fill={SILK} />
  </Frame>
);

/** 功能模组（小板 + 排针 + 定位点） */
export const SymModule = () => (
  <Frame ports={[[14, 14], [14, 24], [14, 34], [82, 14], [82, 24], [82, 34]]}>
    <rect x="22" y="4" width="52" height="40" rx="3" />
    <path d="M14 14 H22 M14 24 H22 M14 34 H22" />
    <path d="M74 14 H82 M74 24 H82 M74 34 H82" />
    <rect x="30" y="12" width="20" height="14" rx="1.5" strokeWidth={1.5} />
    <path d="M56 12 h10 M56 17 h10 M56 22 h6" strokeWidth={1.5} />
    <circle cx="30" cy="36" r="1.5" fill={SILK} />
  </Frame>
);

/** 蜂鸣器（半圆罩 + 出声弧） */
export const SymBuzzer = () => (
  <Frame ports={[[48, 44]]}>
    <path d="M34 30 a14 14 0 0 1 28 0 Z" fill="none" stroke={SILK} strokeWidth={SW} />
    <circle cx="48" cy="22" r="1.5" fill={SILK} stroke="none" />
    <path d="M66 16 a10 10 0 0 1 0 12 M72 12 a16 16 0 0 1 0 20" />
    <path d="M48 30 V44" />
  </Frame>
);

/** 继电器（线圈框 + 触点） */
export const SymRelay = () => (
  <Frame ports={[[16, 12], [16, 36], [70, 12], [86, 12]]}>
    <rect x="16" y="6" width="16" height="36" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M16 42 L32 6" />
    <path d="M32 24 H54" strokeDasharray="3 3" />
    <circle cx="62" cy="16" r="2" fill={SILK} stroke="none" />
    <path d="M54 24 L62 16 M70 12 H62" />
    <path d="M62 16 L70 12" />
    <path d="M70 12 H86" />
  </Frame>
);

/** 直流电机（圆 + M + 双端子） */
export const SymMotor = () => (
  <Frame ports={[[48, 6], [48, 42]]}>
    <circle cx="48" cy="24" r="14" />
    <text x="48" y="29" fill={SILK} stroke="none" fontSize="12" textAnchor="middle" fontFamily="JetBrains Mono, monospace">M</text>
    <path d="M48 6 V10 M48 38 V42" />
  </Frame>
);

/** 舵机（方框 + 摇臂 + 三线） */
export const SymServo = () => (
  <Frame ports={[[10, 12], [10, 24], [10, 36]]}>
    <rect x="26" y="8" width="34" height="32" rx="3" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M43 24 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" />
    <path d="M43 24 L66 12" />
    <circle cx="66" cy="12" r="2" fill={SILK} stroke="none" />
    <path d="M10 12 H26 M10 24 H26 M10 36 H26" />
    <text x="64" y="40" fill={SILK} stroke="none" fontSize="8" fontFamily="JetBrains Mono, monospace">SV</text>
  </Frame>
);

/** 数码管（方框 + 8.） */
export const SymSeg7 = () => (
  <Frame ports={[[20, 10], [20, 24], [20, 38]]}>
    <rect x="28" y="4" width="26" height="40" rx="2" fill="none" stroke={SILK} strokeWidth={SW} />
    <text x="41" y="30" fill={SILK} stroke="none" fontSize="18" textAnchor="middle" fontFamily="JetBrains Mono, monospace">8</text>
    <circle cx="48" cy="38" r="1.5" fill={SILK} stroke="none" />
    <path d="M20 10 H28 M20 24 H28 M20 38 H28" />
  </Frame>
);

/** 光敏电阻（可变电阻 + 两道入光箭头） */
export const SymLdr = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26 M70 24 H90" />
    <rect x="26" y="15" width="44" height="18" />
    <path d="M34 32 L62 16" />
    <path d="M62 16 l-8 1 M62 16 l-1 8" />
    <path d="M30 6 L38 12 M38 12 l-6 0 M38 12 l0 6 M44 4 L52 10 M52 10 l-6 0 M52 10 l0 6" />
  </Frame>
);

/** 热敏电阻（电阻 + 斜杠 t°） */
export const SymThermistor = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H26 M70 24 H90" />
    <rect x="26" y="15" width="44" height="18" />
    <path d="M30 12 L44 36" />
    <text x="52" y="38" fill={SILK} stroke="none" fontSize="9" fontFamily="JetBrains Mono, monospace">t°</text>
  </Frame>
);

/** 肖特基二极管（阴极 S 形折角） */
export const SymSchottky = () => (
  <Frame ports={[[6, 24], [90, 24]]}>
    <path d="M6 24 H36" />
    <path d="M36 12 L36 36 L62 24 Z" fill={SILK} />
    <path d="M62 12 V36 M62 24 H90" />
    <path d="M56 12 H62 V17 M62 31 V36 H68" />
  </Frame>
);

/** 线性稳压器（三端框 IN-GND-OUT） */
export const SymLdo = () => (
  <Frame ports={[[10, 24], [48, 44], [86, 24]]}>
    <rect x="24" y="8" width="48" height="28" rx="2" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M10 24 H24 M72 24 H86 M48 36 V44" />
    <text x="48" y="28" fill={SILK} stroke="none" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">7805</text>
  </Frame>
);

/** 555 定时器（8 脚框） */
export const Sym555 = () => (
  <Frame ports={[[14, 12], [14, 24], [14, 36], [82, 12], [82, 24], [82, 36]]}>
    <rect x="22" y="4" width="52" height="40" rx="2" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M14 12 H22 M14 24 H22 M14 36 H22 M74 12 H82 M74 24 H82 M74 36 H82" />
    <text x="48" y="28" fill={SILK} stroke="none" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">555</text>
    <path d="M44 4 a4 4 0 0 0 8 0" />
  </Frame>
);

/** 变压器（两组对置线圈） */
export const SymTransformer = () => (
  <Frame ports={[[6, 12], [6, 36], [90, 12], [90, 36]]}>
    <path d="M6 12 H22 M6 36 H22 M74 12 H90 M74 36 H90" />
    <path d="M22 12 a5 5 0 0 1 0 10 a5 5 0 0 1 0 -10 M22 26 a5 5 0 0 1 0 10 a5 5 0 0 1 0 -10" />
    <path d="M40 8 V40 M46 8 V40" />
    <path d="M74 12 a5 5 0 0 0 0 10 a5 5 0 0 0 0 -10 M74 26 a5 5 0 0 0 0 10 a5 5 0 0 0 0 -10" />
  </Frame>
);

/** 扬声器（喇叭 + 声波） */
export const SymSpeaker = () => (
  <Frame ports={[[10, 24]]}>
    <path d="M10 24 H28" />
    <path d="M28 18 h8 v12 h-8 Z" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M36 18 L52 8 V40 L36 30" fill="none" stroke={SILK} strokeWidth={SW} />
    <path d="M58 18 a8 8 0 0 1 0 12 M64 13 a16 16 0 0 1 0 22" />
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
  vsrc: SymVsrc,
  battery: SymBattery,
  gnd: SymGnd,
  voltmeter: SymVoltmeter,
  ammeter: SymAmmeter,
  funcgen: SymFuncgen,
  sensor: SymSensor,
  mcu: SymMcu,
  ic: SymIc,
  module: SymModule,
  // Wave 8 新增元件符号
  buzzer: SymBuzzer,
  relay: SymRelay,
  dcmotor: SymMotor,
  servo: SymServo,
  seg7: SymSeg7,
  ldr: SymLdr,
  thermistor: SymThermistor,
  schottky: SymSchottky,
  ldo7805: SymLdo,
  timer555: Sym555,
  transformer: SymTransformer,
  speaker: SymSpeaker,
};

export function ComponentSymbol({ id, className }: { id: string; className?: string }) {
  const Sym = SYMBOLS[id] ?? SymResistor;
  return (
    <div className={className}>
      <Sym />
    </div>
  );
}
