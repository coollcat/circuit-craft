// localStorage 安全包装（audit3 P6）
// - 隐私模式 / 配额满 / 存储被禁用时 setItem 会抛异常，这里统一 try/catch，
//   写失败降级到内存 Map：本次会话内读写仍一致，只是不持久化
// - 写失败只提醒一次（warn 钩子由页面接入各自的 Toast），不反复刷屏
// - 读失败静默返回内存值 / null，不打扰用户
// 注意：setItem 调用点动态查找 localStorage.setItem——sync.ts 的自动云同步
// 包装（捕获 cc-sandbox-* 直写）对经过本模块的写入仍然生效。
type StorageWarnFn = (msg: string) => void;

const WARN_MSG = '浏览器存储不可用，本次进度只留在内存里，刷新或关页后会丢失。';

/** 写失败降级用的会话内内存存储 */
const memory = new Map<string, string>();

let warnFn: StorageWarnFn | null = null;
let warned = false;
let degraded = false;

/** 页面注册警告展示（Toast 等）；传 null 解除。只触发一次。 */
export function setStorageWarnHandler(fn: StorageWarnFn | null): void {
  warnFn = fn;
}

function warnOnce(): void {
  if (warned) return;
  warned = true;
  try {
    warnFn?.(WARN_MSG);
  } catch {
    /* Toast 自身异常不影响存储降级 */
  }
  if (!warnFn && typeof console !== 'undefined') {
    console.warn(`[safeStorage] ${WARN_MSG}`);
  }
}

/** 是否已发生写失败降级（本次会话内存储不可靠） */
export function isStorageDegraded(): boolean {
  return degraded;
}

export function safeGetItem(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    // localStorage 没有该键时回落内存副本（此前写失败降级进来的）
    return v ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/** 返回 true = 已持久化；false = 降级到内存（未持久化） */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    // 持久化成功后清掉可能存在的内存副本，保持单一数据源
    memory.delete(key);
    return true;
  } catch {
    degraded = true;
    memory.set(key, value);
    warnOnce();
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* 删除失败无妨：内存副本已清 */
  }
}

/** zustand persist 的 StateStorage 适配器：createJSONStorage(() => safeStateStorage()) */
export function safeStateStorage() {
  return {
    getItem: (name: string) => safeGetItem(name),
    setItem: (name: string, value: string): void => {
      safeSetItem(name, value);
    },
    removeItem: (name: string) => {
      safeRemoveItem(name);
    },
  };
}
