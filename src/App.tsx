import { Routes, Route } from 'react-router';
import DesktopGate from '@/components/DesktopGate';
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
    </DesktopGate>
  );
}
