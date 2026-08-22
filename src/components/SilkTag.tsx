// SilkTag 丝印标签（design.md 6.4）：等宽大写 + 虚线框 + 四角小方点
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function SilkTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-block border border-dashed border-silk-500 px-3 py-1',
        'font-mono text-xs font-medium uppercase tracking-[0.04em] text-silk-300',
        className,
      )}
    >
      {/* 四角 3px 小方点 */}
      <i className="absolute -left-[3px] -top-[3px] h-[5px] w-[5px] bg-silk-500" />
      <i className="absolute -right-[3px] -top-[3px] h-[5px] w-[5px] bg-silk-500" />
      <i className="absolute -bottom-[3px] -left-[3px] h-[5px] w-[5px] bg-silk-500" />
      <i className="absolute -bottom-[3px] -right-[3px] h-[5px] w-[5px] bg-silk-500" />
      {children}
    </span>
  );
}
