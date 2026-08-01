/* eslint-disable react-refresh/only-export-components */
// STEP 6 毕业证书：cert-bg.svg 底 + 称号 + 印章 + PNG 导出 + 现实联动
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImageDown, Home, FlaskConical, Lock } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { titleForStars } from '@/components/Navbar';
import { useProgress } from '@/store/progress';
import { SealStamp } from './ui';
import { useGrad } from './store';
import type { DialogueLine } from '@/engine/types';

export const STEP6_LINES: DialogueLine[] = [
  { speaker: 'laozhou', text: '签核全齐、DRC 零违规、订单已下。小子，从今天起你就是「首席打板人」。' },
  { speaker: 'xiaohan', text: '呜哇——铜屑礼花！这块板子要是真投产，记得第一片送我！' },
  { speaker: 'lingong', text: '做得漂亮。下一单，我说话算话。——记得去真实打板，这不是玩具。' },
];

/** 铜屑粒子（3s，≤30 粒） */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const parts = Array.from({ length: 30 }, () => ({
      x: Math.random() * cv.width,
      y: -20 - Math.random() * cv.height * 0.5,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.5 + Math.random() * 2.5,
      s: 3 + Math.random() * 4,
      c: ['#C9803C', '#E0A458', '#F0C078', '#3FC47F'][Math.floor(Math.random() * 4)],
      r: Math.random() * Math.PI,
    }));
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const el = t - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.05;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - el / 3000);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (el < 3000) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }} />;
}

export default function Certificate({ visitor }: { visitor: boolean }) {
  const grad = useGrad();
  const set = useGrad(s => s.set);
  const totalStars = useProgress(s => s.totalStars)();
  const [saving, setSaving] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const title = grad.orderPlaced ? '首席打板人' : titleForStars(totalStars);
  const certNo = useMemo(() => `CC-GRAD-2024-${String(Math.floor(1000 + Math.random() * 8999))}`, []);
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const minutes = Math.max(1, Math.round(((grad.finishedAt ?? Date.now()) - grad.startedAt) / 60000));

  useEffect(() => {
    if (!visitor && grad.orderPlaced && !grad.finishedAt) {
      set({ finishedAt: Date.now(), step: 5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Canvas 合成证书 PNG 并下载 */
  const exportPng = async () => {
    setSaving(true);
    try {
      const W = 1600;
      const H = 1131;
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#0A100D';
      ctx.fillRect(0, 0, W, H);
      const img = new Image();
      img.src = '/cert-bg.svg';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      ctx.drawImage(img, 0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F2EFE3';
      ctx.font = '900 72px "Noto Sans SC",sans-serif';
      ctx.fillText('硬件工程师 · 结业证明', W / 2, 340);
      ctx.font = '400 34px "Noto Sans SC",sans-serif';
      ctx.fillStyle = '#CFC9B4';
      ctx.fillText(`兹证明「${title}」完成《回路工坊》全部主线课程`, W / 2, 470);
      ctx.fillText(`独立设计 ESP32 最小系统板一块 · DRC 零违规 · BOM 成本 ¥${grad.bomCost.toFixed(2)}`, W / 2, 530);
      ctx.font = '700 30px "JetBrains Mono",monospace';
      ctx.fillStyle = '#E0A458';
      ctx.fillText(certNo, W / 2, 660);
      ctx.font = '400 26px "Noto Sans SC",sans-serif';
      ctx.fillStyle = '#8E8976';
      ctx.fillText(`${today} · 回路工坊 CircuitCraft`, W / 2, 720);
      if (grad.used0402) {
        ctx.fillStyle = '#FFB020';
        ctx.font = '700 26px "Noto Sans SC",sans-serif';
        ctx.fillText('★ 地狱手焊者（坚持 0402 封装）', W / 2, 790);
      }
      if (grad.extremeSaver) {
        ctx.fillStyle = '#F0C078';
        ctx.font = '700 26px "Noto Sans SC",sans-serif';
        ctx.fillText(`★ 极限降本大师（BOM ≤ ¥22）`, W / 2, grad.used0402 ? 830 : 790);
      }
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `回路工坊毕业证书-${certNo}.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  };

  if (visitor) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
        <Lock className="h-10 w-10 text-silk-700" />
        <h2 className="text-2xl font-black text-silk-100">毕业证书 · 游客模式不可签发</h2>
        <p className="text-sm leading-relaxed text-silk-300">
          证书需要三枚真实签核章（原理图 / BOM / DRC / 下单），游客模式仅供参观。
          通关主线前 6 章后回来，把属于你的「首席打板人」证书领走。
        </p>
        <PadButton variant="copper" size="L" to="/chapters">
          去章节地图闯关 →
        </PadButton>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-6 py-6">
      <Confetti />
      <SilkTag>FINALE / 毕业证书 GRADUATION CERTIFICATE</SilkTag>

      {/* 证书本体 */}
      <motion.div
        ref={certRef}
        initial={{ y: 80, opacity: 0, rotateX: 10 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[720px] max-w-full"
        style={{ perspective: 800 }}
      >
        <img src="/cert-bg.svg" alt="证书边框" className="w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-copper-400">
            CircuitCraft Graduation
          </p>
          <h1 className="text-4xl font-black text-silk-100">硬件工程师 · 结业证明</h1>
          <p className="mt-2 text-sm leading-relaxed text-silk-300">
            兹证明 <span className="text-xl font-black text-copper-300">{title}</span>
            <br />
            完成《回路工坊》全部主线课程，独立设计 ESP32 最小系统板一块，
            <br />
            DRC 零违规 · BOM 成本 <span className="font-mono text-pcb-300">¥{grad.bomCost.toFixed(2)}</span> ·
            已下打样订单 <span className="font-mono text-sig-cyan">{grad.orderNo ?? '—'}</span>
          </p>
          <p className="font-mono text-xs text-silk-500">
            {certNo} · {today}
          </p>
          {/* 彩蛋绶带 */}
          {(grad.used0402 || grad.extremeSaver) && (
            <motion.div
              initial={{ x: 200, opacity: 0, rotate: 12 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 1.6, type: 'spring', stiffness: 120 }}
              className="flex gap-2"
            >
              {grad.used0402 && (
                <span className="rounded-sm bg-warn/20 px-2 py-0.5 font-mono text-[10px] text-warn">★ 地狱手焊者 · 0402</span>
              )}
              {grad.extremeSaver && (
                <span className="rounded-sm bg-copper-500/20 px-2 py-0.5 font-mono text-[10px] text-copper-300">★ 极限降本 ≤¥22</span>
              )}
            </motion.div>
          )}
        </div>
        {/* 三印章依次盖入 */}
        <div className="absolute bottom-10 left-12">
          <SealStamp text="原理图签核" sub="SCH SIGN-OFF" show tone="red" />
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <SealStamp text="DRC Clean" sub="ZERO VIOLATIONS" show tone="green" />
          </motion.div>
        </div>
        <div className="absolute bottom-10 right-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <SealStamp text="已下单" sub={grad.orderNo ?? 'ORDER'} show tone="copper" />
          </motion.div>
        </div>
      </motion.div>

      {/* 数据回顾 */}
      <div className="panel grid w-[720px] max-w-full grid-cols-4 gap-3 rounded-lg p-4 text-center">
        {[
          ['总星数', `${totalStars} ⭐`],
          ['毕业用时', `${minutes} 分钟`],
          ['BOM 单片成本', `¥${grad.bomCost.toFixed(2)}`],
          ['5 片打样实付', `¥${grad.orderPrice.toFixed(2)}`],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-silk-500">{k}</p>
            <p className="mt-1 font-mono text-lg font-bold text-silk-100">{v}</p>
          </div>
        ))}
      </div>

      {/* 按钮组 */}
      <div className="flex flex-wrap justify-center gap-3">
        <PadButton variant="copper" size="L" onClick={exportPng} disabled={saving}>
          <ImageDown className="h-4 w-4" /> {saving ? '绘制中…' : '保存证书图片 PNG'}
        </PadButton>
        <PadButton variant="ghost" size="M" to="/">
          <Home className="h-4 w-4" /> 回到首页
        </PadButton>
        <PadButton variant="ghost" size="M" to="/sandbox">
          <FlaskConical className="h-4 w-4" /> 进入自由沙盒（ESP32 模组已解锁）
        </PadButton>
      </div>

      <p className="max-w-2xl text-center font-mono text-[11px] leading-relaxed text-silk-500">
        现实联动：这张证书背后是一套真实可投产的流程——Gerber 文件已在 STEP 4 真实导出。
        去嘉立创注册账号，上传 zip，3–5 天后你会收到一块真的能跑的板子。这不是玩具。
      </p>
    </div>
  );
}
