// 账号与云同步 UI 状态（zustand，非持久化；token 由 sync.ts 单独管理 localStorage）
import { create } from 'zustand';

/** guest 游客 / synced 已同步 / syncing 同步中 / offline 离线（网络失败，本地仍在） */
export type SyncStatus = 'guest' | 'synced' | 'syncing' | 'offline';

export interface CloudConflict {
  /** 云端存档原始 payload（JSON 字符串） */
  payload: string;
  /** 云端更新时间（来自服务端，可为 Date / string / number） */
  updatedAt: unknown;
}

export type DialogView = 'auth' | 'conflict';

interface AccountUIState {
  token: string | null;
  username: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  dialogOpen: boolean;
  dialogView: DialogView;
  conflict: CloudConflict | null;
  /** 同步结果的一行提示（显示在下拉/弹窗里） */
  notice: string | null;

  setAuth: (token: string | null, username: string | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
  setLastSyncedAt: (ts: number | null) => void;
  openDialog: (view?: DialogView) => void;
  closeDialog: () => void;
  setConflict: (c: CloudConflict | null) => void;
  setNotice: (n: string | null) => void;
}

export const useAccount = create<AccountUIState>()(set => ({
  token: null,
  username: null,
  syncStatus: 'guest',
  lastSyncedAt: null,
  dialogOpen: false,
  dialogView: 'auth',
  conflict: null,
  notice: null,

  setAuth: (token, username) =>
    set({ token, username, syncStatus: token ? 'synced' : 'guest' }),
  setSyncStatus: syncStatus => set({ syncStatus }),
  setLastSyncedAt: lastSyncedAt => set({ lastSyncedAt }),
  openDialog: (view = 'auth') => set({ dialogOpen: true, dialogView: view, notice: null }),
  closeDialog: () => set({ dialogOpen: false }),
  setConflict: conflict => set({ conflict }),
  setNotice: notice => set({ notice }),
}));
