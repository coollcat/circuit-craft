/* eslint-disable react-refresh/only-export-components */
// DialogueBar 剧情对话条（design.md 6.8）：NPC 头像 + 打字机文本 + 继续
import { useEffect, useRef, useState } from 'react';
import type { DialogueLine, NPCId } from '@/engine/types';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/utils';

export const NPC_META: Record<
  NPCId,
  { name: string; refdes: string; avatar: string; ring: string; glow: string }
> = {
  laozhou: {
    name: '老周',
    refdes: 'U-LAO',
    avatar: '/npc-laozhou.png',
    ring: 'border-copper-400',
    glow: '0 0 10px rgba(224,164,88,0.5)',
  },
  xiaohan: {
    name: '小焊',
    refdes: 'U-HAN',
    avatar: '/npc-xiaohan.png',
    ring: 'border-pcb-400',
    glow: '0 0 10px rgba(63,196,127,0.55)',
  },
  lingong: {
    name: '林工',
    refdes: 'U-LIN',
    avatar: '/npc-lingong.png',
    ring: 'border-sig-blue',
    glow: '0 0 10px rgba(91,141,239,0.5)',
  },
};

export interface DialogueBarProps {
  lines: DialogueLine[];
  /** 全部播完回调 */
  onDone?: () => void;
  className?: string;
}

export default function DialogueBar({ lines, onDone, className }: DialogueBarProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const timer = useRef<number | null>(null);
  const line = lines[lineIdx];
  const done = lineIdx >= lines.length - 1 && chars >= (line?.text.length ?? 0);
  // 设置·动效关闭时：打字机停用，整句瞬时显示
  const motionOn = useProgress(s => s.settings.motion);

  // 打字机：18 字/秒（动效关闭 → 瞬时全文）
  useEffect(() => {
    if (!line) return;
    if (!motionOn) {
      setChars(line.text.length);
      return;
    }
    setChars(0);
    timer.current = window.setInterval(() => {
      setChars(c => {
        if (c >= line.text.length) {
          if (timer.current) window.clearInterval(timer.current);
          return c;
        }
        return c + 1;
      });
    }, 1000 / 18);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [lineIdx, line, motionOn]);

  useEffect(() => {
    setLineIdx(0);
    if (motionOn) setChars(0); // 动效关闭时由上面的效果直接铺满全文，避免先清空
  }, [lines, motionOn]);

  useEffect(() => {
    if (done && lines.length > 0) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!line || lines.length === 0) return null;
  const meta = NPC_META[line.speaker];
  const typing = chars < line.text.length;

  const advance = () => {
    if (typing) {
      setChars(line.text.length); // 点击跳过打字
    } else if (lineIdx < lines.length - 1) {
      setLineIdx(i => i + 1);
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={cn(
          'flex h-8 w-full items-center gap-2 border-t border-ink-700 bg-ink-900/95 px-4 font-mono text-xs text-silk-500',
          className,
        )}
      >
        <span className="text-pcb-300">▲</span> 展开对话 · {meta.name}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex h-24 w-full items-center gap-4 border-t border-ink-700 bg-ink-900/95 px-5 backdrop-blur',
        className,
      )}
    >
      <img
        src={meta.avatar}
        alt={meta.name}
        className={cn('h-14 w-14 shrink-0 rounded-full border-2 object-cover', meta.ring)}
        style={{ boxShadow: meta.glow }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="inline-flex w-fit items-center border border-dashed border-silk-500 px-1.5 font-mono text-[10px] uppercase tracking-wider text-silk-300">
          {meta.refdes} · {meta.name}
        </span>
        <p className="line-clamp-2 text-sm leading-relaxed text-silk-100">
          {line.text.slice(0, chars)}
          {typing && <span className="animate-caret-blink text-pcb-300">▌</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          onClick={advance}
          className="rounded border border-ink-600 bg-ink-800 px-3 py-1 text-xs text-pcb-300 transition-colors hover:border-pcb-400"
        >
          {typing ? '跳过 ▸▸' : lineIdx < lines.length - 1 ? '▼ 继续' : '✓ 完成'}
        </button>
        <button
          onClick={() => setMinimized(true)}
          className="font-mono text-[10px] text-silk-700 hover:text-silk-500"
        >
          最小化 ▼
        </button>
      </div>
    </div>
  );
}
