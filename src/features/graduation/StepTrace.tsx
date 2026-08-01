// 五步进度走线：过孔节点 + 45° 走线，当前步脉冲，已完成点亮，可回退
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_LABELS } from './store';

export default function StepTrace({
  step,
  maxReached,
  onJump,
  visitor,
}: {
  step: number;
  maxReached: number;
  onJump: (s: number) => void;
  visitor: boolean;
}) {
  return (
    <div className="border-b border-ink-700 bg-ink-900/60">
      <div className="mx-auto flex max-w-[1280px] items-center gap-0 px-6 py-3">
        {STEP_LABELS.map((label, i) => {
          const done = i < step || (visitor && i < step);
          const current = i === step;
          const reachable = i <= maxReached || visitor;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              {/* 过孔节点 */}
              <button
                disabled={!reachable}
                onClick={() => reachable && onJump(i)}
                className={cn(
                  'group relative flex flex-col items-center gap-1.5',
                  reachable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                )}
                title={reachable ? label : `${label}（先完成前面的步骤）`}
              >
                <span
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all',
                    done
                      ? 'border-pcb-400 bg-pcb-600/30 text-pcb-300'
                      : current
                        ? 'border-copper-400 bg-copper-600/20 text-copper-300'
                        : 'border-ink-600 bg-ink-800 text-silk-700',
                  )}
                  style={
                    current
                      ? { animation: 'grad-pulse 1.6s ease-in-out infinite' }
                      : done
                        ? { boxShadow: '0 0 8px rgba(63,196,127,0.55)' }
                        : undefined
                  }
                >
                  {/* 过孔内孔 */}
                  <span
                    className={cn(
                      'absolute inset-[6px] rounded-full border',
                      done ? 'border-pcb-300/60' : current ? 'border-copper-400/60' : 'border-ink-600',
                    )}
                  />
                  <span className="relative">{i + 1}</span>
                  {!reachable && (
                    <Lock className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-ink-900 p-px text-silk-700" />
                  )}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap font-mono text-[10px] tracking-wider',
                    done ? 'text-pcb-300' : current ? 'text-copper-300' : 'text-silk-700',
                  )}
                >
                  {label}
                </span>
              </button>
              {/* 连接走线（45° 折角） */}
              {i < STEP_LABELS.length - 1 && (
                <svg className="mx-2 h-[14px] min-w-8 flex-1" viewBox="0 0 100 14" preserveAspectRatio="none">
                  <path
                    d="M0 10 L40 10 L50 4 L60 4 L70 10 L100 10"
                    fill="none"
                    stroke={i < step ? '#3FC47F' : '#26402F'}
                    strokeWidth="2"
                  />
                  {i < step && (
                    <motion.circle
                      r="2.5"
                      fill="#6FE3A1"
                      initial={{ offsetDistance: '0%' }}
                      animate={{ offsetDistance: '100%' }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      style={{
                        offsetPath: "path('M0 10 L40 10 L50 4 L60 4 L70 10 L100 10')",
                      } as React.CSSProperties}
                    />
                  )}
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes grad-pulse { 0%,100% { box-shadow: 0 0 4px rgba(224,164,88,0.4);} 50% { box-shadow: 0 0 14px rgba(224,164,88,0.9);} }`}</style>
    </div>
  );
}
