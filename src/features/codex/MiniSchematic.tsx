/* eslint-disable react-refresh/only-export-components */
// 图鉴「原理图看一看」——手绘风典型应用小电路
// 风格与 codex/symbols.tsx 一致：silk-100 描边 2px、JetBrains Mono 标注、sig-cyan 节点
// 颜色走 --col-* 主题变量（经 style 消费），明暗主题自动跟随
import type { JSX } from 'react';

const SILK = 'var(--col-silk-100)';
const CYAN = 'var(--col-sig-cyan)';
const COPPER = 'rgb(var(--cc-copper-300))';
const NOTE = 'var(--col-silk-500)';

/* ---------------- 基础件（全部为绝对坐标、水平取向） ---------------- */

function W({ d, copper }: { d: string; copper?: boolean }) {
  return <path d={d} style={{ stroke: copper ? COPPER : SILK }} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

function T({ x, y, c = NOTE, s = 10, anchor = 'middle', children }: { x: number; y: number; c?: string; s?: number; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode }) {
  return <text x={x} y={y} style={{ fill: c }} fontSize={s} textAnchor={anchor} fontFamily="JetBrains Mono, monospace" stroke="none">{children}</text>;
}

/** 节点圆点 */
function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} style={{ fill: CYAN }} stroke="none" />;
}

/**
 * 取向辅助：基础符号默认水平（引脚在 x±24），v=true 时整体顺时针转 90°（引脚落到 y±24），
 * 用于竖直支路；flip=true 改为逆时针 90°，用于二极管这类有极性、需要阴极朝上的场合。
 * 标注文字不进旋转组，始终水平可读。
 */
function rot(v: boolean | undefined, x: number, y: number, flip?: boolean): string | undefined {
  return v ? `rotate(${flip ? -90 : 90} ${x} ${y})` : undefined;
}

/** 电阻：中心 (x,y)，引脚水平；v=true 竖直 */
function Res({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 14} M${x + 14} ${y} H${x + 24}`} />
        <rect x={x - 14} y={y - 6} width={28} height={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      </g>
      {label && (v ? <T x={x + 12} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y - 10}>{label}</T>)}
    </g>
  );
}

/** 电容（polar 时标 + 号）；v=true 竖直 */
function Cap({ x, y, label, polar, v }: { x: number; y: number; label?: string; polar?: boolean; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 3} M${x + 3} ${y} H${x + 24}`} />
        <W d={`M${x - 3} ${y - 10} V${y + 10} M${x + 3} ${y - 10} V${y + 10}`} />
        {polar && <T x={x - 8} y={y - 13} c={COPPER}>+</T>}
      </g>
      {label && (v ? <T x={x + 12} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y + 22}>{label}</T>)}
    </g>
  );
}

/** 电感：三段半圆；v=true 竖直 */
function Ind({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 15} M${x + 15} ${y} H${x + 24}`} />
        <W d={`M${x - 15} ${y} a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0`} />
      </g>
      {label && (v ? <T x={x + 14} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y - 10}>{label}</T>)}
    </g>
  );
}

/** 二极管族：led 加出光箭头，zener/schottky 阴极折角；v=true 竖直（默认阴极朝下），flip=true 阴极朝上 */
function Dio({ x, y, label, led, zener, schottky, v, flip }: { x: number; y: number; label?: string; led?: boolean; zener?: boolean; schottky?: boolean; v?: boolean; flip?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y, flip)}>
        <W d={`M${x - 24} ${y} H${x - 10}`} />
        <path d={`M${x - 10} ${y - 8} L${x - 10} ${y + 8} L${x + 8} ${y} Z`} style={{ fill: SILK }} stroke="none" />
        <W d={`M${x + 8} ${y - 8} V${y + 8} M${x + 8} ${y} H${x + 24}`} />
        {zener && <W d={`M${x + 2} ${y - 8} H${x + 8} M${x + 8} ${y + 8} H${x + 14}`} />}
        {schottky && <W d={`M${x + 2} ${y - 8} H${x + 8} V${y - 5} M${x + 8} ${y + 5} V${y + 8} H${x + 14}`} />}
        {led && <W d={`M${x - 2} ${y - 12} l6 -6 m0 0 l-4 1 m4 -1 l-1 4 M${x + 4} ${y - 10} l6 -6 m0 0 l-4 1 m4 -1 l-1 4`} />}
      </g>
      {label && (v ? <T x={x + 14} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y + 22}>{label}</T>)}
    </g>
  );
}

/** 接地 */
function Gnd({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <W d={`M${x} ${y} V${y + 8}`} />
      <W d={`M${x - 10} ${y + 8} H${x + 10} M${x - 6} ${y + 12} H${x + 6} M${x - 2} ${y + 16} H${x + 2}`} />
    </g>
  );
}

/** 电源轨（圆圈 + 标签） */
function Rail({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <W d={`M${x} ${y} V${y + 10}`} />
      <circle cx={x} cy={y - 2} r={3} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <T x={x} y={y - 8} c={COPPER}>{label}</T>
    </g>
  );
}

/** 电池（长正短负） */
function Batt({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x - 24} ${y} H${x - 4} M${x + 4} ${y} H${x + 24}`} />
      <W d={`M${x - 4} ${y - 12} V${y + 12} M${x + 4} ${y - 5} V${y + 5}`} />
      <T x={x - 10} y={y - 14} c={COPPER}>+</T>
      {label && <T x={x} y={y + 24}>{label}</T>}
    </g>
  );
}

/** 圆形电源（函数发生器/交流源） */
function Src({ x, y, label, wave }: { x: number; y: number; label?: string; wave?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      {wave
        ? <path d={`M${x - 8} ${y} q4 -10 8 0 q4 10 8 0`} transform={`translate(-4 0)`} style={{ stroke: SILK }} strokeWidth={1.5} fill="none" />
        : <><T x={x - 5} y={y - 1} s={9}>+</T><T x={x - 4} y={y + 9} s={9}>−</T></>}
      <W d={`M${x - 24} ${y} H${x - 13} M${x + 13} ${y} H${x + 24}`} />
      {label && <T x={x} y={y + 26}>{label}</T>}
    </g>
  );
}

/** 表头（V / A） */
function Meter({ x, y, ch }: { x: number; y: number; ch: 'V' | 'A' }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <T x={x} y={y + 4} c={SILK} s={11}>{ch}</T>
    </g>
  );
}

/** NPN 三极管（基极朝左，集电极上，发射极下） */
function Npn({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x - 24} ${y} H${x - 8} M${x - 8} ${y - 10} V${y + 10}`} />
      <W d={`M${x - 8} ${y - 4} L${x + 10} ${y - 16} M${x + 10} ${y - 16} V${y - 24}`} />
      <W d={`M${x - 8} ${y + 4} L${x + 10} ${y + 16} M${x + 10} ${y + 16} V${y + 24}`} />
      <path d={`M${x + 4} ${y + 11} L${x + 10} ${y + 16} L${x + 1} ${y + 15} Z`} style={{ fill: SILK }} stroke="none" />
      {label && <T x={x + 20} y={y + 4}>{label}</T>}
    </g>
  );
}

/** NMOS（简化符号） */
function Nmos({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x - 24} ${y} H${x - 10} M${x - 10} ${y - 10} V${y + 10}`} />
      <W d={`M${x - 6} ${y - 12} V${y + 12}`} />
      <W d={`M${x - 6} ${y - 8} H${x + 10} V${y - 24} M${x - 6} ${y + 8} H${x + 10} V${y + 24} M${x - 6} ${y} H${x + 2}`} />
      <path d={`M${x - 2} ${y - 4} L${x + 4} ${y} L${x - 2} ${y + 4} Z`} style={{ fill: SILK }} stroke="none" />
      {label && <T x={x + 20} y={y + 4}>{label}</T>}
    </g>
  );
}

/** PMOS（箭头反向） */
function Pmos({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x - 24} ${y} H${x - 10} M${x - 10} ${y - 10} V${y + 10}`} />
      <W d={`M${x - 6} ${y - 12} V${y + 12}`} />
      <W d={`M${x - 6} ${y - 8} H${x + 10} V${y - 24} M${x - 6} ${y + 8} H${x + 10} V${y + 24} M${x + 4} ${y} H${x + 10}`} />
      <path d={`M${x + 10} ${y - 4} L${x + 4} ${y} L${x + 10} ${y + 4} Z`} style={{ fill: SILK }} stroke="none" />
      {label && <T x={x + 20} y={y + 4}>{label}</T>}
    </g>
  );
}

/** 运放三角（− 上 + 下，输出朝右） */
function OpAmp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 16} ${y - 18} L${x - 16} ${y + 18} L${x + 18} ${y} Z`} fill="none" style={{ stroke: SILK }} strokeWidth={2} strokeLinejoin="round" />
      <T x={x - 10} y={y - 5} s={9}>−</T>
      <T x={x - 10} y={y + 13} s={9}>+</T>
      <W d={`M${x - 30} ${y - 8} H${x - 16} M${x - 30} ${y + 8} H${x - 16} M${x + 18} ${y} H${x + 30}`} />
    </g>
  );
}

/** 通用方框芯片（label 居中，左右引脚名可选） */
function BoxI({ x, y, w, h, label, lp, rp }: { x: number; y: number; w: number; h: number; label: string; lp?: string[]; rp?: string[] }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={3} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <T x={x} y={y + 3} c={SILK} s={11}>{label}</T>
      {(lp ?? []).map((p, i) => (
        <g key={`l${i}`}>
          <W d={`M${x - w / 2 - 12} ${y - h / 2 + 10 + i * 12} H${x - w / 2}`} />
          <T x={x - w / 2 + 4} y={y - h / 2 + 13 + i * 12} s={8} anchor="start">{p}</T>
        </g>
      ))}
      {(rp ?? []).map((p, i) => (
        <g key={`r${i}`}>
          <W d={`M${x + w / 2} ${y - h / 2 + 10 + i * 12} H${x + w / 2 + 12}`} />
          <T x={x + w / 2 - 4} y={y - h / 2 + 13 + i * 12} s={8} anchor="end">{p}</T>
        </g>
      ))}
    </g>
  );
}

/** 电位器（电阻 + 可调箭头）；v=true 竖直，抽头指针在右侧 */
function Pot({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 14} M${x + 14} ${y} H${x + 24}`} />
        <rect x={x - 14} y={y - 6} width={28} height={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
        <W d={`M${x + 10} ${y - 18} L${x - 4} ${y - 6}`} />
        <path d={`M${x - 4} ${y - 6} l8 -1 l-3 -6 Z`} style={{ fill: SILK }} stroke="none" />
        <W d={`M${x + 10} ${y - 18} V${y - 24}`} />
      </g>
      {label && (v ? <T x={x - 12} y={y + 4} anchor="end">{label}</T> : <T x={x} y={y - 10}>{label}</T>)}
    </g>
  );
}

/** 开关（常开拨杆）；v=true 竖直 */
function Sw({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 10} M${x + 10} ${y} H${x + 24}`} />
        <circle cx={x - 10} cy={y} r={2} style={{ fill: SILK }} stroke="none" />
        <circle cx={x + 10} cy={y} r={2} style={{ fill: SILK }} stroke="none" />
        <W d={`M${x - 10} ${y} L${x + 8} ${y - 10}`} />
      </g>
      {label && (v ? <T x={x + 14} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y + 20}>{label}</T>)}
    </g>
  );
}

/** 晶振（两板夹矩形）；v=true 竖直 */
function Xtal({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 12} M${x + 12} ${y} H${x + 24}`} />
        <W d={`M${x - 12} ${y - 9} V${y + 9} M${x + 12} ${y - 9} V${y + 9}`} />
        <rect x={x - 7} y={y - 6} width={14} height={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      </g>
      {label && (v ? <T x={x + 14} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y - 13}>{label}</T>)}
    </g>
  );
}

/** 保险丝（穿盒斜线）；v=true 竖直 */
function Fuse({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 12} M${x + 12} ${y} H${x + 24}`} />
        <rect x={x - 12} y={y - 6} width={24} height={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
        <W d={`M${x - 12} ${y} H${x + 12}`} />
      </g>
      {label && (v ? <T x={x + 12} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y - 10}>{label}</T>)}
    </g>
  );
}

/** 天线 */
function Ant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <W d={`M${x} ${y + 24} V${y} M${x} ${y} L${x - 10} ${y - 12} M${x} ${y} L${x + 10} ${y - 12} M${x} ${y} V${y - 14}`} />
    </g>
  );
}

/** 电机（圆 + M） */
function Motor({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <T x={x} y={y + 4} c={SILK} s={11}>M</T>
      <W d={`M${x} ${y - 24} V${y - 12} M${x} ${y + 12} V${y + 24}`} />
      {label && <T x={x} y={y + 34}>{label}</T>}
    </g>
  );
}

/** 扬声器（梯形 + 声波） */
function Spk({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <W d={`M${x - 24} ${y} H${x - 14}`} />
      <path d={`M${x - 14} ${y - 5} h7 v10 h-7 Z`} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <path d={`M${x - 7} ${y - 5} L${x + 4} ${y - 12} V${y + 12} L${x - 7} ${y + 5}`} fill="none" style={{ stroke: SILK }} strokeWidth={2} strokeLinejoin="round" />
      <W d={`M${x + 9} ${y - 4} a6 6 0 0 1 0 8 M${x + 13} ${y - 8} a12 12 0 0 1 0 16`} />
    </g>
  );
}

/** 蜂鸣器（半圆罩） */
function Buzz({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x} ${y - 24} V${y - 6} M${x} ${y + 6} V${y + 24}`} />
      <path d={`M${x - 11} ${y + 6} a11 11 0 0 1 22 0 Z`} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <circle cx={x} cy={y} r={1.5} style={{ fill: SILK }} stroke="none" />
      {label && <T x={x + 16} y={y + 4}>{label}</T>}
    </g>
  );
}

/** 继电器线圈（方框 + 斜杠） */
function RelayCoil({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <rect x={x - 10} y={y - 14} width={20} height={28} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <W d={`M${x - 10} ${y + 14} L${x + 10} ${y - 14}`} />
      <W d={`M${x} ${y - 24} V${y - 14} M${x} ${y + 14} V${y + 24}`} />
      {label && <T x={x + 16} y={y + 4}>{label}</T>}
    </g>
  );
}

/** 变压器（两组对置线圈 + 铁芯） */
function Xfmr({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <W d={`M${x - 24} ${y - 10} H${x - 12} M${x - 24} ${y + 10} H${x - 12}`} />
      <W d={`M${x - 12} ${y - 10} a4.5 4.5 0 0 1 0 9 a4.5 4.5 0 0 1 0 -9 M${x - 12} ${y + 1} a4.5 4.5 0 0 1 0 9 a4.5 4.5 0 0 1 0 -9`} />
      <W d={`M${x - 4} ${y - 14} V${y + 14} M${x} ${y - 14} V${y + 14}`} />
      <W d={`M${x + 4} ${y - 10} a4.5 4.5 0 0 0 0 9 a4.5 4.5 0 0 0 0 -9 M${x + 4} ${y + 1} a4.5 4.5 0 0 0 0 9 a4.5 4.5 0 0 0 0 -9`} />
      <W d={`M${x + 12} ${y - 10} H${x + 24} M${x + 12} ${y + 10} H${x + 24}`} />
      {label && <T x={x} y={y - 18}>{label}</T>}
    </g>
  );
}

/** 可变电阻（传感器本体：电阻 + 斜箭头）；v=true 竖直 */
function VarRes({ x, y, label, v }: { x: number; y: number; label?: string; v?: boolean }) {
  return (
    <g>
      <g transform={rot(v, x, y)}>
        <W d={`M${x - 24} ${y} H${x - 14} M${x + 14} ${y} H${x + 24}`} />
        <rect x={x - 14} y={y - 6} width={28} height={12} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
        <W d={`M${x - 12} ${y + 12} L${x + 12} ${y - 12}`} />
        <path d={`M${x + 12} ${y - 12} l-8 1 l3 6 Z`} style={{ fill: SILK }} stroke="none" />
      </g>
      {label && (v ? <T x={x + 12} y={y + 4} anchor="start">{label}</T> : <T x={x} y={y - 11}>{label}</T>)}
    </g>
  );
}

/** 数码管（方框 + 8.） */
function Seg7({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 10} y={y - 16} width={20} height={32} rx={2} fill="none" style={{ stroke: SILK }} strokeWidth={2} />
      <T x={x} y={y + 5} c={COPPER} s={16}>8</T>
      <circle cx={x + 6} cy={y + 11} r={1.5} style={{ fill: COPPER }} stroke="none" />
    </g>
  );
}

/* ---------------- 内置小电路 ---------------- */

/** 分压：VIN → R1 → 中点输出 → R2 → GND（R1/R2 在竖直支路上，用 v 取向让引脚与走线相接） */
const FigDivider = () => (
  <>
    <Rail x={60} y={30} label="VIN" />
    <W d="M60 40 V54" />
    <Res x={60} y={78} v label="R1" />
    <W d="M60 102 V110 M60 110 H120 M120 110 V120" />
    <Dot x={60} y={110} />
    <Res x={60} y={134} v label="R2" />
    <W d="M60 158 V160" />
    <Gnd x={60} y={160} />
    <W d="M120 120 H160" />
    <T x={166} y={114} c={CYAN} anchor="start">OUT</T>
    <T x={104} y={72} anchor="start">中点电压</T>
    <T x={104} y={88} c={COPPER} anchor="start">V×R2/(R1+R2)</T>
  </>
);

/** RC 充电：SW → R → 节点 → C → GND */
const FigRc = () => (
  <>
    <Rail x={50} y={30} label="VIN" />
    <W d="M50 40 V48" />
    <Sw x={50} y={72} v label="S1" />
    <W d="M50 96 V100 H70" />
    <Res x={94} y={100} label="R" />
    <W d="M118 100 H150" />
    <Dot x={150} y={100} />
    <W d="M150 100 V106" />
    <Cap x={150} y={130} v label="C" />
    <W d="M150 154 V168" />
    <Gnd x={150} y={168} />
    <W d="M150 100 H196" />
    <T x={202} y={104} c={CYAN} anchor="start">OUT</T>
    <T x={220} y={130} anchor="start">τ = R×C</T>
    <T x={220} y={146} anchor="start">充到 63%</T>
  </>
);

/** LC 低通：IN → L → OUT，C 到地 */
const FigLc = () => (
  <>
    <T x={20} y={104} c={CYAN} anchor="start">IN</T>
    <W d="M40 100 H70" />
    <Ind x={94} y={100} label="L" />
    <W d="M118 100 H180" />
    <Dot x={150} y={100} />
    <W d="M150 100 V116" />
    <Cap x={150} y={140} v label="C" />
    <W d="M150 164 V172" />
    <Gnd x={150} y={172} />
    <T x={186} y={104} c={CYAN} anchor="start">OUT</T>
    <T x={210} y={140} anchor="start">高频被电感挡、</T>
    <T x={210} y={156} anchor="start">被电容引到地</T>
  </>
);

/** MCU 晶振：XTAL 两脚 + 两颗负载电容到地（每段走线都落在符号引脚端点上） */
const FigXtalMcu = () => (
  <>
    <BoxI x={64} y={100} w={56} h={60} label="MCU" rp={['X1', 'X2']} />
    <W d="M104 80 H140 V66 H170" />
    <W d="M104 100 H140 V114 H170" />
    <Xtal x={170} y={90} v label="XTAL" />
    <W d="M170 66 H250 V116" />
    <Cap x={250} y={140} v label="C1" />
    <W d="M250 164 V172" />
    <Gnd x={250} y={172} />
    <W d="M170 114 H205 V116" />
    <Cap x={205} y={140} v label="C2" />
    <W d="M205 164 V172" />
    <Gnd x={205} y={172} />
    <T x={196} y={26} c={COPPER} anchor="start">C1=C2=2×(CL−Cstray)</T>
    <T x={196} y={42} anchor="start">CL=12.5pF→15~18pF</T>
    <T x={196} y={56} anchor="start">CL=18pF→26~27pF</T>
  </>
);

/** 二极管单向导电：IN → D → 负载 → GND */
const FigDiodeWay = () => (
  <>
    <Rail x={50} y={30} label="VIN" />
    <W d="M50 40 V70 H70" />
    <Dio x={96} y={70} label="D" />
    <W d="M120 70 H150 M150 70 V88" />
    <Res x={150} y={112} v label="负载" />
    <W d="M150 136 V160" />
    <Gnd x={150} y={160} />
    <T x={200} y={66} anchor="start">正接导通（≈0.7V）</T>
    <T x={200} y={82} anchor="start">反接截止</T>
  </>
);

/** LED 限流：VCC → R → LED → GND */
const FigLedLimit = () => (
  <>
    <Rail x={70} y={26} label="VCC" />
    <W d="M70 36 V50" />
    <Res x={70} y={74} v label="R" />
    <W d="M70 98 V102" />
    <Dio x={70} y={126} v label="LED" led />
    <W d="M70 150 V164" />
    <Gnd x={70} y={164} />
    <T x={150} y={70} anchor="start">R = (VCC−Vf)/I</T>
    <T x={150} y={88} c={COPPER} anchor="start">例：(5−2)V/10mA=300Ω</T>
  </>
);

/** 稳压管：VIN → R → OUT（稳压管到地，阴极朝上接输出节点） */
const FigZenerReg = () => (
  <>
    <Rail x={50} y={26} label="VIN" />
    <W d="M50 36 V60 H70" />
    <Res x={94} y={60} label="R" />
    <W d="M118 60 H160" />
    <Dot x={160} y={60} />
    <W d="M160 60 V78" />
    <Dio x={160} y={102} v flip label="DZ" zener />
    <W d="M160 126 V150" />
    <Gnd x={160} y={150} />
    <T x={166} y={64} c={CYAN} anchor="start">OUT=Uz</T>
    <T x={210} y={100} anchor="start">R 吃掉多余电压</T>
  </>
);

/** NPN 低边开关驱动 LED */
const FigNpnLed = () => (
  <>
    <Rail x={150} y={24} label="VCC" />
    <W d="M150 34 V38" />
    <Res x={150} y={62} v label="R" />
    <W d="M150 86 V88" />
    <Dio x={150} y={112} v label="LED" led />
    <W d="M150 136 V128 H160" />
    <Npn x={150} y={152} label="Q1" />
    <W d="M160 176 V186" />
    <Gnd x={160} y={186} />
    <T x={24} y={156} c={CYAN} anchor="start">GPIO</T>
    <W d="M56 152 H86" />
    <Res x={110} y={152} label="Rb" />
  </>
);

/** NMOS 低边开关 */
const FigNmosLoad = () => (
  <>
    <Rail x={160} y={24} label="VCC" />
    <W d="M160 34 V56" />
    <Res x={160} y={80} v label="负载" />
    <W d="M160 104 V116 H170" />
    <Nmos x={160} y={140} label="Q1" />
    <W d="M170 164 V180" />
    <Gnd x={170} y={180} />
    <T x={28} y={144} c={CYAN} anchor="start">GPIO</T>
    <W d="M60 140 H136" />
    <T x={210} y={120} anchor="start">栅压到位即导通</T>
    <T x={210} y={136} anchor="start">几乎不吃电流</T>
  </>
);

/** PMOS 高边开关（源极在上、栅极经上拉电阻回源极） */
const FigPmosHigh = () => (
  <>
    <Rail x={160} y={20} label="VCC" />
    <W d="M160 30 V60 H170" />
    <Pmos x={160} y={84} label="Q1" />
    <W d="M170 108 V114 H160" />
    <Res x={160} y={138} v label="负载" />
    <W d="M160 162 V176" />
    <Gnd x={160} y={176} />
    <W d="M136 84 H100" />
    <Res x={100} y={60} v label="R上拉" />
    <W d="M100 36 V30 H160" />
    <Dot x={100} y={84} />
    <T x={24} y={88} c={CYAN} anchor="start">GPIO</T>
    <W d="M56 84 H100" />
    <T x={212} y={80} anchor="start">栅极拉低才导通</T>
    <T x={212} y={96} anchor="start">上拉保证默认关断</T>
  </>
);

/** 运放反相放大 */
const FigOpampInv = () => (
  <>
    <T x={16} y={94} c={CYAN} anchor="start">IN</T>
    <W d="M36 90 H60" />
    <Res x={84} y={90} label="Rin" />
    <W d="M108 90 H130" />
    <OpAmp x={160} y={100} />
    <Dot x={130} y={92} />
    <W d="M130 92 V56 H176 V82" />
    <Res x={153} y={56} label="Rf" />
    <W d="M130 108 V120" />
    <Gnd x={130} y={120} />
    <T x={196} y={104} c={CYAN} anchor="start">OUT</T>
    <T x={210} y={140} anchor="start">增益 = −Rf/Rin</T>
  </>
);

/** ESP32 最小系统：EN 上拉 + 复位键 + 3V3 去耦 */
const FigMcuMin = () => (
  <>
    <BoxI x={130} y={96} w={72} h={88} label="ESP32" lp={['EN', '3V3', 'GND', 'IO0']} />
    <Rail x={40} y={20} label="3V3" />
    <W d="M40 30 H60" />
    <Dot x={60} y={30} />
    <Res x={60} y={52} v label="10k" />
    <W d="M82 62 H86 V76 H60" />
    <Dot x={60} y={76} />
    <Sw x={36} y={76} label="RST" />
    <W d="M12 76 V120" />
    <Gnd x={12} y={120} />
    <W d="M82 74 H78 V30 H60" />
    <W d="M82 86 H70 V120" />
    <Gnd x={70} y={120} />
    <T x={200} y={60} anchor="start">EN 上拉 + 复位键</T>
    <T x={200} y={76} anchor="start">3V3 就近 0.1µF</T>
    <T x={200} y={92} c={COPPER} anchor="start">IO0 拉低 = 下载模式</T>
  </>
);

/** 按键 + 上拉 */
const FigSwPullup = () => (
  <>
    <Rail x={80} y={24} label="VCC" />
    <W d="M80 34 V46" />
    <Res x={80} y={70} v label="R上拉" />
    <W d="M80 94 V100 M80 100 H140" />
    <Dot x={80} y={100} />
    <Sw x={80} y={120} v label="按键" />
    <W d="M80 144 V160" />
    <Gnd x={80} y={160} />
    <T x={146} y={104} c={CYAN} anchor="start">→ GPIO</T>
    <T x={170} y={140} anchor="start">按下=低电平</T>
    <T x={170} y={156} anchor="start">松开=高电平</T>
  </>
);

/** 电位器分压 */
const FigPotDiv = () => (
  <>
    <Rail x={80} y={24} label="VCC" />
    <W d="M80 34 V64" />
    <Pot x={80} y={88} v label="RP" />
    <W d="M80 112 V140" />
    <Gnd x={80} y={140} />
    <W d="M104 98 H140" />
    <T x={146} y={94} c={CYAN} anchor="start">抽头 → ADC</T>
    <T x={170} y={120} anchor="start">拧一拧</T>
    <T x={170} y={136} anchor="start">0~VCC 连续变</T>
  </>
);

/** 保险丝串在输入 */
const FigFuseLine = () => (
  <>
    <T x={16} y={104} c={CYAN} anchor="start">电源入口</T>
    <W d="M78 100 H100" />
    <Fuse x={124} y={100} label="F1" />
    <W d="M148 100 H180" />
    <BoxI x={216} y={100} w={56} h={44} label="后级电路" />
    <T x={120} y={140}>过流先烧它</T>
    <T x={120} y={156} c={COPPER}>额定 ≥ 工作电流÷0.75</T>
  </>
);

/** 天线 π 型匹配 */
const FigAntPi = () => (
  <>
    <BoxI x={56} y={90} w={52} h={44} label="RF IC" rp={['ANT']} />
    <W d="M82 84 H110" />
    <Dot x={110} y={84} />
    <Cap x={134} y={84} label="C串" />
    <W d="M158 84 H190" />
    <Dot x={176} y={84} />
    <Ant x={206} y={62} />
    <W d="M190 84 H206 V74" />
    <W d="M110 84 V104" />
    <Cap x={110} y={128} v label="C1" />
    <W d="M110 152 V160" />
    <Gnd x={110} y={160} />
    <W d="M176 84 V104" />
    <Cap x={176} y={128} v label="C2" />
    <W d="M176 152 V160" />
    <Gnd x={176} y={160} />
    <T x={240} y={130} anchor="start">50Ω 阻抗匹配</T>
  </>
);

/** 电源带负载回路 */
const FigSrcLoad = () => (
  <>
    <Src x={60} y={90} label="V" />
    <W d="M36 90 H30 V50 H150" />
    <W d="M84 90 H150" />
    <Res x={150} y={76} v label="负载 R" />
    <W d="M150 50 V52 M150 100 V130 H30 V90" />
    <T x={200} y={80} anchor="start">电流兜一圈</T>
    <T x={200} y={96} anchor="start">必须回到电源</T>
  </>
);

/** 电池供电回路 */
const FigBattLoad = () => (
  <>
    <Batt x={60} y={90} label="3.7V" />
    <W d="M36 90 H30 V50 H150 M84 90 H150" />
    <Res x={150} y={76} v label="负载" />
    <W d="M150 50 V52 M150 100 V130 H30 V90" />
    <T x={200} y={80} anchor="start">电量会掉</T>
    <T x={200} y={96} c={COPPER} anchor="start">留意截止电压</T>
  </>
);

/** 星形接地 */
const FigStarGnd = () => (
  <>
    <BoxI x={70} y={60} w={56} h={36} label="模拟" />
    <BoxI x={70} y={130} w={56} h={36} label="数字" />
    <BoxI x={200} y={60} w={56} h={36} label="功率" />
    <W d="M70 78 V100 M70 148 V160 M200 78 V100" />
    <W d="M70 100 V108 H140 M70 160 H140 M200 100 V108 H140" />
    <W d="M140 108 V160 M140 134 V160" />
    <Dot x={140} y={134} />
    <Gnd x={140} y={160} />
    <T x={230} y={140} anchor="start">三路地只在一处汇合</T>
    <T x={230} y={156} c={COPPER} anchor="start">大电流别串小信号的地</T>
  </>
);

/** 电压表并在被测两端 */
const FigMeterV = () => (
  <>
    <Batt x={50} y={90} label="V" />
    <W d="M26 90 H20 V50 H120 M74 90 H120" />
    <Res x={120} y={76} v label="R" />
    <W d="M120 50 V52 M120 100 V130 H20 V90" />
    <W d="M120 60 H170 V80 M120 96 H160" />
    <Dot x={120} y={60} />
    <Dot x={120} y={96} />
    <Meter x={170} y={100} ch="V" />
    <W d="M170 80 V89 M160 96 H170 M170 111 V130" />
    <T x={220} y={70} anchor="start">并联：搭在两点上</T>
    <T x={220} y={86} c={COPPER} anchor="start">内阻超大不吃电流</T>
  </>
);

/** 电流表串进回路 */
const FigMeterA = () => (
  <>
    <Batt x={50} y={90} label="V" />
    <W d="M26 90 H20 V50 H90" />
    <Meter x={110} y={50} ch="A" />
    <W d="M90 50 H99 M121 50 H170" />
    <Res x={170} y={76} v label="R" />
    <W d="M170 50 V52 M170 100 V130 H20 V90 M74 90 H170" />
    <T x={210} y={50} anchor="start">串联：把回路</T>
    <T x={210} y={66} anchor="start">断开接进去</T>
  </>
);

/** 函数发生器驱动 RC（示波器看波形） */
const FigFgRc = () => (
  <>
    <Src x={60} y={100} label="1kHz" wave />
    <W d="M36 100 H30 V60 H80 M84 100 H30" />
    <W d="M30 100 V130" />
    <Gnd x={30} y={130} />
    <Res x={104} y={60} label="R" />
    <W d="M128 60 H170" />
    <Dot x={170} y={60} />
    <W d="M170 60 V66" />
    <Cap x={170} y={90} v label="C" />
    <W d="M170 114 V130" />
    <Gnd x={170} y={130} />
    <Meter x={216} y={60} ch="V" />
    <W d="M170 60 H205 M216 71 V120 H170" />
    <Dot x={170} y={120} />
    <T x={236} y={96} anchor="start">看充放电曲线</T>
  </>
);

/** 传感器分压进 ADC */
const FigSensorDiv = () => (
  <>
    <Rail x={80} y={24} label="VCC" />
    <W d="M80 34 V46" />
    <Res x={80} y={70} v label="R固定" />
    <W d="M80 94 V100 M80 100 H140" />
    <Dot x={80} y={100} />
    <VarRes x={80} y={124} v label="传感器" />
    <W d="M80 148 V164" />
    <Gnd x={80} y={164} />
    <T x={146} y={104} c={CYAN} anchor="start">→ ADC</T>
    <T x={170} y={140} anchor="start">环境变 → 电阻变</T>
    <T x={170} y={156} anchor="start">→ 电压变</T>
  </>
);

/** MCU 点 LED */
const FigMcuLed = () => (
  <>
    <BoxI x={70} y={90} w={56} h={56} label="MCU" rp={['GPIO']} />
    <W d="M98 80 H120" />
    <Res x={144} y={80} label="R" />
    <W d="M168 80 H180 M180 80 V90" />
    <Dio x={180} y={114} v label="LED" led />
    <W d="M180 138 V152" />
    <Gnd x={180} y={152} />
    <T x={220} y={76} anchor="start">高电平点亮</T>
    <T x={220} y={92} c={COPPER} anchor="start">R 别省：限流！</T>
  </>
);

/** IC 去耦电容 */
const FigDecap = () => (
  <>
    <BoxI x={130} y={96} w={64} h={64} label="IC" lp={['VCC', 'GND']} />
    <Rail x={60} y={22} label="VCC" />
    <W d="M60 32 V44 H98 M98 44 V68" />
    <Dot x={76} y={44} />
    <W d="M98 106 H80 V136" />
    <Gnd x={80} y={136} />
    <W d="M76 44 V64" />
    <Cap x={76} y={88} v />
    <T x={62} y={92} anchor="end">0.1µF</T>
    <W d="M76 112 V136" />
    <Gnd x={76} y={136} />
    <T x={200} y={70} anchor="start">紧贴 VCC 引脚放</T>
    <T x={200} y={86} c={COPPER} anchor="start">越近越管用</T>
  </>
);

/** 模组接线：供电 + 上拉 */
const FigModulePins = () => (
  <>
    <BoxI x={140} y={90} w={72} h={72} label="模组" lp={['VCC', 'GND', 'SDA', 'SCL']} />
    <Rail x={60} y={20} label="3V3" />
    <Dot x={60} y={30} />
    <W d="M60 30 V64 H92" />
    <W d="M92 76 H84 V130" />
    <Gnd x={84} y={130} />
    <W d="M92 88 H74" />
    <Dot x={74} y={88} />
    <Res x={74} y={64} v label="4.7k" />
    <W d="M74 40 V30" />
    <W d="M92 100 H40" />
    <Res x={40} y={76} v label="4.7k" />
    <W d="M40 52 V30 H60" />
    <T x={216} y={80} anchor="start">I²C 两根都要上拉</T>
    <T x={216} y={96} c={COPPER} anchor="start">电平看 3V3 还是 5V</T>
  </>
);

/** NPN 驱动蜂鸣器 */
const FigNpnBuzz = () => (
  <>
    <Rail x={160} y={24} label="VCC" />
    <W d="M160 34 V88" />
    <Buzz x={160} y={112} label="BZ" />
    <Npn x={150} y={152} label="Q1" />
    <W d="M160 176 V186" />
    <Gnd x={160} y={186} />
    <T x={24} y={156} c={CYAN} anchor="start">GPIO</T>
    <W d="M56 152 H86" />
    <Res x={110} y={152} label="Rb" />
    <T x={216} y={110} anchor="start">无源蜂鸣器给方波</T>
    <T x={216} y={126} c={COPPER} anchor="start">有源的给电就响</T>
  </>
);

/** 继电器驱动（含续流二极管，阴极朝 VCC） */
const FigRelayDrive = () => (
  <>
    <Rail x={160} y={24} label="VCC" />
    <W d="M160 34 V70" />
    <RelayCoil x={160} y={94} label="J" />
    <Npn x={150} y={142} label="Q1" />
    <W d="M160 166 V180" />
    <Gnd x={160} y={180} />
    <T x={24} y={146} c={CYAN} anchor="start">GPIO</T>
    <W d="M56 142 H86" />
    <Res x={110} y={142} label="Rb" />
    <Dio x={196} y={94} v flip label="D" />
    <W d="M196 70 V34 H160" />
    <W d="M196 118 H160" />
    <Dot x={160} y={34} />
    <T x={230} y={90} anchor="start">断电瞬间线圈反压</T>
    <T x={230} y={106} c={COPPER} anchor="start">靠 D 泄放保命</T>
  </>
);

/** NMOS 驱动直流电机（含续流） */
const FigNmosMotor = () => (
  <>
    <Rail x={150} y={24} label="VCC" />
    <W d="M150 34 V62" />
    <Motor x={150} y={86} label="M" />
    <W d="M150 110 V116 H160" />
    <Nmos x={150} y={140} label="Q1" />
    <W d="M160 164 V180" />
    <Gnd x={160} y={180} />
    <T x={24} y={144} c={CYAN} anchor="start">PWM</T>
    <W d="M56 140 H126" />
    <Dio x={196} y={90} v flip label="D" />
    <W d="M196 66 V34 H150" />
    <W d="M196 114 V116 H160" />
    <Dot x={150} y={34} />
    <T x={230} y={86} anchor="start">PWM 调速</T>
    <T x={230} y={102} c={COPPER} anchor="start">续流二极管必备</T>
  </>
);

/** 舵机三线：信号在左，5V/GND 在右 */
const FigServo3w = () => (
  <>
    <BoxI x={80} y={90} w={56} h={56} label="MCU" rp={['PWM']} />
    <BoxI x={210} y={90} w={64} h={64} label="舵机" lp={['信号']} rp={['5V', 'GND']} />
    <W d="M120 72 H140 V68 H166" />
    <Rail x={280} y={40} label="5V" />
    <W d="M280 50 V68 H254" />
    <W d="M254 80 H270 V130" />
    <Gnd x={270} y={130} />
    <T x={130} y={160}>50Hz 脉冲 0.5~2.5ms</T>
    <T x={130} y={176} c={COPPER}>脉宽定角度</T>
  </>
);

/** 数码管驱动（共阴一位） */
const FigSeg7Drive = () => (
  <>
    <BoxI x={70} y={90} w={56} h={72} label="MCU" rp={['a', 'b', 'com']} />
    <W d="M110 64 H120" />
    <Res x={144} y={64} label="R" />
    <W d="M168 64 H190 V78 H200" />
    <Seg7 x={210} y={92} />
    <W d="M110 76 H130 V92 H200" />
    <W d="M110 88 H150 V130" />
    <Gnd x={150} y={130} />
    <T x={240} y={76} anchor="start">每段串限流电阻</T>
    <T x={240} y={92} c={COPPER} anchor="start">共阴 com 接地</T>
  </>
);

/** 肖特基电源 OR-ing */
const FigDiodeOr = () => (
  <>
    <Rail x={70} y={24} label="USB 5V" />
    <Rail x={40} y={110} label="电池" />
    <W d="M70 34 V50 H96" />
    <W d="M40 110 H96" />
    <Dio x={120} y={50} label="D1" schottky />
    <Dio x={120} y={110} label="D2" schottky />
    <W d="M144 50 H180 M144 110 H180" />
    <W d="M180 50 V80 M180 110 V80" />
    <Dot x={180} y={80} />
    <T x={186} y={84} c={CYAN} anchor="start">→ 系统</T>
    <T x={210} y={130} anchor="start">压降仅 0.3V</T>
    <T x={210} y={146} c={COPPER} anchor="start">两路自动切换</T>
  </>
);

/** 7805 稳压（IN/GND 在左、OUT 在右，电容走竖直支路） */
const FigLdo7805 = () => (
  <>
    <Rail x={50} y={24} label="7~12V" />
    <W d="M50 34 V66 H72" />
    <BoxI x={110} y={80} w={52} h={48} label="7805" lp={['IN', 'GND']} rp={['OUT']} />
    <Dot x={76} y={66} />
    <W d="M76 66 V82" />
    <Cap x={76} y={106} v label="Cin" />
    <W d="M76 130 V140" />
    <W d="M72 78 H60 V140" />
    <W d="M60 140 H170" />
    <Gnd x={110} y={140} />
    <W d="M148 66 H170" />
    <Dot x={170} y={66} />
    <Rail x={170} y={30} label="5V" />
    <W d="M170 66 V40" />
    <W d="M170 66 V82" />
    <Cap x={170} y={106} v label="Cout" />
    <W d="M170 130 V140" />
    <T x={210} y={110} anchor="start">压差变热</T>
    <T x={210} y={126} c={COPPER} anchor="start">大电流要散热片</T>
  </>
);

/** 555 无稳态振荡（THR/TRG/DIS 三脚按 BoxI 引脚的 y 坐标接线） */
const Fig555 = () => (
  <>
    <Rail x={60} y={20} label="VCC" />
    <W d="M60 30 V34" />
    <Res x={60} y={58} v label="RA" />
    <Dot x={60} y={86} />
    <Res x={60} y={104} v label="RB" />
    <Cap x={60} y={150} v label="C" />
    <W d="M60 174 V176" />
    <Gnd x={60} y={176} />
    <BoxI x={160} y={90} w={64} h={80} label="555" lp={['THR', 'TRG', 'DIS']} rp={['OUT']} />
    <W d="M60 86 H92 V84 H116" />
    <W d="M60 126 H100 V60 H116" />
    <W d="M100 72 H116" />
    <Dot x={100} y={72} />
    <W d="M204 60 H230" />
    <T x={236} y={64} c={CYAN} anchor="start">方波</T>
    <T x={198} y={140} anchor="start">f≈1.44/((RA+2RB)C)</T>
  </>
);

/** 变压器 + 整流滤波（线性电源） */
const FigXfmrBridge = () => (
  <>
    <Src x={46} y={80} label="220V~" wave />
    <W d="M46 66 V56 H100 M46 94 V104 H100" />
    <Xfmr x={130} y={80} label="T" />
    <BoxI x={190} y={80} w={48} h={40} label="整流桥" lp={['~', '~']} rp={['+', '−']} />
    <W d="M154 74 H166 M154 86 H166" />
    <W d="M214 70 H236 M214 90 H236" />
    <Cap x={246} y={100} v label="C" polar />
    <W d="M236 70 H246 V76" />
    <W d="M236 90 H246 V114" />
    <Dot x={246} y={70} />
    <W d="M246 124 V140" />
    <Gnd x={246} y={140} />
    <T x={262} y={60} c={CYAN} anchor="start">直流</T>
  </>
);

/** 功放电容耦合推扬声器 */
const FigSpkCap = () => (
  <>
    <BoxI x={70} y={90} w={56} h={48} label="功放" rp={['OUT']} />
    <W d="M110 76 H122 V86" />
    <Cap x={146} y={86} label="C" polar />
    <W d="M170 86 H176 V92" />
    <Spk x={196} y={92} />
    <W d="M200 104 V140 H120" />
    <Gnd x={120} y={140} />
    <T x={220} y={130} anchor="start">电容隔直流通交流</T>
    <T x={220} y={146} c={COPPER} anchor="start">喇叭只认 8Ω/4Ω</T>
  </>
);

/** 比较器迟滞（施密特）：输入走反相端，Rf/Rth 组成正反馈分压 */
const FigCmpSchmitt = () => (
  <>
    <T x={14} y={92} c={CYAN} anchor="start">IN</T>
    <W d="M40 88 H80" />
    <OpAmp x={110} y={96} />
    <Rail x={60} y={40} label="Vref" />
    <Res x={60} y={74} v label="Rth" />
    <W d="M60 98 V104 H80" />
    <Dot x={60} y={104} />
    <W d="M140 96 H190" />
    <Dot x={160} y={96} />
    <Rail x={160} y={26} label="VCC" />
    <Res x={160} y={60} v label="Rpull" />
    <W d="M160 84 V96" />
    <W d="M190 96 V150 H114" />
    <Res x={90} y={150} label="Rf" />
    <W d="M66 150 H40 V104 H80" />
    <T x={196} y={100} c={CYAN} anchor="start">OUT</T>
    <T x={206} y={150} anchor="start">Vhyst=Vout_pp·</T>
    <T x={206} y={164} anchor="start">Rth/(Rth+Rf)</T>
  </>
);

/** 双向 MOS 电平转换（I²C / 1-Wire） */
const FigLevelShift = () => (
  <>
    <Rail x={40} y={30} label="3V3" />
    <Dot x={40} y={40} />
    <Res x={40} y={64} v label="4.7k" />
    <W d="M40 88 V134" />
    <Dot x={40} y={134} />
    <W d="M40 134 H170" />
    <Rail x={280} y={30} label="5V" />
    <Res x={280} y={64} v label="4.7k" />
    <W d="M280 88 V86" />
    <Dot x={280} y={86} />
    <W d="M280 86 H170" />
    <Nmos x={160} y={110} label="Q1" />
    <W d="M160 86 H170" />
    <W d="M136 110 H80 V40 H40" />
    <T x={40} y={154} c={CYAN}>3.3V 侧</T>
    <T x={280} y={154} c={CYAN}>5V 侧</T>
    <T x={196} y={130} anchor="start">两侧各自上拉</T>
    <T x={196} y={146} anchor="start">栅极接低压侧电源</T>
  </>
);

/** Buck 降压模块接线（输入输出电容就近放） */
const FigBuckModule = () => (
  <>
    <Rail x={40} y={24} label="VIN" />
    <W d="M40 34 V66 H93" />
    <Dot x={40} y={66} />
    <W d="M40 66 V116" />
    <Cap x={40} y={140} v label="Cin" />
    <W d="M40 164 V176 H56" />
    <W d="M93 78 H56 V176" />
    <Gnd x={56} y={176} />
    <BoxI x={160} y={96} w={110} h={80} label="DC-DC 模块" lp={['IN+', 'IN−']} rp={['OUT+', 'OUT−']} />
    <W d="M227 66 H280" />
    <Dot x={250} y={66} />
    <W d="M250 66 V116" />
    <Cap x={250} y={140} v label="Cout" />
    <W d="M250 164 V176 H240" />
    <W d="M227 78 H240 V176" />
    <Gnd x={240} y={176} />
    <T x={286} y={70} c={CYAN} anchor="start">5V</T>
    <T x={160} y={150}>热回路要小</T>
    <T x={160} y={166} c={COPPER}>Cin 贴着 IN 脚放</T>
  </>
);

/** 光耦隔离输入（两侧地分开） */
const FigOptoIso = () => (
  <>
    <T x={14} y={78} c={CYAN} anchor="start">IN</T>
    <W d="M40 74 H64" />
    <Res x={88} y={74} label="R" />
    <BoxI x={160} y={96} w={72} h={64} label="PC817" lp={['1 A', '2 K']} rp={['4 C', '3 E']} />
    <W d="M112 86 H80 V140" />
    <Gnd x={80} y={140} />
    <W d="M208 74 H280" />
    <Dot x={250} y={74} />
    <Rail x={250} y={30} label="VCC2" />
    <Res x={250} y={64} v label="4.7k" />
    <W d="M250 88 V74" />
    <W d="M208 86 H230 V140" />
    <Gnd x={230} y={140} />
    <T x={286} y={78} c={CYAN} anchor="start">OUT</T>
    <T x={160} y={164} c={COPPER}>隔离带：两侧地不相连</T>
    <T x={160} y={180}>电流→光→电流</T>
  </>
);

/* ---------------- 图名注册表 + 渲染入口 ---------------- */

export type SchematicFig =
  | 'divider' | 'rc' | 'lc' | 'xtal-mcu' | 'diode-way' | 'led-limit' | 'zener-reg'
  | 'npn-led' | 'nmos-load' | 'pmos-high' | 'opamp-inv' | 'mcu-min' | 'sw-pullup'
  | 'pot-div' | 'fuse-line' | 'ant-pi' | 'src-load' | 'batt-load' | 'star-gnd'
  | 'meter-v' | 'meter-a' | 'fg-rc' | 'sensor-div' | 'mcu-led' | 'decap' | 'module-pins'
  | 'npn-buzz' | 'relay-drive' | 'nmos-motor' | 'servo-3w' | 'seg7-drive' | 'diode-or'
  | 'ldo-7805' | 'a555' | 'xfmr-bridge' | 'spk-cap'
  | 'cmp-schmitt' | 'level-shift' | 'buck-module' | 'opto-iso';

const FIGURES: Record<SchematicFig, () => JSX.Element> = {
  'divider': FigDivider,
  'rc': FigRc,
  'lc': FigLc,
  'xtal-mcu': FigXtalMcu,
  'diode-way': FigDiodeWay,
  'led-limit': FigLedLimit,
  'zener-reg': FigZenerReg,
  'npn-led': FigNpnLed,
  'nmos-load': FigNmosLoad,
  'pmos-high': FigPmosHigh,
  'opamp-inv': FigOpampInv,
  'mcu-min': FigMcuMin,
  'sw-pullup': FigSwPullup,
  'pot-div': FigPotDiv,
  'fuse-line': FigFuseLine,
  'ant-pi': FigAntPi,
  'src-load': FigSrcLoad,
  'batt-load': FigBattLoad,
  'star-gnd': FigStarGnd,
  'meter-v': FigMeterV,
  'meter-a': FigMeterA,
  'fg-rc': FigFgRc,
  'sensor-div': FigSensorDiv,
  'mcu-led': FigMcuLed,
  'decap': FigDecap,
  'module-pins': FigModulePins,
  'npn-buzz': FigNpnBuzz,
  'relay-drive': FigRelayDrive,
  'nmos-motor': FigNmosMotor,
  'servo-3w': FigServo3w,
  'seg7-drive': FigSeg7Drive,
  'diode-or': FigDiodeOr,
  'ldo-7805': FigLdo7805,
  'a555': Fig555,
  'xfmr-bridge': FigXfmrBridge,
  'spk-cap': FigSpkCap,
  'cmp-schmitt': FigCmpSchmitt,
  'level-shift': FigLevelShift,
  'buck-module': FigBuckModule,
  'opto-iso': FigOptoIso,
};

/** 条目「原理图看一看」小电路插图（fig 不存在时静默不渲染） */
export default function MiniSchematic({ fig, className }: { fig: string; className?: string }) {
  const Fig = FIGURES[fig as SchematicFig];
  if (!Fig) return null;
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="典型应用原理图">
      <Fig />
    </svg>
  );
}
