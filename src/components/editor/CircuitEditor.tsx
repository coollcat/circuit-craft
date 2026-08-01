/* eslint-disable react-refresh/only-export-components */
// 编辑器 — 电路画布：节点拖拽连线 + 45° 折线布线 + 磁吸端口 + 电流粒子 + 故障冒烟
// 手感是灵魂：端口 hover 放大发光、拖拽中磁吸、橡皮筋预览、网格 16px 吸附、
// Delete 删除选中、R 旋转、Esc 取消、双击元件开参数、双击导线删除。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CircuitSpec, ComponentSpec, PortRef, WireSpec } from '@/engine/types';
import { compileCircuit, formatSI, numParam, portKey } from '@/engine/solver';
import { ParticleSystem, SmokeSystem, pathLength, type WireFlowState, type WirePath } from '@/engine/particles';
import { PORT_GEOM, SymbolGlyph, compRadius, portWorldPos } from './symbols';
import { distToPolyline, ptsToPath, route45, type Pt } from './routing';
import { toast } from './toast';
import { sfxClick, sfxPop } from './sound';
import { cn } from '@/lib/utils';

const GRID = 16;
const SNAP_TOL = 24; // 磁吸半径（屏幕 px）

export interface EditorVisuals {
  netOf?: Map<string, number>;
  nodeVoltages?: Map<number, number>;
  branchCurrents?: Map<string, number>;
  opampOut?: Map<string, number>;
  overcurrent?: Set<string>;
  blown?: Set<string>;
  running?: boolean;
}

export interface CircuitEditorProps {
  circuit: CircuitSpec;
  onChange: (c: CircuitSpec) => void;
  visuals?: EditorVisuals;
  readOnly?: boolean;
  ghost?: CircuitSpec | null;
  probeMode?: boolean;
  onProbe?: (p: PortRef) => void;
  onCompDoubleClick?: (comp: ComponentSpec, anchor: { x: number; y: number }) => void;
  onSelect?: (sel: { kind: 'comp' | 'wire'; id: string } | null) => void;
  onInteract?: () => void;
  className?: string;
}

type Selection = { kind: 'comp' | 'wire'; id: string } | null;

interface Transform { x: number; y: number; k: number }

export function mainParamText(c: ComponentSpec): string {
  const p = c.params ?? {};
  const g = (k: string) => p[k];
  switch (c.type) {
    case 'resistor': return formatSI(numParam(c, ['resistance', 'r'], 220), 'Ω');
    case 'capacitor': return formatSI(numParam(c, ['capacitance', 'c'], 1e-6), 'F');
    case 'inductor': return formatSI(numParam(c, ['inductance', 'l'], 1e-3), 'H');
    case 'pot': return `${formatSI(numParam(c, ['resistance', 'r'], 1e4), 'Ω')}·${Math.round(numParam(c, ['wiper', 'ratio'], 0.5) * 100)}%`;
    case 'battery': case 'vsrc': return formatSI(numParam(c, ['voltage', 'v'], 5), 'V');
    case 'led': case 'diode': return `Vf=${numParam(c, 'vf', 0.7)}V`;
    case 'zener': return `${numParam(c, 'vz', 5.1)}V`;
    case 'funcgen': return `${g('waveform') ?? 'sine'} ${formatSI(numParam(c, ['freq', 'fs'], 1000), 'Hz')}`;
    case 'fuse': return formatSI(numParam(c, 'rating', 0.5), 'A');
    case 'ic': return `${numParam(c, 'vout', 3.3)}V`;
    case 'sensor': return formatSI(numParam(c, ['output', 'value'], 1.65), 'V');
    case 'antenna': return formatSI(numParam(c, ['impedance', 'r'], 50), 'Ω');
    case 'switch': case 'button': return p.closed ? '闭合' : '断开';
    case 'mcu': return `${numParam(c, 'pinVoltage', 3.3)}V IO`;
    default: return '';
  }
}

export default function CircuitEditor({
  circuit, onChange, visuals, readOnly, ghost, probeMode, onProbe, onCompDoubleClick, onSelect, onInteract, className,
}: CircuitEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<Transform>({ x: 60, y: 40, k: 1 });
  const [sel, setSelRaw] = useState<Selection>(null);
  const setSel = useCallback((s: Selection) => {
    setSelRaw(s);
    onSelect?.(s);
  }, [onSelect]);
  const [wireFrom, setWireFrom] = useState<PortRef | null>(null);
  const [cursor, setCursor] = useState<Pt>({ x: 0, y: 0 }); // 世界坐标
  const [snapPort, setSnapPort] = useState<PortRef | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; text: string } | null>(null);

  // refs 供 rAF 循环读取（避免高频 setState）
  const viewRef = useRef(view);
  viewRef.current = view;
  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;
  const visualsRef = useRef(visuals);
  visualsRef.current = visuals;
  const particleRef = useRef(new ParticleSystem());
  const smokeRef = useRef(new SmokeSystem());
  const blownSeen = useRef<Set<string>>(new Set());

  const compById = useMemo(() => new Map(circuit.components.map(c => [c.id, c])), [circuit]);

  /* ---------------- 坐标换算 ---------------- */
  const toWorld = useCallback((clientX: number, clientY: number): Pt => {
    const r = wrapRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k };
  }, []);
  const toScreen = useCallback((p: Pt): Pt => {
    const v = viewRef.current;
    return { x: p.x * v.k + v.x, y: p.y * v.k + v.y };
  }, []);

  /* ---------------- 命中测试 ---------------- */
  const hitPort = useCallback((w: Pt, tolWorld: number): PortRef | null => {
    let best: PortRef | null = null;
    let bestD = tolWorld;
    for (const c of circuitRef.current.components) {
      for (const g of PORT_GEOM[c.type]) {
        const p = portWorldPos(c, g.name);
        const d = Math.hypot(p.x - w.x, p.y - w.y);
        if (d < bestD) { bestD = d; best = { comp: c.id, port: g.name }; }
      }
    }
    return best;
  }, []);
  const hitComp = useCallback((w: Pt): ComponentSpec | null => {
    for (let i = circuitRef.current.components.length - 1; i >= 0; i--) {
      const c = circuitRef.current.components[i];
      if (Math.hypot(c.x - w.x, c.y - w.y) <= compRadius(c)) return c;
    }
    return null;
  }, []);
  const wirePoints = useCallback((wire: WireSpec, circ = circuitRef.current): Pt[] => {
    const a = circ.components.find(c => c.id === wire.from.comp);
    const b = circ.components.find(c => c.id === wire.to.comp);
    if (!a || !b) return [];
    return route45(portWorldPos(a, wire.from.port), portWorldPos(b, wire.to.port));
  }, []);
  const hitWire = useCallback((w: Pt, tolWorld: number): WireSpec | null => {
    for (let i = circuitRef.current.wires.length - 1; i >= 0; i--) {
      const wire = circuitRef.current.wires[i];
      if (distToPolyline(w, wirePoints(wire)) < tolWorld) return wire;
    }
    return null;
  }, [wirePoints]);

  /* ---------------- 拖拽状态 ---------------- */
  const dragRef = useRef<
    | { mode: 'pan'; startX: number; startY: number; orig: Transform }
    | { mode: 'comp'; id: string; dx: number; dy: number }
    | null
  >(null);

  const emitChange = useCallback((next: CircuitSpec) => {
    onInteract?.();
    onChange(next);
  }, [onChange, onInteract]);

  /* ---------------- 指针事件 ---------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    setCursor(w);
    onInteract?.();

    if (probeMode) {
      const p = hitPort(w, SNAP_TOL / viewRef.current.k);
      if (p) onProbe?.(p);
      else {
        const wire = hitWire(w, 8 / viewRef.current.k);
        if (wire) onProbe?.(wire.from);
      }
      return;
    }
    if (readOnly) return;

    const p = hitPort(w, 14 / viewRef.current.k);
    if (p) {
      setWireFrom(p);
      setSnapPort(null);
      return;
    }
    const comp = hitComp(w);
    if (comp) {
      setSel({ kind: 'comp', id: comp.id });
      if (!comp.locked) {
        dragRef.current = { mode: 'comp', id: comp.id, dx: w.x - comp.x, dy: w.y - comp.y };
      }
      return;
    }
    const wire = hitWire(w, 8 / viewRef.current.k);
    if (wire) {
      setSel({ kind: 'wire', id: wire.id });
      return;
    }
    setSel(null);
    dragRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, orig: { ...viewRef.current } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    setCursor(w);
    const d = dragRef.current;
    if (d?.mode === 'pan') {
      setView({ ...d.orig, x: d.orig.x + (e.clientX - d.startX), y: d.orig.y + (e.clientY - d.startY) });
      return;
    }
    if (d?.mode === 'comp') {
      const nx = Math.round((w.x - d.dx) / GRID) * GRID;
      const ny = Math.round((w.y - d.dy) / GRID) * GRID;
      const circ = circuitRef.current;
      const comp = circ.components.find(c => c.id === d.id);
      if (comp && (comp.x !== nx || comp.y !== ny)) {
        emitChange({ ...circ, components: circ.components.map(c => (c.id === d.id ? { ...c, x: nx, y: ny } : c)) });
      }
      return;
    }
    // 连线模式磁吸
    if (wireFrom) {
      const p = hitPort(w, SNAP_TOL / viewRef.current.k);
      setSnapPort(p && !(p.comp === wireFrom.comp && p.port === wireFrom.port) ? p : null);
      return;
    }
    // hover 测量标签
    const v = visualsRef.current;
    if (v?.running && v.netOf && v.nodeVoltages) {
      const p = hitPort(w, 12 / viewRef.current.k);
      const wire = p ? null : hitWire(w, 8 / viewRef.current.k);
      if (p || wire) {
        const ref = p ?? wire!.from;
        const net = v.netOf.get(portKey(ref));
        const volt = net !== undefined ? v.nodeVoltages.get(net) ?? 0 : NaN;
        const i = v.branchCurrents?.get(ref.comp);
        const s = toScreen(w);
        setHoverInfo({
          x: s.x + 14, y: s.y - 10,
          text: `${ref.comp}:${ref.port} · V=${formatSI(volt, 'V')}${i !== undefined ? ` · I=${formatSI(Math.abs(i), 'A')}` : ''}`,
        });
        return;
      }
    }
    setHoverInfo(null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    if (wireFrom) {
      const target = hitPort(w, SNAP_TOL / viewRef.current.k);
      if (target && !(target.comp === wireFrom.comp && target.port === wireFrom.port)) {
        tryAddWire(wireFrom, target);
      }
      setWireFrom(null);
      setSnapPort(null);
    }
    dragRef.current = null;
  };

  const tryAddWire = (from: PortRef, to: PortRef) => {
    const circ = circuitRef.current;
    if (circ.wires.some(x =>
      (portKey(x.from) === portKey(from) && portKey(x.to) === portKey(to)) ||
      (portKey(x.from) === portKey(to) && portKey(x.to) === portKey(from)))) {
      toast('这两个端口已经连上了。', 'info');
      return;
    }
    const compiled = compileCircuit(circ);
    const na = compiled.netOf.get(portKey(from));
    const nb = compiled.netOf.get(portKey(to));
    if (na !== undefined && na === nb) {
      const involvesSrc = [from, to].some(r => {
        const t = compById.get(r.comp)?.type;
        return t === 'battery' || t === 'vsrc' || t === 'funcgen';
      });
      toast(
        involvesSrc
          ? '这样会把电源直接短路！电流喜欢抄近路——但这条路会烧掉一切。'
          : '这两个点已经是同一个节点了，不需要再连一根线。',
        'error',
      );
      return;
    }
    const wire: WireSpec = { id: `W${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, from, to };
    emitChange({ ...circ, wires: [...circ.wires, wire] });
    setSel({ kind: 'wire', id: wire.id });
    sfxClick();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (readOnly || probeMode) return;
    const w = toWorld(e.clientX, e.clientY);
    const comp = hitComp(w);
    if (comp) {
      onCompDoubleClick?.(comp, { x: e.clientX, y: e.clientY });
      return;
    }
    const wire = hitWire(w, 8 / viewRef.current.k);
    if (wire) {
      emitChange({ ...circuitRef.current, wires: circuitRef.current.wires.filter(x => x.id !== wire.id) });
      setSel(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView(v => {
      const k = Math.min(2, Math.max(0.5, v.k * Math.exp(-e.deltaY * 0.0012)));
      const s = k / v.k;
      return { k, x: mx - (mx - v.x) * s, y: my - (my - v.y) * s };
    });
  };

  /* ---------------- 键盘 ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (e.key === 'Escape') {
        setWireFrom(null);
        setSnapPort(null);
        setSel(null);
        return;
      }
      if (readOnly) return;
      const circ = circuitRef.current;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        if (sel.kind === 'wire') {
          emitChange({ ...circ, wires: circ.wires.filter(x => x.id !== sel.id) });
        } else {
          const comp = circ.components.find(c => c.id === sel.id);
          if (comp && !comp.locked) {
            emitChange({
              components: circ.components.filter(c => c.id !== sel.id),
              wires: circ.wires.filter(x => x.from.comp !== sel.id && x.to.comp !== sel.id),
            });
          }
        }
        setSel(null);
      } else if ((e.key === 'r' || e.key === 'R') && sel?.kind === 'comp') {
        const comp = circ.components.find(c => c.id === sel.id);
        if (comp && !comp.locked) {
          const rot = (((comp.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
          emitChange({ ...circ, components: circ.components.map(c => (c.id === comp.id ? { ...c, rotation: rot } : c)) });
        }
      } else if (e.key.startsWith('Arrow') && sel?.kind === 'comp') {
        const comp = circ.components.find(c => c.id === sel.id);
        if (comp && !comp.locked) {
          e.preventDefault();
          const dx = e.key === 'ArrowLeft' ? -GRID : e.key === 'ArrowRight' ? GRID : 0;
          const dy = e.key === 'ArrowUp' ? -GRID : e.key === 'ArrowDown' ? GRID : 0;
          emitChange({ ...circ, components: circ.components.map(c => (c.id === comp.id ? { ...c, x: c.x + dx, y: c.y + dy } : c)) });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, readOnly, emitChange]);

  /* ---------------- 粒子 / 烟雾循环 ---------------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const frames = Math.min((now - last) / 16.7, 4);
      last = now;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const v = visualsRef.current;
      const circ = circuitRef.current;
      // 烧毁冒烟检测
      if (v?.blown) {
        for (const id of v.blown) {
          if (!blownSeen.current.has(id)) {
            blownSeen.current.add(id);
            const comp = circ.components.find(c => c.id === id);
            if (comp) {
              const s = toScreen({ x: comp.x, y: comp.y });
              smokeRef.current.emit(s.x, s.y);
              sfxPop();
            }
          }
        }
      } else if (blownSeen.current.size) {
        blownSeen.current = new Set();
      }
      // 导线电流映射
      const paths: WirePath[] = [];
      const currents = new Map<string, number>();
      const states = new Map<string, WireFlowState>();
      if (v?.running && v.branchCurrents) {
        for (const wire of circ.wires) {
          const pts = wirePoints(wire).map(toScreen);
          if (pts.length < 2) continue;
          let i = 0;
          for (const ref of [wire.from, wire.to]) {
            const ci = v.branchCurrents.get(ref.comp) ?? 0;
            if (Math.abs(ci) > Math.abs(i)) i = ci;
          }
          paths.push({ id: wire.id, points: pts, length: pathLength(pts) });
          currents.set(wire.id, i);
          const over = v.overcurrent && (v.overcurrent.has(wire.from.comp) || v.overcurrent.has(wire.to.comp));
          const blownHit = v.blown && (v.blown.has(wire.from.comp) || v.blown.has(wire.to.comp));
          states.set(wire.id, blownHit ? 'danger' : over ? 'warn' : Math.abs(i) > 1e-5 ? 'normal' : 'idle');
        }
      }
      const ps = particleRef.current;
      ps.setWires(paths, currents, states);
      ps.update(frames);
      smokeRef.current.update(frames);
      // 绘制
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ps.draw(ctx);
      smokeRef.current.draw(ctx);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [toScreen, wirePoints]);

  /* ---------------- 渲染 ---------------- */
  const v = visuals;
  const wireFromPos = wireFrom ? portWorldPos(compById.get(wireFrom.comp)!, wireFrom.port) : null;
  const rubberEnd = snapPort ? portWorldPos(compById.get(snapPort.comp)!, snapPort.port) : cursor;

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative h-full w-full overflow-hidden bg-ink-950 select-none',
        probeMode || wireFrom ? 'cursor-crosshair' : dragRef.current?.mode === 'comp' ? 'cursor-grabbing' : 'cursor-default',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
    >
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="cc-grid" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <circle cx={0.5} cy={0.5} r={1 / view.k} fill="rgba(63,196,127,0.10)" />
          </pattern>
          <pattern id="cc-grid4" width={64} height={64} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <circle cx={0.5} cy={0.5} r={1.6 / view.k} fill="rgba(63,196,127,0.22)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cc-grid)" />
        <rect width="100%" height="100%" fill="url(#cc-grid4)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* 示教重影 */}
          {ghost && (
            <g opacity={0.3} pointerEvents="none">
              {ghost.wires.map(wire => {
                const pts = wirePoints(wire, ghost);
                return pts.length >= 2 ? (
                  <path key={wire.id} d={ptsToPath(pts)} fill="none" stroke="#6FE3A1" strokeWidth={2.5} strokeDasharray="6 4" />
                ) : null;
              })}
              {ghost.components.map(c => (
                <g key={c.id} transform={`translate(${c.x} ${c.y}) rotate(${c.rotation ?? 0})`}>
                  <SymbolGlyph type={c.type} closed={c.params?.closed === true} />
                </g>
              ))}
            </g>
          )}

          {/* 导线 */}
          {circuit.wires.map(wire => {
            const pts = wirePoints(wire);
            if (pts.length < 2) return null;
            const selected = sel?.kind === 'wire' && sel.id === wire.id;
            const i = v?.branchCurrents ? Math.max(
              Math.abs(v.branchCurrents.get(wire.from.comp) ?? 0),
              Math.abs(v.branchCurrents.get(wire.to.comp) ?? 0),
            ) : 0;
            const active = v?.running && i > 1e-5;
            const over = v?.overcurrent && (v.overcurrent.has(wire.from.comp) || v.overcurrent.has(wire.to.comp));
            return (
              <g key={wire.id}>
                <path
                  d={ptsToPath(pts)} fill="none"
                  stroke={over ? '#FF5263' : selected ? '#45DCE8' : active ? '#3FC47F' : '#E0A458'}
                  strokeWidth={selected ? 3 : 2.5}
                  style={active && !over ? { filter: 'drop-shadow(0 0 3px rgba(63,196,127,0.5))' } : over ? { filter: 'drop-shadow(0 0 4px rgba(255,82,99,0.6))' } : undefined}
                />
                {selected && pts.filter((_, idx) => idx === 0 || idx === pts.length - 1).map((p, idx) => (
                  <rect key={idx} x={p.x - 4} y={p.y - 4} width={8} height={8} fill="#45DCE8" stroke="#060A08" strokeWidth={1} />
                ))}
              </g>
            );
          })}

          {/* 橡皮筋预览 */}
          {wireFrom && wireFromPos && (
            <path
              d={ptsToPath(route45(wireFromPos, rubberEnd))}
              fill="none" stroke="#F2EFE3" strokeWidth={2} strokeDasharray="7 5" opacity={0.85}
            />
          )}

          {/* 元件 */}
          {circuit.components.map(c => {
            const selected = sel?.kind === 'comp' && sel.id === c.id;
            const burned = v?.blown?.has(c.id);
            const over = v?.overcurrent?.has(c.id);
            let ledGlow = 0;
            if (c.type === 'led' && v?.branchCurrents && !burned) {
              const imax = numParam(c, 'imax', 0.02);
              ledGlow = Math.min(Math.abs(v.branchCurrents.get(c.id) ?? 0) / imax, 1.4);
            }
            return (
              <g key={c.id} transform={`translate(${c.x} ${c.y})`} opacity={burned ? 0.75 : 1}>
                {ledGlow > 0.02 && (
                                  <circle r={26} fill={`rgba(255,184,77,${(0.45 * Math.min(ledGlow, 1)).toFixed(2)})`} style={{ filter: 'blur(6px)' }} />
                )}
                {selected && (
                  <circle r={compRadius(c)} fill="none" stroke="#45DCE8" strokeWidth={1.2} strokeDasharray="4 3" />
                )}
                {over && !burned && (
                  <circle r={compRadius(c) - 2} fill="none" stroke="#FF5263" strokeWidth={1.5} opacity={0.7} />
                )}
                <g transform={`rotate(${c.rotation ?? 0})`} style={{ cursor: readOnly ? 'default' : 'grab' }}>
                  <SymbolGlyph type={c.type} closed={c.params?.closed === true} burned={burned} />
                </g>
                {/* 位号 + 参数 */}
                <text x={0} y={-compRadius(c) + 2} textAnchor="middle" fontSize={11} fill="#45DCE8" fontFamily="JetBrains Mono, monospace" style={{ userSelect: 'none' }}>
                  {c.id}{c.locked ? ' ·FIX' : ''}
                </text>
                <text x={0} y={compRadius(c) - 2} textAnchor="middle" fontSize={11} fill="#CFC9B4" fontFamily="JetBrains Mono, monospace" style={{ userSelect: 'none' }}>
                  {burned ? '已烧毁' : mainParamText(c)}
                </text>
                {/* 运放/LDO 输出浮动电压标签 */}
                {v?.running && v.opampOut?.has(c.id) && (
                  <text x={52} y={-10} fontSize={11} fill="#FFB84D" fontFamily="JetBrains Mono, monospace">
                    {formatSI(v.opampOut.get(c.id)!, 'V')}
                  </text>
                )}
                {/* MCU 引脚电平指示器：点击切换 p0~p3 输出高 / 高阻输入（与参数弹窗勾选共享同一 params） */}
                {c.type === 'mcu' && !burned && (
                  <g transform={`rotate(${c.rotation ?? 0})`}>
                    {PORT_GEOM.mcu.filter(g => /^p[0-3]$/.test(g.name)).map(g => {
                      const on = c.params?.[g.name] === true;
                      return (
                        <g key={`pinlvl-${g.name}`}>
                          <circle
                            cx={g.x + 10}
                            cy={g.y}
                            r={5}
                            fill={on ? '#6FE3A1' : '#8E8976'}
                            opacity={on ? 1 : 0.55}
                            stroke="#060A08"
                            strokeWidth={1}
                            style={{
                              cursor: readOnly ? 'default' : 'pointer',
                              ...(on ? { filter: 'drop-shadow(0 0 5px rgba(111,227,161,0.8))' } : {}),
                            }}
                            onPointerDown={e => {
                              if (readOnly || probeMode) return;
                              e.stopPropagation();
                              const circ = circuitRef.current;
                              emitChange({
                                ...circ,
                                components: circ.components.map(x =>
                                  x.id === c.id ? { ...x, params: { ...x.params, [g.name]: !on } } : x,
                                ),
                              });
                              sfxClick();
                            }}
                          >
                            <title>{`${g.name.toUpperCase()} 输出：${on ? '高' : '高阻输入'} — 点击切换`}</title>
                          </circle>
                          <text
                            x={g.x + 10}
                            y={g.y + 2.5}
                            textAnchor="middle"
                            fontSize={6.5}
                            fill={on ? '#060A08' : '#F2EFE3'}
                            fontFamily="JetBrains Mono, monospace"
                            pointerEvents="none"
                            style={{ userSelect: 'none' }}
                          >
                            {on ? 'H' : 'Z'}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
                {/* 端口 */}
                {PORT_GEOM[c.type].map(g => {
                  const isFrom = wireFrom?.comp === c.id && wireFrom?.port === g.name;
                  const isSnap = snapPort?.comp === c.id && snapPort?.port === g.name;
                  const hovering = wireFrom && !isFrom;
                  return (
                    <g key={g.name} transform={`rotate(${c.rotation ?? 0})`}>
                      <circle
                        cx={g.x} cy={g.y}
                        r={isSnap ? 6 : isFrom ? 5.5 : hovering ? 4.5 : 3.5}
                        fill={isSnap ? '#43E08A' : '#45DCE8'}
                        opacity={isSnap || isFrom ? 1 : wireFrom ? 0.9 : 0.65}
                        style={isSnap ? { filter: 'drop-shadow(0 0 6px rgba(67,224,138,0.9))' } : undefined}
                      />
                      {isSnap && <circle cx={g.x} cy={g.y} r={10} fill="none" stroke="#43E08A" strokeWidth={1.5} opacity={0.8} />}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* 画布角落装饰 */}
        <text x={14} y={24} fontSize={10} fill="#55524A" fontFamily="JetBrains Mono, monospace" letterSpacing={2}>SCHEMATIC · REV A</text>
      </svg>

      {/* 粒子画布 */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* hover 测量浮签 */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-20 rounded border border-ink-600 bg-ink-900/95 px-2 py-1 font-mono text-xs text-silk-100"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          {hoverInfo.text}
        </div>
      )}

      {/* 缩放指示 + 比例尺 */}
      <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-3 font-mono text-[11px] text-silk-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-10 bg-copper-500" /> 10mm
        </span>
        {Math.round(view.k * 100)}%
      </div>
    </div>
  );
}
