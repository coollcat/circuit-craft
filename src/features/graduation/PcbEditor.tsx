/* eslint-disable react-refresh/only-export-components */
// STEP 3 PCB 布局布线 mini-game：摆放 → 45° 走线 → 铺铜 → 实时 DRC → 伪 3D 预览
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Box, RotateCw } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';
import { SealStamp, useToasts, ToastHost } from './ui';
import { useGrad } from './store';
import { useProgress } from '@/store/progress';
import type { DialogueLine } from '@/engine/types';

export const STEP3_LINES: DialogueLine[] = [
  { speaker: 'laozhou', text: '上板子！布局三原则：连接器贴板边、晶振贴近芯片、去耦电容贴着电源脚。天线底下别放东西。' },
  { speaker: 'laozhou', text: '走线 45°，电源线加粗到 20mil 以上，最后底层铺铜做地。DRC 全绿，我签字。' },
  { speaker: 'xiaohan', text: '直角走线会藏蚀刻液哦——虽然现在的工厂工艺已经不怕了，但 45° 是老兵的体面！' },
];

/* ---------- 画布常量（10px = 1mm） ---------- */
const MM = 10;
const BOARD = { x: 40, y: 30, w: 600, h: 400 }; // 60×40mm
const CANVAS = { w: 720, h: 500 };
const KEEPOUT = { x: BOARD.x + 400, y: BOARD.y, w: 200, h: 110 }; // 天线禁布区（右上）

interface Pad {
  id: string;
  dx: number;
  dy: number;
  net?: string;
}
interface Comp {
  id: string;
  name: string;
  w: number;
  h: number;
  x: number;
  y: number;
  placed: boolean;
  pads: Pad[];
  fill: string;
  fillLight?: string;
  silk?: string;
}
interface Trace {
  net: string;
  pts: [number, number][];
  widthMil: number;
}

const INITIAL_COMPS: Comp[] = [
  {
    id: 'U1', name: 'ESP32 模组', w: 180, h: 255, x: 0, y: 0, placed: false, fill: '#26402F', fillLight: '#CFE5D7', silk: 'U1',
    pads: [
      { id: '3V3', dx: 172, dy: 60, net: '3V3' },
      { id: 'GND', dx: 172, dy: 200, net: 'GND' },
    ],
  },
  {
    id: 'J1', name: 'Type-C 座', w: 90, h: 75, x: 0, y: 0, placed: false, fill: '#1B2E24', fillLight: '#DCEAE0', silk: 'J1',
    pads: [
      { id: 'VBUS', dx: 8, dy: 20, net: 'VBUS' },
      { id: 'GND', dx: 8, dy: 55, net: 'GND' },
    ],
  },
  {
    id: 'U3', name: 'LDO SOT-223', w: 65, h: 35, x: 0, y: 0, placed: false, fill: '#13211A', fillLight: '#E4EEE7', silk: 'U3',
    pads: [
      { id: 'IN', dx: 6, dy: 17, net: 'VBUS' },
      { id: 'OUT', dx: 59, dy: 17, net: '3V3' },
    ],
  },
  { id: 'U2', name: 'CH340', w: 100, h: 60, x: 0, y: 0, placed: false, fill: '#13211A', fillLight: '#E4EEE7', silk: 'U2', pads: [] },
  { id: 'Y1', name: '40MHz 晶振', w: 32, h: 25, x: 0, y: 0, placed: false, fill: '#3a3325', fillLight: '#EAE2C6', silk: 'Y1', pads: [] },
  { id: 'SW1', name: 'RST 按键', w: 60, h: 60, x: 0, y: 0, placed: false, fill: '#1B2E24', fillLight: '#DCEAE0', silk: 'SW1', pads: [] },
  { id: 'SW2', name: 'BOOT 按键', w: 60, h: 60, x: 0, y: 0, placed: false, fill: '#1B2E24', fillLight: '#DCEAE0', silk: 'SW2', pads: [] },
  { id: 'C1', name: '去耦电容', w: 24, h: 14, x: 0, y: 0, placed: false, fill: '#5a4a2a', fillLight: '#EFE3C2', silk: 'C1', pads: [] },
  { id: 'JP1', name: '排针 2×6', w: 150, h: 25, x: 0, y: 0, placed: false, fill: '#101c15', fillLight: '#E0EAE2', silk: 'JP1', pads: [] },
];

const NETS = [
  { id: 'VBUS', label: 'VBUS (5V)', power: true },
  { id: '3V3', label: '3V3 电源轨', power: true },
  { id: 'GND', label: 'GND', power: false },
] as const;

type Phase = 'place' | 'route' | 'pour';

/* ---------- 画布配色：暗=阻焊板，亮=图纸纸面（跟随全站 data-theme） ---------- */
const PALETTES = {
  dark: {
    bg: '#0A100D',
    grid: 'rgba(63,196,127,0.10)',
    board: '#0E1611',
    boardLine: '#C9803C',
    pour: 'rgba(91,141,239,0.14)',
    pourLine: 'rgba(91,141,239,0.25)',
    sweep: 'rgba(111,227,161,0.6)',
    hatch: 'rgba(255,176,32,0.35)',
    hatchLine: 'rgba(255,176,32,0.6)',
    hatchText: 'rgba(255,184,77,0.9)',
    gnd: '#5B8DEF',
    power: '#C9803C',
    preview: 'rgba(63,196,127,0.7)',
    silk: '#F2EFE3',
    pad: '#E0A458',
    hole: '#060A08',
    padText: '#F0C078',
    antFill: 'rgba(91,141,239,0.25)',
    antText: '#5B8DEF',
    start: '#45DCE8',
  },
  light: {
    bg: '#F7F6EF',
    grid: 'rgba(27,116,71,0.20)',
    board: '#FFFDF4',
    boardLine: '#9C622A',
    pour: 'rgba(59,102,196,0.12)',
    pourLine: 'rgba(59,102,196,0.22)',
    sweep: 'rgba(23,138,80,0.55)',
    hatch: 'rgba(169,106,0,0.30)',
    hatchLine: 'rgba(169,106,0,0.55)',
    hatchText: 'rgba(140,88,0,0.95)',
    gnd: '#3B66C4',
    power: '#9C622A',
    preview: 'rgba(23,138,80,0.65)',
    silk: '#22271E',
    pad: '#C9803C',
    hole: '#FAF8F0',
    padText: '#7A4A18',
    antFill: 'rgba(59,102,196,0.16)',
    antText: '#3B66C4',
    start: '#0E7C8C',
  },
} as const;

const snap = (v: number) => Math.round(v / 8) * 8;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const padPos = (c: Comp, p: Pad): [number, number] => [c.x + p.dx, c.y + p.dy];
const center = (c: Comp): [number, number] => [c.x + c.w / 2, c.y + c.h / 2];
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rectsOverlap = (a: Comp, b: Comp) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** 45° 折线路径：斜线段 + 直线段 */
function route45(a: [number, number], b: [number, number]): [number, number][] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) return [a, b];
  // 先走 45° 斜线 min(|dx|,|dy|)，再走剩余直线
  const m = Math.min(Math.abs(dx), Math.abs(dy));
  const midPt: [number, number] = [a[0] + Math.sign(dx) * m, a[1] + Math.sign(dy) * m];
  return [a, midPt, b];
}

export default function PcbEditor({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const grad = useGrad();
  const set = useGrad(s => s.set);
  const theme = useProgress(s => s.settings.theme);
  const [comps, setComps] = useState<Comp[]>(INITIAL_COMPS);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [phase, setPhase] = useState<Phase>('place');
  const [widthMil, setWidthMil] = useState(20);
  const [routeStart, setRouteStart] = useState<{ comp: string; pad: string; net: string; pos: [number, number] } | null>(null);
  const [mouse, setMouse] = useState<[number, number]>([0, 0]);
  const [poured, setPoured] = useState(false);
  const [pourT, setPourT] = useState(0);
  const [drcClean, setDrcClean] = useState(grad.drcClean);
  const [show3d, setShow3d] = useState(false);
  const { toasts, push } = useToasts();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  /* ---------- DRC ---------- */
  const drc = useMemo(() => {
    const placed = comps.filter(c => c.placed);
    const allPlaced = placed.length === comps.length;
    const inBoard = placed.every(
      c => c.x >= BOARD.x && c.y >= BOARD.y && c.x + c.w <= BOARD.x + BOARD.w && c.y + c.h <= BOARD.y + BOARD.h,
    );
    const noOverlap = placed.every((c, i) => !placed.some((d, j) => j > i && rectsOverlap(c, d)));
    const keepoutClear = placed.every(
      c =>
        !(
          c.x < KEEPOUT.x + KEEPOUT.w &&
          c.x + c.w > KEEPOUT.x &&
          c.y < KEEPOUT.y + KEEPOUT.h &&
          c.y + c.h > KEEPOUT.y
        ),
    );
    const j1 = comps.find(c => c.id === 'J1')!;
    const usbEdge = !j1.placed || j1.x - BOARD.x <= 12;
    const u1 = comps.find(c => c.id === 'U1')!;
    const y1 = comps.find(c => c.id === 'Y1')!;
    const c1 = comps.find(c => c.id === 'C1')!;
    const xtalNear = !y1.placed || !u1.placed || dist(center(y1), center(u1)) <= 160;
    const capNear = !c1.placed || !u1.placed || dist(center(c1), center(u1)) <= 140;

    // 网络连通：存在 trace 其两端 net 匹配
    const netConnected = (net: string) => {
      if (net === 'GND' && poured) return true;
      return traces.some(t => t.net === net);
    };
    const powerWidthOk = traces.filter(t => t.net !== 'GND').every(t => t.widthMil >= 20);
    const unrouted = NETS.filter(n => !netConnected(n.id)).length;

    const rules = [
      { id: 'placed', label: '全部元件已入板框', ok: allPlaced && inBoard },
      { id: 'overlap', label: '元件无重叠', ok: noOverlap },
      { id: 'keepout', label: '天线禁布区无元件', ok: keepoutClear },
      { id: 'edge', label: 'Type-C 贴板边（≤1.2mm）', ok: usbEdge },
      { id: 'xtal', label: '晶振距模组 ≤16mm', ok: xtalNear },
      { id: 'cap', label: '去耦电容距模组 ≤14mm', ok: capNear },
      { id: 'width', label: '电源走线线宽 ≥20mil', ok: powerWidthOk },
      { id: 'nets', label: `网络全部连通（剩 ${unrouted} 网）`, ok: unrouted === 0 },
    ];
    return { rules, allOk: rules.every(r => r.ok), unrouted };
  }, [comps, traces, poured]);

  /* ---------- 绘制 ---------- */
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const dpr = 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
    const pal = PALETTES[theme];

    // 背景网格
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
    ctx.fillStyle = pal.grid;
    for (let x = BOARD.x; x <= BOARD.x + BOARD.w; x += 8 * MM) {
      for (let y = BOARD.y; y <= BOARD.y + BOARD.h; y += 8 * MM) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 板框（阻焊）
    ctx.fillStyle = pal.board;
    ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
    ctx.strokeStyle = pal.boardLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);

    // 铺铜（底层 GND pour，扫过动画）
    if (pourT > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(BOARD.x, BOARD.y, BOARD.w * pourT, BOARD.h);
      ctx.clip();
      ctx.fillStyle = pal.pour;
      ctx.fillRect(BOARD.x + 2, BOARD.y + 2, BOARD.w - 4, BOARD.h - 4);
      ctx.strokeStyle = pal.pourLine;
      ctx.lineWidth = 1;
      for (let i = -BOARD.h; i < BOARD.w; i += 12) {
        ctx.beginPath();
        ctx.moveTo(BOARD.x + i, BOARD.y);
        ctx.lineTo(BOARD.x + i + BOARD.h, BOARD.y + BOARD.h);
        ctx.stroke();
      }
      ctx.restore();
      if (pourT < 1) {
        ctx.fillStyle = pal.sweep;
        ctx.fillRect(BOARD.x + BOARD.w * pourT - 2, BOARD.y, 3, BOARD.h);
      }
    }

    // 天线禁布区（斜纹）
    ctx.save();
    ctx.beginPath();
    ctx.rect(KEEPOUT.x, KEEPOUT.y, KEEPOUT.w, KEEPOUT.h);
    ctx.clip();
    ctx.strokeStyle = pal.hatch;
    ctx.lineWidth = 1.5;
    for (let i = -KEEPOUT.h; i < KEEPOUT.w + KEEPOUT.h; i += 10) {
      ctx.beginPath();
      ctx.moveTo(KEEPOUT.x + i, KEEPOUT.y);
      ctx.lineTo(KEEPOUT.x + i + KEEPOUT.h, KEEPOUT.y + KEEPOUT.h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = pal.hatchLine;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(KEEPOUT.x, KEEPOUT.y, KEEPOUT.w, KEEPOUT.h);
    ctx.setLineDash([]);
    ctx.fillStyle = pal.hatchText;
    ctx.font = '10px "JetBrains Mono",monospace';
    ctx.fillText('ANTENNA KEEPOUT · 禁布区', KEEPOUT.x + 8, KEEPOUT.y + 14);

    // 走线
    for (const t of traces) {
      ctx.strokeStyle = t.net === 'GND' ? pal.gnd : pal.power;
      ctx.lineWidth = Math.max(2.5, t.widthMil * 0.254);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      t.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }

    // 布线预览
    if (routeStart) {
      const pts = route45(routeStart.pos, mouse);
      ctx.strokeStyle = pal.preview;
      ctx.lineWidth = Math.max(2.5, widthMil * 0.254);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 元件
    for (const c of comps) {
      if (!c.placed) continue;
      ctx.fillStyle = theme === 'light' && c.fillLight ? c.fillLight : c.fill;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = pal.silk;
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      // 丝印位号
      ctx.fillStyle = pal.silk;
      ctx.font = 'bold 11px "JetBrains Mono",monospace';
      ctx.fillText(c.silk ?? c.id, c.x + 4, c.y + 13);
      // ESP32 天线区
      if (c.id === 'U1') {
        ctx.fillStyle = pal.antFill;
        ctx.fillRect(c.x, c.y, c.w, 50);
        ctx.fillStyle = pal.antText;
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillText('PCB ANT', c.x + 6, c.y + 30);
      }
      // 焊盘
      for (const p of c.pads) {
        const [px, py] = padPos(c, p);
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = pal.pad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = pal.hole;
        ctx.fill();
        ctx.fillStyle = pal.padText;
        ctx.font = '8px "JetBrains Mono",monospace';
        ctx.fillText(p.id, px + 9, py + 3);
      }
    }

    // 布线模式提示起点
    if (routeStart) {
      ctx.beginPath();
      ctx.arc(routeStart.pos[0], routeStart.pos[1], 11, 0, Math.PI * 2);
      ctx.strokeStyle = pal.start;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [comps, traces, pourT, routeStart, mouse, widthMil, theme]);

  useEffect(() => {
    draw();
  }, [draw]);

  /* ---------- 交互 ---------- */
  const toLocal = (e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * CANVAS.w, ((e.clientY - rect.top) / rect.height) * CANVAS.h];
  };

  const hitComp = (x: number, y: number) =>
    [...comps].reverse().find(c => c.placed && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
  const hitPad = (x: number, y: number) => {
    for (const c of comps) {
      if (!c.placed) continue;
      for (const p of c.pads) {
        const [px, py] = padPos(c, p);
        if (Math.hypot(x - px, y - py) <= 11) return { comp: c, pad: p, pos: [px, py] as [number, number] };
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const [x, y] = toLocal(e);
    if (phase === 'route') {
      const hit = hitPad(x, y);
      if (!hit) {
        setRouteStart(null);
        return;
      }
      if (!routeStart) {
        if (!hit.pad.net) return;
        setRouteStart({ comp: hit.comp.id, pad: hit.pad.id, net: hit.pad.net, pos: hit.pos });
      } else {
        // 完成走线
        if (hit.pad.net === routeStart.net && !(hit.comp.id === routeStart.comp && hit.pad.id === routeStart.pad)) {
          const pts = route45(routeStart.pos, hit.pos);
          setTraces(t => [...t.filter(tr => tr.net !== routeStart.net), { net: routeStart.net, pts, widthMil }]);
          push('ok', `${routeStart.net} 网络已连通（45° 走线）`);
        } else if (hit.pad.net !== routeStart.net) {
          push('danger', `网络不同：${routeStart.net} 不能接 ${hit.pad.net ?? '无网络'}！`);
        }
        setRouteStart(null);
      }
      return;
    }
    // place 模式拖拽
    const c = hitComp(x, y);
    if (c) {
      dragRef.current = { id: c.id, ox: x - c.x, oy: y - c.y };
      canvasRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = toLocal(e);
    setMouse([x, y]);
    const d = dragRef.current;
    if (d) {
      setComps(cs =>
        cs.map(c =>
          c.id === d.id
            ? {
                ...c,
                x: clamp(snap(x - d.ox), BOARD.x, BOARD.x + BOARD.w - c.w),
                y: clamp(snap(y - d.oy), BOARD.y, BOARD.y + BOARD.h - c.h),
              }
            : c,
        ),
      );
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
    }
  };

  // 从清单放入元件（放到板中心空位）
  const placeComp = (id: string) => {
    setComps(cs => {
      const placedCount = cs.filter(c => c.placed).length;
      const cx = BOARD.x + 60 + (placedCount % 4) * 130;
      const cy = BOARD.y + 140 + Math.floor(placedCount / 4) * 110;
      return cs.map(c =>
        c.id === id
          ? { ...c, placed: true, x: snap(clamp(cx, BOARD.x, BOARD.x + BOARD.w - c.w)), y: snap(clamp(cy, BOARD.y, BOARD.y + BOARD.h - c.h)) }
          : c,
      );
    });
    push('info', '元件已放入板框，拖动到合适位置');
  };

  const doPour = () => {
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      setPourT(k);
      if (k < 1) requestAnimationFrame(tick);
      else {
        setPoured(true);
        push('ok', '底层 GND 铺铜完成，地平面连通');
      }
    };
    requestAnimationFrame(tick);
  };

  // DRC 全过 → 盖章（一次性）
  useEffect(() => {
    if (drc.allOk && !drcClean && poured) {
      setDrcClean(true);
      if (!visitor) set({ drcClean: true });
      push('ok', 'DRC 全部通过！签核章已盖');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drc.allOk, poured]);

  const unplaced = comps.filter(c => !c.placed);

  return (
    <div className="grid grid-cols-[220px_1fr_280px] gap-5">
      <ToastHost toasts={toasts} />
      {/* 左：元件清单 */}
      <div>
        <SilkTag>STEP 3 / PCB LAYOUT</SilkTag>
        <h2 className="mb-3 mt-3 text-xl font-black text-silk-100">封装清单</h2>
        <div className="space-y-2">
          {comps.map(c => (
            <button
              key={c.id}
              disabled={c.placed || phase !== 'place'}
              onClick={() => placeComp(c.id)}
              className={cn(
                'w-full rounded border px-3 py-2 text-left font-mono text-xs transition-colors',
                c.placed
                  ? 'border-pcb-500/40 bg-pcb-600/10 text-pcb-300'
                  : phase === 'place'
                    ? 'border-ink-600 bg-ink-800 text-silk-300 hover:border-pcb-400'
                    : 'border-ink-700 text-silk-700',
              )}
            >
              <span className="text-sig-cyan">{c.silk}</span> {c.name}
              <span className="float-right text-silk-500">
                {c.placed ? '✓ 已放' : `${(c.w / MM).toFixed(0)}×${(c.h / MM).toFixed(0)}mm`}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-ink-700 pt-3 font-mono text-[10px] leading-relaxed text-silk-500">
          <p>· 摆放阶段：点清单放入 → 画布内拖拽（吸附 0.8mm）</p>
          <p>· 布线阶段：点焊盘起线，再点同网络焊盘收线</p>
          <p>· 电源网络（VBUS/3V3）需 ≥20mil 线宽</p>
        </div>
      </div>

      {/* 中：画布 */}
      <div className="flex flex-col gap-3">
        {/* 阶段切换 */}
        <div className="flex items-center gap-2">
          {(
            [
              ['place', '① 摆放'],
              ['route', '② 布线'],
              ['pour', '③ 铺铜'],
            ] as [Phase, string][]
          ).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={cn(
                'rounded border px-3 py-1.5 font-mono text-xs transition-colors',
                phase === p
                  ? 'border-copper-400 bg-copper-600/15 text-copper-300'
                  : 'border-ink-600 text-silk-500 hover:border-pcb-400',
              )}
            >
              {label}
            </button>
          ))}
          {phase === 'route' && (
            <div className="ml-2 flex items-center gap-1 font-mono text-xs text-silk-500">
              线宽：
              {[10, 20, 30].map(w => (
                <button
                  key={w}
                  onClick={() => setWidthMil(w)}
                  className={cn(
                    'rounded border px-2 py-1',
                    widthMil === w ? 'border-sig-cyan text-sig-cyan' : 'border-ink-600 text-silk-500',
                  )}
                >
                  {w}mil
                </button>
              ))}
            </div>
          )}
          {phase === 'pour' && !poured && (
            <PadButton size="S" variant="primary" onClick={doPour} className="ml-2">
              铺铜 GND（底层）
            </PadButton>
          )}
          {poured && <span className="ml-2 font-mono text-xs text-sig-blue">✓ GND 地平面已铺</span>}
          {drcClean && (
            <PadButton size="S" variant="ghost" onClick={() => setShow3d(true)} className="ml-auto">
              <Box className="h-3.5 w-3.5" /> 3D 预览
            </PadButton>
          )}
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS.w * 2}
            height={CANVAS.h * 2}
            style={{ width: CANVAS.w, height: CANVAS.h, cursor: phase === 'route' ? 'crosshair' : 'grab' }}
            className="rounded-lg border border-ink-700"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <div className="absolute right-3 top-3">
            <SealStamp text="DRC Clean" sub="ZERO VIOLATIONS" show={drcClean} tone="green" />
          </div>
          {unplaced.length > 0 && phase !== 'place' && (
            <p className="absolute bottom-3 left-3 rounded bg-ink-900/90 px-2 py-1 font-mono text-[10px] text-warn">
              还有 {unplaced.length} 个元件未摆放
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {drcClean ? (
            <PadButton variant="primary" size="L" onClick={onComplete}>
              {visitor ? '继续参观 →（游客模式不签核）' : '进入 Gerber 导出 →'}
            </PadButton>
          ) : (
            <p className="font-mono text-xs text-silk-500">
              目标：右侧 DRC 全绿 → 铺铜 → 签核。当前未连通网络 {drc.unrouted} 个
            </p>
          )}
        </div>
      </div>

      {/* 右：DRC 面板 */}
      <aside className={cn('panel-raised h-fit rounded-lg p-4 transition-shadow', drcClean && 'glow-pcb')}>
        <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-silk-500">
          DRC · 设计规则检查
        </h4>
        <div className="space-y-2">
          {drc.rules.map(r => (
            <div
              key={r.id}
              className={cn(
                'flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[11px]',
                r.ok ? 'border-pcb-500/40 bg-pcb-600/10 text-pcb-300' : 'border-danger/40 bg-danger/5 text-silk-300',
              )}
            >
              {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" />}
              {r.label}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-ink-700 pt-3 font-mono text-[10px] leading-relaxed text-silk-500">
          <p>规则来源：JLC 双层板工艺（线宽/线距 ≥6mil）</p>
          <p className="mt-1">网络表：{NETS.map(n => n.label).join(' · ')}</p>
        </div>
      </aside>

      {/* 3D 预览 modal */}
      <AnimatePresence>
        {show3d && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center cc-scrim backdrop-blur-sm"
            onClick={() => setShow3d(false)}
          >
            <motion.div
              initial={{ rotateY: 70, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="panel-raised w-[560px] rounded-lg p-5"
              style={{ perspective: 1000 }}
              onClick={e => e.stopPropagation()}
            >
              <h4 className="mb-1 flex items-center gap-2 text-lg font-black text-silk-100">
                <Box className="h-5 w-5 text-pcb-300" /> 伪 3D 预览 · 你的板子长这样
              </h4>
              <p className="mb-3 font-mono text-xs text-silk-500">60×40mm · 双层 · 1.6mm · ESP32 最小系统</p>
              <motion.img
                src="/esp32-board-hero.png"
                alt="ESP32 最小系统板 3D 渲染"
                className="w-full rounded border border-ink-600"
                animate={{ rotateY: [0, 4, -4, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="mt-3 flex justify-end gap-2">
                <PadButton variant="ghost" size="S" onClick={() => setShow3d(false)}>
                  <RotateCw className="h-3.5 w-3.5" /> 看够了，关闭
                </PadButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
