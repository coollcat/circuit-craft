// 支线任务 Side Quests（/sidequests）—— 双支线蓝色岔路地图与关卡入口
// 支线 A「ESP32 单片机入门」6 关 / 支线 B「进阶信号处理」5 关 + 支线毕业设计介绍卡
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, AudioWaveform, Lock, Star, Play, Blocks, Waves, X,
} from 'lucide-react';
import { SIDE_QUESTS, LEVELS } from '@/content/levels';
import type { LevelDef } from '@/engine/types';
import { useProgress } from '@/store/progress';
import { useTransient, TOAST_MS, SHAKE_MS } from '@/hooks/useTransient';
import { useMotionOn } from '@/hooks/useMotionOn';
import SilkTag from '@/components/SilkTag';
import PadButton from '@/components/PadButton';
import { cn } from '@/lib/utils';

/* ---------- 支线元数据（玩法 / 教学点，来自 sidequests.md） ---------- */
const SIDE_META: Record<string, { play: string; point: string }> = {
  'sa-1': { play: '代码块「设置引脚 输出/高电平」+ 接 LED 电路', point: '引脚是什么、推挽输出直觉' },
  'sa-2': { play: 'PWM 块调占空比，示波器看方波 → 亮度渐变', point: '占空比 = 平均电压' },
  'sa-3': { play: '上拉/下拉电阻接法 + 消抖波形观察', point: '悬空电平、上拉电阻' },
  'sa-4': { play: '电位器分压 → ADC 块读数，万用表对照', point: '模拟→数字、分辨率直觉' },
  'sa-5': { play: '中断块 vs 轮询块对比演示', point: '事件驱动直觉' },
  'sa-6': { play: '给 A-1 的灯加「WiFi 开关」块（概念级）', point: 'ESP32 无线能力的边界' },
  'sb-1': { play: 'mV 级信号源 + 运放放大 100 倍', point: '微弱信号、增益带宽直觉' },
  'sb-2': { play: '叠加噪声源，示波器对比滤波前后', point: 'SNR 直觉、RC/有源滤波选择' },
  'sb-3': { play: '调采样率旋钮观察混叠现象', point: '采样定理直觉' },
  'sb-4': { play: '过零抖动问题 → 加迟滞解决', point: '施密特触发直觉' },
  'sb-5': { play: '信号链原理图 + 简化 PCB 布局 + BOM', point: '完整信号链工程化' },
  'sb-6': { play: '算出 π 型衰减器三颗电阻，看 −3dB 落点', point: '阻抗匹配、dB 与功率减半' },
  'sb-7': { play: '调 L/C 让陷波器对准干扰频点', point: 'LC 谐振 f₀=1/(2π√LC)、陷波/选频' },
  'sb-8': { play: '二极管+RC 把载波包络摘下来', point: '包络检波、矿石收音机原理' },
};

interface TrackDef {
  track: 'side-a' | 'side-b';
  key: string;
  name: string;
  subtitle: string;
  desc: string;
  difficulty: string;
  icon: typeof Cpu;
  unlockText: string;
  needChapter: number;
  gradName: string;
}
const TRACKS: TrackDef[] = [
  {
    track: 'side-a', key: 'A', name: '让你的板子动起来：ESP32 单片机入门', subtitle: 'SIDE QUEST A',
    desc: '不写深代码。用块式伪代码 + 接线，搞懂 GPIO、PWM、ADC 在「电路层面」到底发生了什么。',
    difficulty: '★★☆', icon: Cpu, unlockText: '通关主线第 2 章解锁', needChapter: 2, gradName: '支线 A 结业',
  },
  {
    track: 'side-b', key: 'B', name: '让传感器说人话：进阶信号处理', subtitle: 'SIDE QUEST B',
    desc: '真实世界的信号是脏的。放大、滤波、整形，再进射频世界：衰减、陷波与检波——最后做一块真能用的传感器信号处理小板。',
    difficulty: '★★★★', icon: AudioWaveform, unlockText: '通关主线第 5 章解锁', needChapter: 5, gradName: '支线毕业：传感器小板',
  },
];

type PadState = 'locked' | 'open' | 'done';

export default function SideQuests() {
  const navigate = useNavigate();
  const completed = useProgress(s => s.completed);
  const stars = useProgress(s => s.stars);
  const isLevelUnlocked = useProgress(s => s.isLevelUnlocked);
  // 循环动画（可玩脉冲环 / 锁定轨道流动光点）只在动效开启时跑，兼容系统 prefers-reduced-motion
  const motionOn = useMotionOn();

  const [hovered, setHovered] = useState<string | null>(null);
  const [toast, setToast] = useTransient<string>(TOAST_MS);
  const [shakeTrack, setShakeTrack] = useTransient<string>(SHAKE_MS);
  const [showBoard, setShowBoard] = useState(false);

  const chapterDone = (ch: number) => {
    const ls = LEVELS.filter(l => l.chapter === ch);
    return ls.length > 0 && ls.every(l => completed.includes(l.id));
  };
  const trackOpen = (t: TrackDef) => chapterDone(t.needChapter);

  const levelsOf = (t: TrackDef) =>
    SIDE_QUESTS.filter(l => l.track === t.track).sort((a, b) => a.index - b.index);

  const stateOf = (l: LevelDef): PadState => {
    if (completed.includes(l.id)) return 'done';
    if (isLevelUnlocked(l.id)) return 'open';
    return 'locked';
  };

  // 支线 B 毕业板：轨道最后一关通关即点亮（新增关卡自动纳入，不再硬编码 id）
  const sbLast = SIDE_QUESTS.filter(l => l.track === 'side-b').sort((a, b) => a.index - b.index).at(-1);
  const b5Done = sbLast ? completed.includes(sbLast.id) : false;

  /* 轨道间联动提示（打字机，进入后延迟 1s 播一次；动效关闭时整句直出） */
  const hintText = '丝印提示：支线 A 的 ADC 知识会让主线 5-4 变简单 · 支线 B 尾声的射频篇需要主线第 6 章的语感';
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!motionOn) return; // 动效关闭：下面直接渲染整句，不跑打字机
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setTyped(hintText.slice(0, i));
        if (i >= hintText.length && interval) clearInterval(interval);
      }, 40);
    }, 1000);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [hintText, motionOn]);

  // 锁定焊盘与锁定轨道统一走「抖动 + 提示」，不再直接进关（与章节地图一致）
  const clickPad = (l: LevelDef) => {
    if (stateOf(l) === 'locked') {
      setShakeTrack(l.track);
      setToast('先通关前面的关卡哦');
      return;
    }
    navigate(`/play/${l.id}`);
  };

  const hoveredLevel = hovered ? SIDE_QUESTS.find(l => l.id === hovered) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-12 py-10">
      {/* 页面标题区 */}
      <motion.header initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SilkTag>SIDE QUESTS · 蓝色岔路</SilkTag>
        <h1 className="mt-3 text-4xl font-black text-silk-100">支线任务</h1>
        <p className="mt-2 text-sm text-silk-500">主线的野路子。不学也能毕业，学了会更强。</p>
      </motion.header>

      {/* 双支线轨道 */}
      {TRACKS.map((track, ti) => {
        const open = trackOpen(track);
        const levels = levelsOf(track);
        const doneCount = levels.filter(l => completed.includes(l.id)).length;
        const trackStars = levels.reduce((s, l) => s + (stars[l.id] ?? 0), 0);
        // 继续/出发 = 第一个可玩的未通关关；全通关后「重温」回落本轨道最后一关（不再 to="#" 死链）
        const resume = levels.find(l => !completed.includes(l.id) && isLevelUnlocked(l.id)) ?? levels[levels.length - 1];
        const Icon = track.icon;
        return (
          <motion.section
            key={track.track}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + ti * 0.15 }}
            className={cn('relative', !open && 'opacity-40 grayscale')}
          >
            <motion.div
              animate={shakeTrack === track.track ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="panel flex gap-6 rounded-xl p-5"
            >
              {/* 轨道头卡 */}
              <div className="flex w-80 shrink-0 flex-col gap-3 border-r border-ink-700 pr-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sig-blue/60 bg-ink-800">
                    <Icon className="h-6 w-6 text-sig-blue" />
                  </span>
                  <div>
                    <div className="font-mono text-[10px] tracking-wider text-sig-blue">{track.subtitle}</div>
                    <div className="font-mono text-xs text-sig-amber">{track.difficulty}</div>
                  </div>
                </div>
                <h2 className="text-base font-bold leading-snug text-silk-100">{track.name}</h2>
                <p className="text-xs leading-relaxed text-silk-500">{track.desc}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-mono text-[11px] text-silk-500">
                    {doneCount}/{levels.length} 关 · ⭐{trackStars}
                  </span>
                  {open ? (
                    <PadButton size="S" variant="ghost" to={resume ? `/play/${resume.id}` : '/sidequests'}>
                      <Play className="h-3.5 w-3.5" /> {doneCount === 0 ? '出发' : doneCount === levels.length ? '重温' : '继续'}
                    </PadButton>
                  ) : (
                    <button
                      onClick={() => {
                        setShakeTrack(track.track);
                        setToast(track.unlockText);
                      }}
                      className="flex items-center gap-1.5 rounded border border-ink-600 px-3 py-1.5 text-[11px] text-silk-500"
                    >
                      <Lock className="h-3.5 w-3.5" /> {track.unlockText}
                    </button>
                  )}
                </div>
              </div>

              {/* 轨道：蓝色走线 + 关卡焊盘序列 */}
              <div className="relative flex-1 overflow-x-auto">
                {/* 走线画进 min-w-max 内容层：宽度随关卡数量增长，横向滚动时依然全覆盖 */}
                <div className="relative min-w-max">
                  <svg className="absolute left-0 top-[52px] h-2 w-full" preserveAspectRatio="none" viewBox="0 0 1000 8">
                    <motion.path
                      d="M0 4 L1000 4"
                      fill="none" style={{ stroke: 'rgb(var(--cc-sig-blue))' }} strokeWidth="3" strokeOpacity={open ? 0.8 : 0.35}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.3 + ti * 0.2 }}
                    />
                    {!open && motionOn && (
                      <motion.circle r="4" style={{ fill: 'rgb(var(--cc-sig-blue))' }} fillOpacity="0.5">
                        <animateMotion dur="6s" repeatCount="indefinite" path="M0 4 L1000 4" />
                      </motion.circle>
                    )}
                  </svg>
                  <div className="relative flex items-start gap-8 pt-6">
                  {levels.map((l, i) => {
                    const st = stateOf(l);
                    const starCount = stars[l.id] ?? 0;
                    const isGrad = track.track === 'side-b' && l.id === sbLast?.id;
                    return (
                      <motion.div
                        key={l.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 + ti * 0.2 + i * 0.03, type: 'spring', stiffness: 320, damping: 20 }}
                        className="flex w-28 flex-col items-center gap-1.5"
                      >
                        <button
                          onClick={() => clickPad(l)}
                          onMouseEnter={() => setHovered(l.id)}
                          onMouseLeave={() => setHovered(null)}
                          className={cn(
                            'relative flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                            isGrad ? 'h-16 w-16' : 'h-14 w-14',
                            st === 'done' && 'border-copper-400 bg-copper-300 text-ink-950',
                            st === 'open' && 'border-sig-blue bg-ink-800 text-sig-blue',
                            st === 'locked' && 'border-ink-700 bg-ink-850 text-silk-700',
                          )}
                          style={st === 'done' ? { boxShadow: '0 0 10px rgba(224,164,88,0.4)' } : undefined}
                        >
                          {st === 'locked' ? (
                            <Lock className="h-4 w-4" />
                          ) : st === 'done' ? (
                            // 星级如实显示：0 星不能再画成 1 星（截图/验收会当成功劳）
                            <span className="font-mono text-xs font-bold">
                              {starCount > 0 ? '★'.repeat(starCount) : '✓'}
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold">
                              {l.id.replace('s', '').toUpperCase()}
                            </span>
                          )}
                          {st === 'open' && motionOn && (
                            <motion.span
                              className="absolute inset-0 rounded-full border-2 border-sig-blue"
                              animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                        </button>
                        <div className="text-center">
                          <div className={cn('text-[11px] font-bold leading-tight', st === 'locked' ? 'text-silk-700' : 'text-silk-100')}>
                            {l.title}
                          </div>
                          <div className="mt-0.5 font-mono text-[9px] text-silk-500">{SIDE_META[l.id]?.point}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {/* 轨道末端：支线毕业焊盘 */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + ti * 0.2 + levels.length * 0.03, type: 'spring', stiffness: 320, damping: 20 }}
                    className="flex w-28 flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        'flex h-16 w-16 items-center justify-center rounded-lg border-2',
                        doneCount === levels.length
                          ? 'border-copper-400 bg-gradient-to-br from-copper-600 via-copper-500 to-copper-300 text-ink-950'
                          : 'border-ink-700 bg-ink-850 text-silk-700',
                      )}
                    >
                      <Star className={cn('h-6 w-6', doneCount === levels.length && 'fill-ink-950')} />
                    </div>
                    <div className="text-center text-[11px] font-bold text-silk-300">{track.gradName}</div>
                    {track.track === 'side-b' && b5Done && (
                      <button onClick={() => setShowBoard(true)} className="font-mono text-[10px] text-sig-blue underline underline-offset-2">
                        查看成品
                      </button>
                    )}
                  </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>
        );
      })}

      {/* 轨道间联动提示条（打字机） */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.4 }}
        className="rounded-md border border-dashed border-ink-600 px-4 py-2 font-mono text-[11px] text-silk-500"
      >
        {motionOn ? typed : hintText}
      </motion.div>

      {/* ESP32 支线块式伪代码说明卡 */}
      <motion.section
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}
        className="panel flex gap-5 rounded-xl p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sig-blue/50 bg-ink-800">
          <Blocks className="h-6 w-6 text-sig-blue" />
        </span>
        <div className="flex-1">
          <h3 className="text-base font-bold text-silk-100">支线 A 玩法说明：块式伪代码 × 真实电路</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-silk-300">
            支线 A 不教深代码——它教的是「程序如何变成电平」。关卡里你会看到一组可拖拽的概念块：
            <span className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-sig-blue">设置引脚</span>
            <span className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-sig-blue">PWM</span>
            <span className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-sig-blue">读ADC</span>
            <span className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-sig-blue">如果…则</span>
            <span className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-sig-blue">当引脚变化时</span>
            —— 每个块对应画布上引脚的真实电平变化（H/L 标签实时切换）。程序逻辑与电路现象对照着学，等以后真写代码时，每一行都有画面感。
          </p>
        </div>
        <Waves className="h-5 w-5 shrink-0 self-start text-sig-blue/60" />
      </motion.section>

      {/* 支线毕业设计介绍卡：传感器小板 */}
      <motion.section
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55 }}
        className="panel flex items-center gap-6 rounded-xl p-5"
      >
        <img src="/sensor-board.png" alt="传感器信号处理小板" className="h-40 w-56 rounded-lg border border-ink-700 object-cover" />
        <div className="flex-1">
          <SilkTag>SIDE B GRADUATION</SilkTag>
          <h3 className="mt-2 text-lg font-bold text-silk-100">支线毕业设计：传感器信号处理小板</h3>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-silk-300">
            支线 B 的终点是一块真能用的传感器小板：mV 级传感器信号进板，经运放放大 20 倍、RC 低通滤掉高频噪声，
            最后以 2.0V 的干净直流送进 ADC。它与工业变送器同构——通过它，你将完成人生第一块「信号链工程化」作品，并解锁尾声的射频三连关。
            板上留有排针与传感器焊盘，照着主线第 4 章的布局手艺，它真的可以打板。
          </p>
          <div className="mt-3 font-mono text-[10px] text-silk-500">
            信号链：SENSOR → OPAMP ×20 → RC 159Hz → ADC · 成品参照见左图
          </div>
        </div>
      </motion.section>

      {/* hover tooltip */}
      <AnimatePresence>
        {hoveredLevel && SIDE_META[hoveredLevel.id] && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="panel-raised pointer-events-none fixed bottom-8 left-1/2 z-40 w-[420px] -translate-x-1/2 rounded-lg p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] text-sig-blue">{hoveredLevel.id.toUpperCase()}</span>
              <span className="font-mono text-[10px] text-silk-500">预计 5–10 分钟</span>
            </div>
            <div className="mt-1 text-sm font-bold text-silk-100">{hoveredLevel.title}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-silk-500">玩法：{SIDE_META[hoveredLevel.id].play}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-silk-500">教学点：{SIDE_META[hoveredLevel.id].point}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 传感器小板成品展示卡（B-5 毕业后） */}
      <AnimatePresence>
        {showBoard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center cc-scrim backdrop-blur-sm"
            onClick={() => setShowBoard(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} transition={{ duration: 0.3 }}
              className="panel-raised w-[560px] rounded-xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <SilkTag>SIDE B · GRADUATED</SilkTag>
                <button onClick={() => setShowBoard(false)} className="rounded p-1 text-silk-500 hover:bg-ink-700" aria-label="关闭">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <motion.img
                src="/sensor-board.png" alt="传感器信号处理小板成品"
                className="mt-4 w-full rounded-lg border border-copper-500/40"
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-copper-500/20 px-3 py-1 text-xs font-bold text-copper-300">🏅 支线毕业绶带</span>
                <span className="text-xs text-silk-300">你亲手设计的信号链，已经印在这块板上。</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-silk-500">
                板载运放增益级、RC 低通与排针接口，深绿阻焊 + 铜色走线——与 sb-5 的原理图一一对应。
                想让它变成实物？通关主线第 7 章后，毕业设计台有完整的打板流程等着你。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast（与章节地图统一：同处停留时长 + 屏幕阅读器可播报） */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="panel-raised fixed right-6 top-20 z-50 rounded-md border-l-2 border-l-warn px-4 py-2.5 text-xs text-silk-100"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
