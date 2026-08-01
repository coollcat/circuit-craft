/* eslint-disable react-refresh/only-export-components */
// 编辑器 — 元件原理图符号（SVG）+ 端口几何 + 参数编辑元数据
// 统一 2px 线宽、silk-100 描边、端口 sig-cyan 圆点；局部坐标，元件中心为原点。
import type { ComponentSpec, ComponentType } from '@/engine/types';
import { PORT_NAMES, DEFAULT_PARAMS } from '@/engine/solver';

export interface PortGeom { name: string; x: number; y: number }

/** 端口局部坐标（未旋转），单位 px，16 网格对齐 */
export const PORT_GEOM: Record<ComponentType, PortGeom[]> = {
  vsrc: [{ name: 'pos', x: -32, y: 0 }, { name: 'neg', x: 32, y: 0 }],
  battery: [{ name: 'pos', x: -32, y: 0 }, { name: 'neg', x: 32, y: 0 }],
  gnd: [{ name: 'gnd', x: 0, y: -20 }],
  resistor: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  capacitor: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  inductor: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  pot: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }, { name: 'w', x: 0, y: -28 }],
  diode: [{ name: 'a', x: -32, y: 0 }, { name: 'k', x: 32, y: 0 }],
  led: [{ name: 'a', x: -32, y: 0 }, { name: 'k', x: 32, y: 0 }],
  zener: [{ name: 'a', x: -32, y: 0 }, { name: 'k', x: 32, y: 0 }],
  switch: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  button: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  npn: [{ name: 'b', x: -32, y: 0 }, { name: 'c', x: 16, y: -24 }, { name: 'e', x: 16, y: 24 }],
  nmos: [{ name: 'g', x: -32, y: 0 }, { name: 'd', x: 16, y: -24 }, { name: 's', x: 16, y: 24 }],
  pmos: [{ name: 'g', x: -32, y: 0 }, { name: 'd', x: 16, y: -24 }, { name: 's', x: 16, y: 24 }],
  opamp: [
    { name: 'inp', x: -32, y: -14 }, { name: 'inn', x: -32, y: 14 }, { name: 'out', x: 40, y: 0 },
    { name: 'vcc', x: 0, y: -34 }, { name: 'vee', x: 0, y: 34 },
  ],
  crystal: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  antenna: [{ name: 'a', x: 0, y: 24 }],
  sensor: [{ name: 'vcc', x: 0, y: -30 }, { name: 'gnd', x: 0, y: 30 }, { name: 'out', x: 32, y: 0 }],
  mcu: [
    { name: 'vcc', x: 0, y: -40 }, { name: 'gnd', x: 0, y: 40 },
    { name: 'p0', x: 32, y: -24 }, { name: 'p1', x: 32, y: -8 },
    { name: 'p2', x: 32, y: 8 }, { name: 'p3', x: 32, y: 24 },
  ],
  ic: [{ name: 'in', x: -32, y: 0 }, { name: 'out', x: 32, y: 0 }, { name: 'gnd', x: 0, y: 30 }],
  fuse: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  funcgen: [{ name: 'out', x: 32, y: 0 }, { name: 'gnd', x: -32, y: 0 }],
  voltmeter: [{ name: 'pos', x: -32, y: 0 }, { name: 'neg', x: 32, y: 0 }],
  ammeter: [{ name: 'a', x: -32, y: 0 }, { name: 'b', x: 32, y: 0 }],
  module: [
    { name: 'in', x: -32, y: -12 }, { name: 'out', x: 32, y: -12 },
    { name: 'vcc', x: -32, y: 12 }, { name: 'gnd', x: 32, y: 12 },
  ],
};

/** 元件包围盒半径（点击命中用） */
export const COMP_RADIUS: Partial<Record<ComponentType, number>> = {
  opamp: 50, mcu: 56, module: 44, sensor: 42,
};

export function rotatePt(x: number, y: number, rot: 0 | 90 | 180 | 270): { x: number; y: number } {
  switch (rot) {
    case 90: return { x: -y, y: x };
    case 180: return { x: -x, y: -y };
    case 270: return { x: y, y: -x };
    default: return { x, y };
  }
}

/** 端口世界坐标 */
export function portWorldPos(comp: ComponentSpec, port: string): { x: number; y: number } {
  const g = PORT_GEOM[comp.type].find(p => p.name === port);
  if (!g) return { x: comp.x, y: comp.y };
  const r = rotatePt(g.x, g.y, comp.rotation ?? 0);
  return { x: comp.x + r.x, y: comp.y + r.y };
}

export function compRadius(comp: ComponentSpec): number {
  return COMP_RADIUS[comp.type] ?? 40;
}

const S = { stroke: '#F2EFE3', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const LEAD = (x1: number, y1: number, x2: number, y2: number, key: string) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...S} />
);

/** 元件符号主体（不含端口圆点/位号），中心原点，未旋转 */
export function SymbolGlyph({ type, closed, burned }: { type: ComponentType; closed?: boolean; burned?: boolean }) {
  const stroke = burned ? '#55524A' : '#F2EFE3';
  const P = { ...S, stroke };
  switch (type) {
    case 'battery':
      return (<g {...P}>
        {LEAD(-32, 0, -14, 0, 'l1')}{LEAD(14, 0, 32, 0, 'l2')}
        <line x1={-14} y1={-12} x2={-14} y2={12} {...P} />
        <line x1={14} y1={-5} x2={14} y2={5} {...P} strokeWidth={3} />
        <text x={-14} y={-16} fontSize={10} fill="#C9803C" textAnchor="middle" stroke="none">+</text>
      </g>);
    case 'vsrc':
      return (<g {...P}>
        {LEAD(-32, 0, -16, 0, 'l1')}{LEAD(16, 0, 32, 0, 'l2')}
        <circle r={16} {...P} />
        <text x={-6} y={-4} fontSize={9} fill="#C9803C" stroke="none">+</text>
        <text x={4} y={12} fontSize={9} fill="#8E8976" stroke="none">−</text>
      </g>);
    case 'gnd':
      return (<g {...P}>
        {LEAD(0, -20, 0, -6, 'l')}
        <line x1={-12} y1={-6} x2={12} y2={-6} {...P} />
        <line x1={-7} y1={0} x2={7} y2={0} {...P} />
        <line x1={-3} y1={6} x2={3} y2={6} {...P} />
      </g>);
    case 'resistor':
      return (<g {...P}>
        {LEAD(-32, 0, -20, 0, 'l1')}{LEAD(20, 0, 32, 0, 'l2')}
        <path d="M-20 0 L-15 -8 L-5 8 L5 -8 L15 8 L20 0" {...P} />
      </g>);
    case 'capacitor':
      return (<g {...P}>
        {LEAD(-32, 0, -4, 0, 'l1')}{LEAD(4, 0, 32, 0, 'l2')}
        <line x1={-4} y1={-12} x2={-4} y2={12} {...P} />
        <line x1={4} y1={-12} x2={4} y2={12} {...P} />
      </g>);
    case 'inductor':
      return (<g {...P}>
        {LEAD(-32, 0, -24, 0, 'l1')}{LEAD(24, 0, 32, 0, 'l2')}
        <path d="M-24 0 A6 6 0 0 1 -12 0 A6 6 0 0 1 0 0 A6 6 0 0 1 12 0 A6 6 0 0 1 24 0" {...P} />
      </g>);
    case 'pot':
      return (<g {...P}>
        {LEAD(-32, 0, -20, 0, 'l1')}{LEAD(20, 0, 32, 0, 'l2')}
        <path d="M-20 0 L-15 -8 L-5 8 L5 -8 L15 8 L20 0" {...P} />
        {LEAD(0, -28, 0, -10, 'w')}
        <path d="M-4 -12 L0 -8 L4 -12" {...P} />
      </g>);
    case 'diode':
      return (<g {...P}>
        {LEAD(-32, 0, -10, 0, 'l1')}{LEAD(10, 0, 32, 0, 'l2')}
        <path d="M-10 -9 L-10 9 L10 0 Z" {...P} fill={stroke} />
        <line x1={10} y1={-9} x2={10} y2={9} {...P} />
      </g>);
    case 'led':
      return (<g {...P}>
        {LEAD(-32, 0, -10, 0, 'l1')}{LEAD(10, 0, 32, 0, 'l2')}
        <path d="M-10 -9 L-10 9 L10 0 Z" {...P} fill={stroke} />
        <line x1={10} y1={-9} x2={10} y2={9} {...P} />
        <path d="M2 -12 L10 -20 M10 -20 l-5 0 M10 -20 l0 5" {...P} stroke={burned ? stroke : '#FFB84D'} />
        <path d="M-4 -10 L4 -18 M4 -18 l-5 0 M4 -18 l0 5" {...P} stroke={burned ? stroke : '#FFB84D'} />
      </g>);
    case 'zener':
      return (<g {...P}>
        {LEAD(-32, 0, -10, 0, 'l1')}{LEAD(10, 0, 32, 0, 'l2')}
        <path d="M-10 -9 L-10 9 L10 0 Z" {...P} fill={stroke} />
        <path d="M6 -9 L10 -9 L10 9 L14 9" {...P} />
      </g>);
    case 'switch':
      return (<g {...P}>
        {LEAD(-32, 0, -14, 0, 'l1')}{LEAD(14, 0, 32, 0, 'l2')}
        <circle cx={-14} cy={0} r={2.5} fill={stroke} stroke="none" />
        <circle cx={14} cy={0} r={2.5} fill={stroke} stroke="none" />
        <line x1={-13} y1={0} x2={closed ? 13 : 10} y2={closed ? 0 : -14} {...P} />
      </g>);
    case 'button':
      return (<g {...P}>
        {LEAD(-32, 0, -14, 0, 'l1')}{LEAD(14, 0, 32, 0, 'l2')}
        <circle cx={-14} cy={0} r={2.5} fill={stroke} stroke="none" />
        <circle cx={14} cy={0} r={2.5} fill={stroke} stroke="none" />
        {closed ? LEAD(-14, 0, 14, 0, 'c') : <path d="M-14 -8 H14 M0 -8 V-2" {...P} />}
      </g>);
    case 'npn':
      return (<g {...P}>
        {LEAD(-32, 0, -8, 0, 'lb')}
        <line x1={-8} y1={-14} x2={-8} y2={14} {...P} />
        {LEAD(-8, -5, 16, -24, 'lc')}{LEAD(-8, 5, 16, 24, 'le')}
        <path d="M10 16 L16 24 L6 20" {...P} fill={stroke} />
      </g>);
    case 'nmos': case 'pmos':
      return (<g {...P}>
        {LEAD(-32, 0, -12, 0, 'lg')}
        <line x1={-12} y1={-12} x2={-12} y2={12} {...P} />
        <line x1={-6} y1={-16} x2={-6} y2={16} {...P} />
        {LEAD(-6, -10, 16, -10, 'd1')}{LEAD(16, -10, 16, -24, 'd2')}
        {LEAD(-6, 10, 16, 10, 's1')}{LEAD(16, 10, 16, 24, 's2')}
        {type === 'pmos' && <circle cx={-16} cy={0} r={3.5} {...P} />}
      </g>);
    case 'opamp':
      return (<g {...P}>
        <path d="M-32 -26 L-32 26 L40 0 Z" {...P} />
        {LEAD(-32, -14, -44, -14, 'in+')}{LEAD(-32, 14, -44, 14, 'in-')}
        {LEAD(40, 0, 52, 0, 'out')}
        {LEAD(0, -34, -8, -34, 'v1')}{LEAD(-8, -34, -8, -20, 'v2')}
        {LEAD(0, 34, -8, 34, 'e1')}{LEAD(-8, 34, -8, 20, 'e2')}
        <text x={-27} y={-9} fontSize={11} fill="#C9803C" stroke="none">+</text>
        <text x={-27} y={22} fontSize={11} fill="#8E8976" stroke="none">−</text>
      </g>);
    case 'crystal':
      return (<g {...P}>
        {LEAD(-32, 0, -10, 0, 'l1')}{LEAD(10, 0, 32, 0, 'l2')}
        <rect x={-10} y={-10} width={20} height={20} rx={3} {...P} />
        <line x1={-4} y1={-12} x2={-4} y2={12} {...P} />
        <line x1={4} y1={-12} x2={4} y2={12} {...P} />
      </g>);
    case 'antenna':
      return (<g {...P}>
        {LEAD(0, 24, 0, 4, 'l')}
        <path d="M0 4 L-10 -12 M0 4 L10 -12 M0 4 L0 -14" {...P} />
      </g>);
    case 'sensor':
      return (<g {...P}>
        <rect x={-22} y={-22} width={44} height={44} rx={6} {...P} />
        <circle r={7} {...P} stroke="#45DCE8" />
        {LEAD(0, -30, 0, -22, 'v')}{LEAD(0, 30, 0, 22, 'g')}{LEAD(32, 0, 22, 0, 'o')}
        <text x={0} y={30} fontSize={8} fill="#8E8976" textAnchor="middle" stroke="none">SEN</text>
      </g>);
    case 'mcu':
      return (<g {...P}>
        <rect x={-28} y={-34} width={56} height={68} rx={4} {...P} />
        {LEAD(0, -40, 0, -34, 'v')}{LEAD(0, 40, 0, 34, 'g')}
        {LEAD(32, -24, 28, -24, 'p0')}{LEAD(32, -8, 28, -8, 'p1')}
        {LEAD(32, 8, 28, 8, 'p2')}{LEAD(32, 24, 28, 24, 'p3')}
        <text x={0} y={-12} fontSize={10} fill="#5B8DEF" textAnchor="middle" stroke="none" fontFamily="JetBrains Mono">MCU</text>
        <text x={20} y={-20} fontSize={7} fill="#8E8976" textAnchor="end" stroke="none">P0</text>
        <text x={20} y={-4} fontSize={7} fill="#8E8976" textAnchor="end" stroke="none">P1</text>
        <text x={20} y={12} fontSize={7} fill="#8E8976" textAnchor="end" stroke="none">P2</text>
        <text x={20} y={28} fontSize={7} fill="#8E8976" textAnchor="end" stroke="none">P3</text>
      </g>);
    case 'ic':
      return (<g {...P}>
        <rect x={-24} y={-18} width={48} height={36} rx={4} {...P} />
        {LEAD(-32, 0, -24, 0, 'i')}{LEAD(32, 0, 24, 0, 'o')}{LEAD(0, 30, 0, 18, 'g')}
        <text x={0} y={4} fontSize={9} fill="#45DCE8" textAnchor="middle" stroke="none" fontFamily="JetBrains Mono">LDO</text>
      </g>);
    case 'fuse':
      return (<g {...P}>
        {LEAD(-32, 0, -18, 0, 'l1')}{LEAD(18, 0, 32, 0, 'l2')}
        <rect x={-18} y={-7} width={36} height={14} rx={7} {...P} />
        <path d={burned ? 'M-8 2 L8 -2 M-6 -3 L6 3' : 'M-14 0 H14'} {...P} />
      </g>);
    case 'funcgen':
      return (<g {...P}>
        <circle r={18} {...P} />
        {LEAD(32, 0, 18, 0, 'o')}{LEAD(-32, 0, -18, 0, 'g')}
        <path d="M-10 0 Q-5 -10 0 0 Q5 10 10 0" {...P} stroke="#45DCE8" />
      </g>);
    case 'voltmeter':
      return (<g {...P}>
        <circle r={16} {...P} />
        {LEAD(-32, 0, -16, 0, 'p')}{LEAD(16, 0, 32, 0, 'n')}
        <text x={0} y={5} fontSize={13} fill="#45DCE8" textAnchor="middle" stroke="none" fontFamily="JetBrains Mono">V</text>
      </g>);
    case 'ammeter':
      return (<g {...P}>
        <circle r={16} {...P} />
        {LEAD(-32, 0, -16, 0, 'p')}{LEAD(16, 0, 32, 0, 'n')}
        <text x={0} y={5} fontSize={13} fill="#E56BD6" textAnchor="middle" stroke="none" fontFamily="JetBrains Mono">A</text>
      </g>);
    case 'module':
      return (<g {...P}>
        <rect x={-26} y={-22} width={52} height={44} rx={4} {...P} />
        {LEAD(-32, -12, -26, -12, 'i')}{LEAD(32, -12, 26, -12, 'o')}
        {LEAD(-32, 12, -26, 12, 'v')}{LEAD(32, 12, 26, 12, 'g')}
        <text x={0} y={4} fontSize={9} fill="#5B8DEF" textAnchor="middle" stroke="none" fontFamily="JetBrains Mono">RF</text>
      </g>);
  }
}

/* ---------------------------------- 参数编辑元数据 ---------------------------------- */

export interface ParamField {
  key: string;
  label: string;
  unit?: string;
  min?: number; max?: number;
  log?: boolean;
  step?: number;
  options?: { value: string; label: string }[];
  toggle?: boolean;
  help?: string;
}

export const PARAM_SCHEMA: Partial<Record<ComponentType, ParamField[]>> = {
  battery: [{ key: 'voltage', label: '电压', unit: 'V', min: 0.5, max: 24, step: 0.5, help: '电池电动势' }],
  vsrc: [{ key: 'voltage', label: '电压', unit: 'V', min: -24, max: 24, step: 0.1 }],
  resistor: [
    { key: 'resistance', label: '阻值', unit: 'Ω', min: 1, max: 10e6, log: true, help: '阻值越大，电流越小' },
    { key: 'power', label: '额定功率', unit: 'W', min: 0.25, max: 5, step: 0.25 },
  ],
  capacitor: [{ key: 'capacitance', label: '容值', unit: 'F', min: 1e-12, max: 1e-3, log: true, help: '容值越大，充放电越慢' }],
  inductor: [{ key: 'inductance', label: '感值', unit: 'H', min: 1e-6, max: 1, log: true }],
  pot: [
    { key: 'resistance', label: '总阻值', unit: 'Ω', min: 100, max: 1e6, log: true },
    { key: 'wiper', label: '抽头位置', min: 0, max: 1, step: 0.01, help: '0 = 靠近 b 端，1 = 靠近 a 端' },
  ],
  diode: [{ key: 'vf', label: '正向压降', unit: 'V', min: 0.2, max: 1.2, step: 0.05 }],
  led: [
    { key: 'vf', label: '正向压降', unit: 'V', min: 1.6, max: 3.6, step: 0.1, help: '红光≈2V，蓝白光≈3V' },
    { key: 'imax', label: '额定电流', unit: 'A', min: 0.005, max: 0.05, step: 0.005 },
  ],
  zener: [
    { key: 'vf', label: '正向压降', unit: 'V', min: 0.5, max: 1, step: 0.05 },
    { key: 'vz', label: '稳压值', unit: 'V', min: 2, max: 24, step: 0.1 },
  ],
  switch: [{ key: 'closed', label: '闭合', toggle: true, help: '开=1GΩ / 合=1mΩ' }],
  button: [{ key: 'closed', label: '按下', toggle: true }],
  npn: [
    { key: 'vf', label: 'Vbe', unit: 'V', min: 0.5, max: 0.9, step: 0.05 },
    { key: 'beta', label: 'β 放大倍数', min: 20, max: 400, step: 10 },
  ],
  nmos: [{ key: 'vt', label: '阈值电压', unit: 'V', min: 0.5, max: 5, step: 0.1 }],
  pmos: [{ key: 'vt', label: '阈值电压', unit: 'V', min: 0.5, max: 5, step: 0.1 }],
  opamp: [{ key: 'gain', label: '开环增益', min: 1e3, max: 1e7, log: true }],
  funcgen: [
    { key: 'waveform', label: '波形', options: [{ value: 'sine', label: '正弦' }, { value: 'square', label: '方波' }, { value: 'triangle', label: '三角' }] },
    { key: 'freq', label: '频率', unit: 'Hz', min: 0.1, max: 1e9, log: true },
    { key: 'vmin', label: '低电平', unit: 'V', min: -15, max: 15, step: 0.1 },
    { key: 'vmax', label: '高电平', unit: 'V', min: -15, max: 15, step: 0.1 },
    { key: 'duty', label: '占空比', min: 0.05, max: 0.95, step: 0.05 },
  ],
  sensor: [{ key: 'output', label: '输出电压', unit: 'V', min: 0, max: 5, step: 0.01, help: '教学近似：传感器 = 可调电压源' }],
  mcu: [
    { key: 'pinVoltage', label: 'IO 高电平', unit: 'V', min: 1.8, max: 5, step: 0.1 },
    { key: 'current', label: '静态电流', unit: 'mA', min: 1, max: 200, step: 1 },
    { key: 'fs', label: '采样率', unit: 'Hz', min: 10, max: 100000, log: true, help: 'ADC 每秒采样次数；奈奎斯特：fs > 2 × 信号最高频率' },
    { key: 'p0', label: 'P0 输出高', toggle: true }, { key: 'p1', label: 'P1 输出高', toggle: true },
    { key: 'p2', label: 'P2 输出高', toggle: true }, { key: 'p3', label: 'P3 输出高', toggle: true },
  ],
  ic: [{ key: 'vout', label: '输出电压', unit: 'V', min: 1.2, max: 12, step: 0.1 }],
  antenna: [{ key: 'impedance', label: '阻抗', unit: 'Ω', min: 10, max: 600, step: 1, help: '教学近似：对地纯阻' }],
  fuse: [{ key: 'rating', label: '熔断电流', unit: 'A', min: 0.05, max: 5, step: 0.05 }],
  crystal: [{ key: 'capacitance', label: '等效电容', unit: 'F', min: 1e-12, max: 100e-12, log: true }],
};

export function defaultParamsFor(type: ComponentType): Record<string, number | string | boolean> {
  return { ...DEFAULT_PARAMS[type] };
}
export function portNamesOf(type: ComponentType): string[] {
  return PORT_NAMES[type];
}
