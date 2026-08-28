// S1 Hero —「一块会呼吸的电路板」（GSAP 滚动叙事 + Canvas 电流粒子，独立组件树）
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SilkTag from '@/components/SilkTag';
import PadButton from '@/components/PadButton';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** 字符切分（保持 React key 稳定） */
function chars(text: string, cls?: string) {
  return Array.from(text).map((c, i) => (
    <span key={`${c}-${i}`} className={`hero-char inline-block ${cls ?? ''}`}>
      {c === ' ' ? '\u00A0' : c}
    </span>
  ));
}

/** 6 条 45° 折线走线路径（百分比坐标，从屏左焊盘到屏右芯片位） */
const TRACE_PATHS: [number, number][][] = [
  [[-2, 18], [22, 18], [30, 26], [58, 26], [66, 34], [102, 34]],
  [[-2, 38], [14, 38], [22, 46], [48, 46], [56, 54], [80, 54], [88, 62], [102, 62]],
  [[-2, 58], [26, 58], [34, 66], [70, 66], [78, 74], [102, 74]],
  [[-2, 76], [10, 76], [18, 84], [44, 84], [52, 92], [102, 92]],
  [[-2, 8], [40, 8], [48, 16], [86, 16], [94, 24], [102, 24]],
  [[-2, 90], [30, 90], [38, 82], [64, 82], [72, 74], [102, 74]],
];

interface Particle {
  path: number;
  t: number; // 路径进度 0..1
  speed: number; // px/s
  ox: number; // 磁性偏移
  oy: number;
}

function CurrentParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // 预计算路径（px + 累计长度）
    type Seg = { x: number; y: number }[];
    let paths: { pts: Seg; cum: number[]; total: number }[] = [];
    const buildPaths = () => {
      paths = TRACE_PATHS.map(raw => {
        const pts = raw.map(([px, py]) => ({ x: (px / 100) * w, y: (py / 100) * h }));
        const cum = [0];
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i].x - pts[i - 1].x;
          const dy = pts[i].y - pts[i - 1].y;
          cum.push(cum[i - 1] + Math.hypot(dx, dy));
        }
        return { pts, cum, total: cum[cum.length - 1] };
      });
    };
    buildPaths();

    const pointAt = (p: (typeof paths)[number], t: number) => {
      const d = t * p.total;
      let i = 1;
      while (i < p.cum.length - 1 && p.cum[i] < d) i++;
      const d0 = p.cum[i - 1];
      const d1 = p.cum[i];
      const f = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
      return {
        x: p.pts[i - 1].x + (p.pts[i].x - p.pts[i - 1].x) * f,
        y: p.pts[i - 1].y + (p.pts[i].y - p.pts[i - 1].y) * f,
      };
    };

    const spawn = (): Particle => ({
      path: Math.floor(Math.random() * paths.length),
      t: 0,
      speed: 60 + Math.random() * 80, // 60–140 px/s
      ox: 0,
      oy: 0,
    });
    const particles: Particle[] = Array.from({ length: 36 }, () => {
      const p = spawn();
      p.t = Math.random();
      return p;
    });

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    let last = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (!reduced) {
        for (const p of particles) {
          const path = paths[p.path];
          p.t += (p.speed * dt) / path.total;
          if (p.t >= 1) Object.assign(p, spawn());
          const pos = pointAt(path, p.t);
          // 鼠标磁吸：120px 内轻微吸引（系数 0.15）
          const dx = mouse.x - pos.x;
          const dy = mouse.y - pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0.01) {
            p.ox += (dx / dist) * 0.15 * 60 * dt;
            p.oy += (dy / dist) * 0.15 * 60 * dt;
          }
          p.ox *= 0.92;
          p.oy *= 0.92;
          const x = pos.x + p.ox;
          const y = pos.y + p.oy;
          ctx.beginPath();
          ctx.fillStyle = '#6FE3A1';
          ctx.shadowColor = 'rgba(111,227,161,0.8)';
          ctx.shadowBlur = 8;
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-particles pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', zIndex: 2 }}
    />
  );
}

export default function HeroSection({ onWatchDemo }: { onWatchDemo: () => void }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      // 背景图 scale 1.06 → 1
      tl.fromTo('.hero-bg', { scale: 1.06 }, { scale: 1, duration: 1.6 }, 0);
      // 主标题字符级入场
      tl.fromTo(
        '.hero-char',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.035 },
        0.15,
      );
      // LED / PCB 发光淡入（延迟 0.9s）
      tl.fromTo('.hero-glow-word', { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0.9);
      // 副标题与 CTA
      tl.fromTo(
        '.hero-fade',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        1.1,
      );

      // 滚动：背景视差 +8% / scale→1.04；粒子层滚过 50% 后淡出
      gsap.to('.hero-bg', {
        yPercent: 8,
        scale: 1.04,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-particles', {
        opacity: 0,
        duration: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '50% top',
          scrub: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative flex h-[calc(100dvh-4rem)] min-h-[560px] items-center overflow-hidden"
    >
      {/* 底层 hero-pcb.png + 暗化遮罩 */}
      <div className="hero-bg absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src="/hero-pcb.png"
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,10,8,.72), rgba(6,10,8,.55) 45%, #060A08 100%)',
          }}
        />
      </div>

      <CurrentParticles />

      {/* 内容（Hero 底图恒为暗色照片，主题变量在此钉回暗色值，避免浅色主题下深字压深图） */}
      <div
        className="relative ml-[8vw] max-w-[760px]"
        style={{
          zIndex: 3,
          '--cc-silk-100': '242 239 227',
          '--cc-silk-300': '207 201 180',
          '--cc-silk-500': '142 137 118',
          '--cc-copper-400': '224 164 88',
        } as React.CSSProperties}
      >
        <div className="hero-fade mb-6">
          <SilkTag>GAMIFIED PCB LEARNING · 准物理仿真</SilkTag>
        </div>
        <h1 className="mb-6 text-[64px] font-black leading-[72px] tracking-[-0.02em] text-silk-100">
          <span className="block">
            {chars('从点亮一颗 ')}
            <span className="hero-glow-word font-display text-copper-400 text-glow-copper">
              {chars('LED')}
            </span>
          </span>
          <span className="block">{chars('到打出你的第一块')}</span>
          <span className="block">
            <span className="hero-glow-word font-display text-copper-400 text-glow-copper">
              {chars('PCB')}
            </span>
            {chars('。')}
          </span>
        </h1>
        <p className="hero-fade mb-8 max-w-[640px] text-lg leading-relaxed text-silk-300">
          闯关式电路设计小游戏。在这里，电流就像水管里的水：电压是水压，电阻是水管的粗细——拖一拖、连一连，小灯真的会亮。一路闯到毕业设计，还能照着教程去嘉立创打一块真电路板。小学生能上手，老硬件也能复习出新东西。
        </p>
        <div className="hero-fade mb-10 flex items-center gap-4">
          <PadButton to="/play/c1-1" variant="primary" size="L">
            ▶ 开始第 1 关：让灯亮起来
          </PadButton>
          <PadButton variant="ghost" size="L" onClick={onWatchDemo}>
            先看 90 秒玩法
          </PadButton>
        </div>
        <p className="hero-fade font-mono text-[13px] text-silk-500">
          30 主线关卡 · 2 条支线 · 1 块真实可打板的毕业设计 · 免费 · 无需注册
        </p>
      </div>
    </section>
  );
}
