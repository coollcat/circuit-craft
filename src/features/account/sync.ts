// 云存档同步引擎（非 React 模块）
// - token 存 localStorage「cc-account-token」，用户名存「cc-account-username」（仅显示用）
// - payload = 打包 cc-save-v1 / cc-graduation-v1 / cc-sandbox-1..5 / cc-sandbox-challenges 为单个 JSON
//   （设置存于 cc-save-v1 的 settings 字段内，无独立 cc-settings 键）
// - 所有网络调用 try/catch 静默降级：任何失败都不影响本地游玩，仅反映到同步状态
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../api/router';
import { useProgress, subscribeProgressCloudSync } from '@/store/progress';
import { useGrad } from '@/features/graduation/store';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/lib/safeStorage';
import { useAccount } from './store';

const TOKEN_KEY = 'cc-account-token';
const NAME_KEY = 'cc-account-username';

/** 参与云同步打包的 localStorage 键（键存在才打包）
 *  - cc-save-v1：zustand persist，含星数/完成关卡/提示/设置（settings 字段）
 *  - cc-graduation-v1：毕业设计向导状态
 *  - cc-sandbox-challenges：沙盒老手挑战完成记录（用户进度，需跨设备同步）
 */
const FIXED_KEYS = ['cc-save-v1', 'cc-graduation-v1', 'cc-sandbox-challenges'] as const;
const SANDBOX_KEYS = [1, 2, 3, 4, 5].map(i => `cc-sandbox-${i}`);

const DEBOUNCE_MS = 5000;

/** 独立 vanilla tRPC 客户端（React 组件内仍走 @/providers/trpc 的 hooks） */
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: 'include' });
      },
    }),
  ],
});

/* ---------------- 凭据读写 ---------------- */

export function getToken(): string | null {
  // safeGetItem：存储被禁用时回落内存副本，会话内登录态仍可用
  return safeGetItem(TOKEN_KEY);
}

export function saveCredentials(token: string, username: string) {
  // 写失败自动降级内存（仅本次会话持有登录态），safeStorage 单次警告
  safeSetItem(TOKEN_KEY, token);
  safeSetItem(NAME_KEY, username);
  useAccount.getState().setAuth(token, username);
}

function clearCredentials() {
  safeRemoveItem(TOKEN_KEY);
  safeRemoveItem(NAME_KEY);
  useAccount.getState().setAuth(null, null);
}

/* ---------------- 存档打包 / 解包（容错：键缺失、JSON 损坏均不崩） ---------------- */

export function packLocalSave(): string {
  const bag: Record<string, string> = {};
  const keys = [...FIXED_KEYS, ...SANDBOX_KEYS];
  for (const key of keys) {
    // safeGetItem 自带容错（读取失败回落内存副本），单键异常不影响其它键
    const raw = safeGetItem(key);
    if (raw != null) bag[key] = raw;
  }
  try {
    return JSON.stringify(bag);
  } catch {
    return '{}';
  }
}

/** 两个 payload 是否等价（按打包后的对象逐键比较，容忍键序差异） */
function payloadsEqual(a: string, b: string): boolean {
  try {
    const oa = JSON.parse(a) as Record<string, unknown>;
    const ob = JSON.parse(b) as Record<string, unknown>;
    const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
    for (const k of keys) {
      if (oa[k] !== ob[k]) return false;
    }
    return true;
  } catch {
    return a === b;
  }
}

/** 标记正在应用云端存档，避免随后的 store 变化立刻触发回传 */
let applyingRemote = false;

export function applySavePayload(payload: string): boolean {
  let bag: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    bag = parsed as Record<string, unknown>;
  } catch {
    return false; // 云端 JSON 损坏，不动本地
  }
  applyingRemote = true;
  try {
    const keys = [...FIXED_KEYS, ...SANDBOX_KEYS];
    for (const key of keys) {
      const v = bag[key];
      if (typeof v === 'string') {
        // 写失败降级内存，云端存档本会话内仍生效，只是不持久化
        safeSetItem(key, v);
      }
    }
    // 让 zustand persist store 重新读取 localStorage
    try {
      void useProgress.persist.rehydrate();
    } catch {
      /* ignore */
    }
    try {
      void useGrad.persist.rehydrate();
    } catch {
      /* ignore */
    }
    return true;
  } finally {
    // rehydrate 可能触发订阅，稍晚再放开推送
    window.setTimeout(() => {
      applyingRemote = false;
    }, 100);
  }
}

/* ---------------- 推送 / 拉取 ---------------- */

let debounceTimer: number | null = null;
let pushing = false;
let pendingPush = false;

export async function pushLocalNow(): Promise<void> {
  const token = getToken();
  if (!token) return;
  if (pushing) {
    pendingPush = true;
    return;
  }
  pushing = true;
  const { setSyncStatus, setLastSyncedAt, setNotice } = useAccount.getState();
  setSyncStatus('syncing');
  try {
    const res = await client.save.store.mutate({ token, payload: packLocalSave() });
    if (res.ok) {
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
      setNotice(null);
    } else {
      setSyncStatus('offline');
    }
  } catch (e) {
    setSyncStatus('offline');
    // 会话失效时给出可操作的提示（不清 token，网络恢复后仍可重试）
    if (e instanceof Error && e.message.includes('失效')) {
      setNotice('登录状态已失效，请重新登录');
    }
  } finally {
    pushing = false;
    if (pendingPush) {
      pendingPush = false;
      schedulePush();
    }
  }
}

/** 防抖推送：进度 / 毕业设计 / 沙盒任意写入后 5s 自动上传 */
export function schedulePush(): void {
  if (!getToken() || applyingRemote) return;
  if (debounceTimer != null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void pushLocalNow();
  }, DEBOUNCE_MS);
}

/** 是否还有未上传云端的本地更改（防抖窗口内或有待补推） */
export function hasUnsyncedChanges(): boolean {
  return getToken() != null && (debounceTimer != null || pendingPush);
}

/**
 * 页面隐藏 / 卸载兜底：防抖窗口内若有关窗动作，立即发起推送（尽力而为）。
 * 直接同步发起 mutation（fetch 立即派出），不阻塞卸载流程；
 * 浏览器对卸载期请求不保证送达，属尽力而为的兜底，正常路径仍是 5s 防抖推送。
 */
export function flushPendingPush(): void {
  if (debounceTimer == null) return;
  window.clearTimeout(debounceTimer);
  debounceTimer = null;
  if (!getToken() || applyingRemote) return;
  void pushLocalNow();
}

interface CloudSave {
  payload: string;
  updatedAt: unknown;
}

async function loadCloudSave(token: string): Promise<CloudSave | null> {
  const res = await client.save.load.query({ token });
  if (!res || typeof res.payload !== 'string') return null;
  return { payload: res.payload, updatedAt: res.updatedAt };
}

/* ---------------- 登录后同步流程 ---------------- */

/**
 * 登录 / 注册成功后调用：拉取云端存档。
 * - 云端无存档 → 自动把本地推上去
 * - 云端有且与本地不同 → 弹冲突对话框让用户选
 * - 一致 → 直接标记已同步
 */
export async function syncAfterAuth(): Promise<void> {
  const token = getToken();
  if (!token) return;
  const acc = useAccount.getState();
  acc.setSyncStatus('syncing');
  try {
    const cloud = await loadCloudSave(token);
    if (!cloud) {
      await pushLocalNow();
      return;
    }
    if (payloadsEqual(cloud.payload, packLocalSave())) {
      acc.setSyncStatus('synced');
      acc.setLastSyncedAt(Date.now());
      acc.setConflict(null);
      return;
    }
    // 冲突：交给用户抉择
    acc.setSyncStatus('synced');
    acc.setConflict({ payload: cloud.payload, updatedAt: cloud.updatedAt });
    acc.openDialog('conflict');
  } catch {
    acc.setSyncStatus('offline');
  }
}

/** 冲突抉择：cloud = 用云端覆盖本地；local = 把本地上传到云端 */
export async function resolveConflict(choice: 'cloud' | 'local'): Promise<void> {
  const acc = useAccount.getState();
  const conflict = acc.conflict;
  acc.setConflict(null);
  if (choice === 'cloud') {
    if (conflict && applySavePayload(conflict.payload)) {
      acc.setSyncStatus('synced');
      acc.setLastSyncedAt(Date.now());
      acc.setNotice('已用云端存档覆盖本地');
    } else {
      acc.setNotice('云端存档读取失败，已保留本地进度');
    }
  } else {
    await pushLocalNow();
  }
}

/** 下拉菜单「从云端恢复」：有云端存档则进入冲突确认，没有则提示 */
export async function restoreFromCloud(): Promise<void> {
  const token = getToken();
  if (!token) return;
  const acc = useAccount.getState();
  acc.setSyncStatus('syncing');
  try {
    const cloud = await loadCloudSave(token);
    acc.setSyncStatus('synced');
    if (!cloud) {
      acc.setNotice('云端还没有存档，先玩一会儿自动同步吧');
      return;
    }
    if (payloadsEqual(cloud.payload, packLocalSave())) {
      acc.setNotice('云端与本地一致，无需恢复');
      return;
    }
    acc.setConflict({ payload: cloud.payload, updatedAt: cloud.updatedAt });
    acc.openDialog('conflict');
  } catch {
    acc.setSyncStatus('offline');
    acc.setNotice('网络开小差了，稍后再试');
  }
}

/** 退出登录：仅断开 token，不清任何本地数据 */
export async function logoutAccount(): Promise<void> {
  const token = getToken();
  if (debounceTimer != null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  clearCredentials();
  const acc = useAccount.getState();
  acc.setConflict(null);
  acc.setLastSyncedAt(null);
  acc.setNotice('已退出登录，进度仍保存在本地');
  if (token) {
    try {
      await client.account.logout.mutate({ token });
    } catch {
      /* 静默：退出登录不受网络影响 */
    }
  }
}

/* ---------------- 启动与订阅 ---------------- */

let inited = false;

/**
 * 初始化云同步（幂等，由 Navbar 账号区挂载时调用）：
 * - 恢复 localStorage 里的登录态
 * - 订阅进度 store / 毕业设计 store 变化，防抖自动上传
 * - 包装 localStorage.setItem，捕获沙盒槽 / 设置的直接写入
 */
export function initCloudSync(): void {
  if (inited) return;
  inited = true;

  try {
    const token = safeGetItem(TOKEN_KEY);
    const username = safeGetItem(NAME_KEY);
    if (token) {
      useAccount.getState().setAuth(token, username ?? '焊友');
      // 启动时静默对齐一次：云端为空则推本地；有冲突先标记，不打断游玩
      void (async () => {
        try {
          const cloud = await loadCloudSave(token);
          if (!cloud) {
            await pushLocalNow();
          } else if (!payloadsEqual(cloud.payload, packLocalSave())) {
            const acc = useAccount.getState();
            acc.setConflict({ payload: cloud.payload, updatedAt: cloud.updatedAt });
            acc.setNotice('发现与本地不同的云端存档，点账号区处理');
          } else {
            const acc = useAccount.getState();
            acc.setSyncStatus('synced');
            acc.setLastSyncedAt(Date.now());
          }
        } catch {
          useAccount.getState().setSyncStatus('offline');
        }
      })();
    }
  } catch {
    /* ignore */
  }

  // 进度 store（cc-save-v1）变化
  subscribeProgressCloudSync(() => schedulePush());
  // 毕业设计 store（cc-graduation-v1）变化
  useGrad.subscribe(() => schedulePush());

  // 沙盒槽 / 挑战记录经 safeSetItem → localStorage.setItem 写入（safeStorage 动态
  // 调用，会经过这里包装后的版本），包装一层捕获
  try {
    const rawSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      rawSetItem(key, value);
      // 覆盖 cc-sandbox-1..5 与 cc-sandbox-challenges（均以 cc-sandbox- 开头）
      if (key.startsWith('cc-sandbox-')) {
        schedulePush();
      }
    };
  } catch {
    /* 包装失败仅影响沙盒自动同步，不影响游玩 */
  }

  // 页面隐藏 / 卸载兜底：防抖窗口内的更改立即冲刷，避免关页丢更新
  window.addEventListener('pagehide', flushPendingPush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingPush();
  });
  // 有未同步更改时提示「离开页面前有未同步更改」（仅脏数据时触发）
  window.addEventListener('beforeunload', e => {
    if (!hasUnsyncedChanges()) return;
    e.preventDefault();
    e.returnValue = ''; // 旧版浏览器兼容
  });
}
