// 未保存内容「离开守卫」：项目用的是 BrowserRouter（非 data router，没有 useBlocker），
// 所以这里用两层兜底：
//   1) beforeunload —— 刷新 / 关标签 / 手输外链时弹浏览器原生确认；
//   2) 站内 <a href="/..."> 点击拦截（捕获阶段）—— react-router 的 Link 底层就是 <a>，
//      在 document 捕获阶段拦下，确认后才放行；取消则阻断事件，SPA 导航不会发生。
import { useEffect } from 'react';

const MODIFIER_KEYS = ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const;

export function useUnsavedGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (MODIFIER_KEYS.some(k => e[k])) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      // 只拦站内绝对路径；外链、下载、纯锚点交给浏览器
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (window.confirm(message)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}
