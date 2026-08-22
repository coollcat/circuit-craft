// DesktopGate：<1024px 显示提示页（平板 1024+ 可正常进入）；更小设备可手动放行
import { useEffect, useState, type ReactNode } from 'react';

const MIN_WIDTH = 1024;
const BYPASS_KEY = 'cc-gate-bypass';

export default function DesktopGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(
    () => window.innerWidth >= MIN_WIDTH || sessionStorage.getItem(BYPASS_KEY) === '1',
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOk(true);
      else if (sessionStorage.getItem(BYPASS_KEY) !== '1') setOk(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (ok) return <>{children}</>;

  const bypass = () => {
    sessionStorage.setItem(BYPASS_KEY, '1');
    setOk(true);
  };

  return (
    <div className="gerber-grid flex min-h-[100dvh] flex-col items-center justify-center bg-ink-950 px-8 text-center">
      <img src="/logo.svg" alt="回路工坊" className="mb-6 h-16 w-16" />
      <h1 className="mb-3 text-2xl font-black text-silk-100">屏幕有点窄，建议用电脑或平板</h1>
      <p className="max-w-md text-sm leading-relaxed text-silk-300">
        「回路工坊」是桌面端优先的电路设计工作台，需要至少
        <span className="mx-1 font-mono text-pcb-300">1024px</span>
        的屏幕宽度来摆放元件面板、画布与仪器。用电脑，或把平板横过来，体验最好。
      </p>
      <button
        onClick={bypass}
        className="mt-6 rounded-md border border-pcb-400 bg-ink-800 px-4 py-2 text-sm text-pcb-300 transition-colors hover:bg-ink-700"
      >
        我知道会有点挤，仍要继续
      </button>
      <p className="mt-6 font-mono text-xs text-silk-700">
        CURRENT WIDTH: {typeof window !== 'undefined' ? window.innerWidth : 0}PX · REQUIRED ≥ {MIN_WIDTH}PX
      </p>
    </div>
  );
}
