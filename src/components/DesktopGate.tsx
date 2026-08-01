// DesktopGate：<1280px 显示「请使用桌面浏览器打开」提示页
import { useEffect, useState, type ReactNode } from 'react';

export default function DesktopGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => window.innerWidth >= 1280);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = (e: MediaQueryListEvent) => setOk(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (ok) return <>{children}</>;

  return (
    <div className="gerber-grid flex min-h-[100dvh] flex-col items-center justify-center bg-ink-950 px-8 text-center">
      <img src="/logo.svg" alt="回路工坊" className="mb-6 h-16 w-16" />
      <h1 className="mb-3 text-2xl font-black text-silk-100">请使用桌面浏览器打开</h1>
      <p className="max-w-md text-sm leading-relaxed text-silk-300">
        「回路工坊」是桌面端优先的电路设计工作台，需要至少
        <span className="mx-1 font-mono text-pcb-300">1280px</span>
        的屏幕宽度来摆放元件面板、画布与仪器。请在电脑浏览器中访问本站。
      </p>
      <p className="mt-6 font-mono text-xs text-silk-700">
        CURRENT WIDTH: {typeof window !== 'undefined' ? window.innerWidth : 0}PX · REQUIRED ≥ 1280PX
      </p>
    </div>
  );
}
