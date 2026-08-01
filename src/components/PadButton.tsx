// PadButton 焊盘按钮（design.md 6.3）
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'copper' | 'ghost' | 'danger';
type Size = 'L' | 'M' | 'S';

export interface PadButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** 提供时渲染为路由链接 */
  to?: string;
  children: ReactNode;
}

const variantCls: Record<Variant, string> = {
  primary: 'bg-pcb-500 text-ink-950 font-bold hover:bg-pcb-400',
  copper:
    'bg-gradient-to-br from-copper-600 via-copper-500 to-copper-400 text-ink-950 font-bold hover:brightness-110',
  ghost: 'bg-ink-800 border border-pcb-400 text-pcb-300 hover:bg-ink-700',
  danger: 'bg-danger/90 text-silk-100 font-bold hover:bg-danger',
};

const sizeCls: Record<Size, string> = {
  L: 'h-12 px-7 text-base rounded-md',
  M: 'h-10 px-5 text-sm rounded-md',
  S: 'h-8 px-3.5 text-xs rounded',
};

export default function PadButton({
  variant = 'primary',
  size = 'M',
  to,
  className,
  children,
  ...rest
}: PadButtonProps) {
  const cls = cn(
    // 环形容差圈（annular ring）：外侧 2px 半透铜色圈
    'pad-sheen inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'ring-2 ring-copper-500/40 ring-offset-2 ring-offset-ink-950',
    'transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-40',
    variantCls[variant],
    sizeCls[size],
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
