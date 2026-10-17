// 关卡游玩页 /play/:levelId —— 三栏工作台 + 准物理仿真 + 渐进提示 + 防卡关 + QC PASS 结算
// 数据暂为空时用 fixtures 兜底并显示「内容装载中」占位，不得报红。
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Box, Check, ChevronDown, Gauge, Lightbulb, ListChecks, Sigma, Stamp, Trophy, TriangleAlert, X, Zap,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CircuitSpec, DialogueLine, GoalCheck, LevelDef, StarCondition, WireSpec } from '@/engine/types';
import { evaluateGoals, formatSI, solveDC, type GoalStatus, type SolveResult } from '@/engine/solver';
import { explainComponent, explainGoal, netVoltageTable, powerLedger, type Derivation } from '@/engine/explain';
import { diagnoseGoals } from '@/content/diagnose';
import { FIXTURE_LEVELS } from '@/engine/fixtures';
import { getLevel, LEVELS, SIDE_QUESTS } from '@/content/levels';
import { buildSolutionCircuit, deriveSolutionSteps, type SolutionStep } from '@/content/solution';
import Placeholder from '@/pages/Placeholder';
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
    case 'led-lit': return `点亮 ${g.comp}（1mA < I ≤ 1.5×额定，且未烧毁）`;
    case 'custom': return g.description || g.id;
  }
}

/** 星标展示文案：与真实判定对齐（内容里的 label 保留风味，此处统一为判据口径） */
export function starLabel(s: StarCondition): string {
  if (s.check === 'no-hint') return '不看剧透级提示 L3/L4（L1/L2 随意）';
  if (s.check === 'first-try') return '首次运行即全绿（无失败运行）';
  return s.label;
}

function goalKey(g: GoalCheck): string {
  return JSON.stringify(g);
}

/* ================= 教学文案辅助（L2 验收台 / L5 小结 / L7 口径统一） ================= */

/** LED 点亮的真实判据——与 solver.ts evaluateGoal('led-lit') 判定完全一致：I > 1mA 且 I ≤ 1.5×额定，且未烧毁 */
const LED_CRITERION = '1mA < I ≤ 1.5×额定（未烧毁）';

/**
 * L7：目标条 / 验收台的统一「差多少」文案。
 * explainGoal 给出「实测 vs 目标 + 偏大/偏小多少」；led-lit 额外把口径对齐求解器的真实判据
 * （explain 侧按额定值描述，判定侧允许 1.5× 额定，二者必须说同一句话）。
 * 求解没成功时不说「等待仿真结果」这种含糊话——直接指向验收台顶部的报错。
 */
function goalExplainLine(s: GoalStatus, circuit: CircuitSpec, res: SolveResult | null): string {
  if (!res?.ok) {
    return res
      ? '求解未完成：先按验收台顶部的报错把电路修成立，再看这一条的实测值。'
      : '还没有仿真结果：按 ▶ 运行（运行中会实时刷新）后再验收。';
  }
  const line = explainGoal(s.goal, circuit, res);
  // explainGoal 在「已在区间内」时会带上单位尾巴（如「在范围内 mA」），展示前统一成人话
  const tidy = (t: string) => t.replace(/（在范围内[^）]*）/g, '（已在目标范围内）');
  if (s.goal.kind !== 'led-lit') return tidy(line ?? s.detail);
  const crit = `真实判据：${LED_CRITERION}`;
  if (s.ok) return `${s.detail}（${crit}）`;
  return `${tidy(line ?? s.detail).replace('超过额定', '超过安全上限（1.5× 额定）')}（${crit}）`;
}

/** 从 explainGoal 文案里抠出「偏大/偏小多少」，给目标条加一枚不依赖 hover 的角标（触屏可见） */
function goalDeltaBadge(s: GoalStatus, circuit: CircuitSpec, res: SolveResult | null): string | null {
  if (s.ok) return null;
  const m = explainGoal(s.goal, circuit, res)?.match(/偏[大小][^）]*/);
  return m ? m[0].trim() : null;
}

/** 通关小结三行（L5）：优先用内容组 recap；缺省回落到本关知识卡摘要，绝不空着 */
function recapLines(level: LevelDef): { lines: string[]; fromContent: boolean } {
  if (level.recap?.length) return { lines: level.recap.filter(Boolean).slice(0, 3), fromContent: true };
  const body = level.knowledge?.body ?? '';
  const sentences = body.split(/(?<=[。！？；])/).map(t => t.trim()).filter(Boolean);
  const lines = [level.knowledge?.title ?? level.title, ...sentences].filter(Boolean).slice(0, 3);
  return { lines, fromContent: false };
}

/** 求解器的收敛位（W3 正在给 SolveResult 增加 converged）：防御式读取，字段缺席/未落库都不报错 */
function readConverged(res: SolveResult | null): boolean | null {
  if (!res?.ok) return null;
  const c = (res as unknown as { converged?: unknown }).converged;
  return typeof c === 'boolean' ? c : null;
}

/** 求解失败时的可读修复建议（L10：绝不白屏） */
const SOLVE_ERROR_TIPS = [
  '电源的正负极不能只靠导线相连——先删掉这条「抄近路」的走线，中间至少串一个元件。',
  '每块电路都要有参考地：放一个 GND 元件，或确认电源负极已经接地。',
  '检查有没有悬空节点（只接了一根线的端口），把它连上或删掉。',
  '元件参数不能是 0 或负数：LED 要串限流电阻，电阻要 > 0Ω。',
];

function solveErrorAdvice(error: string): string[] {
  const tips = [...SOLVE_ERROR_TIPS];
  if (/短路|短接/.test(error)) tips.unshift('这是一条真正的短路：电流会无穷大，仿真器只能停机保护。先删掉那条直连电源正负极的走线。');
  if (/接地|参考地|GND|参考电位/.test(error)) tips.unshift('报错在说「没有 0V 参考点」：放一个 GND 元件，或把电源负极连到标着 GND 的那个网络。');
  if (/悬空|孤岛|孤立/.test(error)) tips.unshift('有子电路孤零零悬着：它跟电源之间没有任何直流通路，检查每个元件是否真的接进了回路。');
  if (/不收敛|奇异/.test(error)) tips.unshift('矩阵奇异通常意味着某个节点没有到地的通路，或两个理想电压源被并联在了一起。');
  return tips.slice(0, 4);
}

export default function LevelPlay() {
  const { levelId } = useParams();
  const content = levelId ? getLevel(levelId) : undefined;
  const fixture = (levelId && FIXTURE_LEVELS.find(l => l.id === levelId)) || undefined;
  // 未解锁关卡不再强制重定向：允许自由进入任意关卡
  // 未知关卡：明确 404，而不是静默落到示例关（旧行为会让人误以为拼错的 id 是真实关卡）
  // （本组件只做路由分发，真正的「离开」跳转在 LevelPlayInner 里用 useNavigate 完成）
  if (!content && !fixture) {
    return (
      <Placeholder
        tag="404"
        title="这条走线断了"
        desc={`关卡「${levelId}」不存在——回章节地图重新上电吧。`}
      />
    );
  }
  return <LevelPlayInner key={(content ?? fixture)!.id} level={(content ?? fixture)!} isFixtureFallback={!content} />;
}

function LevelPlayInner({ level, isFixtureFallback }: { level: LevelDef; isFixtureFallback: boolean }) {
  const navigate = useNavigate();
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
  // 离开确认：不用 window.confirm —— 某些嵌入环境会静默拒绝原生弹窗导致永远无法返回
  const [confirmLeave, setConfirmLeave] = useState(false);
  /* ---- 教学界面状态（L2/L3/L4/L9/L10） ---- */
  const [benchOpen, setBenchOpen] = useState(false);          // 验收台展开
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);  // 知识卡默认折叠（L4）
  const [knowledgeFlash, setKnowledgeFlash] = useState(false);
  const [attempts, setAttempts] = useState(0);                // 已点过几次「运行」（≥1 才算真正尝试过）
  const [simError, setSimError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [victoryClosed, setVictoryClosed] = useState(false);  // 结算层被 Esc/✕ 关掉后不再自动重开

  const completeLevel = useProgress(s => s.completeLevel);
  const useHint = useProgress(s => s.useHint);
  const clearHints = useProgress(s => s.clearHints);
  const hintsUsedTier = useProgress(s => s.hintsUsed[level.id] ?? 0);
  /** 本关历史最好成绩：结算层被 Esc 关掉后，顶栏星星不该退回 0 */
  const bestStars = useProgress(s => s.stars[level.id] ?? 0);
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
  const runGuard = useRef(false);              // L10：运行按钮连点防抖
  const knowledgeAutoOpened = useRef(false);   // L4：知识卡只在「首次失败」自动展开一次
  const hintBtnRef = useRef<HTMLButtonElement | null>(null); // L6：提示抽屉关闭后把焦点还给触发按钮

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

  /* ---------------- 验收台数据（L2：实测值 / 目标区间 / 差多少往哪调） ---------------- */
  const converged = readConverged(activeResult);
  /** 求解失败时验收台要说人话（不是「等待仿真结果」） */
  const solveError = activeResult && !activeResult.ok ? (activeResult.error ?? '求解器返回失败') : null;
  // W5 的误解诊断：只对未达成目标给「错在哪 + 往哪调」（diagnoseGoals 已过滤 ok 目标）
  const diagnoseMap = new Map<string, string[]>();
  for (const d of diagnoseGoals(goalStatuses, circuit, activeResult, level)) diagnoseMap.set(goalKey(d.goal), d.hints);
  const goalRows = goalStatuses.map(s => {
    const rawHints = diagnoseMap.get(goalKey(s.goal)) ?? [];
    return {
      status: s,
      ok: s.ok,
      label: goalLabel(s.goal),
      /** 求解器给的实测值/可读原因 */
      detail: s.detail,
      /** explainGoal 的「实测 vs 目标 ± 偏大/偏小多少」（缺省回落到 detail） */
      explain: goalExplainLine(s, circuit, activeResult),
      /** 不依赖 hover 的角标（触屏可见） */
      delta: goalDeltaBadge(s, circuit, activeResult),
      /** 误解定向反馈（W5 diagnose.ts）；电路压根没成形时「先点运行」是废话，去掉 */
      hints: solveError ? rawHints.filter(t => !t.startsWith('先点')) : rawHints,
      /** false = 该目标无法自动校验（布局/BOM 类），验收台要如实标注 */
      auto: !s.detail.includes('无法自动校验'),
    };
  });
  const okCount = countable.filter(s => s.ok).length;
  /** 展开验收台时才做这两件稍重的活 */
  const netRows = benchOpen ? netVoltageTable(circuit, activeResult) : [];
  /** 选中元件的「代入演算」（L2 教学深潜） */
  const derivation = selInfo?.kind === 'comp' ? explainComponent(selInfo.id, circuit, activeResult) : null;
  /** L3：真正动手跑过一次且还没全绿 → 公式自动高亮（在需要的时刻出现） */
  const formulaHighlight = attempts > 0 && !allOk && !victory;
  const unreadHints = Math.max(0, 3 - hintTier);

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

  /* ---------------- 仿真错误保护（L10：可读修复建议，绝不白屏） ---------------- */
  useEffect(() => {
    if (error && running) {
      setRunning(false);
      setSimError(error);
      setErrorDismissed(false);
      toast(`仿真器停机保护：${error}。画布上已列出排查步骤。`, 'error');
    }
  }, [error, running]);

  /* ---------------- 运行 / 失败计数 / 示教重影 ---------------- */
  const startRun = () => {
    // L10：运行中或连点运行按钮时不重复发起（每次发起都会重新计数、打断节奏）
    if (running || runGuard.current) return;
    runGuard.current = true;
    window.setTimeout(() => { runGuard.current = false; }, 600);
    setRunning(true);
    setAttempts(n => n + 1);
    setErrorDismissed(false);
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
        // L4：首次失败 → 知识卡自动展开一次（原理正好是该用的时候），之后交还给学习者
        if (totalFails.current === 1 && !knowledgeAutoOpened.current) {
          knowledgeAutoOpened.current = true;
          setKnowledgeOpen(true);
          setKnowledgeFlash(true);
          window.setTimeout(() => setKnowledgeFlash(false), 5000);
          enqueueDialogue({ speaker: 'laozhou', text: '先别乱调参数——右侧知识卡正好讲这一步的原理，读完再动手。' });
        }
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
    // 重玩 = 全新一次尝试：教学界面也回到初始态（知识卡重新折叠、关怀可再次触发）
    knowledgeAutoOpened.current = false;
    setKnowledgeOpen(false);
    setKnowledgeFlash(false);
    setAttempts(0);
    setSimError(null);
    setErrorDismissed(false);
    setVictoryClosed(false);
    clearHints(level.id);
  };

  // 重影倒计时
  useEffect(() => {
    if (ghostTick <= 0) return;
    const id = window.setInterval(() => setGhostTick(t => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [ghostTick > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // L9 卡关关怀：改为「本关停留时间 + 失败次数」触发——一直在尝试的卡关者也等得到。
  // 旧口径要求「运行中且画布零交互」，于是拼命调参的人永远收不到提示。
  useEffect(() => {
    const id = window.setInterval(() => {
      if (victory || hintOpen || nudged5min.current || allOk) return;
      const dwell = Date.now() - startTime.current;
      const fails = totalFails.current;
      const triedALot = dwell >= 5 * 60 * 1000 && fails >= 2;   // 试了很多次还在原地
      const satTooLong = dwell >= 10 * 60 * 1000;               // 连尝试都没有，先给个台阶
      if (!triedALot && !satTooLong) return;
      nudged5min.current = true;
      enqueueDialogue({
        speaker: 'xiaohan',
        text: fails > 0
          ? `已经试了 ${fails} 次啦——右上「验收台」会告诉你实测值差多少、往哪边调，点开看看？`
          : '在这一关待了挺久了——右上「验收台」列出了实测值和目标区间，先对一眼再动手。',
      });
      setBenchOpen(true); // 先给「可诊断的信息」，而不是直接甩剧透
    }, 15000);
    return () => window.clearInterval(id);
  }, [victory, hintOpen, allOk, enqueueDialogue]);

  // 计时
  useEffect(() => {
    if (victory) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [victory]);

  /* ---------------- 过关判定 ---------------- */
  // Esc/✕ 关掉结算后，只要学习者又改了电路（allOk 掉回 false），下次达成时允许再次结算
  useEffect(() => { if (!allOk) setVictoryClosed(false); }, [allOk]);

  useEffect(() => {
    if (running && allOk && !victory && !victoryClosed) {
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
  }, [running, allOk, victory, victoryClosed]);

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
    // 落点做占位扫描：避开 preset/已放元件，不再叠在电池或 LED 上
    const taken = new Set(circuitRef.current.components.map(c => `${Math.round(c.x)}:${Math.round(c.y)}`));
    let pos = { x: 240, y: 320 };
    for (let i = 0; i < 200; i++) {
      const p = { x: 240 + (i % 4) * 112, y: 96 + Math.floor(i / 4) * 112 };
      if (!taken.has(`${p.x}:${p.y}`)) { pos = p; break; }
    }
    const comp = { ...item, params: { ...(item.params ?? {}) }, x: pos.x, y: pos.y };
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
    // L3/L4 都是剧透级：首次展开需确认（会失去无提示星）
    if (tier >= 3 && hintTier < tier && !l3Confirm) {
      setL3Confirm(true);
      return;
    }
    setL3Confirm(false);
    setHintTier(t => Math.max(t, tier));
    useHint(level.id, tier);
  };

  /* ---------------- L4 直接通关：解法清单 + 一键照抄 ---------------- */
  const solutionSteps = useMemo<SolutionStep[]>(() => deriveSolutionSteps(level), [level]);
  const applySolution = useCallback(() => {
    setCircuit(c => buildSolutionCircuit(level, c));
    toast('已按参考解法补齐元件与连线——按 ▶ 运行验收。', 'ok');
    lastInteract.current = Date.now();
  }, [level]);

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
            if (circuit.wires.length > 0 && !victory) {
              e.preventDefault();
              setConfirmLeave(true);
            }
          }}
          className="flex items-center gap-1 text-xs text-silk-500 hover:text-silk-100"
        >
          <ArrowLeft className="h-4 w-4" /> 章节地图
        </Link>
        <SilkTag>LV {level.chapter}-{level.index}</SilkTag>
        <h1 className="text-base font-bold text-silk-100">{level.title}</h1>
        {/* 目标条（工单样式）+ 常驻验收台（L2：实测值/目标区间/往哪调，触屏可点开） */}
        <div className="relative mx-2 min-w-0 flex-1">
          <div className="flex items-center gap-3 overflow-x-auto border border-dashed border-silk-500/40 px-3 py-1">
            <button
              type="button"
              onClick={() => setBenchOpen(v => !v)}
              aria-expanded={benchOpen}
              aria-controls="acceptance-bench"
              aria-label={`验收台：自动校验目标已达成 ${okCount}/${countable.length}，展开查看每条目标的实测值、目标区间与调整方向`}
              title="验收台：实测值 / 目标区间 / 差多少往哪调（点开，不依赖悬浮）"
              className="flex shrink-0 items-center gap-1.5 border border-silk-500/40 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-silk-500 transition-colors hover:border-sig-amber hover:text-sig-amber"
            >
              <Gauge className="h-3.5 w-3.5" /> 验收台 {okCount}/{countable.length}
              <ChevronDown className={cn('h-3 w-3 transition-transform', benchOpen && 'rotate-180')} />
            </button>
            {goalRows.map((r, i) => (
              <span
                key={i}
                className={cn('flex shrink-0 items-center gap-1 font-mono text-[11px]', r.ok ? 'text-ok' : 'text-silk-500')}
                title={[r.explain, r.hints[0]].filter(Boolean).join(' ｜ ')}
              >
                {r.ok ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="h-3 w-3" />
                  </motion.span>
                ) : (
                  r.delta && <span className="rounded-sm bg-danger/20 px-1 font-mono text-[10px] text-danger">{r.delta}</span>
                )}
                {r.label}
                {!r.auto && <span className="font-mono text-[10px] text-silk-700">·人工判定</span>}
              </span>
            ))}
          </div>
          <AcceptanceBench
            id="acceptance-bench"
            open={benchOpen}
            onClose={() => setBenchOpen(false)}
            rows={goalRows}
            okCount={okCount}
            total={countable.length}
            converged={converged}
            solveError={solveError}
            tried={attempts > 0}
            level={level}
            netRows={netRows}
            derivation={derivation}
            onOpenHints={() => setHintOpen(true)}
          />
        </div>
        {/* 星条件 */}
        <div className="flex items-center gap-0.5" title={level.stars.map(starLabel).join(' / ')}>
          <StarMeter value={victory ? starResults.filter(Boolean).length : bestStars} size={14} />
        </div>
        <RunControls running={running} onRun={startRun} onPause={pauseRun} onReset={resetAll} />
        <button
          ref={hintBtnRef}
          onClick={() => setHintOpen(true)}
          aria-label={unreadHints > 0 ? `渐进提示，还有 ${unreadHints} 级未读（L3 会让本次尝试失去无提示星）` : '渐进提示（已全部读过）'}
          aria-haspopup="dialog"
          aria-expanded={hintOpen}
          className="relative flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2 py-2 text-sig-amber transition-colors hover:border-sig-amber"
          title="渐进提示（L3 会让本次尝试失去无提示星，重玩可重新挑战）"
        >
          <Lightbulb className="h-4 w-4" />
          {/* 未读提示从「纯颜色圆点」改为带文字的角标：色盲/触屏用户都能读到 */}
          {unreadHints > 0 && (
            <span className="rounded-sm bg-danger px-1 font-mono text-[10px] font-bold leading-4 text-silk-100">{unreadHints} 未读</span>
          )}
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
            dropItems={level.palette}
            onDropItem={(item, at) => {
              if (usedIds.has(item.id)) {
                toast(`${item.id} 已在画布上（每种限放一个）。`, 'info');
                return;
              }
              setCircuit(c => ({
                ...c,
                components: [...c.components, { ...item, params: { ...(item.params ?? {}) }, x: at.x, y: at.y }],
              }));
              toast(`${item.id} 已落到画布（${at.x}, ${at.y}）。`, 'ok');
              lastInteract.current = Date.now();
            }}
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
          {/* L10：求解失败时的可读修复建议（永不白屏）；关掉后可用「运行」再次尝试 */}
          {simError && !errorDismissed && (
            <SimErrorCard
              error={simError}
              onDismiss={() => setErrorDismissed(true)}
              onReset={() => { resetAll(); setErrorDismissed(true); }}
              onOpenHints={() => setHintOpen(true)}
            />
          )}
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
              {/* L3 公式辅助：目标未达成时自动高亮，让学习者在「需要的时刻」看到通式 */}
              <FormulaCard level={level} highlight={formulaHighlight} />
              {/* L4 知识卡：进行中默认折叠（不挂载）；首次失败自动展开一次，避免一上来就把答案摊开 */}
              <KnowledgePanel
                level={level}
                open={knowledgeOpen}
                flash={knowledgeFlash}
                onToggle={setKnowledgeOpen}
              />
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
        steps={solutionSteps}
        tier={hintTier}
        onOpen={openHintTier}
        onApplySolution={applySolution}
        l3Confirm={l3Confirm}
        returnFocusTo={hintBtnRef}
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
            onRotate={rot => setCircuit(c => ({ ...c, components: c.components.map(x => (x.id === comp.id ? { ...x, rotation: rot } : x)) }))}
            onClose={() => setParamEdit(null)}
          />
        );
      })()}

      {/* ---------- 离开确认（应用内对话框，替代被部分环境吞掉的 window.confirm） ---------- */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>离开这一关？</AlertDialogTitle>
            <AlertDialogDescription>
              画布上的连线尚未保存，返回章节地图后会恢复为本关初始状态。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>留下继续焊</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/chapters')}>离开</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- 过关结算（Esc / ✕ 可关闭回画布，L6） ---------- */}
      <VictoryModal
        open={victory}
        level={level}
        stars={starResults}
        elapsed={elapsed}
        hintsTier={hintsUsedTier}
        compCount={circuit.components.length}
        circuit={circuit}
        currents={activeResult?.branchCurrents ?? null}
        result={activeResult}
        nextLevelId={nextLevel?.id}
        onReplay={resetAll}
        onClose={() => { setVictory(false); setVictoryClosed(true); }}
      />
    </div>
  );
}

/* ================= 三级渐进提示抽屉 ================= */
const TIER_META = [
  { label: 'L1 · 方向', desc: '只指路，不剧透', cost: '无代价' },
  { label: 'L2 · 方法', desc: '给出拓扑 / 公式', cost: '无代价' },
  { label: 'L3 · 近乎答案', desc: '元件清单 + 连线指引', cost: '本次尝试失去 ⭐ 无提示星' },
  { label: 'L4 · 直接通关', desc: '完整解法清单，可一键照抄', cost: '同 L3：失去 ⭐ 无提示星' },
];

const STEP_ICON: Record<SolutionStep['kind'], string> = {
  place: '[元件]',
  param: '[参数]',
  pin: '[芯片]',
  wire: '[连线]',
};

function HintDrawer({ open, onClose, hints, steps, tier, onOpen, onApplySolution, l3Confirm, returnFocusTo }: {
  open: boolean; onClose: () => void; hints: [string, string, string]; steps: SolutionStep[];
  tier: number; onOpen: (t: number) => void; onApplySolution: () => void; l3Confirm: boolean;
  returnFocusTo?: RefObject<HTMLElement | null>;
}) {
  const cardCls = (unlocked: boolean) =>
    cn('rounded-lg border p-3', unlocked ? 'border-sig-amber/50 bg-ink-900' : 'border-ink-700 bg-ink-900/50');
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  /* L6：抽屉打开时焦点进入抽屉、Esc 关闭、关闭后焦点回到「提示」按钮 */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      returnFocusTo?.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="渐进提示"
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
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="关闭"
              title="关闭（Esc）"
              className="rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="border-b border-ink-700 px-4 py-2 font-mono text-[10px] text-silk-700">Esc 可随时关闭抽屉，L1/L2 不扣星。</p>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {hints.map((h, i) => {
              const t = i + 1;
              const unlocked = tier >= t;
              const canOpen = tier >= t - 1;
              return (
                <div key={t} className={cardCls(unlocked)}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sig-amber">{TIER_META[i].label}</span>
                    <span className="font-mono text-[10px] text-silk-700">{TIER_META[i].cost}</span>
                  </div>
                  <p className="mb-2 text-[11px] text-silk-500">{TIER_META[i].desc}</p>
                  {unlocked ? (
                    <p className="text-sm leading-relaxed text-silk-100">{h}</p>
                  ) : t === 3 && l3Confirm ? (
                    <SpoilerConfirm onConfirm={() => onOpen(3)} onClose={onClose} />
                  ) : (
                    <PadButton size="S" variant="ghost" disabled={!canOpen} onClick={() => onOpen(t)}>
                      {canOpen ? `查看 ${TIER_META[i].label}` : '先阅读上一级'}
                    </PadButton>
                  )}
                </div>
              );
            })}

            {/* L4 · 直接通关（解法由目标数据推导，无需内容组维护文案） */}
            {(() => {
              const t = 4;
              const unlocked = tier >= t;
              return (
                <div className={cardCls(unlocked)}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sig-amber">{TIER_META[3].label}</span>
                    <span className="font-mono text-[10px] text-silk-700">{TIER_META[3].cost}</span>
                  </div>
                  <p className="mb-2 text-[11px] text-silk-500">{TIER_META[3].desc}</p>
                  {unlocked ? (
                    <>
                      <ol className="mb-3 space-y-2">
                        {steps.map((s, i) => (
                          <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-silk-200">
                            <span className="shrink-0 font-mono text-[10px] text-copper-400">{STEP_ICON[s.kind]}</span>
                            <span>{s.text}</span>
                          </li>
                        ))}
                      </ol>
                      <PadButton size="S" variant="primary" onClick={onApplySolution}>一键照抄（补齐电路）</PadButton>
                    </>
                  ) : tier === 3 && l3Confirm ? (
                    <SpoilerConfirm onConfirm={() => onOpen(4)} onClose={onClose} />
                  ) : (
                    <PadButton size="S" variant="ghost" disabled={tier < 3} onClick={() => onOpen(4)}>
                      {tier >= 3 ? `查看 ${TIER_META[3].label}` : '先阅读 L3'}
                    </PadButton>
                  )}
                </div>
              );
            })()}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function SpoilerConfirm({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="rounded border border-danger/50 bg-danger/10 p-2">
      <p className="mb-2 text-xs text-danger">确定要撕开焊盘封印吗？本次尝试将失去「⭐ 无提示星」——重玩本关可以重新挑战。</p>
      <div className="flex gap-2">
        <PadButton size="S" variant="danger" onClick={onConfirm}>确定要看</PadButton>
        <PadButton size="S" variant="ghost" onClick={onClose}>再想想</PadButton>
      </div>
    </div>
  );
}

/* ================= L2 验收台（常驻教学面板） ================= */
interface BenchRow {
  status: GoalStatus;
  ok: boolean;
  label: string;
  /** 求解器给的实测值 / 未达成原因 */
  detail: string;
  /** explainGoal：实测 vs 目标区间 + 偏大/偏小多少 */
  explain: string;
  /** 角标用的「偏大/偏小 xx」 */
  delta: string | null;
  /** 误解定向反馈（W5 diagnose.ts）：错在哪 + 往哪调 */
  hints: string[];
  /** false = 该目标无法自动校验（布局/BOM 类） */
  auto: boolean;
}

function AcceptanceBench({ id, open, onClose, rows, okCount, total, converged, solveError, tried, level, netRows, derivation, onOpenHints }: {
  id: string; open: boolean; onClose: () => void; rows: BenchRow[]; okCount: number; total: number;
  converged: boolean | null; solveError: string | null; tried: boolean; level: LevelDef;
  netRows: { net: number; label: string; v: number }[];
  derivation: Derivation | null; onOpenHints: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id={id}
          role="region"
          aria-label="验收台"
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="panel-raised absolute left-0 right-0 top-full z-50 mt-1 max-h-[62vh] overflow-y-auto rounded-lg p-3 outline-none"
        >
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-sig-amber" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-sig-amber">ACCEPTANCE · 验收台</span>
            <span className={cn('font-mono text-[11px]', okCount === total ? 'text-ok' : 'text-silk-500')}>
              已达成 {okCount}/{total}
            </span>
            {converged === false && <span className="font-mono text-[10px] text-sig-amber">⚠ 求解未完全收敛</span>}
            <button
              onClick={onClose}
              aria-label="关闭验收台"
              title="关闭（Esc）"
              className="ml-auto rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 求解失败时先解释「为什么还没有实测值」，而不是让每条目标各自含糊 */}
          {solveError && (
            <div className={cn('mb-2 rounded-md border p-2', tried ? 'border-danger/50 bg-danger/10' : 'border-sig-amber/40 bg-sig-amber/5')}>
              <p className={cn('font-mono text-[11px] leading-relaxed', tried ? 'text-danger' : 'text-sig-amber')}>
                {tried ? '求解未完成：' : '电路还没成形：'}{solveError}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-silk-300">
                先让电路成立（有参考地 + 闭合回路），再点 ▶ 运行——验收台的实测值会实时刷新。
              </p>
            </div>
          )}

          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className={cn('rounded-md border p-2', r.ok ? 'border-ok/40 bg-ok/5' : 'border-ink-700 bg-ink-900/60')}>
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5 shrink-0', r.ok ? 'text-ok' : 'text-silk-700')}>
                    {r.ok ? <Check className="h-3.5 w-3.5" /> : <span className="block h-3.5 w-3.5 rounded-full border border-silk-700" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('font-mono text-[12px]', r.ok ? 'text-ok' : 'text-silk-100')}>{r.label}</span>
                      {!r.auto && (
                        <span className="rounded-sm border border-ink-600 px-1 font-mono text-[10px] text-silk-500">无法自动校验 · 由布局/BOM 判定</span>
                      )}
                      {!r.ok && r.delta && (
                        <span className="rounded-sm bg-danger/20 px-1 font-mono text-[10px] text-danger">{r.delta}</span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-silk-500">实测：{r.detail}</p>
                    {r.explain !== r.detail && (
                      <p className={cn('mt-0.5 font-mono text-[11px] leading-relaxed', r.ok ? 'text-silk-500' : 'text-sig-amber')}>
                        {r.ok ? '判定：' : '怎么调：'}{r.explain}
                      </p>
                    )}
                    {!r.ok && r.hints.length > 0 && (
                      <ul className="mt-1 space-y-0.5 border-l border-sig-cyan/40 pl-2">
                        {r.hints.map((t, k) => (
                          <li key={k} className="text-[11px] leading-relaxed text-silk-300">{t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* L3：公式就在验收台上，目标没达成时最容易看到 */}
          <div className="mt-3 rounded-md border border-sig-cyan/30 bg-ink-950/50 p-2">
            <div className="font-mono text-[10px] tracking-[0.2em] text-sig-cyan">本关公式</div>
            <div className="mt-1 font-mono text-[13px] leading-relaxed text-silk-100">
              {level.formula?.expr ?? level.knowledge.title}
            </div>
            {level.formula?.vars && <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-silk-500">{level.formula.vars}</p>}
            {level.formula?.note && <p className="mt-1 text-[11px] leading-relaxed text-silk-300">{level.formula.note}</p>}
            {!level.formula && <p className="mt-1 text-[11px] text-silk-700">本关通式待内容组补齐，先看右栏知识卡。</p>}
          </div>

          {/* 代入演算：选中元件的「通式 → 代入数字 → 结论」 */}
          <div className="mt-3 rounded-md border border-ink-700 bg-ink-900/60 p-2">
            <div className="font-mono text-[10px] tracking-[0.2em] text-silk-500">代入演算 · 选中元件</div>
            {derivation ? (
              <>
                <div className="mt-1 font-mono text-[12px] text-silk-100">{derivation.name} · {derivation.formula}</div>
                <ul className="mt-1 space-y-0.5">
                  {derivation.lines.map((l, i) => (
                    <li key={i} className="font-mono text-[11px] leading-relaxed text-silk-300">{l}</li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-ok">→ {derivation.result}</p>
              </>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-silk-500">在画布上点选一个元件，这里会显示它的「通式 → 代入数字 → 结论」。</p>
            )}
          </div>

          {netRows.length > 0 && (
            <details className="mt-3 rounded-md border border-ink-700 bg-ink-900/60 p-2">
              <summary className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-silk-500">
                网络电压表 · 实测（{netRows.length} 个节点，GND 为 0V）
              </summary>
              <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {netRows.map(n => (
                  <li key={n.net} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="truncate text-silk-500">{n.label}</span>
                    <span className="shrink-0 text-silk-100">{formatSI(n.v, 'V')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] leading-relaxed text-silk-700">
              「实测」来自 MNA 求解器；「怎么调」按当前参数算出，「错在哪」由误解诊断给出。
            </span>
            <div className="flex shrink-0 gap-2">
              <PadButton size="S" variant="ghost" onClick={onOpenHints}>看 L1 提示（不扣星）</PadButton>
              <PadButton size="S" variant="ghost" onClick={onClose}>收起</PadButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= L3 公式辅助卡 ================= */
function FormulaCard({ level, highlight }: { level: LevelDef; highlight: boolean }) {
  const f = level.formula;
  return (
    <section
      aria-label="公式辅助"
      className={cn(
        'rounded-md border p-3 transition-colors',
        highlight ? 'border-sig-amber bg-sig-amber/10' : 'border-ink-700 bg-ink-900/60',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-silk-700">
          <Zap className="h-3 w-3" /> FORMULA · 公式辅助
        </span>
        {highlight && <span className="shrink-0 font-mono text-[10px] font-bold text-sig-amber">目标未达成 · 看这里</span>}
      </div>
      <div className="font-mono text-[13px] leading-relaxed text-sig-cyan">{f?.expr ?? level.knowledge.title}</div>
      {f?.vars && <p className="mt-1 font-mono text-[10px] leading-relaxed text-silk-500">{f.vars}</p>}
      {f?.note && <p className="mt-1.5 text-xs leading-relaxed text-silk-300">{f.note}</p>}
      {!f && <p className="mt-1 text-[11px] leading-relaxed text-silk-700">本关通式待内容组补齐——先读下面的知识卡。</p>}
      {level.concept && level.concept.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="font-mono text-[10px] text-silk-700">考点</span>
          {level.concept.map(c => (
            <span key={c} className="rounded-sm border border-ink-600 px-1 font-mono text-[10px] text-silk-500">{c}</span>
          ))}
        </div>
      )}
    </section>
  );
}

/* ================= L4 知识卡（可控折叠：进行中默认折叠，首次失败自动展开一次） =================
 * WorkbenchBits 的 NotesCard 是「挂载即展开」（内部 <details open>），所以由本页控制挂载时机：
 *   · 进行中默认不挂载 → 知识卡保持折叠，不会一上来就把答案摊开；
 *   · 首次失败时把 open 置 true（见 startRun 的判定回调）→ 自动展开一次；
 *   · 展开后交给 NotesCard（含 W1 落地的图鉴深链：codexId = level.codex?.[0]，缺省按标题回查）。
 */
function KnowledgePanel({ level, open, flash, onToggle }: {
  level: LevelDef; open: boolean; flash: boolean; onToggle: (v: boolean) => void;
}) {
  if (open) {
    return (
      <div className={cn(flash && 'rounded-md ring-1 ring-copper-400')}>
        <NotesCard title={level.knowledge.title} body={level.knowledge.body} codexId={level.codex?.[0]} />
      </div>
    );
  }
  return (
    <section
      aria-label="本关知识卡"
      className={cn('rounded-md border bg-ink-900/60 transition-colors', flash ? 'border-copper-400' : 'border-ink-700')}
    >
      <button
        onClick={() => onToggle(true)}
        aria-expanded={false}
        title="本关笔记：进行中默认折叠（避免直接剧透）；首次失败会自动展开一次"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[10px] tracking-[0.2em] text-silk-500">
            本关笔记{flash ? ' · 刚刚为你展开' : ' · 进行中默认折叠'}
          </span>
          <span className="block truncate text-xs font-bold text-silk-300">{level.knowledge.title}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-silk-700">▼ 展开（含思路）</span>
      </button>
    </section>
  );
}

/* ================= L10 求解失败：可读排查建议（绝不白屏） ================= */
function SimErrorCard({ error, onDismiss, onReset, onOpenHints }: {
  error: string; onDismiss: () => void; onReset: () => void; onOpenHints: () => void;
}) {
  const tips = solveErrorAdvice(error);
  return (
    <div role="alert" className="absolute inset-x-0 top-0 z-30 m-3 rounded-lg border border-danger/60 bg-ink-950/95 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />
        <span className="text-sm font-bold text-silk-100">仿真器停机保护 —— 电路没坏，是这个模型算不下去了</span>
        <button
          onClick={onDismiss}
          aria-label="关闭排查建议"
          className="ml-auto rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-2 font-mono text-[11px] text-silk-300">{error}</p>
      <ol className="mb-3 space-y-1">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-silk-300">
            <span className="shrink-0 font-mono text-[10px] text-sig-amber">第 {i + 1} 步</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <PadButton size="S" variant="primary" onClick={onReset}>重置电路（恢复初始）</PadButton>
        <PadButton size="S" variant="ghost" onClick={onOpenHints}>看 L1 提示</PadButton>
        <PadButton size="S" variant="ghost" onClick={onDismiss}>知道了，继续调</PadButton>
      </div>
    </div>
  );
}

/* ================= 过关结算 VictoryModal ================= */
function VictoryModal({ open, level, stars, elapsed, hintsTier, compCount, circuit, currents, result, nextLevelId, onReplay, onClose }: {
  open: boolean; level: LevelDef; stars: boolean[]; elapsed: number; hintsTier: number; compCount: number;
  circuit: CircuitSpec; currents: Map<string, number> | null; result: SolveResult | null;
  nextLevelId?: string; onReplay: () => void; onClose: () => void;
}) {
  const mm = Math.floor(elapsed / 60), ss = elapsed % 60;
  const [show3d, setShow3d] = useState(false);
  const [acting, setActing] = useState(false); // L10：动作锁，防重复点击结算按钮
  const dialogRef = useRef<HTMLDivElement | null>(null);

  /* L5 能量账本：ΣP 自检（电源发出的功率 = 元件耗散的功率） */
  const ledger = useMemo(() => powerLedger(circuit, result), [circuit, result]);
  const conserved = (() => {
    const mag = ledger.rows.reduce((s, r) => s + r.p, 0);
    return ledger.rows.length === 0 || Math.abs(ledger.total) <= Math.max(1e-9, mag * 0.02);
  })();
  const conv = readConverged(result);
  /* L5 提取练习：优先内容组 recap，缺省回落知识卡摘要（绝不再原样贴长文） */
  const recap = useMemo(() => recapLines(level), [level]);

  /* L6：结算层 role=dialog + 初始焦点 + Esc 关闭（关闭后回画布，关卡仍已记为通关） */
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(n => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* L10：任一结算动作只认第一次点击（避免连点导致重复跳转/重复重玩） */
  const once = (fn: () => void) => () => { if (acting) return; setActing(true); fn(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[65] flex items-center justify-center cc-scrim backdrop-blur-[8px]"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-title"
            aria-describedby="victory-recap"
            tabIndex={-1}
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="panel-raised relative max-h-[calc(100dvh-96px)] w-[560px] overflow-y-auto rounded-xl p-8 outline-none"
          >
            <button
              onClick={onClose}
              aria-label="关闭结算（Esc）"
              title="关闭结算，回画布（Esc）"
              className="absolute right-4 top-3 rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100"
            >
              <X className="h-4 w-4" />
            </button>
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
              <span id="victory-title" className="text-2xl font-black text-silk-100">关卡完成</span>
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

            <div id="victory-recap" className="mb-5 grid gap-4 sm:grid-cols-1">
              {/* L5-a 提取练习三行：替换原来「原样重复知识卡长文」的展示 */}
              <motion.section
                initial={{ rotateX: 15, y: 24, opacity: 0 }}
                animate={{ rotateX: 0, y: 0, opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                aria-label="回顾要点"
                className="rounded-lg border border-copper-500/50 bg-gradient-to-br from-ink-800 to-ink-900 p-4"
                style={{ boxShadow: '0 0 16px rgba(201,128,60,0.2)' }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5 text-copper-400" />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-copper-400">
                    {recap.fromContent ? 'RECAP · 三行小结' : 'RECAP · 知识摘要'}
                  </span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-silk-500">
                  先别看笔记：用自己的话把下面三点讲一遍，再点「下一关」。
                </p>
                <ol className="space-y-1.5">
                  {recap.lines.map((t, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-silk-300">
                      <span className="shrink-0 font-mono text-[10px] text-copper-400">{i + 1}.</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </motion.section>

              {/* L5-b 能量账本：ΣP ≈ 0，让「守恒」看得见 */}
              <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                aria-label="能量账本"
                className="rounded-lg border border-sig-cyan/40 bg-ink-950/60 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sigma className="h-3.5 w-3.5 text-sig-cyan" />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-sig-cyan">ENERGY LEDGER · 能量账本</span>
                </div>
                {ledger.rows.length === 0 ? (
                  <p className="font-mono text-[11px] text-silk-500">这次没有可统计的功率（电路里没有电流经过）。</p>
                ) : (
                  <>
                    <ul className="mb-2 space-y-1">
                      {ledger.rows.map(r => (
                        <li key={r.id} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                          <span className="truncate text-silk-300">{r.id} · {r.name}</span>
                          <span className={r.source ? 'text-sig-amber' : 'text-silk-300'}>
                            {/* 统一口径：电源向电路注入 +P，元件吸收 −P，两者相加 ≈ 0 */}
                            {r.source ? `+${formatSI(r.p, 'W')} 发出` : `−${formatSI(r.p, 'W')} 耗散`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className={cn('border-t border-ink-700 pt-2 font-mono text-[11px]', conserved ? 'text-ok' : 'text-sig-amber')}>
                      ΣP ≈ {formatSI(Math.abs(ledger.total), 'W')}
                      {conserved
                        ? ' ✓ 电源发出的功率 = 各元件耗散的功率（能量守恒）'
                        : '（与 0 的偏差来自求解器的数值误差/GMIN 泄漏，量级可忽略）'}
                    </div>
                  </>
                )}
                {conv === false && (
                  <p className="mt-1 font-mono text-[10px] text-sig-amber">⚠ 本次求解未完全收敛，账本数字仅供量级参考。</p>
                )}
              </motion.section>
            </div>

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
                aria-expanded={show3d}
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

            <div className={cn('flex items-center justify-center gap-3', acting && 'pointer-events-none opacity-60')} aria-busy={acting}>
              {nextLevelId ? (
                <span onClick={once(() => { /* 路由跳转由 PadButton 内部 Link 完成 */ })}>
                  <PadButton variant="primary" to={`/play/${nextLevelId}`}>下一关 →</PadButton>
                </span>
              ) : (
                <span onClick={once(() => { /* 同上 */ })}>
                  <PadButton variant="primary" to="/chapters">返回地图</PadButton>
                </span>
              )}
              <PadButton variant="ghost" onClick={once(onReplay)}>重玩冲三星</PadButton>
              <Link to="/chapters" onClick={once(() => { /* 同上 */ })} className="text-xs text-silk-500 hover:text-silk-100">返回地图</Link>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] text-silk-700">
              Esc 或右上 ✕ 关闭结算回画布（本关成绩已保存）；「下一关」按 Enter 即可。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
