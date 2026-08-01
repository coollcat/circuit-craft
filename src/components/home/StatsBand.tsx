// S7 数字带（铜箔开窗条，Framer Motion 数字滚动计数）
import { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';

const STATS = [
  { value: 30, suffix: '', label: '主线关卡' },
  { value: 11, suffix: '', label: '支线关卡' },
  { value: 24, suffix: '+', label: '可仿真元件' },
  { value: 1, suffix: '', label: '块真实可打板的 PCB' },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, target, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: v => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, target, suffix]);

  return (
    <span ref={ref} className="font-display text-[40px] font-extrabold leading-none">
      0{suffix}
    </span>
  );
}

export default function StatsBand() {
  return (
    <section className="relative my-8 border-y-2 border-copper-400">
      <div className="copper-window gerber-grid-fine flex h-[120px] items-center justify-center gap-24">
        {STATS.map(s => (
          <div key={s.label} className="flex items-baseline gap-3 text-ink-950">
            <Counter target={s.value} suffix={s.suffix} />
            <span className="text-xs font-medium uppercase tracking-[0.04em]">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
