/* eslint-disable react-refresh/only-export-components */
// STEP 1 原理图考核：三轮设计评审（选择题 + 连线纠错混合），答错老周批注
import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, CircleDashed, PlugZap, RotateCcw, Usb } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';
import { LaoZhouNote, SealStamp, useToasts, ToastHost } from './ui';
import { useGrad } from './store';
import type { DialogueLine } from '@/engine/types';

export const STEP1_LINES: DialogueLine[] = [
  { speaker: 'laozhou', text: '接单了？那就过三堂会审——电源、复位启动、USB 转串口。这是最小系统板的三条命。' },
  { speaker: 'laozhou', text: '规矩：选择题答错我会圈出来给你讲；连线连错也一样。全部通过，我给你签核。' },
  { speaker: 'xiaohan', text: '加油加油！答错了我就……我就假装没看见！' },
];

interface Quiz {
  q: string;
  options: string[];
  answer: number;
  note: string; // 答错时老周批注
}
interface Round {
  id: number;
  title: string;
  icon: 'power' | 'reset' | 'usb';
  quizzes: Quiz[];
  pairs: { from: string; to: string }[];
  pairNote: string;
}

const ROUNDS: Round[] = [
  {
    id: 1,
    title: '第一轮 · 电源评审（USB 5V → LDO 3.3V）',
    icon: 'power',
    quizzes: [
      {
        q: 'USB 的 5V 要降到 3.3V 给 ESP32 供电，为什么不能用两个电阻分压？',
        options: [
          '分压输出阻抗高，ESP32 电流一波动（80→240mA）电压就崩',
          '电阻太贵，成本超标',
          '电阻分压只能用于交流电',
          '电阻会屏蔽 WiFi 信号',
        ],
        answer: 0,
        note: '分压器的输出电压 = f（负载电流）。ESP32 发射瞬时电流冲到 240mA 以上，分压点直接被拉垮，芯片复位。电源要用「稳压器件」，不是「比例器件」。',
      },
      {
        q: 'LDO 输入端的 10µF + 输出端的 10µF/100nF 电容是干什么用的？',
        options: [
          '储能与退耦：压住纹波、提供瞬态电流、保证 LDO 环路稳定不振荡',
          '把 5V 升压到 3.3V',
          '隔直通交，保护模组',
          ' datasheet 让画就画，占面积用的',
        ],
        answer: 0,
        note: 'LDO 是反馈环路，输出电容的容量与 ESR 直接写进稳定性条件；100nF 负责高频去耦，必须贴到模组电源脚上——去耦要去耦到「脚上」。',
      },
    ],
    pairs: [
      { from: 'USB 5V (VBUS)', to: 'LDO 输入 IN' },
      { from: 'LDO 输出 OUT', to: '3V3 电源轨 → 模组 3V3 脚' },
      { from: '100nF 去耦电容', to: '跨接 3V3 与 GND，贴模组电源脚' },
      { from: 'USB 外壳与 GND 脚', to: '系统地 GND（单点铺铜）' },
    ],
    pairNote: '先想想电流从哪儿来，到哪儿去：5V 进 LDO，3V3 出到电源轨，电容贴着用电的脚，地要完整。',
  },
  {
    id: 2,
    title: '第二轮 · 复位与启动评审（EN / IO0）',
    icon: 'reset',
    quizzes: [
      {
        q: 'EN（CHIP_PU）脚为什么要用 10kΩ 上拉到 3V3？',
        options: [
          '保证上电默认使能；悬空会被干扰随机拉低，板子莫名复位',
          '为了省电',
          '防止 EN 脚被静电击穿（唯一目的）',
          '纯装饰，规范要求画上',
        ],
        answer: 0,
        note: 'CMOS 输入悬空就是一根天线，工频干扰就能让它在高低之间乱跳。10k 上拉给它一个确定的「默认态」，复位按键再负责把它主动拉低。',
      },
      {
        q: '上电（或复位）瞬间按住 BOOT 键把 IO0 拉低，ESP32 会进入什么状态？',
        options: ['UART 固件下载模式（Bootloader）', '深度睡眠', '安全模式', '蓝牙配对模式'],
        answer: 0,
        note: 'IO0 是 strapping 脚：复位释放瞬间被采样。高=正常启动跑 flash 里的程序，低=进 ROM Bootloader 等串口烧录。这就是烧固件要按 BOOT 的原因。',
      },
    ],
    pairs: [
      { from: 'EN 脚', to: '10kΩ 上拉 3V3 + 1µF 到 GND（上电延时复位）' },
      { from: '复位按键 RST', to: 'EN 与 GND 之间（按下拉低复位）' },
      { from: 'IO0 脚', to: '10kΩ 上拉 3V3，BOOT 按键到 GND' },
      { from: '自动下载三极管对', to: 'DTR→IO0、RTS→EN（软件联动进下载模式）' },
    ],
    pairNote: 'EN 和 IO0 都要「有默认态、能被拉低」：上拉电阻给默认态，按键和三极管给拉低路径。DTR 和 RTS 别接反了。',
  },
  {
    id: 3,
    title: '第三轮 · USB 转串口评审（CH340）',
    icon: 'usb',
    quizzes: [
      {
        q: 'CH340 的 TXD 引脚应该接到 ESP32 的哪个脚？',
        options: ['ESP32 的 RXD0——串口必须交叉连接', 'ESP32 的 TXD0——同名相连', 'EN 脚', 'IO2（随便一个 GPIO 都行）'],
        answer: 0,
        note: '「发」接「收」：CH340 的 TXD 是它在说话，得送进 ESP32 的耳朵 RXD0。同名直连是两台机器互相吼，谁也听不见谁。',
      },
      {
        q: '自动下载电路里 DTR / RTS 两根握手线是干什么的？',
        options: [
          '经三极管分别控制 IO0 与 EN，烧录软件自动复位并拉低 IO0 进下载模式',
          '给 CH340 提供 5V 电源',
          '把串口波特率提到 2Mbps',
          '防止 USB 插反',
        ],
        answer: 0,
        note: ' esptool 烧录时翻转 DTR/RTS，两个三极管（或 NPN+二极管）组合出「先拉 IO0 低、再抖一下 EN」的时序——不用手按按键也能进下载模式。',
      },
    ],
    pairs: [
      { from: 'CH340 TXD', to: 'ESP32 RXD0 (GPIO3)' },
      { from: 'CH340 RXD', to: 'ESP32 TXD0 (GPIO1)' },
      { from: 'USB D+ / D−', to: 'CH340 UD+ / UD−' },
      { from: 'DTR / RTS', to: '自动下载三极管 → IO0 / EN' },
    ],
    pairNote: '串口交叉、USB 直连、握手走三极管。画完默念一遍：电脑的「说」进模组的「听」。',
  },
];

function PairBoard({
  pairs,
  pairNote,
  onSolved,
}: {
  pairs: { from: string; to: string }[];
  pairNote: string;
  onSolved: () => void;
}) {
  // 目标乱序（稳定）
  const targets = useMemo(() => {
    const arr = pairs.map(p => p.to);
    const seed = pairs.map(p => p.from.length).reduce((a, b) => a + b, 7);
    return [...arr].sort((a, b) => ((a.charCodeAt(0) + seed) % 5) - ((b.charCodeAt(0) + seed) % 5) || a.localeCompare(b));
  }, [pairs]);
  const [selFrom, setSelFrom] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<{ from: string; to: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const { toasts, push } = useToasts();

  const usedTargets = new Set(Object.values(matched));
  const solvedCount = Object.keys(matched).length;

  const clickTo = (to: string) => {
    if (!selFrom || usedTargets.has(to)) return;
    const correct = pairs.find(p => p.from === selFrom)?.to === to;
    if (correct) {
      const next = { ...matched, [selFrom]: to };
      setMatched(next);
      setSelFrom(null);
      setNote(null);
      push('ok', '连线正确 ✓');
      if (Object.keys(next).length === pairs.length) {
        window.setTimeout(onSolved, 600);
      }
    } else {
      setWrong({ from: selFrom, to });
      setNote(pairNote);
      push('danger', '连错了，看老周批注');
      window.setTimeout(() => setWrong(null), 700);
    }
  };

  return (
    <div className="panel rounded-lg p-4">
      <ToastHost toasts={toasts} />
      <p className="mb-3 font-mono text-xs text-silk-500">
        连线纠错：先点左侧「起点」，再点右侧「去向」。{solvedCount}/{pairs.length} 已接通
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          {pairs.map(p => {
            const done = matched[p.from];
            const active = selFrom === p.from;
            return (
              <button
                key={p.from}
                disabled={!!done}
                onClick={() => setSelFrom(active ? null : p.from)}
                className={cn(
                  'flex w-full items-center gap-2 rounded border px-3 py-2 text-left font-mono text-xs transition-all',
                  done
                    ? 'border-pcb-500/60 bg-pcb-600/15 text-pcb-300'
                    : active
                      ? 'border-sig-cyan bg-sig-cyan/10 text-sig-cyan'
                      : 'border-ink-600 bg-ink-800 text-silk-300 hover:border-pcb-400',
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full border-2',
                    done ? 'border-pcb-300 bg-pcb-400' : active ? 'border-sig-cyan bg-sig-cyan/40' : 'border-silk-700',
                  )}
                />
                {p.from}
                {done && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-pcb-300" />}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {targets.map(t => {
            const used = usedTargets.has(t);
            const isWrong = wrong?.to === t;
            return (
              <button
                key={t}
                disabled={used || !selFrom}
                onClick={() => clickTo(t)}
                className={cn(
                  'flex w-full items-center gap-2 rounded border px-3 py-2 text-left font-mono text-xs transition-all',
                  used
                    ? 'border-pcb-500/60 bg-pcb-600/15 text-pcb-300 opacity-60'
                    : isWrong
                      ? 'border-danger bg-danger/15 text-danger'
                      : selFrom
                        ? 'border-sig-cyan/60 bg-ink-800 text-silk-100 hover:border-sig-cyan hover:bg-sig-cyan/10'
                        : 'border-ink-600 bg-ink-800 text-silk-500',
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full border-2',
                    used ? 'border-pcb-300 bg-pcb-400' : 'border-silk-700',
                  )}
                />
                {t}
              </button>
            );
          })}
        </div>
      </div>
      {/* 已接通配对 */}
      {solvedCount > 0 && (
        <div className="mt-3 space-y-1 border-t border-ink-700 pt-3">
          {Object.entries(matched).map(([f, t]) => (
            <p key={f} className="font-mono text-[11px] text-pcb-300">
              ✓ {f} ──→ {t}
            </p>
          ))}
        </div>
      )}
      <AnimatePresence>{note && <LaoZhouNote onClose={() => setNote(null)}>{note}</LaoZhouNote>}</AnimatePresence>
    </div>
  );
}

export default function SchematicReview({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const passed = useGrad(s => s.reviewsPassed);
  const set = useGrad(s => s.set);
  const [roundIdx, setRoundIdx] = useState(Math.min(passed.length, 2));
  const [quizDone, setQuizDone] = useState<Record<number, boolean>>({});
  const [wrongNotes, setWrongNotes] = useState<Record<number, string>>({});
  const [roundPassed, setRoundPassed] = useState<number[]>(passed);
  const [allSigned, setAllSigned] = useState(passed.length === 3);
  const [pairUnlockedFlash, setPairUnlockedFlash] = useState(false);
  const { toasts, push } = useToasts();

  const round = ROUNDS[roundIdx];
  const allQuizCorrect = round.quizzes.every((_, i) => quizDone[roundIdx * 10 + i]);

  const answer = (qi: number, oi: number) => {
    const key = roundIdx * 10 + qi;
    if (quizDone[key]) return;
    if (oi === round.quizzes[qi].answer) {
      setQuizDone(d => ({ ...d, [key]: true }));
      setWrongNotes(n => {
        const next = { ...n };
        delete next[key];
        return next;
      });
      push('ok', '回答正确 ✓');
      const nowAll = round.quizzes.every((_, i) => i === qi || quizDone[roundIdx * 10 + i]);
      if (nowAll) {
        setPairUnlockedFlash(true);
        window.setTimeout(() => setPairUnlockedFlash(false), 1200);
      }
    } else {
      setWrongNotes(n => ({ ...n, [key]: round.quizzes[qi].note }));
      push('danger', '答错了，看老周批注');
    }
  };

  const passRound = () => {
    const next = [...new Set([...roundPassed, round.id])].sort();
    setRoundPassed(next);
    if (!visitor) set({ reviewsPassed: next });
    if (next.length === 3) {
      setAllSigned(true);
      push('ok', '三轮评审全部通过！');
    } else {
      window.setTimeout(() => setRoundIdx(next.length), 900);
    }
  };

  const iconOf = { power: PlugZap, reset: RotateCcw, usb: Usb } as const;
  const RoundIcon = iconOf[round.icon];

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      <ToastHost toasts={toasts} />
      <div>
        <SilkTag>STEP 1 / 原理图考核 SCHEMATIC REVIEW</SilkTag>
        <h2 className="mb-4 mt-3 flex items-center gap-3 text-2xl font-black text-silk-100">
          <RoundIcon className="h-6 w-6 text-copper-400" />
          {round.title}
        </h2>

        {/* 选择题 */}
        <div className="space-y-4">
          {round.quizzes.map((quiz, qi) => {
            const key = roundIdx * 10 + qi;
            const done = quizDone[key];
            return (
              <div key={qi} className="panel rounded-lg p-4">
                <p className="mb-3 text-sm font-bold leading-relaxed text-silk-100">
                  Q{qi + 1}. {quiz.q}
                  {done && <CheckCircle2 className="ml-2 inline h-4 w-4 text-pcb-300" />}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quiz.options.map((opt, oi) => {
                    const isAnswer = oi === quiz.answer;
                    const locked = done;
                    return (
                      <button
                        key={oi}
                        disabled={locked}
                        onClick={() => answer(qi, oi)}
                        className={cn(
                          'rounded border px-3 py-2 text-left text-xs leading-relaxed transition-all',
                          locked && isAnswer
                            ? 'border-pcb-400 bg-pcb-600/20 text-pcb-300'
                            : locked
                              ? 'border-ink-600 text-silk-700'
                              : 'border-ink-600 bg-ink-800 text-silk-300 hover:border-sig-cyan hover:text-silk-100',
                        )}
                      >
                        <span className="mr-1.5 font-mono text-sig-cyan">{['A', 'B', 'C', 'D'][oi]}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {wrongNotes[key] && !done && (
                    <LaoZhouNote
                      onClose={() =>
                        setWrongNotes(n => {
                          const next = { ...n };
                          delete next[key];
                          return next;
                        })
                      }
                    >
                      {wrongNotes[key]}
                    </LaoZhouNote>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* 连线纠错 */}
        <div className="mt-4">
          {allQuizCorrect || roundPassed.includes(round.id) ? (
            roundPassed.includes(round.id) ? (
              <div className="panel rounded-lg p-4 font-mono text-sm text-pcb-300">
                ✓ 本轮连线已接通，评审通过。
              </div>
            ) : (
              <PairBoard
                key={roundIdx}
                pairs={round.pairs}
                pairNote={round.pairNote}
                onSolved={passRound}
              />
            )
          ) : (
            <div
              className={cn(
                'panel rounded-lg border-dashed p-4 text-center font-mono text-xs text-silk-700',
                pairUnlockedFlash && 'glow-pcb',
              )}
            >
              🔒 连线纠错环节：先答对本轮全部选择题解锁
            </div>
          )}
        </div>

        {/* 签核 & 下一步 */}
        <div className="mt-6 flex items-center gap-4">
          {allSigned ? (
            <>
              <SealStamp text="原理图签核" sub="SCHEMATIC SIGN-OFF" show tone="red" className="relative" />
              <div>
                <p className="mb-2 font-mono text-sm text-pcb-300">三轮设计评审全部通过，原理图冻结。</p>
                {visitor ? (
                  <PadButton variant="primary" size="L" onClick={onComplete}>
                    继续参观 →（游客模式不签核）
                  </PadButton>
                ) : (
                  <PadButton variant="primary" size="L" onClick={onComplete}>
                    进入选型 BOM →
                  </PadButton>
                )}
              </div>
            </>
          ) : (
            <p className="font-mono text-xs text-silk-500">
              评审进度 {roundPassed.length}/3 · 每轮 = 选择题全对 + 连线纠错全接通
            </p>
          )}
        </div>
      </div>

      {/* 右：评审单 */}
      <aside className="panel-raised h-fit rounded-lg p-4">
        <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-silk-500">
          设计评审单 DESIGN REVIEW
        </h4>
        <div className="space-y-2">
          {ROUNDS.map(r => {
            const ok = roundPassed.includes(r.id);
            const current = r.id === round.id && !ok;
            return (
              <button
                key={r.id}
                disabled={!ok && !current}
                onClick={() => ok && setRoundIdx(r.id - 1)}
                className={cn(
                  'flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-xs transition-colors',
                  ok
                    ? 'border-pcb-500/50 bg-pcb-600/10 text-pcb-300'
                    : current
                      ? 'border-copper-500/60 bg-copper-600/10 text-copper-300'
                      : 'border-ink-700 text-silk-700',
                )}
              >
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                <span className="font-mono">{['电源', '复位/启动', 'USB 转串口'][r.id - 1]}评审</span>
                <span className="ml-auto font-mono text-[10px]">{ok ? 'PASS' : current ? 'REVIEWING' : 'WAIT'}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 border-t border-ink-700 pt-3 text-[11px] leading-relaxed text-silk-500">
          <p>· 必须项：LDO 电源路径 / EN·IO0 上拉 / 复位+BOOT / CH340 交叉连接</p>
          <p className="mt-1">· 参考：第 6 章「ESP32 RF 布局」、第 7 章「LDO 选型」知识卡</p>
        </div>
      </aside>
    </div>
  );
}
