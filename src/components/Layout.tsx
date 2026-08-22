// Layout（嵌套路由模式：<Outlet/> 内容槽）
// 注意：App.tsx 必须使用嵌套 <Route> 挂载页面（react-dev.md 模式 B）
import { Outlet } from 'react-router';
import Navbar from '@/components/Navbar';

export default function Layout() {
  return (
    <div className="noise-overlay gerber-grid flex min-h-[100dvh] flex-col bg-ink-950">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
