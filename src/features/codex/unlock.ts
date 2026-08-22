// 条目解锁判定：未解锁章节的元件显示预告态（防剧透）
import { LEVELS } from '@/content/levels';

/** 主线第 N 章是否全部完成（与 store 中逻辑一致） */
export function isMainChapterDone(completed: string[], chapter: number): boolean {
  const levels = LEVELS.filter(l => l.track === 'main' && l.chapter === chapter);
  return levels.length > 0 && levels.every(l => completed.includes(l.id));
}

/** 条目是否解锁：第 1 章条目始终可见，其余需前一章通关 */
export function isEntryUnlocked(completed: string[], unlockChapter: number): boolean {
  if (unlockChapter <= 1) return true;
  return isMainChapterDone(completed, unlockChapter - 1);
}

/** 已通关到第几章（用于侧栏/统计展示） */
export function maxChapterDone(completed: string[]): number {
  let max = 0;
  for (let ch = 1; ch <= 7; ch++) {
    if (isMainChapterDone(completed, ch)) max = ch;
  }
  return max;
}
