/* eslint-disable react-refresh/only-export-components */
// 编辑器 — 电路画布：节点拖拽连线 + 45° 折线布线 + 拐点手动布线 + 磁吸端口 + 电流粒子 + 故障冒烟
// 手感是灵魂：端口 hover 放大发光、拖拽中磁吸、橡皮筋预览、网格 16px 吸附、
// Delete 删除选中、R 旋转、Esc 取消、双击元件开参数、双击导线删除。
// 走线治理：所有导线经 wireRoutes 的「全局串行布线」统一出路径（后画的线避让先画的线 + 元件本体），
// 渲染 / 命中 / 粒子 / 橡皮筋预览共用同一组折线（A2/A3），预览什么样落线就什么样。
// 防呆（poka-yoke）：B1 非法连线拦截并说明原因 · B2 可连接端口高亮/磁吸/端口名 · B3 落空/pointercancel/Esc 复位
// · B4 Ctrl+Z / Ctrl+Shift+Z 撤销重做 · B5 元件放置避让/不出画布 · B7 悬空端口灰显 + 计数提示。
// 拐点布线（wirefix）：单击端口起线 → 点击空白加拐点（16px 网格吸附）→ 点目标端口收线；
// Backspace 撤销上一个拐点；Esc / 右键 / 再次点击起点端口 取消整条在画导线。
// 四层走线（wave6 双层 → editorx7 四层板 top/in1/in2/bottom）：工具区层按钮定新导线起始层（选中导线时=改派该线层）；
// 画线中按 V 在光标处落过孔（hole 拐点），后续段沿层序循环换层，预览与落线共用 buildWireSegments 逐段一致。
// 画布明/暗主题：右上角太阳/月亮切换，localStorage 持久化 + 多实例事件同步（见 canvasTheme.ts）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Layers, Moon, Redo2, RotateCw, Sun, Undo2 } from 'lucide-react';
import type { CircuitSpec, ComponentSpec, ComponentType, PortRef, ViaPoint, WireLayer, WireSpec } from '@/engine/types';
import { compileCircuit, formatSI, numParam, passiveR, portKey } from '@/engine/solver';
import { ParticleSystem, SmokeSystem, pathLength, type WireFlowState, type WirePath } from '@/engine/particles';
import { PORT_GEOM, SymbolGlyph, compRadius, portWorldPos } from './symbols';
import {
  LAYER_ORDER, buildWirePolyline, buildWireSegments, distToPolyline, flattenSegments, ptsToPath,
  type Pt, type WireSegment,
} from './routing';
import {
  buildCircuitWireSegments, buildWireRouteContext, clampComponentToWorkspace,
  componentPlaceBlocked, findFreeComponentSpot,
} from './wireRoutes';
import { layerWireColor, useCanvasTheme } from './canvasTheme';
import { toast } from './toast';
import { sfxClick, sfxPop } from './sound';
import { cn } from '@/lib/utils';

const GRID = 16;
const SNAP_TOL = 24; // 磁吸半径（屏幕 px）
const LAYER_LABEL: Record<WireLayer, string> = { top: '顶层', in1: '内层1', in2: '内层2', bottom: '底层' };
// 层按钮 tooltip 的通俗讲解（对齐真实 4 层 PCB：顶/底在表面，内层夹在板子里）
const LAYER_TIPS: Record<WireLayer, string> = {
  top: '板子最上面的走线层，最常用',
  in1: '夹在板子里的走线层，像三明治的夹心',
  in2: '夹心里再深一层的走线层',
  bottom: '板子背面的走线层',
};

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
  /** 调色板拖放：dropItems 提供 id→元件映射，命中后以画布世界坐标（16px 吸附）回调 */
  dropItems?: ComponentSpec[];
  onDropItem?: (item: ComponentSpec, at: { x: number; y: number }) => void;
  className?: string;
}

type Selection = { kind: 'comp' | 'wire'; id: string } | null;

interface Transform { x: number; y: number; k: number }

/* ---------------- B1 连线合法性判定（防呆核心；纯函数，供落线与端口高亮共用） ---------------- */

const SOURCE_TYPES = new Set<ComponentType>(['battery', 'vsrc', 'funcgen']);

function samePort(a: PortRef, b: PortRef): boolean {
  return a.comp === b.comp && a.port === b.port;
}

/** 已存在「同一对端口」的导线（无向） */
function wireBetween(wires: readonly WireSpec[], a: PortRef, b: PortRef): WireSpec | undefined {
  return wires.find(w =>
    (samePort(w.from, a) && samePort(w.to, b)) || (samePort(w.from, b) && samePort(w.to, a)));
}

/** 电源类元件的两个端子（正/负，函数发生器是 out/gnd） */
function sourceTerminals(c: ComponentSpec): [string, string] {
  return c.type === 'funcgen' ? ['out', 'gnd'] : ['pos', 'neg'];
}

/** 新连一根 na↔nb 的线是否会直接把某个电源的正负极短接 */
function shortsSourceTerminals(compiled: ReturnType<typeof compileCircuit>, na: number | undefined, nb: number | undefined): boolean {
  if (na === undefined || nb === undefined || na === nb) return false;
  for (const c of compiled.circuit.components) {
    if (!SOURCE_TYPES.has(c.type)) continue;
    const [pos, neg] = sourceTerminals(c);
    const np = compiled.netOf.get(`${c.id}:${pos}`);
    const nn = compiled.netOf.get(`${c.id}:${neg}`);
    if (np === undefined || nn === undefined) continue;
    if ((na === np && nb === nn) || (na === nn && nb === np)) return true;
  }
  return false;
}

export type ConnectVerdict =
  | { ok: true }
  | { ok: false; kind: 'self' | 'duplicate' | 'same-net' | 'short'; msg: string };

/** 落线前的完整防呆校验：自连 / 重复连 / 已同网络 / 电源短路（含经由既有支路的间接短路） */
export function validateConnection(circuit: CircuitSpec, from: PortRef, to: PortRef): ConnectVerdict {
  if (samePort(from, to)) {
    return { ok: false, kind: 'self', msg: '不能把端口连到它自己：导线两端必须是两个不同的引脚。' };
  }
  if (wireBetween(circuit.wires, from, to)) {
    return { ok: false, kind: 'duplicate', msg: '这两个端口之间已经有一根导线了，不用重复连。' };
  }
  const compiled = compileCircuit(circuit);
  const na = compiled.netOf.get(portKey(from));
  const nb = compiled.netOf.get(portKey(to));
  if (na !== undefined && na === nb) {
    return {
      ok: false, kind: 'same-net',
      msg: '这两点已经连通了（同一个节点），再连一根线不会改变电路。',
    };
  }
  if (shortsSourceTerminals(compiled, na, nb)) {
    return {
      ok: false, kind: 'short',
      msg: '这样会把电源正负极直接短接！电流会瞬间烧毁元件——中间至少要串一个用电器。',
    };
  }
  // 兜底：真的把这根线加进去编译一次，拦住「经由其它支路间接短路」的边界情况
  const probe: CircuitSpec = { ...circuit, wires: [...circuit.wires, { id: '__phantom__', from, to }] };
  const after = compileCircuit(probe);
  if (!compiled.error && after.error) {
    return { ok: false, kind: 'short', msg: `${after.error}接线已取消。` };
  }
  return { ok: true };
}

export type PortConnectState = 'origin' | 'ok' | 'duplicate' | 'same-net' | 'short';

/** 连线中每个端口的可连接状态（一次编译，供 B2 高亮/吸附/端口名使用） */
function buildPortConnectivity(circuit: CircuitSpec, from: PortRef): Map<string, PortConnectState> {
  const map = new Map<string, PortConnectState>();
  const compiled = compileCircuit(circuit);
  const netFrom = compiled.netOf.get(portKey(from));
  for (const c of circuit.components) {
    for (const g of PORT_GEOM[c.type]) {
      const ref: PortRef = { comp: c.id, port: g.name };
      const key = portKey(ref);
      if (samePort(ref, from)) { map.set(key, 'origin'); continue; }
      if (wireBetween(circuit.wires, ref, from)) { map.set(key, 'duplicate'); continue; }
      const net = compiled.netOf.get(key);
      if (net !== undefined && net === netFrom) { map.set(key, 'same-net'); continue; }
      map.set(key, shortsSourceTerminals(compiled, netFrom, net) ? 'short' : 'ok');
    }
  }
  return map;
}

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
    case 'schottky': return `Vf=${numParam(c, 'vf', 0.3)}V`;
    case 'ldr': return `${formatSI(passiveR(c), 'Ω')}·${Math.round(numParam(c, 'light', 300))}lx`;
    case 'thermistor': return `${formatSI(passiveR(c), 'Ω')}·${Math.round(numParam(c, 'temp', 25))}°C`;
    case 'buzzer': return formatSI(numParam(c, ['resistance'], 30), 'Ω');
    case 'speaker': return formatSI(numParam(c, ['impedance', 'r'], 8), 'Ω');
    case 'transformer': return `×${numParam(c, 'ratio', 1)}`;
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
  circuit, onChange, visuals, readOnly, ghost, probeMode, onProbe, onCompDoubleClick, onSelect, onInteract, dropItems, onDropItem, className,
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
  const [viaPts, setViaPts] = useState<ViaPoint[]>([]); // 在画导线的手动拐点（世界坐标，hole:true=过孔换层点）
  // 四层走线：激活层决定新导线起始层；wireStartLayer 固定在画导线的起始层（段落层 = 起始层沿层序循环递进）
  const [activeLayer, setActiveLayer] = useState<WireLayer>('top');
  const [wireStartLayer, setWireStartLayer] = useState<WireLayer>('top');
  const [cursor, setCursor] = useState<Pt>({ x: 0, y: 0 }); // 世界坐标
  const [snapPort, setSnapPort] = useState<PortRef | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; text: string } | null>(null);
  // 画布明/暗主题（localStorage + 同页事件同步，见 canvasTheme.ts）
  const { name: themeName, theme: T, toggle: toggleTheme } = useCanvasTheme();
  // 光标高频跟踪：ref 每次必记；仅当渲染真正依赖它（正在画导线的橡皮筋线）时才 setState，
  // 否则空闲移动鼠标也会让整棵 SVG 场景 reconcile（含每个元件的 mainParamText 重算）。
  const cursorRef = useRef<Pt>({ x: 0, y: 0 });
  /* eslint-disable react-hooks/refs -- trackCursor 只在指针事件回调里调用；下方 ref 镜像为 rAF 循环服务的既有写法 */
  const trackCursor = (w: Pt) => {
    cursorRef.current = w;
    if (wireFrom) setCursor(w);
  };

  // refs 供 rAF 循环读取（避免高频 setState）
  const viewRef = useRef(view);
  viewRef.current = view;
  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;
  const visualsRef = useRef(visuals);
  visualsRef.current = visuals;
  const themeNameRef = useRef(themeName);
  themeNameRef.current = themeName;
  /* eslint-enable react-hooks/refs */
  // 起线手势：fresh=本次 pointerdown 刚按下（尚未进入点击布线模式）；moved=是否拖过
  const gestureRef = useRef<{ fresh: boolean; moved: boolean; downX: number; downY: number } | null>(null);
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
  /* ---------------- 全局串行布线（A2/A3：渲染/命中/粒子/预览同一组折线） ---------------- */
  // 后画的线避让先画的线 + 元件本体；同一份 circuit 一定得到同一份路径（纯函数）。
  const wireSegMap = useMemo(() => buildCircuitWireSegments(circuit), [circuit]);
  const wireSegRef = useRef(wireSegMap);
  wireSegRef.current = wireSegMap;
  const ghostSegMap = useMemo(() => (ghost ? buildCircuitWireSegments(ghost) : null), [ghost]);
  const ghostSegRef = useRef(ghostSegMap);
  ghostSegRef.current = ghostSegMap;
  const wirePoints = useCallback((wire: WireSpec, circ?: CircuitSpec): Pt[] => {
    const segs = circ ? ghostSegRef.current?.get(wire.id) : wireSegRef.current.get(wire.id);
    if (segs) return flattenSegments(segs);
    // 兜底（极端时序：路径表还没跟上 props）：退回纯几何布线，保证不白屏
    const source = circ ?? circuitRef.current;
    const a = source.components.find(c => c.id === wire.from.comp);
    const b = source.components.find(c => c.id === wire.to.comp);
    if (!a || !b) return [];
    return buildWirePolyline(portWorldPos(a, wire.from.port), wire.via ?? [], portWorldPos(b, wire.to.port));
  }, []);
  const hitWire = useCallback((w: Pt, tolWorld: number): WireSpec | null => {
    for (let i = circuitRef.current.wires.length - 1; i >= 0; i--) {
      const wire = circuitRef.current.wires[i];
      if (distToPolyline(w, wirePoints(wire)) < tolWorld) return wire;
    }
    return null;
  }, [wirePoints]);

  /* ---------------- B4 撤销/重做（覆盖加/删元件、加/删线、改参数、移动元件） ---------------- */
  const pastRef = useRef<CircuitSpec[]>([]);
  const futureRef = useRef<CircuitSpec[]>([]);
  const lastHistoryAtRef = useRef(0);
  const prevPropRef = useRef(circuit);
  const historySkipRef = useRef(false); // 本次 props 变化由撤销/重做引起，不要再入栈
  const [histCounts, setHistCounts] = useState({ undo: 0, redo: 0 });
  const syncHistCounts = useCallback(() => {
    setHistCounts({ undo: pastRef.current.length, redo: futureRef.current.length });
  }, []);
  // 任何来源的电路变化（含父组件放元件 / 派生解法）都进撤销栈；650ms 内的连续变化（拖元件/拖滑杆）合并成一步
  useEffect(() => {
    const prev = prevPropRef.current;
    if (prev === circuit) return;
    prevPropRef.current = circuit;
    if (readOnly) return;
    if (historySkipRef.current) {
      historySkipRef.current = false;
      return;
    }
    const now = performance.now();
    if (now - lastHistoryAtRef.current < 650 && pastRef.current.length > 0) {
      lastHistoryAtRef.current = now;
      return;
    }
    pastRef.current = [...pastRef.current.slice(-79), prev];
    futureRef.current = [];
    lastHistoryAtRef.current = now;
    syncHistCounts();
  }, [circuit, readOnly, syncHistCounts]);

  /* ---------------- B7 悬空端口统计（灰显 + 计数） ---------------- */
  const connectedPorts = useMemo(() => {
    const set = new Set<string>();
    for (const w of circuit.wires) {
      set.add(portKey(w.from));
      set.add(portKey(w.to));
    }
    return set;
  }, [circuit]);
  const danglingPorts = useMemo(() => {
    let dangling = 0;
    for (const c of circuit.components) {
      for (const g of PORT_GEOM[c.type]) {
        if (!connectedPorts.has(portKey({ comp: c.id, port: g.name }))) dangling += 1;
      }
    }
    return dangling;
  }, [circuit, connectedPorts]);

  /* ---------------- B2 连线中端口可连接状态（高亮/灰显/红显 + 吸附端口名） ---------------- */
  const portConnectivity = useMemo(
    () => (wireFrom ? buildPortConnectivity(circuit, wireFrom) : null),
    [wireFrom, circuit],
  );

  /* ---------------- 拖拽状态 ---------------- */
  const dragRef = useRef<
    | { mode: 'pan'; startX: number; startY: number; orig: Transform }
    | { mode: 'comp'; id: string; dx: number; dy: number }
    | null
  >(null);
  /** 本次拖拽是否撞到画布边界被钳位（松手时提示一次，不在拖动过程中刷屏） */
  const clampedRef = useRef(false);

  const emitChange = useCallback((next: CircuitSpec) => {
    onInteract?.();
    onChange(next);
  }, [onChange, onInteract]);

  /** 取消整条在画导线（Esc / 右键 / 再次点击起点端口）。
   *  草稿状态（起线端口 / 拐点 / 层草稿 / 手势）必须完全复位，
   *  否则下一条线会继承脏状态导致落线与预览不一致（wirefix 回归点）。 */
  const cancelWire = useCallback(() => {
    setWireFrom(null);
    setSnapPort(null);
    setViaPts([]);
    setWireStartLayer('top'); // 层草稿一并复位；下次起线时会重新取当前激活层
    gestureRef.current = null;
  }, []);

  /** B4 撤销：恢复到上一个电路快照（加/删元件、加/删线、改参数、移动元件都覆盖） */
  const undo = useCallback(() => {
    if (readOnly) return;
    const target = pastRef.current[pastRef.current.length - 1];
    if (!target) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, circuitRef.current];
    historySkipRef.current = true; // 这次 props 变化是撤销本身，不要再入栈
    lastHistoryAtRef.current = 0;
    cancelWire();
    setSelRaw(null);
    onSelect?.(null);
    onChange(target);
    syncHistCounts();
    toast('已撤销上一步（Ctrl+Z 继续撤销 / Ctrl+Shift+Z 重做）', 'info');
  }, [readOnly, cancelWire, onSelect, onChange, syncHistCounts]);

  /** B4 重做 */
  const redo = useCallback(() => {
    if (readOnly) return;
    const target = futureRef.current[futureRef.current.length - 1];
    if (!target) return;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, circuitRef.current];
    historySkipRef.current = true;
    lastHistoryAtRef.current = 0;
    cancelWire();
    setSelRaw(null);
    onSelect?.(null);
    onChange(target);
    syncHistCounts();
    toast('已重做', 'info');
  }, [readOnly, cancelWire, onSelect, onChange, syncHistCounts]);

  /** 顺时针旋转元件 90°（R 键 / 悬浮旋转按钮 / 参数弹窗四朝向共用的核心逻辑；locked 元件拒绝） */
  const rotateComp = useCallback((compId: string) => {
    const circ = circuitRef.current;
    const comp = circ.components.find(c => c.id === compId);
    if (!comp || comp.locked) return;
    const rot = (((comp.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
    emitChange({ ...circ, components: circ.components.map(c => (c.id === compId ? { ...c, rotation: rot } : c)) });
    sfxClick();
  }, [emitChange]);

  /* ---------------- 指针事件 ---------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    // 右键：仅用于取消在画导线。画布平移是左键拖拽（右键原本无任何行为，故无冲突），
    // 且 onContextMenu 已 preventDefault，不会弹系统菜单。
    if (e.button === 2) {
      if (wireFrom) cancelWire();
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    trackCursor(w);
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

    // 点击布线模式（wireFrom 已激活）：端口=收线/取消，空白=加拐点；
    // 期间不触发选中、元件拖拽或平移（要平移请先 Esc 收线）。
    if (wireFrom) {
      const p = hitPort(w, SNAP_TOL / viewRef.current.k);
      if (p) {
        if (p.comp === wireFrom.comp && p.port === wireFrom.port) {
          // B1：自连不是「合法收线」，明确告诉玩家原因再取消
          toast('同一端口不能自连：导线两端必须是两个不同的引脚，本次连线已取消。', 'error');
          cancelWire();
        } else if (tryAddWire(wireFrom, p, viaPts)) {
          cancelWire();
        } else {
          // B1 拦截：保留在画导线草稿，玩家可以直接改选别的端口，不用从头再来
          gestureRef.current = null;
        }
      } else {
        // 点击空白画布：追加拐点（吸附 16px 网格，与元件拖拽同一套吸附）
        const pt = { x: Math.round(w.x / GRID) * GRID, y: Math.round(w.y / GRID) * GRID };
        setViaPts(v => [...v, pt]);
        sfxClick();
      }
      return;
    }

    const p = hitPort(w, 14 / viewRef.current.k);
    if (p) {
      setWireFrom(p);
      setWireStartLayer(activeLayer); // 新导线起始层 = 当前激活层
      setSnapPort(null);
      setViaPts([]);
      gestureRef.current = { fresh: true, moved: false, downX: e.clientX, downY: e.clientY };
      return;
    }
    const comp = hitComp(w);
    if (comp) {
      // 二次点击已选中元件 = 直接打开调参（不必找双击；拖拽不受影响，弹卡后仍可继续拖）
      if (!readOnly && !comp.locked && sel?.kind === 'comp' && sel.id === comp.id) {
        onCompDoubleClick?.(comp, { x: e.clientX, y: e.clientY });
      }
      setSel({ kind: 'comp', id: comp.id });
      if (!comp.locked) {
        clampedRef.current = false;
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
    trackCursor(w);
    // 起线手势：移动超过 6px 视为「拖拽起线」（区别于单击进入点击布线模式）
    const g = gestureRef.current;
    if (g && wireFrom && !g.moved && Math.hypot(e.clientX - g.downX, e.clientY - g.downY) > 6) g.moved = true;
    const d = dragRef.current;
    if (d?.mode === 'pan') {
      setView({ ...d.orig, x: d.orig.x + (e.clientX - d.startX), y: d.orig.y + (e.clientY - d.startY) });
      return;
    }
    if (d?.mode === 'comp') {
      const circ = circuitRef.current;
      const comp = circ.components.find(c => c.id === d.id);
      if (!comp) return;
      // B5 防呆：拖动时把元件中心钳位在画布可用区内（用点击半径给符号本身留空间）
      const raw = { x: Math.round((w.x - d.dx) / GRID) * GRID, y: Math.round((w.y - d.dy) / GRID) * GRID };
      const pos = clampComponentToWorkspace(comp, raw, compRadius(comp));
      if (pos.x !== raw.x || pos.y !== raw.y) clampedRef.current = true;
      if (comp.x !== pos.x || comp.y !== pos.y) {
        emitChange({ ...circ, components: circ.components.map(c => (c.id === d.id ? { ...c, x: pos.x, y: pos.y } : c)) });
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
    const drag = dragRef.current;
    if (wireFrom) {
      const g = gestureRef.current;
      const target = hitPort(w, SNAP_TOL / viewRef.current.k);
      const isOrigin = target !== null && target.comp === wireFrom.comp && target.port === wireFrom.port;
      if (target && !isOrigin) {
        // 松手落在目标端口：完成连线（拖拽起线与点击模式都走这里兜底）
        if (tryAddWire(wireFrom, target, viaPts)) cancelWire();
        else gestureRef.current = null; // 被防呆拦截：保留草稿，方便改选端口
      } else if (g?.fresh) {
        if (!g.moved) {
          // 单击起点端口（含轻微手抖）：进入点击布线模式（之后点空白加拐点、点目标端口收线）
          g.fresh = false;
        } else if (isOrigin) {
          // B1：拖回起点端口 = 自连，明确提示后取消
          toast('拖回起点是自连——两端必须是不同引脚，本次连线已取消。', 'error');
          cancelWire();
        } else {
          // B3：拖拽起线后松手落在空白处 → 取消，绝不产生悬空导线
          cancelWire();
          toast('松手的位置没有端口，本次连线已取消（没有产生多余导线）。', 'info');
        }
      }
      // 点击布线模式下 pointerup 不做事：收线/取消/加点都在 pointerdown 处理
    } else if (drag?.mode === 'comp') {
      // B5：拖拽结束时若和别的元件叠住，自动错开到最近空位并说明
      const circ = circuitRef.current;
      const comp = circ.components.find(c => c.id === drag.id);
      if (comp && !comp.locked && componentPlaceBlocked(circ, comp, { x: comp.x, y: comp.y }, comp.id)) {
        const spot = findFreeComponentSpot(circ, comp, { x: comp.x, y: comp.y }, compRadius(comp));
        if (spot.x !== comp.x || spot.y !== comp.y) {
          emitChange({ ...circ, components: circ.components.map(c => (c.id === comp.id ? { ...c, x: spot.x, y: spot.y } : c)) });
          toast(`${comp.id} 和别的元件叠住了，已自动挪到最近的空位。`, 'info');
        }
      } else if (clampedRef.current) {
        toast('元件不能拖出画布可用区，已经停在边缘。', 'info');
      }
    }
    clampedRef.current = false;
    dragRef.current = null;
  };

  /** B3 指针被系统取消（触控手势被抢/窗口切走）时复位所有布线草稿，避免下一条线继承脏状态 */
  const onPointerCancel = () => {
    dragRef.current = null;
    gestureRef.current = null;
    clampedRef.current = false;
    if (wireFrom) {
      cancelWire();
      toast('连线手势被中断，已复位（没有产生导线）。', 'info');
    }
  };

  /** 落线唯一入口：B1 防呆校验（自连/重复/已同网络/电源短路）不通过 → toast 说明原因且绝不产生导线。
   *  返回是否真的落下：失败时调用方保留在画导线草稿，玩家可以直接改选别的端口。 */
  const tryAddWire = (from: PortRef, to: PortRef, via?: ViaPoint[]): boolean => {
    const circ = circuitRef.current;
    const verdict = validateConnection(circ, from, to);
    if (!verdict.ok) {
      const soft = verdict.kind === 'duplicate' || verdict.kind === 'same-net';
      toast(verdict.msg, soft ? 'info' : 'error');
      return false;
    }
    const wire: WireSpec = {
      id: `W${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      from,
      to,
      layer: wireStartLayer, // 起始层；路径上的 hole 拐点会在渲染时逐段换层
      ...(via && via.length > 0 ? { via: via.map(p => ({ ...p })) } : {}),
    };
    emitChange({ ...circ, wires: [...circ.wires, wire] });
    setSel({ kind: 'wire', id: wire.id });
    sfxClick();
    return true;
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
      // B4：删除必须可撤销，而且要告诉玩家有撤销这回事
      toast('导线已删除 · Ctrl+Z（Mac ⌘Z）可撤销', 'info');
      sfxClick();
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
        cancelWire();
        setSel(null);
        return;
      }
      // 布线中：Backspace 只撤销上一个拐点（不删选中、防浏览器后退）
      if (wireFrom && e.key === 'Backspace') {
        if (viaPts.length > 0) {
          e.preventDefault();
          setViaPts(v => v.slice(0, -1));
        }
        return;
      }
      // 布线中：V 在当前光标处落过孔（hole 拐点），后续段沿层序循环换层（top→in1→in2→bottom→top）
      if (wireFrom && !readOnly && (e.key === 'v' || e.key === 'V')) {
        const holes = viaPts.reduce((n, p) => n + (p.hole ? 1 : 0), 0);
        const startIdx = Math.max(0, LAYER_ORDER.indexOf(wireStartLayer));
        const cur = LAYER_ORDER[(startIdx + holes) % LAYER_ORDER.length];
        const next = LAYER_ORDER[(startIdx + holes + 1) % LAYER_ORDER.length];
        const pt: ViaPoint = { x: Math.round(cursorRef.current.x / GRID) * GRID, y: Math.round(cursorRef.current.y / GRID) * GRID, hole: true };
        setViaPts(v => [...v, pt]);
        toast(`过孔换层：${LAYER_LABEL[cur]} → ${LAYER_LABEL[next]}`, 'info');
        sfxClick();
        return;
      }
      if (readOnly) return;
      const circ = circuitRef.current;
      // B4 撤销/重做：Ctrl+Z / Ctrl+Shift+Z（Mac 上 Cmd）；Delete 类操作之后再补 Ctrl+Y 也可重做
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        // 若正从被删元件的端口拉线，先取消布线，避免渲染期对已删端口取坐标而崩溃
        if (wireFrom && wireFrom.comp === sel.id) cancelWire();
        if (sel.kind === 'wire') {
          emitChange({ ...circ, wires: circ.wires.filter(x => x.id !== sel.id) });
          toast('导线已删除 · Ctrl+Z（Mac ⌘Z）可撤销', 'info');
        } else {
          const comp = circ.components.find(c => c.id === sel.id);
          if (comp && !comp.locked) {
            const related = circ.wires.filter(x => x.from.comp === sel.id || x.to.comp === sel.id).length;
            emitChange({
              components: circ.components.filter(c => c.id !== sel.id),
              wires: circ.wires.filter(x => x.from.comp !== sel.id && x.to.comp !== sel.id),
            });
            toast(
              related > 0
                ? `${comp.id} 及连带 ${related} 根导线已删除 · Ctrl+Z（Mac ⌘Z）可撤销`
                : `${comp.id} 已删除 · Ctrl+Z（Mac ⌘Z）可撤销`,
              'info',
            );
          }
        }
        setSel(null);
      } else if ((e.key === 'r' || e.key === 'R') && sel?.kind === 'comp') {
        rotateComp(sel.id);
      } else if (e.key.startsWith('Arrow') && sel?.kind === 'comp') {
        const comp = circ.components.find(c => c.id === sel.id);
        if (comp && !comp.locked) {
          e.preventDefault();
          const dx = e.key === 'ArrowLeft' ? -GRID : e.key === 'ArrowRight' ? GRID : 0;
          const dy = e.key === 'ArrowUp' ? -GRID : e.key === 'ArrowDown' ? GRID : 0;
          // B5：方向键微移同样不许把元件移出画布可用区
          const pos = clampComponentToWorkspace(comp, { x: comp.x + dx, y: comp.y + dy }, compRadius(comp));
          emitChange({ ...circ, components: circ.components.map(c => (c.id === comp.id ? { ...c, x: pos.x, y: pos.y } : c)) });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, readOnly, emitChange, wireFrom, viaPts, cancelWire, wireStartLayer, rotateComp, setSel, undo, redo]); // 光标走 cursorRef，不进依赖：避免监听器随鼠标移动反复拆挂

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
      ps.lightMode = themeNameRef.current === 'light'; // 亮底用深色粒子 + 普通合成
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
  // 起线/磁吸元件可能已被删掉（撤销、派生解法等），这里防御式取坐标，绝不因脏草稿白屏
  const wireFromComp = wireFrom ? compById.get(wireFrom.comp) ?? null : null;
  const snapComp = snapPort ? compById.get(snapPort.comp) ?? null : null;
  const wireFromPos = wireFrom && wireFromComp ? portWorldPos(wireFromComp, wireFrom.port) : null;
  const rubberEnd = snapPort && snapComp ? portWorldPos(snapComp, snapPort.port) : cursor;
  // A2/A3：橡皮筋预览与落线共用同一实现 + 同一上下文（existing = 当前全部已布线，boxes 排除起/终点元件），
  // 因此「悬停吸附到目标端口」时预览路径 = 松手后的落线路径，逐点一致。
  const previewSegs: WireSegment[] = (() => {
    if (!wireFrom || !wireFromPos) return [];
    const exclude = [wireFrom.comp];
    if (snapPort && snapPort.comp !== wireFrom.comp) exclude.push(snapPort.comp);
    const ctx = buildWireRouteContext(circuit, wireSegMap, exclude);
    return buildWireSegments(wireFromPos, viaPts, rubberEnd, wireStartLayer, ctx);
  })();
  // 层切换按钮状态：选中导线时显示/改派该导线的起始层，否则显示/设置激活层（新导线用）
  const selWire = sel?.kind === 'wire' ? circuit.wires.find(w => w.id === sel.id) ?? null : null;
  // 选中元件（悬浮旋转按钮 + 顶部操作提示条用）
  const selComp = sel?.kind === 'comp' ? circuit.components.find(c => c.id === sel.id) ?? null : null;
  const uiLayer: WireLayer = selWire ? selWire.layer ?? 'top' : activeLayer;
  const onLayerButton = (layer: WireLayer) => {
    if (selWire) {
      if ((selWire.layer ?? 'top') === layer) return;
      const circ = circuitRef.current;
      emitChange({ ...circ, wires: circ.wires.map(w => (w.id === selWire.id ? { ...w, layer } : w)) });
      toast(`导线 ${selWire.id} 已改派到${LAYER_LABEL[layer]}（路径上的过孔仍会逐段换层）`, 'ok');
      sfxClick();
    } else {
      setActiveLayer(layer);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ background: T.bg }}
      className={cn(
        'relative h-full w-full overflow-hidden bg-ink-950 select-none',
        probeMode || wireFrom ? 'cursor-crosshair' : dragRef.current?.mode === 'comp' ? 'cursor-grabbing' : 'cursor-default',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
      onDragOver={e => {
        if (dropItems && onDropItem) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={e => {
        if (!dropItems || !onDropItem) return;
        const id = e.dataTransfer.getData('application/x-cc-palette');
        const item = dropItems.find(p => p.id === id);
        if (!item) return;
        e.preventDefault();
        const w = toWorld(e.clientX, e.clientY);
        const want = { x: Math.round(w.x / GRID) * GRID, y: Math.round(w.y / GRID) * GRID };
        // B5 元件放置防呆：落点被占用 → 自动错开到最近空位；拖到画布外 → 钳回可用区
        const spot = findFreeComponentSpot(circuitRef.current, item, want, compRadius(item));
        const alreadyPlaced = circuitRef.current.components.some(c => c.id === item.id);
        if (!alreadyPlaced && (spot.x !== want.x || spot.y !== want.y)) {
          toast(`${item.id} 的落点和别的元件重叠，已自动放到最近空位（${spot.x}, ${spot.y}）。`, 'info');
        }
        onDropItem(item, spot);
      }}
    >
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="cc-grid" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <circle cx={0.5} cy={0.5} r={1 / view.k} fill={T.gridMinor} />
          </pattern>
          <pattern id="cc-grid4" width={64} height={64} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <circle cx={0.5} cy={0.5} r={1.6 / view.k} fill={T.gridMajor} />
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
                  <path key={wire.id} d={ptsToPath(pts)} fill="none" stroke={T.ghost} strokeWidth={2.5} strokeDasharray="6 4" />
                ) : null;
              })}
              {ghost.components.map(c => (
                <g key={c.id} transform={`translate(${c.x} ${c.y}) rotate(${c.rotation ?? 0})`}>
                  <SymbolGlyph type={c.type} closed={c.params?.closed === true} stroke={T.symbol} accent={T.port} />
                </g>
              ))}
            </g>
          )}

          {/* 导线（A3：渲染直接用全局布线表的同一组折线，命中测试也读同一份） */}
          {circuit.wires.map(wire => {
            const a = compById.get(wire.from.comp);
            const b = compById.get(wire.to.comp);
            const segs = wireSegMap.get(wire.id);
            if (!a || !b || !segs || segs.length === 0) return null;
            const pa = portWorldPos(a, wire.from.port);
            const pb = portWorldPos(b, wire.to.port);
            const selected = sel?.kind === 'wire' && sel.id === wire.id;
            const i = v?.branchCurrents ? Math.max(
              Math.abs(v.branchCurrents.get(wire.from.comp) ?? 0),
              Math.abs(v.branchCurrents.get(wire.to.comp) ?? 0),
            ) : 0;
            const active = v?.running && i > 1e-5;
            const over = v?.overcurrent && (v.overcurrent.has(wire.from.comp) || v.overcurrent.has(wire.to.comp));
            const glow = active && !over ? { filter: 'drop-shadow(0 0 3px rgba(63,196,127,0.5))' } : over ? { filter: 'drop-shadow(0 0 4px rgba(255,82,99,0.6))' } : undefined;
            const strokeOf = (layer: WireLayer) =>
              over ? T.wireOver : selected ? T.wireSelected : active ? T.wireActive : layerWireColor(T, layer);
            return (
              <g key={wire.id}>
                {segs.map((s, idx) => (
                  <path
                    key={idx}
                    d={ptsToPath(s.pts)} fill="none"
                    stroke={strokeOf(s.layer)}
                    strokeWidth={selected ? 3 : 2.5}
                    style={glow}
                  />
                ))}
                {/* 过孔标记（常显）：铜环 + 钻孔 */}
                {wire.via?.map((p, idx) => p.hole ? (
                  <g key={`hole-${idx}`} pointerEvents="none">
                    <circle cx={p.x} cy={p.y} r={5.2} fill="none" stroke={T.viaRing} strokeWidth={1.6} />
                    <circle cx={p.x} cy={p.y} r={2} fill={T.bg} stroke={T.viaRing} strokeWidth={0.8} />
                  </g>
                ) : null)}
                {selected && [pa, pb].map((p, idx) => (
                  <rect key={idx} x={p.x - 4} y={p.y - 4} width={8} height={8} fill={T.selMarkFill} stroke={T.selMarkStroke} strokeWidth={1} />
                ))}
                {/* 选中带拐点的导线：拐点画小手柄（普通拐点=方块，过孔=圆点，提示这段路径是手动布的） */}
                {selected && wire.via?.map((p, idx) => p.hole ? (
                  <circle key={`via-${idx}`} cx={p.x} cy={p.y} r={3.4} fill={T.selMarkFill} stroke={T.selMarkStroke} strokeWidth={1} opacity={0.9} />
                ) : (
                  <rect key={`via-${idx}`} x={p.x - 3} y={p.y - 3} width={6} height={6} fill={T.selMarkFill} stroke={T.selMarkStroke} strokeWidth={1} opacity={0.85} />
                ))}
              </g>
            );
          })}

          {/* 橡皮筋预览：起点 → 各拐点 → 光标/磁吸端口；与落线共用 buildWireSegments + 同一避让上下文（A2），
              悬停吸附到端口时预览路径即落线路径，颜色随层切换 */}
          {wireFrom && wireFromPos && (
            <g pointerEvents="none">
              {previewSegs.map((s, i) => (
                <path
                  key={i}
                  d={ptsToPath(s.pts)} fill="none"
                  stroke={layerWireColor(T, s.layer)}
                  strokeWidth={2} strokeDasharray="7 5" opacity={0.85}
                />
              ))}
              {viaPts.map((p, i) => p.hole ? (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={5.2} fill="none" stroke={T.viaRing} strokeWidth={1.6} opacity={0.9} />
                  <circle cx={p.x} cy={p.y} r={2} fill={T.bg} stroke={T.viaRing} strokeWidth={0.8} opacity={0.9} />
                </g>
              ) : (
                <rect key={i} x={p.x - 3.5} y={p.y - 3.5} width={7} height={7} fill={T.rubber} opacity={0.9} />
              ))}
            </g>
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
                  <circle r={compRadius(c)} fill="none" stroke={T.wireSelected} strokeWidth={1.2} strokeDasharray="4 3" />
                )}
                {over && !burned && (
                  <circle r={compRadius(c) - 2} fill="none" stroke={T.wireOver} strokeWidth={1.5} opacity={0.7} />
                )}
                <g transform={`rotate(${c.rotation ?? 0})`} style={{ cursor: readOnly ? 'default' : 'grab' }}>
                  <SymbolGlyph type={c.type} closed={c.params?.closed === true} burned={burned} stroke={T.symbol} burnedStroke={T.symbolBurned} accent={T.port} />
                </g>
                {/* 位号 + 参数 */}
                <text x={0} y={-compRadius(c) + 2} textAnchor="middle" fontSize={11} fill={T.idText} fontFamily="JetBrains Mono, monospace" style={{ userSelect: 'none' }}>
                  {c.id}{c.locked ? ' ·FIX' : ''}
                </text>
                <text x={0} y={compRadius(c) - 2} textAnchor="middle" fontSize={11} fill={T.paramText} fontFamily="JetBrains Mono, monospace" style={{ userSelect: 'none' }}>
                  {burned ? '已烧毁' : mainParamText(c)}
                </text>
                {/* 运放/LDO 输出浮动电压标签 */}
                {v?.running && v.opampOut?.has(c.id) && (
                  <text x={52} y={-10} fontSize={11} fill={T.auxText} fontFamily="JetBrains Mono, monospace">
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
                            fill={on ? T.pinOn : T.pinOff}
                            opacity={on ? 1 : 0.55}
                            stroke={T.pinStroke}
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
                            fill={on ? T.pinTextOn : T.pinTextOff}
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
                {/* 端口（B2：连线中可连接端口绿环高亮、非法端口灰/红显；B7：未接线端口灰点 + 虚线环） */}
                {PORT_GEOM[c.type].map(g => {
                  const isFrom = wireFrom?.comp === c.id && wireFrom?.port === g.name;
                  const isSnap = snapPort?.comp === c.id && snapPort?.port === g.name;
                  const key = portKey({ comp: c.id, port: g.name });
                  const state: PortConnectState | undefined = wireFrom ? portConnectivity?.get(key) : undefined;
                  const connected = connectedPorts.has(key);
                  const invalid = state === 'duplicate' || state === 'same-net' || state === 'short';
                  const fill = isSnap ? T.portSnap
                    : isFrom ? T.rubber
                      : state === 'short' ? T.wireOver
                        : invalid ? T.pinOff
                          : state === 'ok' ? T.port
                            : connected ? T.port : T.pinOff;
                  const r = isSnap ? 6 : isFrom ? 5.5 : state === 'ok' ? 4.5 : wireFrom ? 3.8 : connected ? 3.8 : 3;
                  const opacity = isSnap || isFrom ? 1 : invalid ? 0.45 : wireFrom ? 0.95 : connected ? 0.8 : 0.5;
                  const hint = state === 'origin' ? `${c.id}:${g.name} — 本次连线的起点`
                    : state === 'duplicate' ? `${c.id}:${g.name} — 已经和起点连过了`
                      : state === 'same-net' ? `${c.id}:${g.name} — 和起点已经是同一个节点`
                        : state === 'short' ? `${c.id}:${g.name} — 会把电源正负极短接！`
                          : state === 'ok' ? `${c.id}:${g.name} — 可以连` : `${c.id}:${g.name}`;
                  return (
                    <g key={g.name} transform={`rotate(${c.rotation ?? 0})`}>
                      <title>{hint}</title>
                      <circle
                        cx={g.x} cy={g.y} r={r}
                        fill={fill}
                        opacity={opacity}
                        style={isSnap ? { filter: 'drop-shadow(0 0 6px rgba(67,224,138,0.9))' } : undefined}
                      />
                      {state === 'ok' && <circle cx={g.x} cy={g.y} r={7.5} fill="none" stroke={T.portSnap} strokeWidth={1.1} opacity={0.5} />}
                      {state === 'short' && <circle cx={g.x} cy={g.y} r={8} fill="none" stroke={T.wireOver} strokeWidth={1.3} opacity={0.85} />}
                      {!wireFrom && !connected && <circle cx={g.x} cy={g.y} r={6} fill="none" stroke={T.pinOff} strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />}
                      {isSnap && <circle cx={g.x} cy={g.y} r={10} fill="none" stroke={T.portSnap} strokeWidth={1.5} opacity={0.8} />}
                    </g>
                  );
                })}
                {/* B2：连线中把端口名直接标在引脚旁，避免连错引脚 */}
                {wireFrom && PORT_GEOM[c.type].map(g => {
                  const p = portWorldPos(c, g.name);
                  const dx = p.x - c.x, dy = p.y - c.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const isSnap = snapPort?.comp === c.id && snapPort?.port === g.name;
                  const state: PortConnectState | undefined = portConnectivity?.get(portKey({ comp: c.id, port: g.name }));
                  const dim = state === 'duplicate' || state === 'same-net';
                  return (
                    <text
                      key={`lbl-${g.name}`}
                      x={dx + (dx / len) * 11}
                      y={dy + (dy / len) * 11 + 2.5}
                      textAnchor="middle"
                      fontSize={isSnap ? 9 : 7.5}
                      fontWeight={isSnap ? 700 : 400}
                      fill={isSnap ? T.portSnap : dim ? T.cornerText : T.paramText}
                      fontFamily="JetBrains Mono, monospace"
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      {g.name}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* 画布角落装饰（左移让位给撤销/重做按钮） */}
        <text x={92} y={24} fontSize={10} fill={T.cornerText} fontFamily="JetBrains Mono, monospace" letterSpacing={2}>SCHEMATIC · REV A</text>
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

      {/* B4 撤销/重做按钮（与 Ctrl+Z / Ctrl+Shift+Z 同一逻辑，可见入口不怕找不到） */}
      {!readOnly && (
        <div
          className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md border p-0.5 backdrop-blur"
          style={{ background: T.btnBg, borderColor: T.btnBorder }}
          onPointerDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={undo}
            disabled={histCounts.undo === 0}
            title="撤销（Ctrl+Z / Mac ⌘Z）"
            aria-label="撤销"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-30"
            style={{ color: T.btnText }}
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={histCounts.redo === 0}
            title="重做（Ctrl+Shift+Z / Ctrl+Y）"
            aria-label="重做"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-30"
            style={{ color: T.btnText }}
          >
            <Redo2 size={13} />
          </button>
        </div>
      )}

      {/* B7 悬空端口计数：只要还有引脚没接线就提醒，避免「以为连好了」 */}
      {!readOnly && danglingPorts > 0 && (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] backdrop-blur"
          style={{ background: T.btnBg, borderColor: T.btnBorder, color: T.auxText }}
          title="灰色虚线小圆点 = 还没接线的引脚；接上后会变成实心青色"
        >
          <AlertTriangle size={11} />
          还有 {danglingPorts} 个引脚没接线
        </div>
      )}

      {/* 缩放指示 + 比例尺 */}
      <div
        className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-3 font-mono text-[11px] text-silk-500"
        style={{ color: T.paramText }}
      >
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-10 bg-copper-500" style={{ background: T.wire }} /> 10mm
        </span>
        {Math.round(view.k * 100)}%
      </div>

      {/* 层切换：顶层 / 内层1 / 内层2 / 底层（四层板，色点=该层走线颜色）；选中导线时点击 = 重新指派该导线起始层 */}
      {!readOnly && (
        <div
          className="absolute right-12 top-3 z-10 flex items-center gap-0.5 rounded-md border p-0.5 backdrop-blur"
          style={{ background: T.btnBg, borderColor: T.btnBorder }}
          onPointerDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <Layers size={12} style={{ color: T.btnText, marginLeft: 4, marginRight: 2, opacity: 0.7 }} />
          {LAYER_ORDER.map(layer => {
            const on = uiLayer === layer;
            const dot = layerWireColor(T, layer);
            return (
              <button
                key={layer}
                type="button"
                onClick={() => onLayerButton(layer)}
                title={selWire
                  ? `把选中导线 ${selWire.id} 改派到${LAYER_LABEL[layer]}（${LAYER_TIPS[layer]}）`
                  : `${LAYER_LABEL[layer]}：${LAYER_TIPS[layer]}。点这里让新导线从${LAYER_LABEL[layer]}起画（画线中按 V 循环换层）`}
                aria-label={`切换到${LAYER_LABEL[layer]}`}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors"
                style={{
                  color: on ? dot : T.btnText,
                  background: on ? `${dot}22` : 'transparent',
                  boxShadow: on ? `inset 0 0 0 1px ${dot}66` : 'none',
                  opacity: on ? 1 : 0.65,
                }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} />
                {LAYER_LABEL[layer]}
              </button>
            );
          })}
        </div>
      )}

      {/* 画布明/暗主题切换（localStorage 持久化，同页多编辑器实例事件同步） */}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onClick={toggleTheme}
        title={themeName === 'dark' ? '切到明亮画布：给眼睛放个假' : '切回深色画布：夜班模式启动'}
        aria-label="切换画布明暗主题"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur transition-colors"
        style={{ background: T.btnBg, borderColor: T.btnBorder, color: T.btnText }}
      >
        {themeName === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* 选中元件的悬浮旋转按钮（可见入口：与 R 键同一逻辑；locked 元件不出现）。
          位置 = 选中圈右上角的屏幕坐标，随视图/旋转实时跟随 */}
      {selComp && !readOnly && !selComp.locked && !wireFrom && (() => {
        const s = toScreen({ x: selComp.x, y: selComp.y });
        const r = compRadius(selComp) * view.k;
        return (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            onClick={() => rotateComp(selComp.id)}
            title={`顺时针旋转 90°（快捷键 R）· 当前 ${selComp.rotation ?? 0}°`}
            aria-label="旋转选中元件"
            className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur transition-transform hover:scale-110"
            style={{
              left: s.x + r * 0.72 - 14,
              top: s.y - r * 0.72 - 14,
              background: T.btnBg,
              borderColor: T.wireSelected,
              color: T.wireSelected,
              boxShadow: `0 0 8px ${T.wireSelected}44`,
            }}
          >
            <RotateCw size={14} />
          </button>
        );
      })()}

      {/* 选中元件操作提示（顶部居中，与布线提示互斥）：补上「R 旋转」快捷键说明 */}
      {selComp && !wireFrom && !readOnly && !probeMode && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap font-mono text-[11px]"
          style={{ color: T.paramText }}
        >
          {selComp.locked
            ? '元件已锁定（不能旋转/移动）· 双击查看参数'
            : 'R 旋转 · 双击调参数 · 方向键微移 · Delete 删除（Ctrl+Z 撤销）'}
        </div>
      )}

      {/* 布线中操作提示（顶部居中：显示起点 → 吸附目标端口名，B2 防错引脚） */}
      {wireFrom && !readOnly && !probeMode && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap font-mono text-[11px]"
          style={{ color: T.paramText }}
        >
          {snapPort
            ? `起点 ${wireFrom.comp}:${wireFrom.port} → 吸附到目标 ${snapPort.comp}:${snapPort.port} · 松手/点击完成`
            : viaPts.length > 0
              ? `起点 ${wireFrom.comp}:${wireFrom.port} · 拐点 ×${viaPts.length} · 点空白再加 · V 过孔换层 · Backspace 撤销 · Esc 取消`
              : `起点 ${wireFrom.comp}:${wireFrom.port} · 绿色环=可连端口 · 点目标端口收线 · 点空白加拐点 · Esc 取消`}
        </div>
      )}
    </div>
  );
}
