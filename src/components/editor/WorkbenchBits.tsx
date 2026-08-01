// 编辑器 — 工作台共享小组件：运行控制组 / 万用表读数卡 / 右栏折叠条
import { Pause, Play, RotateCcw, PanelRightClose, PanelRightOpen } from 'lucide-react';
import PadButton from '@/components/PadButton';
import { cn } from '@/lib/utils';

export function RunControls({ running, onRun, onPause, onReset }: {
  running: boolean; onRun: () => void; onPause: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {running ? (
        <PadButton size="S" variant="ghost" onClick={onPause} title="暂停仿真">
          <Pause className="h-3.5 w-3.5" /> 暂停
        </PadButton>
      ) : (
        <PadButton size="S" variant="primary" onClick={onRun} title="运行仿真（MNA 求解器）">
          <Play className="h-3.5 w-3.5" /> 运行
        </PadButton>
      )}
      <PadButton size="S" variant="ghost" onClick={onReset} title="重置：恢复初始电路并清除烧毁状态">
        <RotateCcw className="h-3.5 w-3.5" /> 重置
      </PadButton>
      {running && <span className="h-2 w-2 animate-pulse rounded-full bg-ok" style={{ boxShadow: '0 0 6px rgba(67,224,138,0.8)' }} />}
    </div>
  );
}

export function MultimeterCard({ voltage, current, hint }: { voltage?: string; current?: string; hint?: string }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/60 p-3">
      <div className="mb-1.5 font-mono text-[10px] tracking-[0.2em] text-silk-700">MULTIMETER · 万用表</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-ink-950 px-2 py-1.5">
          <div className="font-mono text-[9px] text-sig-cyan">V 电压</div>
          <div className="font-mono text-lg font-bold text-silk-100">{voltage ?? '—'}</div>
        </div>
        <div className="rounded bg-ink-950 px-2 py-1.5">
          <div className="font-mono text-[9px] text-sig-magenta">I 电流</div>
          <div className="font-mono text-lg font-bold text-silk-100">{current ?? '—'}</div>
        </div>
      </div>
      {hint && <p className="mt-1.5 font-mono text-[10px] text-silk-700">{hint}</p>}
    </div>
  );
}

export function RightCollapseBar({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-l border-ink-700 bg-ink-850 py-3">
      <button onClick={onExpand} className="rounded p-2 text-silk-300 hover:bg-ink-800 hover:text-silk-100" title="展开仪器面板">
        <PanelRightOpen className="h-4 w-4" />
      </button>
      <span className="mt-4 font-mono text-[10px] tracking-widest text-silk-700" style={{ writingMode: 'vertical-rl' }}>仪器面板</span>
    </div>
  );
}

export function RightPanelHeader({ onCollapse, title }: { onCollapse: () => void; title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
      <span className="font-mono text-[10px] tracking-[0.2em] text-silk-500">{title}</span>
      <button onClick={onCollapse} className="rounded p-1.5 text-silk-500 hover:bg-ink-800 hover:text-silk-100" title="折叠">
        <PanelRightClose className="h-4 w-4" />
      </button>
    </div>
  );
}

export function NotesCard({ title, body }: { title: string; body: string }) {
  return (
    <details className="rounded-md border border-ink-700 bg-ink-900/60 p-3" open>
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-silk-500">
        本关笔记 · {title}
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-silk-300">{body}</p>
      <p className="mt-1 font-mono text-[10px] text-silk-700">更多见「图鉴 /codex」对应条目</p>
    </details>
  );
}

export function panelCls(extra?: string) {
  return cn('panel', extra);
}
