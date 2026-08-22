// 图鉴 3D —— 灯箱卡片（懒加载入口）
// three.js 经 React.lazy 分包：仅条目详情打开 3D 预览时才加载查看器 chunk。
// 卡片外框沿用深色站 token（ink 面板边），内部 320px 亮背影棚，形成「灯箱」反差。
import { Suspense, lazy } from 'react';
import { Box } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const Component3DViewer = lazy(() => import('./Component3DViewer'));

function StudioSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F4F1E8]">
      <Box className="h-6 w-6 animate-pulse text-[#B4AC96]" />
      <span className="font-mono text-[11px] tracking-[0.25em] text-[#8E8976]">正在点亮灯箱…</span>
    </div>
  );
}

export default function Codex3DCard({ entryId, name }: { entryId: string; name: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-800 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-4 py-2">
        <span className="font-mono text-[11px] tracking-[0.25em] text-silk-500">
          3D PREVIEW · 影棚模式
        </span>
        <span className="font-mono text-[10px] text-silk-700">
          拖拽旋转 · 滚轮缩放 · 双击复位 · 悬停暂停自转
        </span>
      </div>
      <div className="h-[320px]">
        <ErrorBoundary variant="viewer">
          <Suspense fallback={<StudioSkeleton />}>
            <Component3DViewer entryId={entryId} name={name} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
