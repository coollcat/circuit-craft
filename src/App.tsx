import { Routes, Route } from 'react-router';
import DesktopGate from '@/components/DesktopGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Chapters from '@/pages/Chapters';
import LevelPlay from '@/pages/LevelPlay';
import Graduation from '@/pages/Graduation';
import Sandbox from '@/pages/Sandbox';
import SideQuests from '@/pages/SideQuests';
import Codex from '@/pages/Codex';
import Placeholder from '@/pages/Placeholder';

export default function App() {
  return (
    <DesktopGate>
      {/* 全局兜底：任何页面渲染异常显示「这块板子烧了」恢复面板，而不是整站白屏 */}
      <ErrorBoundary variant="global">
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
      </ErrorBoundary>
    </DesktopGate>
  );
}
