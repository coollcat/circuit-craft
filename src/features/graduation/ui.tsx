/* eslint-disable react-refresh/only-export-components */
// 毕业设计共享 UI：签核章 / Toast / 老周批注卡 / 步骤面板
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------- 签核章 SealStamp ---------------- */
export function SealStamp({
  text,
  sub,
  show,
  tone = 'red',
  className,
}: {
  text: string;
  sub?: string;
  show: boolean;
  tone?: 'red' | 'green' | 'copper';
  className?: string;
}) {
  const color = tone === 'red' ? '#E04040' : tone === 'green' ? '#2E9E63' : '#C9803C';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          className={cn('pointer-events-none select-none', className)}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        >
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r="60" fill="none" stroke={color} strokeWidth="4" opacity="0.92" />
            <circle cx="66" cy="66" r="50" fill="none" stroke={color} strokeWidth="1.5" opacity="0.75" />
            {/* 五角星 */}
            <path
              d="M66 30 l4.7 9.5 10.5 1.5 -7.6 7.4 1.8 10.4 -9.4 -4.9 -9.4 4.9 1.8 -10.4 -7.6 -7.4 10.5 -1.5 z"
              fill={color}
              opacity="0.9"
            />
            <text
              x="66"
              y="86"
              textAnchor="middle"
              fill={color}
              fontSize="17"
              fontWeight="900"
              fontFamily='"Noto Sans SC",sans-serif'
            >
              {text}
            </text>
            {sub && (
              <text
                x="66"
                y="103"
                textAnchor="middle"
                fill={color}
                fontSize="9"
                fontFamily='"JetBrains Mono",monospace'
                letterSpacing="1"
              >
                {sub}
              </text>
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Toast ---------------- */
export interface ToastMsg {
  id: number;
  kind: 'ok' | 'warn' | 'danger' | 'info';
  text: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: ToastMsg['kind'], text: string) => {
    const id = ++idRef.current;
    setToasts(t => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: ToastMsg[] }) {
  const icon = {
    ok: <CheckCircle2 className="h-4 w-4 text-ok" />,
    warn: <AlertTriangle className="h-4 w-4 text-warn" />,
    danger: <XCircle className="h-4 w-4 text-danger" />,
    info: <Info className="h-4 w-4 text-sig-cyan" />,
  };
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[80] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'panel-raised flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm text-silk-100',
              t.kind === 'danger' && 'border-l-[3px] border-l-danger',
              t.kind === 'warn' && 'border-l-[3px] border-l-warn',
            )}
          >
            <span className="mt-0.5 shrink-0">{icon[t.kind]}</span>
            <span className="leading-snug">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- 老周批注（红笔手写风） ---------------- */
export function LaoZhouNote({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mt-3 rounded-md border border-danger/50 bg-danger/10 p-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-danger">
          ✎ 老周批注 · REVIEW NOTE
        </span>
        {onClose && (
          <button onClick={onClose} className="text-xs text-silk-500 hover:text-silk-100">
            知道了 ✕
          </button>
        )}
      </div>
      {/* 红笔字色走主题令牌：亮色主题下不再是「近黑块 + 浅红字」的失配 */}
      <p className="text-sm leading-relaxed text-danger" style={{ fontFamily: '"Noto Sans SC",sans-serif' }}>
        {children}
      </p>
    </motion.div>
  );
}

/* ---------------- 步骤工作区容器 ---------------- */
export function StepPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mx-auto w-full max-w-[1280px] px-6 py-6', className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- 简易数字滚动 ---------------- */
export function RollingNumber({ value, prefix = '¥', digits = 2 }: { value: number; prefix?: string; digits?: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const from = display;
    const start = performance.now();
    const dur = 400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="font-mono tabular-nums">
      {prefix}
      {display.toFixed(digits)}
    </span>
  );
}
