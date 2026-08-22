// 章节地图 Chapter Map（/chapters）—— 整块 PCB 式选关大地图
// S 形主走线串联 30 关卡焊盘 + 支线岔口 + 玩家面板 + 章节详情抽屉 + 底部状态条 + 首访引导
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Component, FileText, Route, AudioWaveform, Radio, Award,
  Lock, FlaskConical, BookOpen, Play, X, GraduationCap, ChevronRight,
} from 'lucide-react';
import { LEVELS, SIDE_QUESTS } from '@/content/levels';
import type { LevelDef } from '@/engine/types';
import { useProgress } from '@/store/progress';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { titleForStars } from '@/lib/titles';
import { safeGetItem, safeSetItem, setStorageWarnHandler } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';

/* ---------- 章节元数据（丝印梗 / 知识清单 / 老周说） ---------- */
const CHAPTER_META: {
  chapter: number;
  name: string;
  icon: typeof Zap;
  gag: string;
  intro: string;
  knowledge: string[];
  laozhou: string;
}[] = [
  { chapter: 1, name: '电是什么', icon: Zap, gag: '先想想电流从哪儿来，到哪儿去', intro: '电压、电流、电阻的直觉，从一条闭合回路开始。', knowledge: ['回路闭合', '电压与电位差', '欧姆定律 I=V/R', 'LED 限流电阻'], laozhou: '这一章我只教你一件事：电流要回家。往后所有的错，都是忘了这件事。' },
  { chapter: 2, name: '认识元器件', icon: Component, gag: '每种元件都有脾气', intro: 'R/C/L、二极管、三极管，逐个摸透它们的性格。', knowledge: ['时间常数 τ=RC', '二极管单向导电', '三极管放大与饱和', '电感的电流惯性'], laozhou: '元件没有好坏，只有用没用在它的脾气上。' },
  { chapter: 3, name: '原理图设计', icon: FileText, gag: '图纸是电路的第一版人生', intro: '分压、串并联、RC 波形与滤波，画出会思考的图纸。', knowledge: ['分压公式', '串并联心法', 'RC 充放电波形', '截止频率 fc', '三极管开关'], laozhou: '原理图阶段改一根线只要一秒钟，打板之后改一根线要一百块。' },
  { chapter: 4, name: 'PCB 布局布线', icon: Route, gag: '此处地平面不可分割', intro: '从封装到 DRC，把图纸变成一块真正的板子。', knowledge: ['封装与实物', '去耦电容 10mm 原则', '45° 走线', '回流路径与地平面', 'DRC 与载流线宽'], laozhou: '布局先放连接器，再放大芯片，最后让电容贴着芯片的电源脚——这是三十年烧出来的顺序。' },
  { chapter: 5, name: '信号处理', icon: AudioWaveform, gag: '模拟世界的最后一道防线', intro: '运放、滤波、ADC——让微弱信号说出真话。', knowledge: ['虚短与虚断', '同相增益 G=1+R2/R1', '有源滤波', 'ADC 分辨率', '传感器信号链'], laozhou: '示波器比万用表好说话。别慌，看波形先看幅度、形状、时间。' },
  { chapter: 6, name: '无线通信', icon: Radio, gag: 'RF 区域 · 禁止走线', intro: '载波、天线、匹配与功耗，把信号送上天空。', knowledge: ['载波与调制', '50Ω 阻抗匹配', '天线净空区', '功耗预算'], laozhou: '无线的玄学，八成是电源和地没伺候好。' },
  { chapter: 7, name: '选型实战', icon: Award, gag: '买得到的元件才是好元件', intro: '数据手册、LDO、成本与 BOM——量产思维养成。', knowledge: ['数据手册读法', '降额设计', 'LDO 选型', 'E 系列与供货', 'BOM 制作'], laozhou: '毕业设计没有提示。但从今天起，你查手册的速度会越来越快——那就是工程师的经验。' },
];

/* 称号体系统一收敛到 src/lib/titles.ts（0/15/40/70/100/120 星阈值），此处不再另立阶梯 */

/* ---------- 地图几何：S 形布局 ---------- */
const BOARD_W = 1560;
const BOARD_H = 940;
// 主板容器内偏移（对应下方 motion.div 的 left-6 top-6 = 24px），小地图视口换算必须扣除
const BOARD_OX = 24;
const BOARD_OY = 24;

interface Zone { x: number; y: number; w: number; h: number; }
const ZONES: Zone[] = [
  { x: 60, y: 120, w: 380, h: 190 },   // ch1
  { x: 480, y: 120, w: 380, h: 190 },  // ch2
  { x: 900, y: 120, w: 460, h: 190 },  // ch3 (5关)
  { x: 900, y: 400, w: 460, h: 190 },  // ch4 (5关)
  { x: 400, y: 400, w: 380, h: 190 },  // ch5
  { x: 400, y: 680, w: 380, h: 190 },  // ch6
  { x: 820, y: 680, w: 380, h: 190 },  // ch7
];
const GRAD_PAD = { x: 1330, y: 775, r: 26 }; // 毕业设计金焊盘
const PORTAL_A = { x: 620, y: 352 }; // 支线 A 岔口（第 2 章后）
const PORTAL_B = { x: 1170, y: 632 }; // 支线 B 岔口（第 5 章后）

interface PadPos { level: LevelDef; x: number; y: number; }

function buildPads(): PadPos[] {
  const pads: PadPos[] = [];
  CHAPTER_META.forEach((meta, zi) => {
    const levels = LEVELS.filter(l => l.chapter === meta.chapter).sort((a, b) => a.index - b.index);
    const zone = ZONES[zi];
    levels.forEach((level, i) => {
      const x = zone.x + 56 + (i * (zone.w - 112)) / Math.max(levels.length - 1, 1);
      pads.push({ level, x, y: zone.y + zone.h / 2 + 18 });
    });
  });
  return pads;
}

/** 两焊盘间的 45° 折线走线 */
function traceSeg(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(y2 - y1) < 1) return `L ${x2} ${y2}`;
  const dy = y2 - y1;
  const d = Math.abs(dy);
  const dir = Math.sign(x2 - x1) || 1;
  const diagX = Math.min(d, Math.abs(x2 - x1));
  const midX = x2 - dir * diagX;
  return `L ${midX} ${y1} L ${x2} ${y2}`;
}

type PadState = 'locked' | 'open' | 'done' | 'current';

const PAD_STYLE: Record<PadState, { ring: string; fill: string; text: string }> = {
  locked: { ring: '#1B2E24', fill: '#0E1611', text: '#55524A' },
  open: { ring: '#2E9E63', fill: '#0E1611', text: '#6FE3A1' },
  done: { ring: '#E0A458', fill: '#F0C078', text: '#060A08' },
  current: { ring: '#45DCE8', fill: '#13211A', text: '#45DCE8' },
};

const GUIDE_KEY = 'cc-guide-chapters-v1';

export default function Chapters() {
  const navigate = useNavigate();
  const location = useLocation();
  const completed = useProgress(s => s.completed);
  const stars = useProgress(s => s.stars);
  const isLevelUnlocked = useProgress(s => s.isLevelUnlocked);

  const pads = useMemo(buildPads, []);
  const totalStars = useMemo(() => Object.values(stars).reduce((a, b) => a + b, 0), [stars]);
  const totalCompleted = completed.length;
  const TOTAL_LEVELS = LEVELS.length + SIDE_QUESTS.length;
  const TOTAL_STARS = TOTAL_LEVELS * 3;

  const stateOf = useCallback(
    (l: LevelDef): PadState => {
      const done = completed.includes(l.id);
      const open = isLevelUnlocked(l.id);
      if (done) return 'done';
      if (open) {
        const firstOpen = pads.find(p => !completed.includes(p.level.id) && isLevelUnlocked(p.level.id));
        return firstOpen?.level.id === l.id ? 'current' : 'open';
      }
      return 'locked';
    },
    [completed, isLevelUnlocked, pads],
  );

  const nextLevel = pads.find(p => stateOf(p.level) === 'current')?.level ?? null;
  const chapterDone = (ch: number) => {
    const ls = LEVELS.filter(l => l.chapter === ch);
    return ls.length > 0 && ls.every(l => completed.includes(l.id));
  };
  const sideAOpen = chapterDone(2);
  const sideBOpen = chapterDone(5);
  const gradOpen = chapterDone(6);
  const mainProgress = LEVELS.filter(l => completed.includes(l.id)).length / LEVELS.length;

  /* ---------- 平移缩放 ---------- */
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // 触控：活跃指针对照表 + 双指捏合基线（Pointer Events 同时覆盖鼠标与触屏）
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ d0: number; k0: number } | null>(null);
  // 容器尺寸进 state：小地图视口框/悬浮卡 clamp 依赖它，窗口或平板旋转时必须实时刷新
  const [mapSize, setMapSize] = useState({ w: 900, h: 600 });
  const fitDone = useRef(false);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setMapSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // 初次适配：板子比容器大（平板/小窗）时整体缩到能看清并居中；桌面宽屏保持 0,0,1 原样
  useEffect(() => {
    if (fitDone.current) return;
    const { w, h } = mapSize;
    const k = Math.min(1, (w - 48) / BOARD_W, (h - 48) / BOARD_H);
    fitDone.current = true;
    if (k < 1) {
      setView({ x: (w - BOARD_W * k) / 2 - BOARD_OX * k, y: (h - BOARD_H * k) / 2 - BOARD_OY * k, k });
    }
  }, [mapSize]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setView(v => {
      const k = Math.min(1.6, Math.max(0.6, v.k * (e.deltaY > 0 ? 0.9 : 1.1)));
      return { ...v, k };
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: view.k };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = Math.min(1.6, Math.max(0.6, pinchRef.current.k0 * (d / pinchRef.current.d0)));
      setView(v => ({ ...v, k }));
      return;
    }
    const dr = dragRef.current;
    if (dr) setView(v => ({ ...v, x: dr.ox + e.clientX - dr.sx, y: dr.oy + e.clientY - dr.sy }));
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  /* ---------- 弹层状态 ---------- */
  const [hovered, setHovered] = useState<string | null>(null);
  const [drawerCh, setDrawerCh] = useState<number | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [knowledgeOf, setKnowledgeOf] = useState<LevelDef | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [guideStep, setGuideStep] = useState<number>(() =>
    typeof window !== 'undefined' && !safeGetItem(GUIDE_KEY) ? 0 : -1,
  );

  // 存储写失败（隐私模式/配额满）时的一次性警告（safeStorage 只触发一次）
  useEffect(() => {
    setStorageWarnHandler(setToast);
    return () => setStorageWarnHandler(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // URL 直达未解锁关卡被重定向回来时，接住 LevelPlay 带来的提示
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast;
    if (msg) {
      setToast(msg);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(null), 400);
    return () => clearTimeout(t);
  }, [shake]);

  const clickPad = (p: PadPos) => {
    const st = stateOf(p.level);
    if (st === 'locked') {
      setShake(p.level.id);
      setToast('先通关前面的关卡哦');
      return;
    }
    navigate(`/play/${p.level.id}`);
  };

  /* ---------- 状态条打字机 ---------- */
  const statusText = nextLevel
    ? `小焊：下一个是「${nextLevel.title}」——${CHAPTER_META[nextLevel.chapter - 1].laozhou}`
    : '小焊：主线全部通关！去毕业设计台迎接终极挑战吧！';
  const [typed, setTyped] = useState('');
  useEffect(() => {
    setTyped('');
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(statusText.slice(0, i));
      if (i >= statusText.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [statusText]);

  /* ---------- 走线路径 ---------- */
  const tracePath = useMemo(() => {
    if (!pads.length) return '';
    let d = `M ${pads[0].x} ${pads[0].y}`;
    for (let i = 1; i < pads.length; i++) {
      d += ' ' + traceSeg(pads[i - 1].x, pads[i - 1].y, pads[i].x, pads[i].y);
    }
    const last = pads[pads.length - 1];
    d += ' ' + traceSeg(last.x, last.y, GRAD_PAD.x - GRAD_PAD.r - 8, GRAD_PAD.y);
    return d;
  }, [pads]);

  // 已点亮段：到最后一个已完成关卡
  const litPath = useMemo(() => {
    const donePads = pads.filter(p => completed.includes(p.level.id));
    if (!donePads.length) return '';
    const lastDone = donePads[donePads.length - 1];
    let d = `M ${pads[0].x} ${pads[0].y}`;
    for (let i = 1; i < pads.length; i++) {
      d += ' ' + traceSeg(pads[i - 1].x, pads[i - 1].y, pads[i].x, pads[i].y);
      if (pads[i] === lastDone) break;
    }
    return d;
  }, [pads, completed]);

  const hoveredLevel = hovered ? pads.find(p => p.level.id === hovered) : null;
  const drawerMeta = drawerCh ? CHAPTER_META.find(m => m.chapter === drawerCh) : null;

  const guideSteps = [
    { title: '这是你的主板', body: '点亮走线就是通关。30 个关卡焊盘由铜色主走线串联，通关一段，走线就点亮一段。' },
    { title: '点这个焊盘开始', body: '发光的焊盘是你的当前关。点它，进入工作台，接通你的第一条回路。' },
    { title: '卡住了找小焊', body: '每个关卡右侧有 3 级渐进提示，从方向到近乎答案。用提示不丢人，烧板子才丢人。' },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* ===== S1 左侧玩家面板 ===== */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-ink-700 bg-ink-850 p-4">
          {/* 玩家卡 */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="panel rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-12 w-12" />
              <div>
                <div className="text-sm font-bold text-silk-100">{titleForStars(totalStars)}</div>
                <div className="mt-0.5 font-mono text-[11px] text-silk-500">⭐ {totalStars}/{TOTAL_STARS} · ⚡ 通关 {totalCompleted}/{TOTAL_LEVELS}</div>
              </div>
            </div>
            {/* 主线进度条（铜箔开窗） */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-silk-500">
                <span>MAIN LINE</span>
                <span>{Math.round(mainProgress * 100)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm border border-ink-700 bg-ink-900">
                <motion.div
                  className="copper-window h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mainProgress * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          </motion.div>

          {/* 继续征程 */}
          {nextLevel && (
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.07 }} className="panel-raised rounded-lg p-4">
              <SilkTag className="mb-2">NEXT MISSION</SilkTag>
              <div className="text-base font-bold text-silk-100">
                第 {nextLevel.chapter} 章 · {nextLevel.title}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-silk-500">{nextLevel.briefing}</p>
              <motion.div animate={{ boxShadow: ['0 0 4px rgba(63,196,127,0.4)', '0 0 14px rgba(63,196,127,0.8)', '0 0 4px rgba(63,196,127,0.4)'] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.8 }} className="mt-3 rounded-md">
                <PadButton to={`/play/${nextLevel.id}`} variant="primary" size="L" className="w-full">
                  <Play className="h-4 w-4" /> 继续 {nextLevel.id.replace('c', '').replace('-', '-')} 关
                </PadButton>
              </motion.div>
            </motion.div>
          )}

          {/* 支线入口 */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.14 }} className="flex flex-col gap-2">
            {[
              { name: '支线 A · ESP32 单片机入门', open: sideAOpen, cond: '通关主线第 2 章解锁' },
              { name: '支线 B · 进阶信号处理', open: sideBOpen, cond: '通关主线第 5 章解锁' },
            ].map(s => (
              <Link
                key={s.name}
                to={s.open ? '/sidequests' : '#'}
                onClick={e => {
                  if (!s.open) {
                    e.preventDefault();
                    setToast(s.cond);
                  }
                }}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 text-xs transition-colors',
                  s.open
                    ? 'border-sig-blue/50 bg-ink-800 text-silk-100 hover:border-sig-blue'
                    : 'border-ink-700 bg-ink-850 text-silk-700',
                )}
              >
                <span className="flex items-center gap-2">
                  {!s.open && <Lock className="h-3.5 w-3.5" />}
                  {s.name}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </motion.div>

          {/* 沙盒 / 图鉴入口 */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.21 }} className="flex flex-col gap-2">
            <Link to="/sandbox" className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 p-3 text-xs text-silk-300 transition-colors hover:border-pcb-400 hover:text-silk-100">
              <FlaskConical className="h-4 w-4 text-pcb-300" />
              自由沙盒（全部件解锁）
              <span className="ml-auto font-mono text-[10px] text-silk-700">老手向</span>
            </Link>
            <Link to="/codex" className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 p-3 text-xs text-silk-300 transition-colors hover:border-pcb-400 hover:text-silk-100">
              <BookOpen className="h-4 w-4 text-pcb-300" />
              元件图鉴 / 公式速查
            </Link>
          </motion.div>
        </aside>

        {/* ===== S2 章节大地图 ===== */}
        <div
          ref={mapRef}
          className="relative flex-1 cursor-grab select-none overflow-hidden bg-ink-900 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={() => setCtxMenu(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: '0 0' }}
            className="absolute left-6 top-6"
          >
            <svg width={BOARD_W} height={BOARD_H} className="block">
              {/* 主板底色与邮票孔边缘 */}
              <rect x="20" y="80" width={BOARD_W - 40} height={BOARD_H - 120} rx="12" fill="#0A100D" stroke="#1B2E24" strokeWidth="2" />
              {Array.from({ length: 24 }).map((_, i) => (
                <circle key={`t${i}`} cx={60 + i * 60} cy={86} r="4" fill="#13211A" stroke="#26402F" />
              ))}
              {Array.from({ length: 24 }).map((_, i) => (
                <circle key={`b${i}`} cx={60 + i * 60} cy={BOARD_H - 46} r="4" fill="#13211A" stroke="#26402F" />
              ))}
              <text x="40" y="106" fill="#55524A" fontSize="11" fontFamily="JetBrains Mono">MAINBOARD · REV A</text>
              <text x={BOARD_W - 200} y={106} fill="#55524A" fontSize="11" fontFamily="JetBrains Mono">SN 2024-CC-001</text>

              {/* 章节功能区（丝印边框） */}
              {CHAPTER_META.map((meta, zi) => {
                const z = ZONES[zi];
                const Icon = meta.icon;
                return (
                  <g key={meta.chapter}>
                    <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="8" fill="none" stroke="#26402F" strokeWidth="1.5" strokeDasharray="6 4" />
                    <g
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        setDrawerCh(meta.chapter);
                      }}
                    >
                      <rect x={z.x + 12} y={z.y - 14} width={z.w - 24} height="28" rx="6" fill="#0E1611" stroke="#1B2E24" />
                      <foreignObject x={z.x + 20} y={z.y - 12} width={z.w - 40} height="24">
                        <div className="flex h-6 items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-copper-500/60">
                            <Icon className="h-3 w-3 text-copper-400" />
                          </span>
                          <span className="text-xs font-bold text-silk-100">第 {meta.chapter} 章 · {meta.name}</span>
                          <span className="ml-auto font-mono text-[10px] text-silk-700">CH{meta.chapter}</span>
                        </div>
                      </foreignObject>
                    </g>
                    <text x={z.x + 16} y={z.y + z.h - 12} fill="#55524A" fontSize="11" fontFamily="JetBrains Mono" letterSpacing="1">
                      {meta.gag}
                    </text>
                  </g>
                );
              })}

              {/* 主走线（暗淡底层） */}
              <path d={tracePath} fill="none" stroke="#9A5E28" strokeWidth="4" strokeOpacity="0.35" strokeLinejoin="round" />
              {/* 已点亮走线 */}
              {litPath && (
                <motion.path
                  d={litPath}
                  fill="none"
                  stroke="#3FC47F"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(63,196,127,0.55))' }}
                />
              )}

              {/* 支线岔口走线（sig-blue） */}
              {(() => {
                const ch2last = [...pads].reverse().find(p => p.level.chapter === 2);
                const ch5last = [...pads].reverse().find(p => p.level.chapter === 5);
                return (
                  <>
                    {ch2last && (
                      <path
                        d={`M ${ch2last.x} ${ch2last.y} ${traceSeg(ch2last.x, ch2last.y, PORTAL_A.x, PORTAL_A.y)}`}
                        fill="none" stroke="#5B8DEF" strokeWidth="3" strokeOpacity={sideAOpen ? 0.9 : 0.3} strokeLinejoin="round" strokeDasharray={sideAOpen ? '' : '6 5'}
                      />
                    )}
                    {ch5last && (
                      <path
                        d={`M ${ch5last.x} ${ch5last.y} ${traceSeg(ch5last.x, ch5last.y, PORTAL_B.x, PORTAL_B.y)}`}
                        fill="none" stroke="#5B8DEF" strokeWidth="3" strokeOpacity={sideBOpen ? 0.9 : 0.3} strokeLinejoin="round" strokeDasharray={sideBOpen ? '' : '6 5'}
                      />
                    )}
                  </>
                );
              })()}

              {/* 支线传送门焊盘 */}
              {[
                { p: PORTAL_A, label: 'SA', open: sideAOpen, name: '支线 A' },
                { p: PORTAL_B, label: 'SB', open: sideBOpen, name: '支线 B' },
              ].map(({ p, label, open, name }) => (
                <g
                  key={label}
                  className="cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    if (open) navigate('/sidequests');
                    else setToast(name === '支线 A' ? '通关主线第 2 章解锁支线 A' : '通关主线第 5 章解锁支线 B');
                  }}
                >
                  <rect x={p.x - 20} y={p.y - 20} width="40" height="40" rx="6" fill={open ? '#13211A' : '#0E1611'} stroke={open ? '#5B8DEF' : '#1B2E24'} strokeWidth="2" />
                  <text x={p.x} y={p.y + 5} textAnchor="middle" fill={open ? '#5B8DEF' : '#55524A'} fontSize="13" fontWeight="bold" fontFamily="Orbitron">
                    {label}
                  </text>
                  {!open && (
                    <foreignObject x={p.x + 8} y={p.y - 26} width="16" height="16">
                      <Lock className="h-3 w-3 text-silk-700" />
                    </foreignObject>
                  )}
                  <text x={p.x} y={p.y + 36} textAnchor="middle" fill="#55524A" fontSize="10" fontFamily="JetBrains Mono">
                    {name}
                  </text>
                </g>
              ))}

              {/* 毕业设计金焊盘 */}
              <g
                className="cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  if (gradOpen) navigate('/graduation');
                  else setToast('通关第 6 章解锁毕业设计');
                }}
              >
                <circle cx={GRAD_PAD.x} cy={GRAD_PAD.y} r={GRAD_PAD.r + 6} fill="none" stroke="#C9803C" strokeOpacity="0.4" strokeWidth="2" />
                <circle cx={GRAD_PAD.x} cy={GRAD_PAD.y} r={GRAD_PAD.r} fill="url(#gradGold)" stroke="#E0A458" strokeWidth="2" />
                <foreignObject x={GRAD_PAD.x - 14} y={GRAD_PAD.y - 14} width="28" height="28">
                  <GraduationCap className="h-7 w-7 text-ink-950" />
                </foreignObject>
                {!gradOpen && (
                  <text
                    x={GRAD_PAD.x} y={GRAD_PAD.y + 44} textAnchor="middle" fill="#C9803C" fillOpacity="0.6"
                    fontSize="11" fontFamily="JetBrains Mono" transform={`rotate(-45 ${GRAD_PAD.x} ${GRAD_PAD.y + 40})`}
                  >
                    QC PASS
                  </text>
                )}
                <text x={GRAD_PAD.x} y={GRAD_PAD.y + (gradOpen ? 44 : 60)} textAnchor="middle" fill="#8E8976" fontSize="11" fontFamily="JetBrains Mono">
                  毕业设计
                </text>
              </g>

              {/* 关卡焊盘 */}
              {pads.map((p, i) => {
                const st = stateOf(p.level);
                const s = PAD_STYLE[st];
                const starCount = stars[p.level.id] ?? 0;
                return (
                  <motion.g
                    key={p.level.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.03, type: 'spring', stiffness: 300, damping: 18 }}
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    className="cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      clickPad(p);
                    }}
                    onContextMenu={e => {
                      e.preventDefault();
                      if (st === 'done') setCtxMenu({ id: p.level.id, x: e.clientX, y: e.clientY });
                    }}
                    onMouseEnter={() => setHovered(p.level.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* 当前关脉冲环 */}
                    {st === 'current' && (
                      <motion.circle
                        cx={p.x} cy={p.y} r="18" fill="none" stroke="#45DCE8" strokeWidth="2"
                        animate={{ scale: [1, 1.35], opacity: [0.9, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                      />
                    )}
                    {/* 可玩呼吸 */}
                    {st === 'open' && (
                      <motion.circle
                        cx={p.x} cy={p.y} r="16" fill="none" stroke="#2E9E63" strokeWidth="2"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <motion.circle
                      cx={p.x} cy={p.y} r="14"
                      fill={s.fill} stroke={s.ring} strokeWidth="2.5"
                      animate={shake === p.level.id ? { x: [0, -3, 3, -3, 3, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                    {st === 'done' ? (
                      <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill={s.text} fontFamily="JetBrains Mono">
                        {'★'.repeat(Math.max(starCount, 1))}
                      </text>
                    ) : st === 'locked' ? (
                      <foreignObject x={p.x - 6} y={p.y - 6} width="12" height="12">
                        <Lock className="h-3 w-3 text-silk-700" />
                      </foreignObject>
                    ) : (
                      <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill={s.text} fontFamily="JetBrains Mono">
                        {p.level.chapter}-{p.level.index}
                      </text>
                    )}
                  </motion.g>
                );
              })}

              <defs>
                <linearGradient id="gradGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9A5E28" />
                  <stop offset="55%" stopColor="#C9803C" />
                  <stop offset="100%" stopColor="#F0C078" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* 小地图 */}
          <div className="panel absolute right-4 top-4 z-10 rounded-md p-1.5">
            <svg width="120" height="80" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
              <rect x="20" y="80" width={BOARD_W - 40} height={BOARD_H - 120} fill="#0A100D" stroke="#26402F" />
              {ZONES.map((z, i) => (
                <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} fill="none" stroke="#2E9E63" strokeOpacity="0.6" strokeWidth="6" />
              ))}
              {/* 视口框：板坐标 = (容器坐标 - 板偏移 24px - view 平移) / 缩放 */}
              <rect
                x={(-view.x - BOARD_OX) / view.k} y={(-view.y - BOARD_OY) / view.k}
                width={mapSize.w / view.k}
                height={mapSize.h / view.k}
                fill="none" stroke="#45DCE8" strokeWidth="8"
              />
            </svg>
          </div>

          {/* hover tooltip */}
          <AnimatePresence>
            {hoveredLevel && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className="panel-raised pointer-events-none absolute z-20 w-64 rounded-lg p-3"
                style={{ left: Math.min(hoveredLevel.x * view.k + view.x + 30, mapSize.w - 270), top: hoveredLevel.y * view.k + view.y + 20 }}
              >
                <div className="font-mono text-[10px] text-sig-cyan">LV {hoveredLevel.level.id.replace('c', '')}</div>
                <div className="mt-0.5 text-sm font-bold text-silk-100">{hoveredLevel.level.title}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-silk-500">{hoveredLevel.level.briefing}</p>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-silk-500">
                  <span className="text-copper-300">{'★'.repeat(stars[hoveredLevel.level.id] ?? 0) || '未完成'}</span>
                  <span>预计 5–10 分钟</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 右键菜单（已通关） */}
          {ctxMenu && (
            <div className="panel-raised absolute z-30 w-36 rounded-md py-1" style={{ left: ctxMenu.x - 320, top: ctxMenu.y - 80, position: 'fixed' }}>
              <button className="block w-full px-3 py-1.5 text-left text-xs text-silk-300 hover:bg-ink-700" onClick={() => { setCtxMenu(null); navigate(`/play/${ctxMenu.id}`); }}>
                重玩本关
              </button>
              <button className="block w-full px-3 py-1.5 text-left text-xs text-silk-300 hover:bg-ink-700" onClick={() => { const l = pads.find(p => p.level.id === ctxMenu.id)?.level; if (l) setKnowledgeOf(l); setCtxMenu(null); }}>
                查看知识卡
              </button>
            </div>
          )}
        </div>

        {/* ===== S3 章节详情抽屉 ===== */}
        <AnimatePresence>
          {drawerMeta && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="absolute inset-0 z-30 bg-ink-950/60 backdrop-blur-sm"
                onClick={() => setDrawerCh(null)}
              />
              <motion.aside
                initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute right-0 top-0 z-40 flex h-full w-[400px] flex-col gap-4 overflow-y-auto border-l border-ink-700 bg-ink-850 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-copper-500/60 bg-ink-800">
                      <drawerMeta.icon className="h-8 w-8 text-copper-400" />
                    </span>
                    <div>
                      <div className="font-mono text-[10px] text-sig-cyan">CHAPTER {drawerMeta.chapter}</div>
                      <h2 className="text-xl font-black text-silk-100">第 {drawerMeta.chapter} 章 · {drawerMeta.name}</h2>
                    </div>
                  </div>
                  <button onClick={() => setDrawerCh(null)} className="rounded p-1 text-silk-500 hover:bg-ink-700 hover:text-silk-100" aria-label="关闭">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-silk-300">{drawerMeta.intro}</p>
                <div>
                  <SilkTag className="mb-2">本章知识清单</SilkTag>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {drawerMeta.knowledge.map(k => (
                      <li key={k} className="flex items-center gap-2 text-xs text-silk-300">
                        <span className="h-1 w-1 rounded-full bg-pcb-400" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SilkTag className="mb-2">本章关卡</SilkTag>
                  <div className="mt-2 flex flex-col gap-1">
                    {LEVELS.filter(l => l.chapter === drawerMeta.chapter)
                      .sort((a, b) => a.index - b.index)
                      .map((l, i) => {
                        const st = stateOf(l);
                        return (
                          <motion.button
                            key={l.id}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            onClick={() => (st === 'locked' ? setToast('先通关前面的关卡哦') : (setDrawerCh(null), navigate(`/play/${l.id}`)))}
                            className={cn(
                              'flex items-center gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors',
                              st === 'locked' ? 'border-ink-700 text-silk-700' : 'border-ink-600 text-silk-300 hover:border-pcb-400 hover:text-silk-100',
                            )}
                          >
                            <span className="font-mono text-sig-cyan">{l.chapter}-{l.index}</span>
                            <span className="flex-1">{l.title}</span>
                            {st === 'locked' ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : st === 'done' ? (
                              <span className="font-mono text-copper-300">{'★'.repeat(Math.max(stars[l.id] ?? 0, 1))}</span>
                            ) : (
                              <Play className="h-3.5 w-3.5 text-pcb-300" />
                            )}
                          </motion.button>
                        );
                      })}
                  </div>
                </div>
                <blockquote className="mt-auto border-l-2 border-copper-500/60 pl-3 text-xs italic leading-relaxed text-silk-300">
                  「{drawerMeta.laozhou}」<span className="ml-1 font-mono not-italic text-silk-500">— 老周</span>
                </blockquote>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* 知识卡模态（右键查看） */}
        <AnimatePresence>
          {knowledgeOf && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
              onClick={() => setKnowledgeOf(null)}
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} transition={{ duration: 0.28 }}
                className="panel-raised w-[480px] rounded-lg p-6"
                onClick={e => e.stopPropagation()}
              >
                <SilkTag>KNOWLEDGE · {knowledgeOf.id.replace('c', '')}</SilkTag>
                <h3 className="mt-3 text-lg font-bold text-silk-100">{knowledgeOf.knowledge.title}</h3>
                <p className="mt-3 text-sm leading-7 text-silk-300">{knowledgeOf.knowledge.body}</p>
                <div className="mt-4 text-right">
                  <PadButton variant="ghost" size="S" onClick={() => setKnowledgeOf(null)}>关闭</PadButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="panel-raised absolute right-6 top-6 z-50 rounded-md border-l-2 border-l-warn px-4 py-2.5 text-xs text-silk-100"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== S5 首访引导 ===== */}
        <AnimatePresence>
          {guideStep >= 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 z-[60] flex items-center justify-center bg-ink-950/80"
              onClick={() => {
                if (guideStep < guideSteps.length - 1) setGuideStep(guideStep + 1);
                else {
                  safeSetItem(GUIDE_KEY, '1');
                  setGuideStep(-1);
                }
              }}
            >
              <motion.div
                key={guideStep}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="panel-raised w-[380px] rounded-lg p-6 text-center"
              >
                <img src="/npc-xiaohan.png" alt="小焊" className="mx-auto h-16 w-16 rounded-full border-2 border-pcb-400" />
                <h3 className="mt-3 text-lg font-bold text-silk-100">{guideSteps[guideStep].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silk-300">{guideSteps[guideStep].body}</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {guideSteps.map((_, i) => (
                    <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === guideStep ? 'bg-pcb-400' : 'bg-ink-600')} />
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-silk-500">点击任意处继续（{guideStep + 1}/3）</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== S4 底部状态条 ===== */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-ink-700 bg-ink-900 px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <img src="/npc-xiaohan.png" alt="" className="h-5 w-5 rounded-full border border-pcb-400" />
          <span className="truncate text-[11px] text-silk-300">{typed}</span>
        </div>
        <div className="shrink-0 font-mono text-[11px] text-silk-500">
          进度 {totalCompleted}/{TOTAL_LEVELS} · ⭐{totalStars} · 称号：{titleForStars(totalStars)}
        </div>
      </div>
    </div>
  );
}
