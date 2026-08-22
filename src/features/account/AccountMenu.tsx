// AccountMenu — Navbar 右侧账号区
// 未登录：「游客 · 本地存档」+ 登录/注册按钮；已登录：用户名 + 同步状态 + 下拉菜单
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  CloudDownload,
  CloudUpload,
  LogOut,
  UserRound,
  WifiOff,
} from 'lucide-react';
import PadButton from '@/components/PadButton';
import { cn } from '@/lib/utils';
import { useAccount } from './store';
import { initCloudSync, logoutAccount, pushLocalNow, restoreFromCloud } from './sync';

function fmtHHmm(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 同步状态指示（✓已同步 HH:mm / 同步中 / 离线） */
function SyncBadge() {
  const status = useAccount(s => s.syncStatus);
  const lastSyncedAt = useAccount(s => s.lastSyncedAt);
  if (status === 'syncing') {
    return (
      <span className="flex items-center gap-1 font-mono text-[11px] text-sig-amber">
        <CloudUpload className="h-3 w-3 animate-pulse" />
        同步中…
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1 font-mono text-[11px] text-warn">
        <WifiOff className="h-3 w-3" />
        离线 · 本地已保存
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 font-mono text-[11px] text-pcb-300">
      ✓ 已同步{lastSyncedAt ? ` ${fmtHHmm(lastSyncedAt)}` : ''}
    </span>
  );
}

export default function AccountMenu() {
  const token = useAccount(s => s.token);
  const username = useAccount(s => s.username);
  const conflict = useAccount(s => s.conflict);
  const notice = useAccount(s => s.notice);
  const openDialog = useAccount(s => s.openDialog);
  const [menuOpen, setMenuOpen] = useState(false);

  // 启动云同步引擎（幂等）
  useEffect(() => {
    initCloudSync();
  }, []);

  // AccountDialog 必须挂在稳定的单一挂载点：
  // 若随 token 分支切换而卸载重挂，注册成功瞬间弹窗状态（开通成功面板）会丢失并重生成新凭据。
  if (!token) {
    return (
      <>
        <span className="hidden items-center gap-1.5 font-mono text-xs text-silk-500 lg:flex">
          <UserRound className="h-3.5 w-3.5" />
          游客 · 本地存档
        </span>
        <PadButton size="S" variant="ghost" onClick={() => openDialog('auth')}>
          登录 / 注册
        </PadButton>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors',
          conflict
            ? 'border-sig-amber/60 bg-sig-amber/10 hover:bg-sig-amber/15'
            : 'border-ink-700 bg-ink-850 hover:border-ink-600',
        )}
      >
        <span className="max-w-[120px] truncate font-mono text-xs font-bold text-silk-100">
          {username ?? '焊友'}
        </span>
        <SyncBadge />
        {conflict && <span className="h-1.5 w-1.5 rounded-full bg-sig-amber" />}
        <ChevronDown className="h-3.5 w-3.5 text-silk-500" />
      </button>

      {menuOpen && (
        <>
          {/* 点击外部关闭 */}
          <button
            aria-label="关闭菜单"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="panel-raised absolute right-0 top-11 z-50 w-56 rounded-lg p-2">
            {conflict && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openDialog('conflict');
                }}
                className="mb-1 w-full rounded border border-sig-amber/50 bg-sig-amber/10 px-3 py-2 text-left text-xs text-sig-amber transition-colors hover:bg-sig-amber/15"
              >
                有云端存档待处理，点我选择保留哪边
              </button>
            )}
            {(
              [
                ['立即同步', CloudUpload, () => void pushLocalNow()],
                ['从云端恢复', CloudDownload, () => void restoreFromCloud()],
              ] as const
            ).map(([label, Icon, act]) => (
              <button
                key={label}
                onClick={() => {
                  setMenuOpen(false);
                  act();
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-silk-300 transition-colors hover:bg-ink-700 hover:text-silk-100"
              >
                <Icon className="h-4 w-4 text-pcb-300" />
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                void logoutAccount();
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-silk-300 transition-colors hover:bg-ink-700 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              退出登录（不清本地进度）
            </button>
            {notice && (
              <p className="mt-1 border-t border-ink-700 px-3 pt-2 text-xs leading-relaxed text-silk-500">
                小焊：{notice}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
