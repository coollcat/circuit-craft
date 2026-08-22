/* eslint-disable react-refresh/only-export-components */
// 小实验 ①：色环电阻练习器（随机出题，点击选色环，判分）
// 正向模式：看色环选阻值（四选一）；反向模式：给阻值，点击色板涂 4 环
import { useCallback, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import PadButton from '@/components/PadButton';
import { cn } from '@/lib/utils';

/** 色环颜色定义：数字 → 颜色名 / 显示色 */
const DIGIT_COLORS: { name: string; hex: string }[] = [
  { name: '黑', hex: '#1A1A1A' },
  { name: '棕', hex: '#7B4B2A' },
  { name: '红', hex: '#D23A2E' },
  { name: '橙', hex: '#E8821E' },
  { name: '黄', hex: '#F2D21E' },
  { name: '绿', hex: '#2E9E3C' },
  { name: '蓝', hex: '#2456C8' },
  { name: '紫', hex: '#7B3FBF' },
  { name: '灰', hex: '#8A8A8A' },
  { name: '白', hex: '#EDEDED' },
];
const GOLD = { name: '金', hex: '#C9A227' };
const SILVER = { name: '银', hex: '#B8BCC2' };

interface Question {
  d1: number;
  d2: number;
  mult: number; // 10^mult，-1=金，-2=银
  tol: 'gold' | 'silver';
  value: number; // Ω
}

function randomQuestion(): Question {
  const d1 = 1 + Math.floor(Math.random() * 9);
  const d2 = Math.floor(Math.random() * 10);
  const mult = -1 + Math.floor(Math.random() * 6); // -1(金) .. 4(黄)
  const tol = Math.random() < 0.8 ? 'gold' : 'silver';
  return { d1, d2, mult, tol, value: (d1 * 10 + d2) * Math.pow(10, mult) };
}

export function formatOhm(v: number): string {
  if (v >= 1e6) return `${trimNum(v / 1e6)}MΩ`;
  if (v >= 1e3) return `${trimNum(v / 1e3)}kΩ`;
  return `${trimNum(v)}Ω`;
}
function trimNum(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function multColor(mult: number) {
  if (mult === -1) return GOLD;
  if (mult === -2) return SILVER;
  return DIGIT_COLORS[mult];
}

/** 色环电阻 SVG（代码绘制，非位图） */
function ResistorSvg({
  bands,
  onBandClick,
  activeBand,
}: {
  bands: (string | null)[]; // 4 环的 hex 或 null
  onBandClick?: (idx: number) => void;
  activeBand?: number;
}) {
  const xs = [118, 152, 186, 234]; // 4 环 x 位置（公差环隔开）
  return (
    <svg viewBox="0 0 320 90" className="h-auto w-full max-w-[420px]">
      {/* 引线 */}
      <path d="M0 45 H70 M250 45 H320" stroke="#B8BCC2" strokeWidth="4" />
      {/* 电阻体 */}
      <rect x="66" y="20" width="188" height="50" rx="24" fill="#D9B98A" stroke="#A8834C" strokeWidth="2" />
      {/* 色环 */}
      {xs.map((x, i) => (
        <g
          key={i}
          onClick={onBandClick ? () => onBandClick(i) : undefined}
          className={onBandClick ? 'cursor-pointer' : undefined}
        >
          <rect
            x={x}
            y="20"
            width="16"
            height="50"
            fill={bands[i] ?? '#B99B6E'}
            stroke={activeBand === i ? '#45DCE8' : 'none'}
            strokeWidth="2.5"
          />
          {bands[i] === null && (
            <text x={x + 8} y="50" textAnchor="middle" fontSize="14" fill="#6b5836">
              ?
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function bandHexes(q: Question): string[] {
  return [
    DIGIT_COLORS[q.d1].hex,
    DIGIT_COLORS[q.d2].hex,
    multColor(q.mult).hex,
    (q.tol === 'gold' ? GOLD : SILVER).hex,
  ];
}

/** 生成 4 个选项（含正确答案） */
function makeOptions(q: Question): number[] {
  const set = new Set<number>([q.value]);
  const digits = q.d1 * 10 + q.d2;
  const candidates = [
    digits * Math.pow(10, q.mult + 1),
    digits * Math.pow(10, q.mult - 1),
    (q.d2 * 10 + q.d1) * Math.pow(10, q.mult),
    (q.d1 * 10 + ((q.d2 + 1) % 10)) * Math.pow(10, q.mult),
    (q.d1 * 10 + ((q.d2 + 9) % 10)) * Math.pow(10, q.mult + 1),
  ];
  for (const c of candidates) {
    if (set.size >= 4) break;
    if (c > 0 && !set.has(c)) set.add(c);
  }
  return [...set].sort(() => Math.random() - 0.5);
}

type Mode = 'read' | 'paint';

export default function BandsLab() {
  const [mode, setMode] = useState<Mode>('read');
  const [question, setQuestion] = useState<Question>(randomQuestion);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState<null | { ok: boolean; text: string }>(null);

  // 反向模式状态
  const [painted, setPainted] = useState<(string | null)[]>([null, null, null, null]);
  const [paintedNames, setPaintedNames] = useState<(string | null)[]>([null, null, null, null]);
  const [activeBand, setActiveBand] = useState(0);

  const options = useMemo(() => makeOptions(question), [question]);

  const next = useCallback(() => {
    setQuestion(randomQuestion());
    setFeedback(null);
    setPainted([null, null, null, null]);
    setPaintedNames([null, null, null, null]);
    setActiveBand(0);
  }, []);

  const judge = useCallback(
    (ok: boolean, wrongText: string) => {
      if (ok) {
        const s = streak + 1;
        setStreak(s);
        setBest(b => Math.max(b, s));
        setFeedback({ ok: true, text: `回答正确！${formatOhm(question.value)} ${question.tol === 'gold' ? '±5%' : '±10%'}` });
        window.setTimeout(next, 1200);
      } else {
        setStreak(0);
        setFeedback({ ok: false, text: wrongText });
      }
    },
    [streak, question, next],
  );

  // 正向：选阻值
  const pickValue = (v: number) => {
    if (feedback?.ok) return;
    judge(v === question.value, `不对哦，再读一遍环色。提示：第 3 环是倍率，不是数字。`);
  };

  // 反向：点色板涂环
  const PALETTE: { name: string; hex: string; role: string }[] = [
    ...DIGIT_COLORS.map(c => ({ ...c, role: '数字/倍率' })),
    { ...GOLD, role: '倍率0.1/公差±5%' },
    { ...SILVER, role: '倍率0.01/公差±10%' },
  ];
  const paint = (name: string, hex: string) => {
    if (feedback?.ok) return;
    const i = activeBand;
    const np = [...painted];
    const nn = [...paintedNames];
    np[i] = hex;
    nn[i] = name;
    setPainted(np);
    setPaintedNames(nn);
    if (i < 3) setActiveBand(i + 1);
  };

  const submitPaint = () => {
    if (painted.some(p => p === null)) {
      setFeedback({ ok: false, text: '4 环都要涂完才能交卷。' });
      return;
    }
    const expected = [
      DIGIT_COLORS[question.d1].name,
      DIGIT_COLORS[question.d2].name,
      multColor(question.mult).name,
      (question.tol === 'gold' ? GOLD : SILVER).name,
    ];
    const ok = paintedNames.every((n, i) => n === expected[i]);
    judge(ok, `判分：应为 ${expected.join('-')}，你涂的是 ${paintedNames.join('-')}。`);
  };

  const tolText = question.tol === 'gold' ? '±5%' : '±10%';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(
            [
              ['read', '看环读值'],
              ['paint', '给值涂环'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                next();
              }}
              className={cn(
                'rounded border px-3 py-1.5 text-xs transition-colors',
                mode === m
                  ? 'border-pcb-400 bg-pcb-500/15 text-pcb-300'
                  : 'border-ink-700 text-silk-500 hover:border-ink-600 hover:text-silk-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 font-mono text-[13px]">
          <span className="text-silk-300">
            连对 <span className="text-pcb-300">{streak}</span>
          </span>
          <span className="text-silk-500">
            最佳 <span className="text-copper-300">{best}</span>
          </span>
        </div>
      </div>

      {mode === 'read' ? (
        <>
          <div className="panel flex flex-col items-center gap-3 rounded-lg p-4">
            <ResistorSvg bands={bandHexes(question)} />
            <p className="text-sm text-silk-300">读出这颗 4 环电阻的标称阻值（公差 {tolText}）：</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {options.map(v => (
              <button
                key={v}
                onClick={() => pickValue(v)}
                className={cn(
                  'rounded-md border border-ink-700 bg-ink-800 py-2.5 font-mono text-sm text-silk-100 transition-all hover:border-pcb-400 hover:text-pcb-300',
                  feedback?.ok && v === question.value && 'glow-pcb border-pcb-400 text-pcb-300',
                )}
              >
                {formatOhm(v)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="panel flex flex-col items-center gap-3 rounded-lg p-4">
            <div className="copper-window rounded px-4 py-1.5 font-mono text-lg font-bold">
              {formatOhm(question.value)} {tolText}
            </div>
            <p className="text-sm text-silk-300">
              给这颗空白电阻涂上 4 环（点击下方色板，当前环：第 {activeBand + 1} 环）：
            </p>
            <ResistorSvg bands={painted} onBandClick={setActiveBand} activeBand={activeBand} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PALETTE.map(c => (
              <button
                key={c.name}
                onClick={() => paint(c.name, c.hex)}
                title={c.role}
                className="flex items-center gap-1.5 rounded border border-ink-700 px-2 py-1 text-xs text-silk-300 transition-colors hover:border-sig-cyan"
              >
                <i className="h-3.5 w-3.5 rounded-sm border border-ink-600" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
            <PadButton size="S" variant="primary" className="ml-auto" onClick={submitPaint}>
              交卷判分
            </PadButton>
          </div>
        </>
      )}

      {feedback && (
        <div
          className={cn(
            'rounded-md border-l-[3px] px-3 py-2 font-mono text-[13px]',
            feedback.ok
              ? 'border-ok bg-ok/10 text-ok'
              : 'border-danger bg-danger/10 text-danger',
          )}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-silk-500">
        <span>口诀：第 1、2 环是有效数字，第 3 环是倍率（加几个 0），第 4 环是公差。</span>
        <button
          onClick={next}
          className="flex items-center gap-1 text-silk-300 transition-colors hover:text-sig-cyan"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 换一题
        </button>
      </div>
    </div>
  );
}
