// TraceDivider 走线分隔线（design.md 6.5）：2px 铜色走线，中段 45° 折角，两端过孔
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/utils';

export default function TraceDivider({
  className,
  active = true,
}: {
  className?: string;
  /** 滚动到视口 60% 时点亮一次（电流粒子流过） */
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 设置·动效关闭时：直接常亮，不播点亮动画
  const motionOn = useProgress(s => s.settings.motion);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (!motionOn) {
      setLit(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.intersectionRatio >= 0.6 || e.isIntersecting)) {
          setLit(true);
          io.disconnect();
        }
      },
      { threshold: [0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, motionOn]);

  return (
    <div ref={ref} className={cn('relative h-6 w-full', className)} aria-hidden>
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 24">
        {/* 走线主体：中段 45° 折角起伏 */}
        <path
          d="M8 12 L430 12 L448 6 L470 6 L488 12 L512 12 L530 18 L552 18 L570 12 L992 12"
          fill="none"
          stroke={lit ? '#3FC47F' : '#C9803C'}
          strokeWidth="2"
          strokeLinejoin="round"
          className={motionOn ? 'transition-colors duration-700' : undefined}
          style={lit ? { filter: 'drop-shadow(0 0 4px rgba(63,196,127,0.55))' } : undefined}
        />
        {/* 两端过孔 */}
        <circle cx="8" cy="12" r="5" fill="#C9803C" />
        <circle cx="8" cy="12" r="2" fill="#060A08" />
        <circle cx="992" cy="12" r="5" fill="#C9803C" />
        <circle cx="992" cy="12" r="2" fill="#060A08" />
        {/* 电流粒子：点亮时流过一次（动效关闭时不播） */}
        {lit && motionOn && (
          <circle r="3" fill="#6FE3A1">
            <animateMotion
              dur="1.2s"
              repeatCount="1"
              path="M8 12 L430 12 L448 6 L470 6 L488 12 L512 12 L530 18 L552 18 L570 12 L992 12"
            />
          </circle>
        )}
      </svg>
    </div>
  );
}
