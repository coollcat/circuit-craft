// AccountDialog 账号弹窗（PCB 工程风 Modal）
// 动效遵循 design.md 5.2：遮罩 blur 8px + fade 200ms；内容 scale 0.96→1 + y 12→0，280ms
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CloudDownload,
  CloudUpload,
  Copy,
  KeyRound,
  RefreshCw,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { trpc } from '@/providers/trpc';
import PadButton from '@/components/PadButton';
import { cn } from '@/lib/utils';
import { useAccount } from './store';
import { generateCredentials, copyText } from './credentials';
import type { GeneratedCredentials } from './credentials';
import { saveCredentials, syncAfterAuth, resolveConflict } from './sync';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function fmtTime(v: unknown): string {
  try {
    const d = v instanceof Date ? v : new Date(v as string | number);
    if (Number.isNaN(d.getTime())) return '未知时间';
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '未知时间';
  }
}

/* ---------------- 一键生成账号 ---------------- */

function GenerateView() {
  const [creds, setCreds] = useState<GeneratedCredentials>(() => generateCredentials());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);
  const registerMut = trpc.account.register.useMutation();
  const closeDialog = useAccount(s => s.closeDialog);

  const regen = () => {
    setCreds(generateCredentials());
    setError(null);
    setCopied(false);
  };

  const doCopy = async () => {
    const ok = await copyText(`回路工坊账号\n用户名：${creds.username}\n密码：${creds.password}`);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const doRegister = async () => {
    setBusy(true);
    setError(null);
    let c = creds;
    // 撞库（用户名被占用）时自动再生成重试
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const res = await registerMut.mutateAsync({ username: c.username, password: c.password });
        saveCredentials(res.token, res.username);
        await syncAfterAuth();
        // 若云端有冲突，syncAfterAuth 已切到冲突视图；否则展示开通成功
        if (!useAccount.getState().conflict) setDoneName(res.username);
        setBusy(false);
        return;
      } catch (e) {
        if (errMsg(e, '').includes('占用') && attempt < 5) {
          c = generateCredentials();
          setCreds(c);
          continue;
        }
        setError(errMsg(e, '注册失败，请检查网络后再试'));
        setBusy(false);
        return;
      }
    }
    setBusy(false);
  };

  if (doneName) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="glow-pcb flex h-14 w-14 items-center justify-center rounded-full border-2 border-pcb-400 bg-ink-800">
          <Check className="h-7 w-7 text-pcb-300" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-silk-100">云存档已开通</h3>
          <p className="mt-1 font-mono text-sm text-pcb-300">{doneName}</p>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-silk-300">
          小焊提示：进度会每 5 秒自动焊上云端，换台电脑登录就能接着玩。
          账号密码一定收好——丢了可真找不回来！
        </p>
        <PadButton onClick={closeDialog}>开工！</PadButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-silk-300">
        一键生成一组账号密码，马上把本地存档焊上云端。不用邮箱，不用手机号。
      </p>

      {/* 凭据大字等宽展示（阻焊开窗铜色底） */}
      <div className="panel rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="border border-dashed border-silk-500 px-1.5 font-mono text-[10px] uppercase tracking-wider text-silk-300">
            U-ACCT · 你的新账号
          </span>
          <button
            onClick={regen}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-silk-500 transition-colors hover:text-pcb-300"
          >
            <RefreshCw className="h-3 w-3" /> 换一组
          </button>
        </div>
        <div className="copper-window mb-2 flex items-center justify-between gap-2 rounded px-3 py-2">
          <span className="font-mono text-xl font-bold tracking-wide">{creds.username}</span>
          <span className="font-mono text-[10px] uppercase opacity-70">用户名</span>
        </div>
        <div className="copper-window flex items-center justify-between gap-2 rounded px-3 py-2">
          <span className="break-all font-mono text-xl font-bold tracking-wider">{creds.password}</span>
          <span className="shrink-0 font-mono text-[10px] uppercase opacity-70">密码</span>
        </div>
      </div>

      <button
        onClick={doCopy}
        className="flex h-9 items-center justify-center gap-2 rounded-md border border-pcb-400 bg-ink-800 text-sm text-pcb-300 transition-colors hover:bg-ink-700"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? '已复制到剪贴板' : '一键复制账号密码'}
      </button>

      {/* 醒目警告 */}
      <div className="flex items-start gap-2 rounded-md border border-sig-amber/60 bg-sig-amber/10 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sig-amber" />
        <p className="text-sm leading-relaxed text-silk-100">
          <strong className="text-sig-amber">请立即保存，密码不可找回。</strong>
          小焊再唠叨一句：抄进备忘录或截图收好，丢了只能重新开号从头焊！
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-silk-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="h-4 w-4 accent-pcb-500"
        />
        我已把账号密码保存好了
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <PadButton size="L" disabled={!confirmed || busy} onClick={doRegister}>
        {busy ? '正在上锡注册…' : '确认保存完毕，注册并开通云存档'}
      </PadButton>
    </div>
  );
}

/* ---------------- 老用户登录 ---------------- */

function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginMut = trpc.account.login.useMutation();
  const closeDialog = useAccount(s => s.closeDialog);

  const doLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await loginMut.mutateAsync({ username: username.trim(), password });
      saveCredentials(res.token, res.username);
      await syncAfterAuth();
      if (!useAccount.getState().conflict) closeDialog();
    } catch (e) {
      setError(errMsg(e, '登录失败，请检查网络后再试'));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 font-mono text-sm text-silk-100 placeholder:text-silk-700 focus:border-pcb-400';

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        if (!busy && username.trim() && password) void doLogin();
      }}
    >
      <p className="text-sm leading-relaxed text-silk-300">
        老焊友欢迎回来。登录后可把这台设备的进度和云端存档对齐。
      </p>
      <label className="flex flex-col gap-1.5 text-xs text-silk-500">
        用户名
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silk-700" />
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="焊工_XXXX"
            autoComplete="username"
            autoFocus
            className={cn(inputCls, 'pl-9')}
          />
        </div>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-silk-500">
        密码
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silk-700" />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="16 位随机密码"
            autoComplete="current-password"
            className={cn(inputCls, 'pl-9')}
          />
        </div>
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <PadButton size="L" type="submit" disabled={busy || !username.trim() || !password}>
        {busy ? '正在接通电源…' : '登录并同步存档'}
      </PadButton>
    </form>
  );
}

/* ---------------- 云端存档冲突 ---------------- */

function ConflictView() {
  const conflict = useAccount(s => s.conflict);
  const closeDialog = useAccount(s => s.closeDialog);
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;

  const choose = async (c: 'cloud' | 'local') => {
    setBusy(true);
    await resolveConflict(c);
    setBusy(false);
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-md border border-sig-amber/60 bg-sig-amber/10 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sig-amber" />
        <p className="text-sm leading-relaxed text-silk-100">
          发现云端存档
          <span className="ml-1 font-mono text-sig-amber">（更新时间 {fmtTime(conflict.updatedAt)}）</span>
          ，它和这台设备上的本地进度不一样。选一边保留吧，另一边会被覆盖。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PadButton variant="copper" disabled={busy} onClick={() => void choose('cloud')}>
          <CloudDownload className="h-4 w-4" /> 用云端覆盖本地
        </PadButton>
        <PadButton variant="ghost" disabled={busy} onClick={() => void choose('local')}>
          <CloudUpload className="h-4 w-4" /> 把本地上传到云端
        </PadButton>
      </div>
      <button
        onClick={closeDialog}
        className="self-center text-xs text-silk-500 transition-colors hover:text-silk-300"
      >
        先不处理，稍后再说
      </button>
    </div>
  );
}

/* ---------------- 登录/注册主体（弹窗关闭时卸载，重开自动回到「一键生成」） ---------------- */

function AuthView() {
  const [tab, setTab] = useState<'gen' | 'login'>('gen');
  return (
    <>
      {/* 选项卡（走线指示条风格） */}
      <div className="mb-5 flex gap-1 border-b border-ink-700">
        {(
          [
            ['gen', '一键生成账号', Zap],
            ['login', '老用户登录', UserRound],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2 text-sm transition-colors',
              tab === key ? 'text-pcb-300' : 'text-silk-500 hover:text-silk-100',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {tab === key && (
              <svg
                className="absolute -bottom-px left-0 h-[6px] w-full"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 L40 5 L46 1 L54 1 L60 5 L100 5"
                  fill="none"
                  style={{ stroke: 'rgb(var(--cc-pcb-400))' }}
                  strokeWidth="2"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
      {tab === 'gen' ? <GenerateView /> : <LoginView />}
    </>
  );
}

/* ---------------- 弹窗主体 ---------------- */

export default function AccountDialog() {
  const open = useAccount(s => s.dialogOpen);
  const view = useAccount(s => s.dialogView);
  const closeDialog = useAccount(s => s.closeDialog);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDialog]);

  // 通过 portal 挂到 document.body：Navbar 的 backdrop-blur 会创建包含块，
  // 若不 portal，fixed inset-0 会被钳制在 64px 高的 header 内，弹窗出现在角落而非屏幕正中。
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center cc-scrim p-6 backdrop-blur-[8px]"
          onClick={closeDialog}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={e => e.stopPropagation()}
            className="panel-raised w-full max-w-[400px] rounded-lg p-6"
            role="dialog"
            aria-modal="true"
            aria-label="账号与云存档"
          >
            {/* 标题栏 */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <span className="mb-1 inline-block border border-dashed border-silk-500 px-1.5 font-mono text-[10px] uppercase tracking-wider text-silk-300">
                  {view === 'conflict' ? 'SYNC · 存档冲突' : 'ACCOUNT · 云存档'}
                </span>
                <h2 className="text-xl font-bold text-silk-100">
                  {view === 'conflict' ? '发现云端存档' : '账号与云存档'}
                </h2>
              </div>
              <button
                onClick={closeDialog}
                aria-label="关闭"
                className="rounded p-1.5 text-silk-500 transition-colors hover:bg-ink-700 hover:text-silk-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {view === 'conflict' ? <ConflictView /> : <AuthView />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
