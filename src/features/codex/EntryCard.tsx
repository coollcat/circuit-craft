// 条目卡片（网格视图）：解锁状态随主线进度，未解锁显示「在第 X 章遇见它」预告态
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { CodexEntry } from './data/entries';
import { ComponentSymbol } from './symbols';
import { cn } from '@/lib/utils';

export default function EntryCard({
  entry,
  unlocked,
  onOpen,
  index,
}: {
  entry: CodexEntry;
  unlocked: boolean;
  onOpen: (id: string) => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.04 }}
      onClick={() => onOpen(entry.id)}
      className={cn(
        'group panel relative flex h-[180px] w-full flex-col items-center justify-between overflow-hidden rounded-lg p-4 text-left transition-all duration-200',
        'hover:-translate-y-1 hover:border-ink-600 hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
        !unlocked && 'opacity-70',
      )}
    >
      {/* 剧透锁定角标 */}
      {!unlocked && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded border border-silk-700 px-1.5 py-0.5 font-mono text-[10px] text-silk-500">
          <Lock className="h-3 w-3" />
          第 {entry.unlockChapter} 章
        </span>
      )}

      <div
        className={cn(
          'w-full max-w-[150px] flex-1 transition-all duration-200',
          unlocked ? 'text-silk-100 group-hover:drop-shadow-[0_0_6px_rgba(63,196,127,0.6)]' : 'text-silk-700 grayscale',
        )}
      >
        <ComponentSymbol id={entry.id} className="h-full w-full" />
      </div>

      <div className="w-full text-center">
        <div className={cn('text-base font-bold', unlocked ? 'text-silk-100' : 'text-silk-500')}>
          {entry.name}
          <span className="ml-2 font-mono text-xs font-normal text-sig-cyan">{entry.refdes}</span>
        </div>
        {unlocked ? (
          <div className="mt-0.5 text-xs text-silk-300">{entry.tagline}</div>
        ) : (
          <div className="mt-0.5 text-xs text-silk-500">在第 {entry.unlockChapter} 章遇见它</div>
        )}
      </div>

      {/* hover 底部参数行 */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-ink-900/90 px-3 py-1 font-mono text-[11px] text-sig-cyan transition-transform duration-200 group-hover:translate-y-0">
        {unlocked
          ? `${entry.en} · ${entry.params[0]?.unit ?? ''} · ${entry.usedIn.length} 处关卡引用`
          : `剧透警告：点击仍可偷看`}
      </div>
    </motion.button>
  );
}
