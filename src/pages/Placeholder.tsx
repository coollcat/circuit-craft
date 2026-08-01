// 占位页：内容由后续页面代理填充
import type { ReactNode } from 'react';
import SilkTag from '@/components/SilkTag';
import PadButton from '@/components/PadButton';

export default function Placeholder({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-12 py-24 text-center">
      <SilkTag>{tag}</SilkTag>
      <h1 className="text-4xl font-black text-silk-100">{title}</h1>
      <div className="max-w-xl text-sm leading-relaxed text-silk-500">{desc}</div>
      <img src="/empty-state.svg" alt="" className="w-72 opacity-80" />
      <PadButton to="/" variant="ghost" size="M">
        ← 返回首页
      </PadButton>
    </div>
  );
}
