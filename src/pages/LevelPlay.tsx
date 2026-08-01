// 关卡游玩页 /play/:levelId —— 三栏工作台 + 准物理仿真 + 渐进提示 + 防卡关 + QC PASS 结算
// 数据暂为空时用 fixtures 兜底并显示「内容装载中」占位，不得报红。
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Box, Check, Lightbulb, Stamp, Trophy } from 'lucide-react';
import type { CircuitSpec, DialogueLine, GoalCheck, LevelDef, StarCondition, WireSpec } from '@/engine/types';
import { evaluateGoals, formatSI, solveDC, type GoalStatus } from '@/engine/solver';
import { FIXTURE_LEVELS } from '@/engine/fixtures';
import { getLevel, LEVELS, SIDE_QUESTS } from '@/content/levels';
import { useProgress } from '@/store/progress';
import CircuitEditor, { type EditorVisuals } from '@/components/editor/CircuitEditor';
import PalettePanel from '@/components/editor/PalettePanel';
import ParamDialog from '@/components/editor/ParamDialog';
import { PARAM_SCHEMA } from '@/components/editor/symbols';
import { ToastHost, toast } from '@/components/editor/toast';
import { useSimulation, defaultTimebase } from '@/components/editor/useSimulation';
import { setSoundEnabled, sfxChord } from '@/components/editor/sound';
import WaveformPanel, { CH_NAMES, type ScopeChannel } from '@/components/WaveformPanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import DialogueBar from '@/components/DialogueBar';
import StarMeter from '@/components/StarMeter';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { MultimeterCard, NotesCard, RightCollapseBar, RightPanelHeader, RunControls } from '@/components/editor/WorkbenchBits';
import { SOLDER_CURSOR_CLASS, ensureSolderCursorStyle } from '@/lib/cursor';
import { cn } from '@/lib/utils';

// 3D PCB 预览器：懒加载（结算弹窗里展开才下载 three.js）
const Pcb3DViewer = lazy(() => import('@/features/pcb3d/Pcb3DViewer'));

function clonePreset(level: LevelDef): CircuitSpec {
  return {
    components: level.preset.components.map(c => ({ ...c, params: { ...(c.params ?? {}) } })),
    wires: level.preset.wires.map(w => ({
      id: w.id,
      from: { ...w.from },
      to: { ...w.to },
      ...(w.layer ? { layer: w.layer } : {}),
      ...(w.via ? { via: w.via.map(p => ({ ...p })) } : {}), // {...p} 同时带走 hole 过孔标记
    })),
  };
}

/** param key → 中文名/单位 反查表（PARAM_SCHEMA 按元件类型组织，目标里只有 key，故反查；同 key 取先见者） */
const PARAM_LABELS: Record<string, { label: string; unit?: string }> = (() => {
  const map: Record<string, { label: string; unit?: string }> = {};
  for (const fields of Object.values(PARAM_SCHEMA)) {
    for (const f of fields ?? []) if (!map[f.key]) map[f.key] = { label: f.label, unit: f.unit };
  }
  return map;
})();

/** 目标数值格式化：极大/极小且带单位时用 SI 词头（400000000 Hz → 400 MHz），否则原样 */
function fmtGoalValue(v: number, unit?: string): string {
  if (unit && (Math.abs(v) >= 1000 || (Math.abs(v) > 0 && Math.abs(v) < 0.01))) return formatSI(v, unit).replace(' ', '');
  return `${v}${unit ?? ''}`;
}

export function goalLabel(g: GoalCheck): string {
  switch (g.kind) {
    case 'connected': return `连通 ${g.a.comp}:${g.a.port} ↔ ${g.b.comp}:${g.b.port}`;
    case 'component-placed': return `放置 ${g.count ?? 1} 个 ${g.type}`;
    case 'param': {
      const meta = PARAM_LABELS[g.param];
      const zh = meta ? ` ${meta.label}` : '';
      const unit = meta?.unit;
      const range = g.min !== undefined && g.max !== undefined
        ? `${fmtGoalValue(g.min, unit)}~${fmtGoalValue(g.max, unit)}`
        : g.min !== undefined
          ? `≥ ${fmtGoalValue(g.min, unit)}`
          : `≤ ${fmtGoalValue(g.max!, unit)}`;
      return `${g.comp} 的 ${g.param}${zh} ${range}`;
    }
    case 'node-voltage': return `V(${g.node.comp}:${g.node.port}) ∈ [${g.min}, ${g.max}]V`;
    case 'branch-current': return `I(${g.comp}) ∈ [${g.min}, ${g.max}]mA`;
    case 'led-lit': return `点亮 ${g.comp}（1mA < I ≤ 额定）`;
    case 'custom': return g.description || g.id;
  }
}

/** 星标展示文案：与真实判定对齐（内容里的 label 保留风味，此处统一为判据口径） */
export function starLabel(s: StarCondition): string {
  if (s.check === 'no-hint') return '不看 L3 剧透提示（L1/L2 随意）';
  if (s.check === 'first-try') return '首次运行即全绿（无失败运行）';
  return s.label;
}

function goalKey(g: GoalCheck): string {
  return JSON.stringify(g);
}

export default function LevelPlay() {
  const { levelId } = useParams();
  const content = levelId ? getLevel(levelId) : undefined;
  const fixture = (levelId && FIXTURE_LEVELS.find(l => l.id === levelId)) || FIXTURE_LEVELS[0];
  const level = content ?? fixture;
  const navigate = useNavigate();
  // URL 直达未解锁关卡 → 重定向回章节地图并提示（fixture 兜底关不参与解锁判定）
  const locked = useProgress(s => (content ? !s.isLevelUnlocked(content.id) : false));
  useEffect(() => {
    if (content && locked) {
      navigate('/chapters', { replace: true, state: { toast: `「${content.title}」还没解锁——先通关前面的关卡。` } });
    }
  }, [content, locked, navigate]);
  if (content && locked) return null;
  return <LevelPlayInner key={level.id} level={level} isFixtureFallback={!content} />;
}

function LevelPlayInner({ level, isFixtureFallback }: { level: LevelDef; isFixtureFallback: boolean }) {
  const [circuit, setCircuit] = useState<CircuitSpec>(() => clonePreset(level));
  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;
  const [running, setRunning] = useState(false);
  const { simRef, version, error } = useSimulation(circuit, running);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [instrCollapsed, setInstrCollapsed] = useState(false);
  const [channels, setChannels] = useState<ScopeChannel[]>([
    { probe: level.sim?.probes?.[0] ?? null },
    { probe: level.sim?.probes?.[1] ?? null },
    { probe: null },
  ]);
  const [probingChannel, setProbingChannel] = useState<number | null>(null);
  const [timebase, setTimebase] = useState(() => defaultTimebase(circuit));
  const [vdiv, setVdiv] = useState(2);
  const [paramEdit, setParamEdit] = useState<{ compId: string; anchor: { x: number; y: number } } | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintTier, setHintTier] = useState(0); // 已阅读到的级数
  const [l3Confirm, setL3Confirm] = useState(false);
  const [ghostTick, setGhostTick] = useState(0);
  const [victory, setVictory] = useState(false);
  const [lines, setLines] = useState<DialogueLine[]>(level.intro);
  const [barIdle, setBarIdle] = useState(false);
  const [selInfo, setSelInfo] = useState<{ kind: 'comp' | 'wire'; id: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const completeLevel = useProgress(s => s.completeLevel);
  const useHint = useProgress(s => s.useHint);
  const clearHints = useProgress(s => s.clearHints);
  const hintsUsedTier = useProgress(s => s.hintsUsed[level.id] ?? 0);
  const soundOn = useProgress(s => s.settings.sound);
  const solderCursor = useProgress(s => s.settings.solderCursor);
  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);
  useEffect(() => { if (solderCursor) ensureSolderCursorStyle(); }, [solderCursor]);

  const pendingLines = useRef<DialogueLine[]>([]);
  const enqueueDialogue = useCallback((line: DialogueLine) => {
    pendingLines.current.push(line);
    if (barIdle) {
      setLines(pendingLines.current.splice(0));
      setBarIdle(false);
    }
  }, [barIdle]);

  const startTime = useRef(Date.now());
  const lastInteract = useRef(Date.now());
  const failCounts = useRef<Record<string, number>>({});
  const totalFails = useRef(0);
  const prevOk = useRef<Set<string>>(new Set());
  const runJudgeTimer = useRef<number | null>(null);
  const nudged5min = useRef(false);

  /* ---------------- 目标求值 ---------------- */
  const dcResult = useMemo(() => (running ? null : solveDC(circuit)), [circuit, running]);
  const activeResult = running ? simRef.current.latest : dcResult;
  // version 驱动运行中刷新
  const goalStatuses: GoalStatus[] = useMemo(
    () => evaluateGoals(level.goals, circuitRef.current, activeResult, simRef.current.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, activeResult, version],
  );
  const countable = goalStatuses.filter(s => !s.detail.includes('无法自动校验'));
  const allOk = countable.length > 0 && countable.every(s => s.ok);

  // 子目标达成 → 小焊插话鼓励
  useEffect(() => {
    for (const s of goalStatuses) {
      const k = goalKey(s.goal);
      if (s.ok && !prevOk.current.has(k)) {
        prevOk.current.add(k);
        if (running) enqueueDialogue({ speaker: 'xiaohan', text: `✓ ${goalLabel(s.goal)} 达成！继续保持，先想想电流从哪儿来，到哪儿去。` });
      } else if (!s.ok && prevOk.current.has(k)) {
        prevOk.current.delete(k);
      }
    }
  }, [goalStatuses, running, enqueueDialogue]);

  /* ---------------- 故障事件 → Toast ---------------- */
  useEffect(() => {
    if (!running) return;
    for (const e of simRef.current.drainFailures()) toast(e.message, 'error');
  }, [version, running, simRef]);

  /* ---------------- 仿真错误保护 ---------------- */
  useEffect(() => {
    if (error && running) {
      setRunning(false);
      toast(`这个电路把仿真器绕晕了：${error}。重置试试？`, 'error');
    }
  }, [error, running]);

  /* ---------------- 运行 / 失败计数 / 示教重影 ---------------- */
  const startRun = () => {
    setRunning(true);
    lastInteract.current = Date.now();
    if (runJudgeTimer.current) window.clearTimeout(runJudgeTimer.current);
    runJudgeTimer.current = window.setTimeout(() => {
      const res = simRef.current.latest;
      const sts = evaluateGoals(level.goals, circuitRef.current, res, simRef.current.state)
        .filter(s => !s.detail.includes('无法自动校验'));
      if (!sts.every(s => s.ok)) {
        const first = sts.find(s => !s.ok);
        const key = first ? goalKey(first.goal) : 'unknown';
        failCounts.current[key] = (failCounts.current[key] ?? 0) + 1;
        totalFails.current++;
        if (failCounts.current[key] >= 3 && ghostTick <= 0) {
          setGhostTick(8);
          enqueueDialogue({ speaker: 'xiaohan', text: '看我的手——绿色重影就是正确连法，照着连一遍，下关就没有我了。' });
        }
      }
    }, 2500);
  };
  const pauseRun = () => {
    setRunning(false);
    lastInteract.current = Date.now();
    if (runJudgeTimer.current) window.clearTimeout(runJudgeTimer.current);
  };
  // 重玩/重置 = 全新一次尝试：电路、计时、失败计数、关怀标记、该关提示记录全部归零，
  // 让 time 星 / first-try 星 / 无提示星都能在重玩时真正重新挑战。
  const resetAll = () => {
    pauseRun();
    setCircuit(clonePreset(level));
    prevOk.current = new Set();
    setVictory(false);
    startTime.current = Date.now();
    lastInteract.current = Date.now();
    setElapsed(0);
    totalFails.current = 0;
    failCounts.current = {};
    nudged5min.current = false;
    setGhostTick(0);
    clearHints(level.id);
  };

  // 重影倒计时
  useEffect(() => {
    if (ghostTick <= 0) return;
    const id = window.setInterval(() => setGhostTick(t => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [ghostTick > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5 分钟无进展关怀（守卫：关卡已完成 / 暂停中 / 提示抽屉已打开时不打扰）
  useEffect(() => {
    const id = window.setInterval(() => {
      if (victory || !running || hintOpen || nudged5min.current) return;
      if (Date.now() - lastInteract.current > 5 * 60 * 1000) {
        nudged5min.current = true;
        enqueueDialogue({ speaker: 'xiaohan', text: '卡住了吗？要不要看看提示？或者去图鉴复习一下再回来。' });
        setHintOpen(true);
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, [victory, running, hintOpen, enqueueDialogue]);

  // 计时
  useEffect(() => {
    if (victory) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [victory]);

  /* ---------------- 过关判定 ---------------- */
  useEffect(() => {
    if (running && allOk && !victory) {
      const t = window.setTimeout(() => {
        setVictory(true);
        sfxChord();
        const starsGot = computeStars().filter(Boolean).length;
        completeLevel(level.id, starsGot);
        pendingLines.current.push(...level.outro);
        setLines(pendingLines.current.splice(0));
        setBarIdle(false);
      }, 700);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, allOk, victory]);

  const computeStars = useCallback((): boolean[] => {
    return level.stars.map(s => {
      if (s.check === 'no-hint') return (useProgress.getState().hintsUsed[level.id] ?? 0) < 3;
      if (s.check === 'first-try') return totalFails.current === 0;
      if (s.check === 'time') return elapsed <= (s.value ?? 300);
      if (s.id === 'pass') return true;
      if (s.value !== undefined) return circuitRef.current.components.length <= s.value;
      return true;
    });
  }, [level, elapsed]);

  /* ---------------- 示教重影内容 ---------------- */
  const ghost = useMemo((): CircuitSpec | null => {
    if (ghostTick <= 0) return null;
    const unplaced = level.palette.filter(p => !circuit.components.some(c => c.id === p.id));
    const comps = unplaced.map((p, i) => ({ ...p, x: 272 + (i % 3) * 144, y: 112 + Math.floor(i / 3) * 144 }));
    const wires: WireSpec[] = level.goals
      .filter((g): g is Extract<GoalCheck, { kind: 'connected' }> => g.kind === 'connected')
      .map((g, i) => ({ id: `ghost-${i}`, from: g.a, to: g.b }));
    return { components: comps, wires };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostTick > 0, level, circuit]);

  /* ---------------- palette 放置 ---------------- */
  const usedIds = useMemo(() => new Set(circuit.components.map(c => c.id)), [circuit]);
  const addFromPalette = (item: CircuitSpec['components'][number]) => {
    if (usedIds.has(item.id)) return;
    const idx = circuit.components.length;
    const comp = { ...item, params: { ...(item.params ?? {}) }, x: 240 + (idx % 4) * 96, y: 96 + Math.floor((idx % 8) / 4) * 96 };
    setCircuit(c => ({ ...c, components: [...c.components, comp] }));
    toast(`${item.id} 已放到画布，拖动调整位置（16px 网格吸附）。`, 'info');
    lastInteract.current = Date.now();
  };

  /* ---------------- 仿真可视化数据 ---------------- */
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
    const res = activeResult;
    const set = new Set<string>();
    if (!res?.ok) return set;
    for (const c of circuit.components) {
      const meta = c.type === 'led' ? Number(c.params?.imax ?? 0.02) : c.type === 'fuse' ? Number(c.params?.rating ?? 0.5) : undefined;
      const lim = meta ?? (c.type === 'resistor' ? 0.25 : undefined);
      if (lim && Math.abs(res.branchCurrents.get(c.id) ?? 0) > lim) set.add(c.id);
    }
    return set;
  }

  /* ---------------- 万用表 ---------------- */
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

  /* ---------------- 提示 ---------------- */
  const openHintTier = (tier: number) => {
    if (tier === 3 && hintTier < 3 && !l3Confirm) {
      setL3Confirm(true);
      return;
    }
    setL3Confirm(false);
    setHintTier(t => Math.max(t, tier));
    useHint(level.id, tier);
  };

  /* ---------------- 下一关 ---------------- */
  const nextLevel = (() => {
    const all = [...LEVELS, ...SIDE_QUESTS].filter(l => l.track === level.track)
      .sort((a, b) => a.chapter - b.chapter || a.index - b.index);
    const i = all.findIndex(l => l.id === level.id);
    return i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  })();

  const starResults = victory ? computeStars() : level.stars.map(() => false);

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col overflow-hidden">
      <ToastHost />
      {/* ---------- 顶部关卡栏 ---------- */}
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-700 bg-ink-900 px-4">
        <Link
          to="/chapters"
          onClick={e => {
            if (circuit.wires.length > 0 && !victory && !window.confirm('电路还没保存，确定离开吗？')) e.preventDefault();
          }}
          className="flex items-center gap-1 text-xs text-silk-500 hover:text-silk-100"
        >
          <ArrowLeft className="h-4 w-4" /> 章节地图
        </Link>
        <SilkTag>LV {level.chapter}-{level.index}</SilkTag>
        <h1 className="text-base font-bold text-silk-100">{level.title}</h1>
        {/* 目标条（工单样式） */}
        <div className="mx-2 flex min-w-0 flex-1 items-center gap-3 overflow-x-auto border border-dashed border-silk-500/40 px-3 py-1">
          <span className="shrink-0 font-mono text-[10px] tracking-widest text-silk-700">工单 · 目标</span>
          {goalStatuses.map((s, i) => (
            <span key={i} className={cn('flex shrink-0 items-center gap-1 font-mono text-[11px]', s.ok ? 'text-ok' : 'text-silk-500')} title={s.detail}>
              {s.ok && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="h-3 w-3" />
                </motion.span>
              )}
              {goalLabel(s.goal)}
            </span>
          ))}
        </div>
        {/* 星条件 */}
        <div className="flex items-center gap-0.5" title={level.stars.map(starLabel).join(' / ')}>
          <StarMeter value={victory ? starResults.filter(Boolean).length : 0} size={14} />
        </div>
        <RunControls running={running} onRun={startRun} onPause={pauseRun} onReset={resetAll} />
        <button
          onClick={() => setHintOpen(true)}
          className="relative rounded-md border border-ink-600 bg-ink-800 p-2 text-sig-amber transition-colors hover:border-sig-amber"
          title="渐进提示（L3 会让本次尝试失去无提示星，重玩可重新挑战）"
        >
          <Lightbulb className="h-4 w-4" />
          {hintTier < 3 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger" />}
        </button>
      </div>

      {/* 内容装载中占位条 */}
      {isFixtureFallback && (
        <div className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-sig-amber/30 bg-sig-amber/10 font-mono text-[11px] text-sig-amber">
          内容装载中：正式关卡数据尚未装载，当前为引擎联调示例关（{level.id}）
        </div>
      )}

      {/* ---------- 三栏 ---------- */}
      <div className="flex min-h-0 flex-1">
        <PalettePanel
          items={level.palette}
          usedIds={usedIds}
          onAdd={addFromPalette}
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed(v => !v)}
          footer={<span className="font-mono text-[10px] text-silk-700">双击或拖拽放入画布 · 图鉴见 /codex</span>}
        />

        <div className={cn('relative min-w-0 flex-1', solderCursor && SOLDER_CURSOR_CLASS)}>
          <CircuitEditor
            circuit={circuit}
            onChange={setCircuit}
            visuals={visuals}
            ghost={ghost}
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
            onInteract={() => { lastInteract.current = Date.now(); }}
          />
          {/* 关卡标题卡（入场闪现） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.75, 1] }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="font-display text-4xl font-extrabold tracking-widest text-copper-300 text-glow-copper">
                LV {level.chapter}-{level.index}
              </div>
              <div className="mt-2 text-xl font-bold text-silk-100">{level.title}</div>
              {level.subtitle && <div className="mt-1 text-sm text-silk-500">{level.subtitle}</div>}
            </div>
          </motion.div>
        </div>

        {instrCollapsed ? (
          <RightCollapseBar onExpand={() => setInstrCollapsed(false)} />
        ) : (
          <div className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-ink-700 bg-ink-850">
            <RightPanelHeader onCollapse={() => setInstrCollapsed(true)} title="INSTRUMENTS · 仪器" />
            <div className="flex flex-col gap-3 p-3">
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
              />
              <MultimeterCard voltage={multimeter.voltage} current={multimeter.current} hint={multimeter.hint} />
              <NotesCard title={level.knowledge.title} body={level.knowledge.body} />
            </div>
          </div>
        )}
      </div>

      {/* ---------- 对话条 ---------- */}
      <DialogueBar lines={lines} onDone={() => {
        setBarIdle(true);
        if (pendingLines.current.length) {
          setLines(pendingLines.current.splice(0));
          setBarIdle(false);
        }
      }} />

      {/* ---------- 提示抽屉 ---------- */}
      <HintDrawer
        open={hintOpen}
        onClose={() => { setHintOpen(false); setL3Confirm(false); }}
        hints={level.hints}
        tier={hintTier}
        onOpen={openHintTier}
        l3Confirm={l3Confirm}
      />

      {/* ---------- 参数弹窗 ---------- */}
      {paramEdit && (() => {
        const comp = circuit.components.find(c => c.id === paramEdit.compId);
        if (!comp) return null;
        return (
          <ParamDialog
            comp={comp}
            anchor={paramEdit.anchor}
            onChange={params => {
              lastInteract.current = Date.now(); // 调参也是进展，别误触 5 分钟关怀
              setCircuit(c => ({ ...c, components: c.components.map(x => (x.id === comp.id ? { ...x, params } : x)) }));
            }}
            onClose={() => setParamEdit(null)}
          />
        );
      })()}

      {/* ---------- 过关结算 ---------- */}
      <VictoryModal
        open={victory}
        level={level}
        stars={starResults}
        elapsed={elapsed}
        hintsTier={hintsUsedTier}
        compCount={circuit.components.length}
        circuit={circuit}
        currents={activeResult?.branchCurrents ?? null}
        nextLevelId={nextLevel?.id}
        onReplay={resetAll}
      />
    </div>
  );
}

/* ================= 三级渐进提示抽屉 ================= */
const TIER_META = [
  { label: 'L1 · 方向', desc: '只指路，不剧透', cost: '无代价' },
  { label: 'L2 · 方法', desc: '给出拓扑 / 公式', cost: '无代价' },
  { label: 'L3 · 近乎答案', desc: '元件清单 + 连线指引', cost: '本次尝试失去 ⭐ 无提示星' },
];

function HintDrawer({ open, onClose, hints, tier, onOpen, l3Confirm }: {
  open: boolean; onClose: () => void; hints: [string, string, string];
  tier: number; onOpen: (t: number) => void; l3Confirm: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ duration: 0.3 }}
          className="panel-raised fixed right-0 top-16 z-[55] flex h-[calc(100dvh-64px)] w-80 flex-col border-l border-ink-700"
        >
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-sig-amber">
              <Lightbulb className="h-4 w-4" /> 渐进提示
            </span>
            <button onClick={onClose} className="text-silk-500 hover:text-silk-100">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {hints.map((h, i) => {
              const t = i + 1;
              const unlocked = tier >= t;
              const canOpen = tier >= t - 1;
              return (
                <div key={t} className={cn('rounded-lg border p-3', unlocked ? 'border-sig-amber/50 bg-ink-900' : 'border-ink-700 bg-ink-900/50')}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sig-amber">{TIER_META[i].label}</span>
                    <span className="font-mono text-[10px] text-silk-700">{TIER_META[i].cost}</span>
                  </div>
                  <p className="mb-2 text-[11px] text-silk-500">{TIER_META[i].desc}</p>
                  {unlocked ? (
                    <p className="text-sm leading-relaxed text-silk-100">{h}</p>
                  ) : t === 3 && l3Confirm ? (
                    <div className="rounded border border-danger/50 bg-danger/10 p-2">
                      <p className="mb-2 text-xs text-danger">确定要撕开焊盘封印吗？本次尝试将失去「⭐ 无提示星」——重玩本关可以重新挑战。</p>
                      <div className="flex gap-2">
                        <PadButton size="S" variant="danger" onClick={() => onOpen(3)}>确定要看</PadButton>
                        <PadButton size="S" variant="ghost" onClick={onClose}>再想想</PadButton>
                      </div>
                    </div>
                  ) : (
                    <PadButton size="S" variant="ghost" disabled={!canOpen} onClick={() => onOpen(t)}>
                      {canOpen ? `查看 ${TIER_META[i].label}` : '先阅读上一级'}
                    </PadButton>
                  )}
                </div>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ================= 过关结算 VictoryModal ================= */
function VictoryModal({ open, level, stars, elapsed, hintsTier, compCount, circuit, currents, nextLevelId, onReplay }: {
  open: boolean; level: LevelDef; stars: boolean[]; elapsed: number; hintsTier: number; compCount: number;
  circuit: CircuitSpec; currents: Map<string, number> | null;
  nextLevelId?: string; onReplay: () => void;
}) {
  const mm = Math.floor(elapsed / 60), ss = elapsed % 60;
  const [show3d, setShow3d] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-ink-950/70 backdrop-blur-[8px]"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="panel-raised relative max-h-[calc(100dvh-96px)] w-[560px] overflow-y-auto rounded-xl p-8"
          >
            {/* QC PASS 印章 */}
            <motion.div
              initial={{ scale: 1.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="absolute -right-4 -top-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-copper-400 text-copper-300"
              style={{ boxShadow: '0 0 18px rgba(224,164,88,0.45)', background: 'rgba(154,94,40,0.15)' }}
            >
              <div className="text-center">
                <Stamp className="mx-auto h-4 w-4" />
                <div className="font-display text-sm font-extrabold tracking-widest">QC PASS</div>
              </div>
            </motion.div>

            <div className="mb-1 flex items-center gap-2 text-ok">
              <Trophy className="h-5 w-5" />
              <span className="text-2xl font-black text-silk-100">关卡完成</span>
            </div>
            <p className="mb-5 font-mono text-xs text-silk-500">LV {level.chapter}-{level.index} · {level.title}</p>

            {/* 三星结算 */}
            <div className="mb-5 flex items-start justify-center gap-6">
              {level.stars.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.35 + i * 0.18, duration: 0.4 }}
                  className="flex flex-col items-center gap-1"
                >
                  <StarMeter value={stars[i] ? 1 : 0} max={1} size={36} />
                  <span className={cn('max-w-[120px] text-center font-mono text-[10px] leading-tight', stars[i] ? 'text-copper-300' : 'text-silk-700')}>
                    {starLabel(s)}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* 知识卡 */}
            <motion.div
              initial={{ rotateX: 15, y: 24, opacity: 0 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mx-auto mb-5 w-64 rounded-lg border border-copper-500/50 bg-gradient-to-br from-ink-800 to-ink-900 p-4"
              style={{ boxShadow: '0 0 16px rgba(201,128,60,0.2)' }}
            >
              <div className="mb-1 font-mono text-[10px] tracking-[0.2em] text-copper-400">KNOWLEDGE CARD</div>
              <div className="mb-1 text-sm font-bold text-silk-100">{level.knowledge.title}</div>
              <p className="text-xs leading-relaxed text-silk-300">{level.knowledge.body}</p>
            </motion.div>

            {/* 数据行 */}
            <div className="mb-5 flex justify-center gap-6 font-mono text-xs text-silk-500">
              <span>用时 {mm}:{String(ss).padStart(2, '0')}</span>
              <span>提示 L{hintsTier}</span>
              <span>元件 {compCount} 个</span>
            </div>

            {/* 3D PCB 折叠区：通关仪式感，展开才加载 three.js */}
            <div className="mx-auto mb-6 w-full rounded-lg border border-ink-700 bg-ink-900/60">
              <button
                onClick={() => setShow3d(v => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5"
              >
                <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-copper-300">
                  <Box className="h-3.5 w-3.5" /> 看看它的 3D 样子
                </span>
                <span className="font-mono text-[10px] text-silk-700">{show3d ? '▲ 收起' : '▼ 打板成品'}</span>
              </button>
              <AnimatePresence>
                {show3d && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 260, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-ink-700"
                  >
                    <div className="h-[260px]">
                      <ErrorBoundary variant="viewer">
                        <Suspense fallback={
                          <div className="flex h-full items-center justify-center font-mono text-xs text-silk-500">
                            正在装载 3D 引擎（three.js）…
                          </div>
                        }>
                          <Pcb3DViewer
                            circuit={circuit}
                            currents={currents}
                            emptyHint="这关还没搭出电路——重玩一次，搭好了再来看成品板。"
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-3">
              {nextLevelId ? (
                <PadButton variant="primary" to={`/play/${nextLevelId}`}>下一关 →</PadButton>
              ) : (
                <PadButton variant="primary" to="/chapters">返回地图</PadButton>
              )}
              <PadButton variant="ghost" onClick={onReplay}>重玩冲三星</PadButton>
              <Link to="/chapters" className="text-xs text-silk-500 hover:text-silk-100">返回地图</Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
