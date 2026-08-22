// 路由级代码分割：Home 保持首屏 eager，其余页面（含 three.js/GSAP 重依赖）按需加载，
// 把主包从 1.6MB 级别拆薄。Suspense 兜底沿用「上电装载」话术。
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import DesktopGate from '@/components/DesktopGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';

const Chapters = lazy(() => import('@/pages/Chapters'));
const LevelPlay = lazy(() => import('@/pages/LevelPlay'));
const Graduation = lazy(() => import('@/pages/Graduation'));
const Sandbox = lazy(() => import('@/pages/Sandbox'));
const SideQuests = lazy(() => import('@/pages/SideQuests'));
const Codex = lazy(() => import('@/pages/Codex'));
const Placeholder = lazy(() => import('@/pages/Placeholder'));

function PageFallback() {
  return (
    <div className="flex h-[calc(100dvh-64px)] items-center justify-center">
      <div className="text-center font-mono text-xs text-silk-500">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-pcb-400" />
        正在上电装载…
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DesktopGate>
      {/* 全局兜底：任何页面渲染异常显示「这块板子烧了」恢复面板，而不是整站白屏 */}
      <ErrorBoundary variant="global">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="chapters" element={<Chapters />} />
              <Route path="play/:levelId" element={<LevelPlay />} />
              <Route path="graduation" element={<Graduation />} />
              <Route path="sandbox" element={<Sandbox />} />
              <Route path="sidequests" element={<SideQuests />} />
              <Route path="codex" element={<Codex />} />
              <Route
                path="*"
                element={
                  <Placeholder tag="404" title="这条走线断了" desc="你访问的页面不存在，回到首页重新上电吧。" />
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </DesktopGate>
  );
}
