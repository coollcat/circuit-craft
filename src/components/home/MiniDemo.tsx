// S2 可玩微演示 —「30 秒，点亮它」：LED 迷你关（简单闭合判断，不依赖 MNA 引擎）
import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SilkTag from '@/components/SilkTag';
import PadButton from '@/components/PadButton';

type PortId = 'batP' | 'batN' | 'resA' | 'resB' | 'ledA' | 'ledK';

const PORTS: Record<PortId, { x: number; y: number; label: string }> = {
  batP: { x: 200, y: 175, label: '+' },
  batN: { x: 200, y: 365, label: '−' },
  resA: { x: 420, y: 175, label: 'a' },
  resB: { x: 570, y: 175, label: 'b' },
  ledA: { x: 765, y: 175, label: '长脚 +' },
  ledK: { x: 765, y: 365, label: '短脚 −' },
};

interface Wire {
  from: PortId;
  to: PortId;
}

/** 45° 折线路径 */
function tracePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < 2 || ady < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  if (adx > ady) {
    const ex = x2 - Math.sign(dx) * ady;
    return `M ${x1} ${y1} L ${ex} ${y1} L ${x2} ${y2}`;
  }
  const ey = y2 - Math.sign(dy) * adx;
  return `M ${x1} ${y1} L ${x1} ${ey} L ${x2} ${y2}`;
}

/** 并查集求连通网络 */
function nets(wires: Wire[]): Map<PortId, Set<PortId>> {
  const parent = new Map<PortId, PortId>(Object.keys(PORTS).map(k => [k as PortId, k as PortId]));
  const find = (p: PortId): PortId => {
    let r = p;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(p, r);
    return r;
  };
  for (const w of wires) parent.set(find(w.from), find(w.to));
  const out = new Map<PortId, Set<PortId>>();
  (Object.keys(PORTS) as PortId[]).forEach(p => {
    const r = find(p);
    if (!out.has(r)) out.set(r, new Set());
    out.get(r)!.add(p);
  });
  return out;
}

function netOf(n: Map<PortId, Set<PortId>>, p: PortId): Set<PortId> {
  for (const s of n.values()) if (s.has(p)) return s;
  return new Set([p]);
}

export default function MiniDemo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [dragFrom, setDragFrom] = useState<PortId | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const state = useMemo(() => {
    const n = nets(wires);
    const pNet = netOf(n, 'batP');
    const nNet = netOf(n, 'batN');
    if (pNet.has('batN')) return { lit: false, reversed: false }; // 短路保护：不算
    const r1 = pNet.has('resA') ? 'resB' : pNet.has('resB') ? 'resA' : null;
    if (!r1) return { lit: false, reversed: false };
    const r2Net = netOf(n, r1);
    if (r2Net.has('ledA') && nNet.has('ledK')) return { lit: true, reversed: false };
    if (r2Net.has('ledK') && nNet.has('ledA')) return { lit: false, reversed: true };
    return { lit: false, reversed: false };
  }, [wires]);

  const lit = state.lit;

  const svgPoint = (e: React.MouseEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 960,
      y: ((e.clientY - rect.top) / rect.height) * 540,
    };
  };

  const startWire = (p: PortId) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (wires.length >= 4) return;
    setDragFrom(p);
    setMouse(svgPoint(e));
  };

  const onMove = (e: React.MouseEvent) => {
    if (dragFrom) setMouse(svgPoint(e));
  };

  const endWire = (p: PortId) => () => {
    if (dragFrom && dragFrom !== p && wires.length < 4) {
      const dup = wires.some(
        w => (w.from === dragFrom && w.to === p) || (w.from === p && w.to === dragFrom),
      );
      if (!dup) setWires(ws => [...ws, { from: dragFrom, to: p }]);
    }
    setDragFrom(null);
    setMouse(null);
  };

  const cancelDrag = () => {
    setDragFrom(null);
    setMouse(null);
  };

  const reset = () => {
    setWires([]);
  };

  return (
    <section id="demo" className="relative mx-auto max-w-[1280px] px-12 py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 text-center"
      >
        <SilkTag className="mb-5">TRY IT NOW</SilkTag>
        <h2 className="mb-3 mt-5 text-4xl font-bold text-silk-100">别只看，现在就焊一手</h2>
        <p className="mx-auto max-w-[560px] text-sm text-silk-500">
          这是第 1 关的迷你版。把电池、电阻（电流的「减速带」）、LED（小灯珠）连成一个圈——电流能从电池出发跑回电池，灯就亮。连错了不会怎样，连对了，它就真的亮。
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        animate={
          lit
            ? {
                boxShadow: [
                  '0 0 0px rgba(255,82,99,0)',
                  '0 0 42px rgba(255,82,99,0.35)',
                  '0 0 8px rgba(255,82,99,0.15)',
                  '0 0 42px rgba(255,82,99,0.35)',
                  '0 0 12px rgba(255,82,99,0.2)',
                ],
              }
            : { boxShadow: '0 0 0px rgba(255,82,99,0)' }
        }
        className="relative mx-auto w-[960px] rounded-lg border border-ink-600 bg-ink-850"
      >
        {/* 四角丝印角标 DEMO-01 */}
        <span className="absolute left-3 top-2 font-mono text-[10px] tracking-widest text-silk-700">DEMO-01</span>
        <span className="absolute right-3 top-2 font-mono text-[10px] tracking-widest text-silk-700">REV A</span>
        <span className="absolute bottom-2 left-3 font-mono text-[10px] tracking-widest text-silk-700">
          WIRES {wires.length}/4
        </span>
        <button
          onClick={reset}
          className="absolute bottom-1.5 right-3 font-mono text-[10px] tracking-widest text-silk-500 hover:text-pcb-300"
        >
          ⟲ RESET
        </button>

        <svg
          ref={svgRef}
          viewBox="0 0 960 540"
          className="gerber-grid-fine block h-[540px] w-[960px] select-none"
          onMouseMove={onMove}
          onMouseLeave={cancelDrag}
          onMouseUp={cancelDrag}
        >
          {/* 已连导线 */}
          {wires.map((w, i) => {
            const a = PORTS[w.from];
            const b = PORTS[w.to];
            return (
              <path
                key={i}
                d={tracePath(a.x, a.y, b.x, b.y)}
                fill="none"
                stroke={lit ? '#3FC47F' : '#C9803C'}
                strokeWidth="3"
                strokeLinejoin="round"
                style={lit ? { filter: 'drop-shadow(0 0 5px rgba(63,196,127,0.6))' } : undefined}
              />
            );
          })}
          {/* 拖拽中的临时导线 */}
          {dragFrom && mouse && (
            <path
              d={tracePath(PORTS[dragFrom].x, PORTS[dragFrom].y, mouse.x, mouse.y)}
              fill="none"
              stroke="#45DCE8"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
          )}

          {/* 电池 5V */}
          <g>
            <rect x="120" y="140" width="70" height="260" rx="8" fill="#13211A" stroke="#1B2E24" strokeWidth="2" />
            <text x="155" y="128" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="14" fill="#45DCE8">BT1</text>
            <text x="155" y="278" textAnchor="middle" fontSize="13" fill="#CFC9B4">5V</text>
            <text x="155" y="296" textAnchor="middle" fontSize="10" fill="#8E8976">电池</text>
            <path d="M150 160 h24 M162 148 v24" stroke="#F2EFE3" strokeWidth="3" />
            <path d="M150 380 h24" stroke="#F2EFE3" strokeWidth="5" />
          </g>

          {/* 电阻 220Ω */}
          <g>
            <text x="495" y="128" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="14" fill="#45DCE8">R1</text>
            <rect x="430" y="160" width="130" height="30" rx="3" fill="#13211A" stroke="#F2EFE3" strokeWidth="2" />
            <text x="495" y="181" textAnchor="middle" fontSize="13" fontFamily="'JetBrains Mono',monospace" fill="#CFC9B4">220Ω</text>
            <text x="495" y="222" textAnchor="middle" fontSize="10" fill="#8E8976">限流电阻</text>
          </g>

          {/* LED（红色） */}
          <g>
            <text x="800" y="128" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="14" fill="#45DCE8">LED1</text>
            {/* 点亮光晕 */}
            {lit && (
              <motion.circle
                cx="800"
                cy="265"
                r="60"
                fill="url(#ledGlow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, duration: 0.3 }}
                style={{ transformOrigin: '800px 265px' }}
              />
            )}
            <defs>
              <radialGradient id="ledGlow">
                <stop offset="0%" stopColor="rgba(255,82,99,0.55)" />
                <stop offset="100%" stopColor="rgba(255,82,99,0)" />
              </radialGradient>
            </defs>
            {/* LED 符号：二极管 + 发光箭头 */}
            <path d="M785 250 L815 265 L785 280 Z" fill={lit ? '#FF5263' : '#13211A'} stroke="#F2EFE3" strokeWidth="2" />
            <path d="M815 248 L815 282" stroke="#F2EFE3" strokeWidth="3" />
            <path d="M765 175 L765 250 M765 280 L765 365" stroke={lit ? '#3FC47F' : '#F2EFE3'} strokeWidth="2.5" />
            <path d="M800 242 l10 -12 M810 246 l8 -12" stroke={lit ? '#FF5263' : '#8E8976'} strokeWidth="2" />
            <text x="800" y="316" textAnchor="middle" fontSize="10" fill={lit ? '#FF5263' : '#8E8976'}>
              {lit ? '亮！' : '红色 LED'}
            </text>
          </g>

          {/* 电池内部到端口的短走线 */}
          <path d="M190 175 H200 M190 365 H200" stroke="#C9803C" strokeWidth="3" />
          <path d="M420 175 H430 M560 175 H570" stroke="#C9803C" strokeWidth="3" />

          {/* 端口焊盘 */}
          {(Object.keys(PORTS) as PortId[]).map(p => {
            const pt = PORTS[p];
            const isSource = dragFrom === p;
            return (
              <g key={p}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSource ? 13 : 11}
                  fill="none"
                  stroke={isSource ? '#45DCE8' : 'rgba(201,128,60,0.4)'}
                  strokeWidth="2"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  fill="#C9803C"
                  stroke="#0A100D"
                  strokeWidth="2"
                  className="cursor-crosshair"
                  style={{ pointerEvents: 'all' }}
                  onMouseDown={startWire(p)}
                  onMouseUp={endWire(p)}
                />
                <text
                  x={pt.x + (p === 'ledA' || p === 'ledK' ? 26 : 0)}
                  y={pt.y - 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="'JetBrains Mono',monospace"
                  fill="#8E8976"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 仿真读数 */}
        {lit && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded border border-pcb-600 bg-ink-900/90 px-4 py-2 font-mono text-[13px] text-pcb-300"
          >
            I = 13.6mA · LED 正向压降 2.0V · 电阻功耗 39mW ✅
          </motion.div>
        )}

        {/* LED 接反提示（小焊） */}
        {state.reversed && !lit && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-4 top-12 flex w-64 items-center gap-3 rounded-lg border border-ink-600 bg-ink-900/95 p-3"
          >
            <img src="/npc-xiaohan.png" alt="小焊" className="h-10 w-10 rounded-full border-2 border-pcb-400 object-cover" />
            <p className="text-xs leading-relaxed text-silk-100">
              LED 有极性哦，长腿接正极（再试试）
            </p>
          </motion.div>
        )}

        {/* 完成浮层 */}
        {lit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-x-0 top-6 mx-auto flex w-fit items-center gap-4 rounded-lg border border-copper-500/60 bg-ink-900/95 px-6 py-4 backdrop-blur"
          >
            <p className="text-sm text-silk-100">
              这就是第 1 关。<span className="text-silk-500">后面还有 29 关 + 一块真板子</span>
            </p>
            <PadButton to="/chapters" variant="copper" size="M">
              去章节地图 →
            </PadButton>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
