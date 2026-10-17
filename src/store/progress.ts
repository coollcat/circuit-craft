// 回路工坊 — 进度 Store（路径与 API 冻结）
// zustand + persist，localStorage 键 cc-save-v1
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStateStorage } from '@/lib/safeStorage';
import { LEVELS, SIDE_QUESTS } from '@/content/levels';
import type { LevelDef } from '@/engine/types';

export interface ProgressSettings {
  sound: boolean;
  motion: boolean;
  solderCursor: boolean;
  /** 全站明暗主题：dark=阻焊暗房（默认），light=图纸白 */
  theme: 'dark' | 'light';
}

export interface ProgressState {
  stars: Record<string, number>;
  completed: string[];
  hintsUsed: Record<string, number>;
  settings: ProgressSettings;
  completeLevel: (id: string, stars: number) => void;
  useHint: (levelId: string, tier: number) => void;
  /** 重玩/重置本关时清零该关提示记录：无提示星按「本次尝试」判定，可重新挑战 */
  clearHints: (levelId: string) => void;
  isLevelUnlocked: (id: string) => boolean;
  totalStars: () => number;
  setSettings: (patch: Partial<ProgressSettings>) => void;
  reset: () => void;
}

const ALL: () => LevelDef[] = () => [...LEVELS, ...SIDE_QUESTS];

/** 按轨道内 章节→序号 排序 */
function trackLevels(track: LevelDef['track']): LevelDef[] {
  return ALL()
    .filter(l => l.track === track)
    .sort((a, b) => a.chapter - b.chapter || a.index - b.index);
}

/** 主线第 N 章是否全部完成 */
function mainChapterDone(completed: string[], chapter: number): boolean {
  const levels = LEVELS.filter(l => l.track === 'main' && l.chapter === chapter);
  return levels.length > 0 && levels.every(l => completed.includes(l.id));
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      stars: {},
      completed: [],
      hintsUsed: {},
      settings: { sound: true, motion: true, solderCursor: false, theme: 'dark' },

      completeLevel: (id, stars) =>
        set(state => {
          const completed = state.completed.includes(id)
            ? state.completed
            : [...state.completed, id];
          // 星数语义（P6）：0 星是合法结果（通关但没达成任何星条件），与「未通关」（stars 无此键）必须可区分。
          // 同时防御 NaN / 越界：夹到 0~3 的整数后再取历史最好。
          const gained = Number.isFinite(stars) ? Math.max(0, Math.min(3, Math.round(stars))) : 0;
          const prev = state.stars[id] ?? 0;
          return {
            completed,
            stars: { ...state.stars, [id]: Math.max(prev, gained) },
          };
        }),

      useHint: (levelId, tier) =>
        set(state => ({
          hintsUsed: {
            ...state.hintsUsed,
            [levelId]: Math.max(state.hintsUsed[levelId] ?? 0, tier),
          },
        })),

      clearHints: levelId => {
        if (!(levelId in get().hintsUsed)) return; // 无记录则不触发订阅（避免无意义云同步）
        set(state => {
          const hintsUsed = { ...state.hintsUsed };
          delete hintsUsed[levelId];
          return { hintsUsed };
        });
      },

      isLevelUnlocked: id => {
        const level = ALL().find(l => l.id === id);
        if (!level) return false;
        const { completed } = get();
        // 已通关的关卡永远保持解锁：门槛调整（P5）不得回收历史存档的进度
        if (completed.includes(id)) return true;
        // 支线入口门槛：side-a 需主线第 2 章完成
        if (level.track === 'side-a' && !mainChapterDone(completed, 2)) return false;
        // sa-6（无线第一课）用到第 6 章知识，单独要求第 6 章完成
        if (level.id === 'sa-6' && !mainChapterDone(completed, 6)) return false;
        // side-b 后段（sb-6/7/8）依赖第 6 章无线知识，整条支线统一要求第 6 章完成
        if (level.track === 'side-b' && !mainChapterDone(completed, 6)) return false;
        // 同轨道前一关完成即解锁，首关默认解锁
        const seq = trackLevels(level.track);
        const idx = seq.findIndex(l => l.id === id);
        if (idx <= 0) return true;
        return completed.includes(seq[idx - 1].id);
      },

      totalStars: () =>
        Object.values(get().stars).reduce((sum, n) => sum + n, 0),

      setSettings: patch =>
        set(state => ({ settings: { ...state.settings, ...patch } })),

      reset: () =>
        set({
          stars: {},
          completed: [],
          hintsUsed: {},
          settings: { sound: true, motion: true, solderCursor: false, theme: 'dark' },
        }),
    }),
    { name: 'cc-save-v1', storage: createJSONStorage(safeStateStorage) },
  ),
);

/**
 * 云同步挂钩（账号模块专用，见 src/features/account/sync.ts）：
 * 订阅进度 store 的任意变化，用于防抖自动上传云端；游客态下不会被调用。
 */
export function subscribeProgressCloudSync(listener: () => void): () => void {
  return useProgress.subscribe(listener);
}
