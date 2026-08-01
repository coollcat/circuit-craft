// ErrorBoundary —— 烧板冒烟风错误兜底（audit3 P4）
// 两级挂载：
// - variant="global"：App 路由级全局兜底，任何页面崩溃显示「这块板子烧了」整屏面板，
//   提供「重新上电」（location.reload）/「回首页」/「清运行时缓存」三个恢复出口；
// - variant="viewer"：3D 查看器懒加载局部兜底（three chunk 加载失败 / WebGL 不可用），
//   只替换 3D 区域，显示「你的浏览器点不亮 3D 灯箱，其他功能不受影响」，不带走整站。
import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { Flame, Home, RotateCcw, Trash2, Zap } from 'lucide-react';
import PadButton from '@/components/PadButton';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** global = 整屏烧板页；viewer = 3D 区域局部降级条 */
  variant?: 'global' | 'viewer';
}

interface ErrorBoundaryState {
  error: Error | null;
  /** 重试计数：作为 key 重挂子树，让 React.lazy 重新发起 chunk 加载 */
  retry: number;
}

/** 错误摘要取首行，截断防刷屏 */
function summarize(error: Error): string {
  const first = (error.message || String(error)).split('\n')[0];
  return first.length > 160 ? `${first.slice(0, 160)}…` : first;
}

/**
 * 仅清运行时状态，不清进度：
 * - sessionStorage（标签页会话态）
 * - 引导已读标记等易失键（下次重新看一遍引导而已）
 * 保留 cc-save-v1 / cc-graduation-v1 / cc-sandbox-* / cc-account-*（进度与账号）。
 */
function clearRuntimeState(): void {
  const VOLATILE_KEYS = ['cc-guide-chapters-v1', 'cc-sandbox-guide-seen'];
  try {
    sessionStorage.clear();
  } catch {
    /* 存储被禁用时忽略 */
  }
  for (const key of VOLATILE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, retry: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] 板子烧了：', error, info.componentStack);
  }

  private reset = () => {
    this.setState(s => ({ error: null, retry: s.retry + 1 }));
  };

  render() {
    const { error, retry } = this.state;
    if (!error) {
      // key 变化强制重挂子树（lazy chunk 失败后重试必须重新创建组件），Fragment 不产生额外 DOM 节点
      return <Fragment key={retry}>{this.props.children}</Fragment>;
    }
    return this.props.variant === 'viewer'
      ? <ViewerFallback error={error} onRetry={this.reset} />
      : <GlobalFallback error={error} />;
  }
}

/* ---------------- 全局兜底：这块板子烧了 ---------------- */

function GlobalFallback({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink-950 px-6">
      <div
        className="panel-raised w-[520px] rounded-xl border border-danger/60 bg-ink-850 p-8"
        style={{ boxShadow: '0 0 24px rgba(255,82,99,0.18)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border border-danger/50 bg-danger/10">
            <Flame className="h-5 w-5 text-danger" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-silk-100">这块板子烧了</h1>
            <p className="font-mono text-[10px] tracking-[0.25em] text-silk-700">BOARD FAILURE · REV A</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-silk-300">
          页面渲染时冒出了一股青烟（未捕获的前端异常）。你的关卡进度、沙盒存档都在本地保险柜里，没有烧。
        </p>

        <pre className="mt-4 max-h-28 overflow-auto rounded border border-ink-700 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-danger/90 whitespace-pre-wrap break-all">
          {summarize(error)}
        </pre>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PadButton size="M" onClick={() => window.location.reload()}>
            <Zap className="h-4 w-4" /> 重新上电
          </PadButton>
          <PadButton
            size="M"
            variant="ghost"
            onClick={() => window.location.assign('/')}
          >
            <Home className="h-4 w-4" /> 回首页
          </PadButton>
          <button
            onClick={() => {
              clearRuntimeState();
              window.location.reload();
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded px-2 font-mono text-[11px] text-silk-500 underline decoration-dotted underline-offset-4 hover:text-silk-100"
            title="只清会话缓存与引导标记，关卡进度 / 沙盒存档 / 账号全部保留"
          >
            <Trash2 className="h-3.5 w-3.5" /> 清运行时缓存后重启
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] text-silk-700">
          「清运行时缓存」不动 cc-save-v1 / 沙盒存档 / 账号，进度零损失。
        </p>
      </div>
    </div>
  );
}

/* ---------------- 3D 局部兜底：点不亮 3D 灯箱 ---------------- */

function ViewerFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-danger/50 bg-danger/10">
        <Flame className="h-5 w-5 text-danger" />
      </span>
      <p className="text-sm text-silk-100">你的浏览器点不亮 3D 灯箱，其他功能不受影响</p>
      <p className="max-w-md font-mono text-[10px] leading-relaxed text-silk-700">
        {summarize(error)}
      </p>
      <button
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 rounded border border-ink-600 px-3 py-1.5 font-mono text-[11px] text-pcb-300 hover:border-pcb-400"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 重试点亮
      </button>
    </div>
  );
}
