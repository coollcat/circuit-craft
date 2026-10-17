/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import './index.css';
import { TRPCProvider } from "@/providers/trpc"
import { useProgress } from '@/store/progress';
import App from './App.tsx';

/**
 * 全局动效策略（无障碍）：
 * - 设置里「动效」开（默认）→ reducedMotion="user"：framer-motion 尊重系统 prefers-reduced-motion；
 * - 「动效」关 → "always"：framer-motion 停用 transform/layout 动画，
 *   同时 Navbar 会把 <html data-motion="off"> 写进 DOM，index.css 据此停用全站 CSS 动画与过渡。
 * 需覆盖 opacity/boxShadow 之类的无限循环动画时，各页面再显式读 settings.motion（如 Chapters 焊盘脉冲）。
 */
function MotionRoot({ children }: { children: ReactNode }) {
  const motionOn = useProgress(s => s.settings.motion);
  return <MotionConfig reducedMotion={motionOn ? 'user' : 'always'}>{children}</MotionConfig>;
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <MotionRoot>
        <App />
      </MotionRoot>
    </TRPCProvider>
  </BrowserRouter>,
);
