// 自由沙盒 /sandbox —— 全部件解锁自由搭建 + 函数发生器 + 5 槽存档 + 分享码 + 老手挑战 + CSV 导出
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box, FileBox, FileDown, FileUp, FlaskConical, FolderOpen, Import, Link2, Save, Trophy, X,
} from 'lucide-react';
import type { CircuitSpec, ComponentSpec } from '@/engine/types';
import { formatSI, numParam, solveDC, COMP_META } from '@/engine/solver';
import { maxFuncgenFreq } from '@/engine/solver';
import { REFDES_PREFIX } from '@/components/ComponentChip';
import CircuitEditor, { type EditorVisuals } from '@/components/editor/CircuitEditor';
import PalettePanel, { fullSandboxPalette } from '@/components/editor/PalettePanel';
import ParamDialog from '@/components/editor/ParamDialog';
import { ToastHost, toast } from '@/components/editor/toast';
import { useSimulation, defaultTimebase } from '@/components/editor/useSimulation';
import { setSoundEnabled } from '@/components/editor/sound';
import WaveformPanel, { CH_NAMES, type ScopeChannel } from '@/components/WaveformPanel';
import PadButton from '@/components/PadButton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { MultimeterCard, RightCollapseBar, RightPanelHeader, RunControls } from '@/components/editor/WorkbenchBits';
import { safeGetItem, safeSetItem, setStorageWarnHandler } from '@/lib/safeStorage';
import { useProgress } from '@/store/progress';
import { parseProject, serializeProject } from '@/features/pcb3d/projectFile';
import { cn } from '@/lib/utils';

// 3D PCB 预览器：懒加载（首次打开面板才下载 three.js）
const Pcb3DViewer = lazy(() => import('@/features/pcb3d/Pcb3DViewer'));

/* ---------------- 存档槽（localStorage cc-sandbox-*） ---------------- */
// pcb? 仅作历史字段容忍：旧槽位 JSON 里可能带 pcb 布局，读取时忽略、新存档不再写入
interface SaveSlot { name: string; savedAt: number; circuit: CircuitSpec; pcb?: unknown }
const SLOT_KEYS = [1, 2, 3, 4, 5].map(i => `cc-sandbox-${i}`);

function readSlot(key: string): SaveSlot | null {
  try {
    const raw = safeGetItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveSlot;
    return s && s.circuit ? s : null;
  } catch { return null; }
}

/* ---------------- 分享码（Base64URL，前缀 CCT1-） ---------------- */
function encodeShare(circuit: CircuitSpec): string {
  const json = JSON.stringify({ v: 1, circuit });
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `CCT1-${b64}`;
}
function decodeShare(code: string): CircuitSpec | null {
  try {
    const t = code.trim();
    if (!t.startsWith('CCT1-')) return null;
    const b64 = t.slice(5).replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    if (obj?.v !== 1 || !Array.isArray(obj.circuit?.components) || !Array.isArray(obj.circuit?.wires)) return null;
    return obj.circuit as CircuitSpec;
  } catch { return null; }
}

/* ---------------- 老手挑战 ---------------- */
interface Challenge { id: string; title: string; hint: string }
const CHALLENGES: Challenge[] = [
  { id: 'mic-pre', title: '±15V 运放增益 46dB 话筒前级', hint: '增益 200 倍：反相放大 Rf/Rin = 200，注意输出别削波（看示波器平顶）。' },
  { id: 'active-lpf', title: '二阶有源低通 f₀=1kHz', hint: '两级 RC 各取 f=1/(2πRC)≈1kHz，例如 R=15.9kΩ、C=10nF，运放缓冲。示波器找 -3dB 点。' },
  { id: 'rc-osc', title: 'RC 振荡器起振条件实验', hint: '正反馈 + 增益 ≥ 3（文氏桥）。教学模型下观察起振波形即可。' },
  { id: 'relay-flyback', title: '三极管开关驱动继电器 + 续流二极管', hint: 'NPN 低边开关，电感负载断电产生反峰；反并联二极管后尖峰消失。' },
  { id: 'bridge-ripple', title: '桥式整流 + 电容滤波纹波计算', hint: '4 二极管全桥 + 大电容；纹波 ΔV ≈ I·T/C，与示波器实测对比。' },
  { id: 'bias-stability', title: '分压式偏置工作点稳定性调试', hint: '上/下偏置电阻 + 射极电阻，调 wiper 看 Vc 漂移。' },
  { id: 'poor-dac', title: 'PWM + RC「贫穷的 DAC」', hint: '函数发生器方波 duty 20%/50%/80%，RC 滤波后 Vavg ≈ duty×Vpp。' },
  { id: 'ldo-ripple', title: '复刻电源部分，纹波压到 50mV 以下', hint: '整流滤波 + LDO(ic) + 输出电容，示波器 V/DIV 调小看纹波。' },
];
const CH_KEY = 'cc-sandbox-challenges';
function readChallenges(): string[] {
  try { return JSON.parse(safeGetItem(CH_KEY) ?? '[]'); } catch { return []; }
}

const EMPTY_CIRCUIT: CircuitSpec = { components: [], wires: [] };

export default function Sandbox() {
  const [circuit, setCircuit] = useState<CircuitSpec>(EMPTY_CIRCUIT);
  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;
  const [docName, setDocName] = useState('未命名电路');
  const [running, setRunning] = useState(false);
  const { simRef, version, error } = useSimulation(circuit, running);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [instrCollapsed, setInstrCollapsed] = useState(false);
  const [channels, setChannels] = useState<ScopeChannel[]>([{ probe: null }, { probe: null }, { probe: null }]);
  const [probingChannel, setProbingChannel] = useState<number | null>(null);
  const [timebase, setTimebase] = useState(1e-3);
  const [vdiv, setVdiv] = useState(2);
  const [paramEdit, setParamEdit] = useState<{ compId: string; anchor: { x: number; y: number } } | null>(null);
  const [selInfo, setSelInfo] = useState<{ kind: 'comp' | 'wire'; id: string } | null>(null);
  const [slotDrawer, setSlotDrawer] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [doneChallenges, setDoneChallenges] = useState<string[]>(readChallenges);
  const [guideStep, setGuideStep] = useState(() => (safeGetItem('cc-sandbox-guide-seen') ? 0 : 1));
  const [preview3d, setPreview3d] = useState(false);
  const [previewH, setPreviewH] = useState(320);
  const [projMenu, setProjMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragResizeRef = useRef<{ startY: number; startH: number } | null>(null);

  const soundOn = useProgress(s => s.settings.sound);
  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);

  // 存储写失败（隐私模式/配额满）时的一次性警告（safeStorage 只触发一次）
  useEffect(() => {
    setStorageWarnHandler(msg => toast(msg, 'error'));
    return () => setStorageWarnHandler(null);
  }, []);

  const palette = useMemo(fullSandboxPalette, []);
  const emptyUsed = useMemo(() => new Set<string>(), []);

  /* ---------------- 放置元件（自动生成位号） ---------------- */
  const addFromPalette = useCallback((item: ComponentSpec) => {
    setCircuit(c => {
      const prefix = REFDES_PREFIX[item.type] ?? 'U';
      let n = 1;
      while (c.components.some(x => x.id === `${prefix}${n}`)) n++;
      const comp: ComponentSpec = {
        ...item,
        id: `${prefix}${n}`,
        params: { ...(item.params ?? {}) },
        x: 240 + ((c.components.length * 3) % 5) * 96,
        y: 112 + (Math.floor(c.components.length / 5) % 4) * 112,
      };
      return { ...c, components: [...c.components, comp] };
    });
  }, []);

  /* ---------------- 函数发生器控制 ---------------- */
  const funcgen = circuit.components.find(c => c.type === 'funcgen');
  const setFgParam = (key: string, v: number | string | boolean) => {
    if (!funcgen) return;
    setCircuit(c => ({ ...c, components: c.components.map(x => (x.id === funcgen.id ? { ...x, params: { ...(x.params ?? {}), [key]: v } } : x)) }));
  };
  useEffect(() => {
    if (funcgen) setTimebase(defaultTimebase(circuit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcgen?.id]);

  /* ---------------- 存档 ---------------- */
  const saveToSlot = (key: string) => {
    const existing = readSlot(key);
    if (existing && !window.confirm(`覆盖槽位「${existing.name}」？`)) return;
    const slot: SaveSlot = { name: docName, savedAt: Date.now(), circuit: circuitRef.current };
    // 写失败降级内存并弹一次性警告（safeStorage），这里只在真正持久化时报成功
    const persisted = safeSetItem(key, JSON.stringify(slot));
    if (persisted) toast(`已保存到 ${key.replace('cc-sandbox-', '槽位 ')}。`, 'ok');
  };
  const loadSlot = (key: string) => {
    const s = readSlot(key);
    if (!s) return;
    setRunning(false);
    setCircuit(s.circuit); // s.pcb（旧存档的 PCB 布局字段）有意忽略
    setDocName(s.name);
    setSlotDrawer(false);
    toast(`已载入「${s.name}」。`, 'ok');
  };

  /* ---------------- 分享码 ---------------- */
  const exportShare = async () => {
    const code = encodeShare(circuitRef.current);
    try {
      await navigator.clipboard.writeText(code);
      toast('分享码已复制到剪贴板，发给朋友吧！', 'ok');
    } catch {
      window.prompt('复制分享码：', code);
    }
  };
  const importShare = () => {
    const c = decodeShare(importText);
    if (!c) {
      toast('这不是回路工坊的分享码（应以 CCT1- 开头）。', 'error');
      return;
    }
    setRunning(false);
    setCircuit(c);
    setDocName('导入的分享电路');
    setImportOpen(false);
    setImportText('');
    toast('分享码导入成功！', 'ok');
  };

  /* ---------------- 工程文件（.ccproj.json；旧文件里可能带 pcb 字段，parseProject 会自然忽略） ---------------- */
  const exportProject = () => {
    const text = serializeProject(docName, circuitRef.current);
    const safe = (docName.trim() || '未命名电路').replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safe}.ccproj.json`;
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    setProjMenu(false);
    toast(`工程已导出为 ${filename}。`, 'ok');
  };
  const importProjectFile = async (file: File) => {
    const text = await file.text();
    const result = parseProject(text);
    if (!result.ok) {
      toast(`导入失败：${result.error}`, 'error');
      return;
    }
    setRunning(false);
    setCircuit(result.circuit);
    setDocName(result.name);
    setProjMenu(false);
    toast(`工程「${result.name}」导入成功！元件 ${result.circuit.components.length} · 导线 ${result.circuit.wires.length}`, 'ok');
  };

  /* ---------------- CSV 导出 ---------------- */
  const exportCsv = () => {
    const sim = simRef.current;
    const series = channels.map(ch => (ch.probe ? sim.nodeSeries(ch.probe) : undefined));
    if (!series.some(s => s && s.size > 1)) {
      toast('先接示波器探头再导出数据。', 'error');
      return;
    }
    const windowSec = 5;
    const n = Math.min(Math.floor(windowSec / sim.dt), sim.timeHist.size);
    const stride = Math.max(1, Math.floor(n / 2000));
    const rows: string[] = [`t(s),${CH_NAMES.map((_, i) => `CH${i + 1}(${channels[i].probe ? `${channels[i].probe!.comp}:${channels[i].probe!.port}` : 'off'})`).join(',')}`];
    for (let back = n - 1; back >= 0; back -= stride) {
      const t = sim.timeHist.at(back);
      const vs = series.map(s => (s && s.size > back ? s.at(back).toPrecision(6) : ''));
      rows.push(`${t.toPrecision(8)},${vs.join(',')}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `circuitcraft-${docName}-wave.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`已导出 ${rows.length - 1} 行波形数据（最近 ${windowSec}s）。`, 'ok');
  };

  /* ---------------- 挑战 ---------------- */
  const toggleChallenge = (id: string) => {
    setDoneChallenges(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      safeSetItem(CH_KEY, JSON.stringify(next));
      return next;
    });
  };

  /* ---------------- 仿真可视化 ---------------- */
  const dcResult = useMemo(() => (running ? null : solveDC(circuit)), [circuit, running]);
  const activeResult = running ? simRef.current.latest : dcResult;
  const visuals: EditorVisuals = {
    running,
    netOf: activeResult?.netOf,
    nodeVoltages: activeResult?.nodeVoltages,
    branchCurrents: activeResult?.branchCurrents,
    opampOut: activeResult?.opampOut,
    overcurrent: running && activeResult?.ok ? overSet() : undefined,
    blown: running ? simRef.current.state.blown : undefined,
  };
  function overSet() {
    const set = new Set<string>();
    const res = activeResult;
    if (!res?.ok) return set;
    for (const c of circuit.components) {
      const lim = c.type === 'led' ? numParam(c, 'imax', 0.02) : c.type === 'fuse' ? numParam(c, 'rating', 0.5) : COMP_META[c.type].maxCurrent;
      if (lim && Math.abs(res.branchCurrents.get(c.id) ?? 0) > lim) set.add(c.id);
    }
    return set;
  }
  useEffect(() => {
    if (!running) return;
    for (const e of simRef.current.drainFailures()) toast(e.message, 'error');
  }, [version, running, simRef]);
  useEffect(() => {
    if (error && running) {
      setRunning(false);
      toast(`仿真暂停：${error}`, 'error');
    }
  }, [error, running]);

  const multimeter = (() => {
    if (!selInfo || !activeResult?.ok) return { hint: '点击导线或端口进行测量' };
    if (selInfo.kind === 'wire') {
      const wire = circuit.wires.find(w => w.id === selInfo.id);
      if (!wire) return { hint: '点击导线或端口进行测量' };
      const net = activeResult.netOf.get(`${wire.from.comp}:${wire.from.port}`);
      const v = net !== undefined ? activeResult.nodeVoltages.get(net) ?? 0 : NaN;
      return { voltage: formatSI(v, 'V'), hint: `导线 ${wire.from.comp}:${wire.from.port} ↔ ${wire.to.comp}:${wire.to.port}` };
    }
    const i = activeResult.branchCurrents.get(selInfo.id);
    return { current: i !== undefined ? formatSI(Math.abs(i), 'A') : '—', hint: `支路 ${selInfo.id}` };
  })();

  const nodeCount = activeResult?.nodeVoltages.size ?? 1;
  const challengeBadge = doneChallenges.length >= 4;

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col overflow-hidden">
      <ToastHost />
      {/* ---------- 顶部工具栏 ---------- */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-900 px-4">
        <FlaskConical className="h-4 w-4 text-pcb-300" />
        <span className="text-base font-bold text-silk-100">自由沙盒</span>
        <input
          value={docName}
          onChange={e => setDocName(e.target.value)}
          className="w-40 rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-xs text-silk-300 outline-none focus:border-sig-cyan"
          title="点击改名"
        />
        {challengeBadge && (
          <span className="flex items-center gap-1 rounded border border-copper-500/50 px-2 py-0.5 font-mono text-[10px] text-copper-300">
            <Trophy className="h-3 w-3" /> · 沙盒玩家
          </span>
        )}

        {/* 原理图双层走线提示：顶/底层切换 + 过孔（画布工具区内操作） */}
        <span className="mx-1 hidden rounded border border-ink-700 bg-ink-850 px-2.5 py-1 font-mono text-[11px] text-silk-500 lg:inline" title="原理图支持双层走线：顶层/底层切换 + V 键过孔换层">
          原理图 · 双层走线
        </span>

        {/* 信号源控制 */}
        <div className="mx-1 flex items-center gap-2 rounded border border-ink-700 bg-ink-850 px-3 py-1">
          <span className="font-mono text-[10px] tracking-widest text-silk-700">FUNC GEN</span>
          {funcgen ? (
            <>
              {(['sine', 'square', 'triangle'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setFgParam('waveform', w)}
                  className={cn('rounded px-1.5 py-0.5 font-mono text-[10px]', funcgen.params?.waveform === w ? 'bg-pcb-600/40 text-pcb-300' : 'text-silk-500 hover:text-silk-100')}
                >
                  {w === 'sine' ? '正弦' : w === 'square' ? '方波' : '三角'}
                </button>
              ))}
              <input
                type="number"
                value={numParam(funcgen, ['freq', 'fs'], 1000)}
                onChange={e => setFgParam('freq', Math.max(0.1, Number(e.target.value) || 1))}
                className="w-16 rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-right font-mono text-[11px] text-silk-100 outline-none"
                title="频率 Hz"
              />
              <span className="font-mono text-[10px] text-silk-700">Hz</span>
              <input
                type="number" step={0.5}
                value={numParam(funcgen, 'vmax', 5)}
                onChange={e => setFgParam('vmax', Number(e.target.value) || 0)}
                className="w-12 rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-right font-mono text-[11px] text-silk-100 outline-none"
                title="高电平 V"
              />
              <span className="font-mono text-[10px] text-silk-700">V</span>
            </>
          ) : (
            <button
              onClick={() => addFromPalette(palette.find(p => p.type === 'funcgen')!)}
              className="font-mono text-[11px] text-sig-cyan hover:underline"
            >
              + 放置函数发生器
            </button>
          )}
        </div>

        <div className="flex-1" />
        <PadButton
          size="S"
          variant={preview3d ? 'primary' : 'ghost'}
          onClick={() => setPreview3d(v => !v)}
          title="把当前电路转印成 3D PCB"
        >
          <Box className="h-3.5 w-3.5" /> 3D 预览
        </PadButton>
        {/* 工程文件菜单 */}
        <div className="relative">
          <PadButton size="S" variant="ghost" onClick={() => setProjMenu(v => !v)} title="本地工程文件导入/导出">
            <FileBox className="h-3.5 w-3.5" /> 工程
          </PadButton>
          <AnimatePresence>
            {projMenu && (
              <>
                <div className="fixed inset-0 z-[68]" onClick={() => setProjMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="panel-raised absolute right-0 top-full z-[69] mt-1 w-56 rounded-lg border border-ink-700 p-1.5"
                >
                  <button
                    onClick={exportProject}
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-silk-300 hover:bg-ink-700 hover:text-silk-100"
                  >
                    <FileDown className="h-3.5 w-3.5 text-copper-400" />
                    <span>导出工程 <span className="font-mono text-[10px] text-silk-700">.ccproj.json</span></span>
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); }}
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-silk-300 hover:bg-ink-700 hover:text-silk-100"
                  >
                    <FileUp className="h-3.5 w-3.5 text-sig-cyan" />
                    <span>导入工程文件…</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void importProjectFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <PadButton size="S" variant="ghost" onClick={() => setSlotDrawer(v => !v)}><FolderOpen className="h-3.5 w-3.5" /> 存档槽</PadButton>
        <PadButton size="S" variant="ghost" onClick={() => saveToSlot(SLOT_KEYS[0])}><Save className="h-3.5 w-3.5" /> 保存</PadButton>
        <PadButton size="S" variant="ghost" onClick={exportShare}><Link2 className="h-3.5 w-3.5" /> 分享码</PadButton>
        <PadButton size="S" variant="ghost" onClick={() => setImportOpen(true)}><Import className="h-3.5 w-3.5" /> 导入</PadButton>
        <RunControls running={running} onRun={() => setRunning(true)} onPause={() => setRunning(false)} onReset={() => { setRunning(false); setCircuit(EMPTY_CIRCUIT); setDocName('未命名电路'); }} />
      </div>

      {/* ---------- 三栏 ---------- */}
      <div className="flex min-h-0 flex-1">
        <PalettePanel
          items={palette}
          usedIds={emptyUsed}
          onAdd={addFromPalette}
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed(v => !v)}
          footer={<span className="font-mono text-[10px] text-silk-700">全部件已解锁 · 双击放入画布</span>}
        />

        <div className="relative min-w-0 flex-1">
          <CircuitEditor
            circuit={circuit}
            onChange={setCircuit}
            visuals={visuals}
            probeMode={probingChannel !== null}
            onProbe={p => {
              if (probingChannel !== null) {
                setChannels(cs => cs.map((c, i) => (i === probingChannel ? { probe: p } : c)));
                toast(`${CH_NAMES[probingChannel]} 探头已接 ${p.comp}:${p.port}`, 'ok');
                setProbingChannel(null);
              }
            }}
            onCompDoubleClick={(comp, anchor) => setParamEdit({ compId: comp.id, anchor })}
            onSelect={setSelInfo}
          />
          <span className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.3em] text-silk-700">SANDBOX</span>

          {/* 空态 */}
          {circuit.components.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <img src="/empty-state.svg" alt="空白电路板" className="w-64 opacity-80" />
              <p className="mt-3 text-sm text-silk-500">拖个元件上来，或者载入一份存档</p>
            </div>
          )}

          {/* 首次引导 */}
          <AnimatePresence>
            {guideStep > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="panel-raised absolute bottom-8 left-1/2 z-20 w-[420px] -translate-x-1/2 rounded-lg p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <img src="/npc-xiaohan.png" alt="小焊" className="h-8 w-8 rounded-full border border-pcb-400 object-cover" />
                  <span className="text-sm font-bold text-silk-100">小焊的沙盒指引 {guideStep}/2</span>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-silk-300">
                  {guideStep === 1
                    ? '这里没有标准答案，随便搭！函数发生器在顶部工具栏，可以注入正弦/方波/三角波。'
                    : '做完记得点 💾 保存到存档槽；分享码可以发给朋友，他们粘贴导入就能看到你的电路。'}
                </p>
                <div className="flex justify-end gap-2">
                  <PadButton size="S" variant="ghost" onClick={() => { setGuideStep(0); safeSetItem('cc-sandbox-guide-seen', '1'); }}>跳过</PadButton>
                  <PadButton size="S" onClick={() => {
                    if (guideStep === 1) setGuideStep(2);
                    else { setGuideStep(0); safeSetItem('cc-sandbox-guide-seen', '1'); }
                  }}>
                    {guideStep === 1 ? '下一步' : '开工！'}
                  </PadButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {instrCollapsed ? (
          <RightCollapseBar onExpand={() => setInstrCollapsed(false)} />
        ) : (
          <div className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-ink-700 bg-ink-850">
            <RightPanelHeader onCollapse={() => setInstrCollapsed(true)} title="INSTRUMENTS · 仪器" />
            <div className="flex flex-1 flex-col gap-3 p-3">
              <WaveformPanel
                simRef={simRef}
                channels={channels}
                running={running}
                probingChannel={probingChannel}
                onRequestProbe={i => { setProbingChannel(i); toast('到画布上点击一个端口或导线接入探头。', 'info'); }}
                onClearProbe={i => setChannels(cs => cs.map((c, k) => (k === i ? { probe: null } : c)))}
                timebase={timebase}
                onTimebase={setTimebase}
                voltsPerDiv={vdiv}
                onVoltsPerDiv={setVdiv}
                onExportCsv={exportCsv}
              />
              <MultimeterCard voltage={multimeter.voltage} current={multimeter.current} hint={multimeter.hint} />

              {/* 老手挑战 */}
              <div className="rounded-md border border-ink-700 bg-ink-900/60">
                <button onClick={() => setChallengeOpen(v => !v)} className="flex w-full items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-copper-300">
                    <Trophy className="h-3.5 w-3.5" /> 挑战 · {doneChallenges.length}/8
                  </span>
                  <span className="font-mono text-[10px] text-silk-700">{challengeOpen ? '▲' : '▼'}</span>
                </button>
                {challengeOpen && (
                  <div className="space-y-2 border-t border-ink-700 p-3">
                    <p className="text-[10px] text-silk-700">无奖励纯荣誉，完成 4/8 解锁称号后缀「· 沙盒玩家」。勾选为自评。</p>
                    {CHALLENGES.map((ch, i) => (
                      <ChallengeCard key={ch.id} index={i + 1} ch={ch} done={doneChallenges.includes(ch.id)} onToggle={() => toggleChallenge(ch.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- 3D PCB 预览抽屉（可拖高度） ---------- */}
      <AnimatePresence>
        {preview3d && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: previewH }} exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="relative shrink-0 overflow-hidden border-t border-ink-700 bg-ink-950"
          >
            {/* 拖拽调高把手 */}
            <div
              className="absolute left-0 right-0 top-0 z-20 flex h-3 cursor-row-resize items-center justify-center"
              onPointerDown={e => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                dragResizeRef.current = { startY: e.clientY, startH: previewH };
              }}
              onPointerMove={e => {
                const d = dragResizeRef.current;
                if (!d) return;
                setPreviewH(Math.min(Math.max(d.startH + (d.startY - e.clientY), 200), window.innerHeight - 320));
              }}
              onPointerUp={() => { dragResizeRef.current = null; }}
              title="拖拽调整预览高度"
            >
              <span className="h-1 w-12 rounded-full bg-ink-600" />
            </div>
            <div className="absolute left-3 top-2 z-10 flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-copper-400">
              <Box className="h-3 w-3" /> 3D PCB PREVIEW · REV A
            </div>
            <button
              onClick={() => setPreview3d(false)}
              className="absolute right-3 top-2 z-10 text-silk-500 hover:text-silk-100"
              title="关闭 3D 预览"
            >
              <X className="h-4 w-4" />
            </button>
            {/* 3D 局部兜底：chunk 加载失败 / WebGL 不可用时只降级本区域，不带走整站 */}
            <ErrorBoundary variant="viewer">
              <Suspense fallback={
                <div className="flex h-full items-center justify-center font-mono text-xs text-silk-500">
                  正在装载 3D 引擎（three.js）…
                </div>
              }>
                <Pcb3DViewer circuit={circuit} currents={activeResult?.branchCurrents ?? null} />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- 底部状态条 ---------- */}
      <div className="flex h-8 shrink-0 items-center gap-5 border-t border-ink-700 bg-ink-900 px-4 font-mono text-[11px] text-silk-500">
        <span className={cn('flex items-center gap-1.5', running ? 'text-ok' : error ? 'text-danger' : '')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'animate-pulse bg-ok' : error ? 'bg-danger' : 'bg-silk-700')} />
          {error ? `仿真错误：${error}` : running ? '仿真运行中' : '仿真已暂停'}
        </span>
        <span>节点 {Math.max(nodeCount - 1, 0)}</span>
        <span>dt = {formatSI(simRef.current.dt, 's')}{maxFuncgenFreq(circuit) > 0 ? '（自适应）' : ''}</span>
        <span>t = {formatSI(simRef.current.time, 's')}</span>
        <span className="ml-auto text-silk-700">仿真里烧一百次，现实里一次不烧</span>
      </div>

      {/* ---------- 存档槽抽屉 ---------- */}
      <AnimatePresence>
        {slotDrawer && (
          <motion.aside
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ duration: 0.3 }}
            className="panel-raised fixed left-0 top-16 z-[55] flex h-[calc(100dvh-64px)] w-80 flex-col border-r border-ink-700"
          >
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <span className="text-sm font-bold text-silk-100">存档槽（本地 5 槽）</span>
              <button onClick={() => setSlotDrawer(false)} className="text-silk-500 hover:text-silk-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {SLOT_KEYS.map((key, i) => {
                const s = readSlot(key);
                return (
                  <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-ink-700 bg-ink-900 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs text-sig-cyan">SLOT {i + 1}</span>
                      {s && <span className="font-mono text-[10px] text-silk-700">{new Date(s.savedAt).toLocaleString('zh-CN')}</span>}
                    </div>
                    {s ? (
                      <>
                        <div className="mb-1 text-sm text-silk-100">{s.name}</div>
                        <p className="mb-2 font-mono text-[10px] text-silk-700">元件 {s.circuit.components.length} · 导线 {s.circuit.wires.length}</p>
                        <div className="flex gap-2">
                          <PadButton size="S" onClick={() => loadSlot(key)}>载入</PadButton>
                          <PadButton size="S" variant="ghost" onClick={() => saveToSlot(key)}>覆盖保存</PadButton>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-xs text-silk-700">空槽位</p>
                        <PadButton size="S" variant="ghost" onClick={() => saveToSlot(key)}>保存当前电路</PadButton>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------- 导入分享码 ---------- */}
      <AnimatePresence>
        {importOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center bg-ink-950/70 backdrop-blur-[8px]">
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} className="panel-raised w-[480px] rounded-xl p-6">
              <h3 className="mb-2 text-lg font-bold text-silk-100">导入分享码</h3>
              <p className="mb-3 text-xs text-silk-500">粘贴以 CCT1- 开头的分享码：</p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={4}
                placeholder="CCT1-…"
                className="mb-4 w-full rounded border border-ink-700 bg-ink-900 p-2 font-mono text-xs text-silk-100 outline-none focus:border-sig-cyan"
              />
              <div className="flex justify-end gap-2">
                <PadButton size="S" variant="ghost" onClick={() => setImportOpen(false)}>取消</PadButton>
                <PadButton size="S" onClick={importShare}>导入</PadButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- 参数弹窗 ---------- */}
      {paramEdit && (() => {
        const comp = circuit.components.find(c => c.id === paramEdit.compId);
        if (!comp) return null;
        return (
          <ParamDialog
            comp={comp}
            anchor={paramEdit.anchor}
            onChange={params => setCircuit(c => ({ ...c, components: c.components.map(x => (x.id === comp.id ? { ...x, params } : x)) }))}
            onClose={() => setParamEdit(null)}
          />
        );
      })()}
    </div>
  );
}

function ChallengeCard({ index, ch, done, onToggle }: { index: number; ch: Challenge; done: boolean; onToggle: () => void }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className={cn('rounded border p-2', done ? 'border-copper-500/50 bg-copper-600/10' : 'border-ink-700 bg-ink-850')}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-xs leading-snug', done ? 'text-copper-300' : 'text-silk-300')}>
          {index}. {ch.title}
        </span>
        <button
          onClick={onToggle}
          className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]',
            done ? 'border-copper-400 text-copper-300' : 'border-ink-600 text-silk-500 hover:border-pcb-400 hover:text-pcb-300')}
        >
          {done ? '✓ 已完成' : '标记完成'}
        </button>
      </div>
      <button onClick={() => setShowHint(v => !v)} className="mt-1 font-mono text-[10px] text-sig-cyan hover:underline">
        {showHint ? '收起提示 ▲' : '查看提示 ▼'}
      </button>
      {showHint && <p className="mt-1 text-[11px] leading-relaxed text-silk-500">{ch.hint}</p>}
    </div>
  );
}
