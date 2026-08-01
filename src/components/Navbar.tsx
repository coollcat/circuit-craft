/* eslint-disable react-refresh/only-export-components */
// Navbar 全站导航（design.md 6.1，TopNav，64px，sticky top-0 z-50）
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Lock, Settings, Star, Zap } from 'lucide-react';
import { useProgress } from '@/store/progress';
import { LEVELS } from '@/content/levels';
import AccountMenu from '@/features/account/AccountMenu';
import { titleForStars } from '@/lib/titles';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/chapters', label: '章节地图' },
  { to: '/sandbox', label: '沙盒' },
  { to: '/codex', label: '图鉴' },
] as const;

function graduationUnlocked(completed: string[]): boolean {
  const ch6 = LEVELS.filter(l => l.track === 'main' && l.chapter === 6);
  return ch6.length > 0 && ch6.every(l => completed.includes(l.id));
}

export default function Navbar() {
  const stars = useProgress(s => s.stars);
  const totalStars = Object.values(stars).reduce((sum, n) => sum + n, 0);
  const completed = useProgress(s => s.completed);
  const settings = useProgress(s => s.settings);
  const setSettings = useProgress(s => s.setSettings);
  const reset = useProgress(s => s.reset);
  const [showSettings, setShowSettings] = useState(false);
  const gradLocked = !graduationUnlocked(completed);

  // 动效开关的全局兜底：<html data-motion="off">，供非 React 消费者（粒子系统等）读取
  useEffect(() => {
    document.documentElement.dataset.motion = settings.motion ? 'on' : 'off';
  }, [settings.motion]);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-ink-700 bg-ink-900/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        {/* 左：Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="回路工坊" className="h-9 w-9" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-black text-silk-100">回路工坊</span>
            <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-silk-500">
              CIRCUITCRAFT
            </span>
          </span>
        </Link>

        {/* 中：导航项（1280px 下限收紧横向间距防挤压） */}
        <nav className="flex min-w-0 items-center gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item && item.end}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-2 text-sm transition-colors duration-200',
                  isActive ? 'text-pcb-300' : 'text-silk-300 hover:text-silk-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {/* 当前项 2px 走线指示条（带 45° 折角） */}
                  {isActive && (
                    <svg
                      className="absolute -bottom-[13px] left-0 h-[6px] w-full"
                      viewBox="0 0 100 6"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 5 L40 5 L46 1 L54 1 L60 5 L100 5"
                        fill="none"
                        stroke="#3FC47F"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </>
              )}
            </NavLink>
          ))}
          {/* 毕业设计（未解锁带锁） */}
          {gradLocked ? (
            <span
              className="flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm text-silk-700"
              title="通关第 6 章解锁"
            >
              <Lock className="h-3.5 w-3.5" />
              毕业设计
            </span>
          ) : (
            <NavLink
              to="/graduation"
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap px-3 py-2 text-sm transition-colors',
                  isActive ? 'text-pcb-300' : 'text-silk-300 hover:text-silk-100',
                )
              }
            >
              毕业设计
            </NavLink>
          )}
        </nav>

        {/* 右：总星数 / 称号 / 设置（shrink-0 防挤压，1280px 下限收紧间距） */}
        <div className="relative flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[13px] text-copper-300">
            <Star className="h-4 w-4 fill-copper-300" />
            {totalStars}
          </span>
          {/* 称号徽章：<1400px 隐藏称号文本只留星数，保证 1280px 下限不溢出 */}
          <span className="hidden min-[1400px]:flex items-center gap-1.5 whitespace-nowrap border border-dashed border-silk-500 px-2 py-0.5 font-mono text-xs text-silk-300">
            <Zap className="h-3.5 w-3.5 text-pcb-300" />
            {titleForStars(totalStars)}
          </span>
          <button
            onClick={() => setShowSettings(v => !v)}
            aria-label="设置"
            className="rounded p-1.5 text-silk-300 transition-colors hover:bg-ink-800 hover:text-silk-100"
          >
            <Settings className="h-4 w-4" />
          </button>
          {/* 账号区：游客态显示登录/注册，登录后显示用户名 + 云同步状态 */}
          <span className="h-5 w-px bg-ink-700" aria-hidden="true" />
          <AccountMenu />

          {showSettings && (
            <div className="panel-raised absolute right-0 top-12 z-50 w-64 rounded-lg p-4">
              <h4 className="mb-3 text-sm font-bold text-silk-100">设置</h4>
              {(
                [
                  ['sound', '音效'],
                  ['motion', '动效'],
                  ['solderCursor', '烙铁光标（彩蛋）'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="mb-2 flex cursor-pointer items-center justify-between text-sm text-silk-300"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={e => setSettings({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-pcb-500"
                  />
                </label>
              ))}
              <button
                onClick={() => {
                  if (window.confirm('确定要清空全部闯关进度吗？此操作不可撤销。')) {
                    reset();
                    setShowSettings(false);
                  }
                }}
                className="mt-2 w-full rounded border border-danger/50 px-2 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10"
              >
                重置全部进度
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
