/* eslint-disable react-refresh/only-export-components */
// 编辑器 — 轻量 Toast（右上角滑入，250ms；错误带 danger 竖条）
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastKind = 'info' | 'ok' | 'error';
interface ToastItem { id: number; msg: string; kind: ToastKind }

let nextId = 1;
let pushFn: ((t: ToastItem) => void) | null = null;

export function toast(msg: string, kind: ToastKind = 'info') {
  pushFn?.({ id: nextId++, msg, kind });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    pushFn = t => {
      setItems(list => {
        // 去重：同文案同类型的提示不叠加（「这两个端口已经连上了」连点会叠一屏）
        if (list.some(x => x.msg === t.msg && x.kind === t.kind)) return list;
        // 复制一份到时长不受后续 setState 影响
        return [...list.slice(-3), t];
      });
      const id = window.setTimeout(() => setItems(list => list.filter(x => x.id !== t.id)), 3500);
      timers.current.push(id);
    };
    const pending = timers.current;
    return () => {
      pushFn = null;
      for (const id of pending) window.clearTimeout(id);
      pending.length = 0;
    };
  }, []);
  return (
    // 读屏用户也要能听见短路/过流/仿真错误：role=status + polite 播报
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-20 z-[80] flex w-80 flex-col gap-2"
    >
      <AnimatePresence>
        {items.map(t => (
          <motion.div
            key={t.id}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={
              'panel-raised rounded-lg px-4 py-3 text-sm leading-relaxed text-silk-100 ' +
              (t.kind === 'error' ? 'border-l-[3px] border-l-danger' : t.kind === 'ok' ? 'border-l-[3px] border-l-ok' : 'border-l-[3px] border-l-pcb-400')
            }
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
