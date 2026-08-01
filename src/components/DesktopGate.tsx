// DesktopGate：<768px 显示「请使用更大的屏幕打开」提示页（平板及以上放行）
import { useEffect, useState, type ReactNode } from 'react';

export default function DesktopGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setOk(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (ok) return <>{children}</>;

  return (
    <div className="gerber-grid flex min-h-[100dvh] flex-col items-center justify-center bg-ink-950 px-8 text-center">
      <img src="/logo.svg" alt="回路工坊" className="mb-6 h-16 w-16" />
      <h1 className="mb-3 text-2xl font-black text-silk-100">请使用平板或电脑访问</h1>
      <p className="max-w-md text-sm leading-relaxed text-silk-300">
        「回路工坊」是桌面端优先的电路设计工作台，需要至少
        <span className="mx-1 font-mono text-pcb-300">768px</span>
        的屏幕宽度来摆放元件面板、画布与仪器。请换用平板/电脑浏览器访问本站。
      </p>
      <p className="mt-6 font-mono text-xs text-silk-700">
        CURRENT WIDTH: {typeof window !== 'undefined' ? window.innerWidth : 0}PX · REQUIRED ≥ 768PX
      </p>
    </div>
  );
}
