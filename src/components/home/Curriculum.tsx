// S4 学习路线 — 七章长图（GSAP Pin + ScrollTrigger scrub，独立组件树）
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SilkTag from '@/components/SilkTag';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CHAPTERS = [
  { title: '电是什么', count: 4, desc: '电压、电流、电阻，和一颗终于亮起的 LED。' },
  { title: '认识元器件', count: 4, desc: 'R、C、L、二极管、三极管：你的零件盒开箱。' },
  { title: '原理图设计', count: 5, desc: '分压、RC 充放电、滤波——第一次看懂波形。' },
  { title: 'PCB 布局布线', count: 5, desc: '封装、走线、地平面，和强迫症友好的 DRC。' },
  { title: '信号处理', count: 4, desc: '放大、滤波、采样：让传感器说人话。' },
  { title: '无线通信', count: 4, desc: '调制、天线、匹配：把信号扔上天。' },
  { title: '选型实战', count: 4, desc: '读数据手册、挑 LDO、算 BOM——毕业设计前夜。' },
];

const BRANCHES = [
  { label: '支线 A · ESP32 单片机入门' },
  { label: '支线 B · 进阶信号处理' },
];

export default function Curriculum() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.6,
        },
      });
      // 主走线自上而下通电点亮
      tl.fromTo('.curr-lit', { scaleY: 0 }, { scaleY: 1, duration: 7, ease: 'none' }, 0);
      // 章节节点依次弹入 + 卡片滑入
      gsap.utils.toArray<HTMLElement>('.curr-item').forEach((el, i) => {
        const t = 0.15 + i * 0.92;
        tl.fromTo(
          el.querySelector('.curr-pad'),
          { scale: 0.6, opacity: 0.4 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' },
          t,
        ).fromTo(
          el.querySelector('.curr-card'),
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.55 },
          t + 0.08,
        );
      });
      // 支线岔口：蓝色微光分叉
      tl.fromTo(
        '.curr-branch',
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.25 },
        6.6,
      );
      // 解除 Pin 前整段淡出
      tl.to('.curr-inner', { y: -24, opacity: 0, duration: 0.6 }, 7.4);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="curr-inner mx-auto flex h-[calc(100dvh-4rem)] max-w-[1280px] items-center gap-16 px-12">
        {/* 左：固定标题栏 */}
        <div className="w-[360px] shrink-0">
          <SilkTag className="mb-6">CURRICULUM</SilkTag>
          <h2 className="mb-4 mt-6 text-4xl font-bold leading-tight text-silk-100">
            七章，<span className="font-display text-copper-400">三十</span>关
          </h2>
          <p className="text-sm leading-relaxed text-silk-500">
            主线全部免费，顺序解锁。从「电是什么」到「选型实战」，每一章都是一块更硬的板子。
          </p>
          <p className="mt-6 font-mono text-xs text-silk-700">
            MAIN TRACK · 30 LEVELS · FREE
          </p>
        </div>

        {/* 右：竖向主走线 + 章节节点 */}
        <div className="relative flex-1 py-6">
          {/* 走线底（铜）与点亮层（绿） */}
          <div className="absolute bottom-6 left-[23px] top-6 w-[4px] rounded bg-copper-600/60" />
          <div className="curr-lit absolute bottom-6 left-[23px] top-6 w-[4px] origin-top rounded bg-pcb-400 glow-pcb" />

          <div className="flex flex-col gap-3">
            {CHAPTERS.map((c, i) => (
              <div key={c.title} className="curr-item relative flex items-center gap-5">
                {/* 焊盘节点 48px */}
                <div className="curr-pad relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-copper-500 bg-ink-850">
                  <span
                    className="block h-9 w-9 rounded-full"
                    style={{
                      backgroundImage: 'url(/chapter-badges.svg)',
                      backgroundSize: '252px 36px',
                      backgroundPosition: `${-36 * i}px 0`,
                    }}
                  />
                </div>
                {/* 章节卡 */}
                <div className="curr-card panel flex-1 rounded-lg px-5 py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-semibold text-copper-400">
                      CH.{i + 1}
                    </span>
                    <h3 className="text-lg font-bold text-silk-100">{c.title}</h3>
                    <span className="font-mono text-xs text-silk-500">{c.count} 关</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-silk-500">{c.desc}</p>
                </div>
              </div>
            ))}

            {/* 支线岔路口 */}
            <div className="ml-12 mt-1 flex flex-col gap-2 border-l-2 border-dashed border-sig-blue/40 pl-6">
              {BRANCHES.map(b => (
                <div
                  key={b.label}
                  className="curr-branch w-fit rounded border border-sig-blue/50 bg-ink-850 px-4 py-2 font-mono text-xs text-sig-blue"
                  style={{ boxShadow: '0 0 10px rgba(91,141,239,0.25)' }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
