// 条目详情（六段式 + 嵌实验 + 剧透锁定）
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, FlaskConical, Lock, Quote, Wrench } from 'lucide-react';
import type { CodexEntry } from './data/entries';
import Codex3DCard from '@/features/codex3d';
import { ComponentSymbol } from './symbols';
import MiniSchematic from './MiniSchematic';
import Lab, { LAB_TITLES } from './labs/index';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';

function Section({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <SilkTag>{eyebrow}</SilkTag>
        <h3 className="text-lg font-bold text-silk-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function EntryDetail({
  entry,
  unlocked,
  onBack,
}: {
  entry: CodexEntry;
  unlocked: boolean;
  onBack: () => void;
}) {
  const [spoiler, setSpoiler] = useState(false);
  const showFull = unlocked || spoiler;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-silk-300 transition-colors hover:text-sig-cyan"
      >
        <ArrowLeft className="h-4 w-4" /> 返回条目网格
      </button>

      {/* 1. 头部 */}
      <header className="panel flex items-center gap-8 rounded-lg p-6">
        <div className={cn('w-56 shrink-0', !showFull && 'opacity-50 grayscale')}>
          <ComponentSymbol id={entry.id} className="h-28 w-full" />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-black text-silk-100">{entry.name}</h2>
            <span className="font-display text-sm font-semibold tracking-widest text-silk-500">
              {entry.en.toUpperCase()}
            </span>
            <span className="rounded border border-dashed border-silk-500 px-2 py-0.5 font-mono text-xs text-sig-cyan">
              位号 {entry.refdes}
            </span>
            {!unlocked && (
              <span className="flex items-center gap-1 rounded border border-warn/60 px-2 py-0.5 font-mono text-xs text-warn">
                <Lock className="h-3 w-3" />
                {spoiler ? '剧透模式' : '预告态'}
              </span>
            )}
          </div>
          <p className="text-lg text-silk-300">{entry.essence}</p>
          {entry.plain && (
            <p className="text-sm text-pcb-300">💬 小焊翻译：{entry.plain}</p>
          )}
          <p className="font-mono text-[13px] text-silk-500">
            {unlocked
              ? `首次出现于第 ${entry.unlockChapter} 章 · 已解锁`
              : `你将在第 ${entry.unlockChapter} 章遇见它`}
          </p>
        </div>
      </header>

      {/* 未解锁且未剧透：预告态 */}
      {!showFull && (
        <div className="panel-raised flex flex-col items-center gap-4 rounded-lg border-dashed p-10 text-center">
          <Lock className="h-8 w-8 text-silk-500" />
          <p className="max-w-md text-sm leading-6 text-silk-300">
            这个元件的完整档案会在你推进主线到第 {entry.unlockChapter} 章后自动解锁。
            小焊建议先去闯关，留点惊喜；实在忍不住，也可以偷看。
          </p>
          <button
            onClick={() => setSpoiler(true)}
            className="flex items-center gap-2 rounded border border-warn/60 px-4 py-2 text-sm text-warn transition-colors hover:bg-warn/10"
          >
            <Eye className="h-4 w-4" /> 我不怕剧透，现在就看
          </button>
        </div>
      )}

      {showFull && (
        <>
          {spoiler && !unlocked && (
            <div className="rounded-md border-l-[3px] border-warn bg-warn/10 px-3 py-2 font-mono text-xs text-warn">
              剧透模式：以下内容本应在第 {entry.unlockChapter} 章后解锁。
            </div>
          )}

          {/* 2. 它干什么（工作原理） */}
          <Section title="它干什么" eyebrow="HOW IT WORKS">
            <div className="panel space-y-3 rounded-lg p-5 text-sm leading-7 text-silk-300">
              {entry.principle.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="flex gap-2 rounded-md bg-ink-800 p-3 text-silk-100">
                <Quote className="h-4 w-4 shrink-0 text-copper-400" />
                生活类比：{entry.analogy}
              </p>
            </div>
          </Section>

          {/* 2.5 原理图看一看 */}
          {entry.schematic && (
            <Section title="原理图看一看" eyebrow="SCHEMATIC">
              <div className="panel rounded-lg p-5">
                <div className="mx-auto max-w-md rounded-md border border-ink-700 bg-ink-900/80 p-2">
                  <MiniSchematic fig={entry.schematic.fig} className="h-auto w-full" />
                </div>
                <p className="mt-3 text-center font-bold text-silk-100">{entry.schematic.title}</p>
                <p className="mx-auto mt-1.5 max-w-xl text-center text-[13px] leading-6 text-silk-300">
                  {entry.schematic.note}
                </p>
              </div>
            </Section>
          )}

          {/* 3. 交互小实验 */}
          {entry.lab && (
            <Section title="动手试一试" eyebrow="INTERACTIVE LAB">
              <div className="panel-raised rounded-lg p-5">
                <div className="mb-4 flex items-center gap-2 font-mono text-[13px] text-sig-cyan">
                  <FlaskConical className="h-4 w-4" />
                  {LAB_TITLES[entry.lab]}
                </div>
                <Lab kind={entry.lab} />
              </div>
            </Section>
          )}

          {/* 4. 关键参数表 */}
          <Section title="参数怎么看" eyebrow="DATASHEET">
            <div className="panel overflow-hidden rounded-lg">
              <table className="w-full text-left font-mono text-[13px]">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-800 text-xs text-silk-500">
                    <th className="px-4 py-2.5 font-medium">参数</th>
                    <th className="px-4 py-2.5 font-medium">符号</th>
                    <th className="px-4 py-2.5 font-medium">单位</th>
                    <th className="px-4 py-2.5 font-medium">怎么选 / 教学批注</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.params.map((p, i) => (
                    <tr key={i} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-800/60">
                      <td className="px-4 py-2.5 text-silk-100">{p.param}</td>
                      <td className="px-4 py-2.5 text-sig-cyan">{p.symbol}</td>
                      <td className="px-4 py-2.5 text-copper-300">{p.unit}</td>
                      <td className="px-4 py-2.5 font-sans text-silk-300">{p.guide}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 4.5 布线案例 + 计算方式 双栏 */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="怎么接线" eyebrow="WIRING CASE">
              <div className="panel space-y-3 rounded-lg p-5 text-sm leading-6 text-silk-300">
                <p className="font-bold text-silk-100">{entry.wiring.title}</p>
                <ol className="space-y-2">
                  {entry.wiring.steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="shrink-0 font-mono text-sig-cyan">{String(i + 1).padStart(2, '0')}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                {entry.wiring.note && (
                  <p className="rounded-md border-l-[3px] border-copper-500 bg-ink-800 px-3 py-2 text-[13px] leading-5 text-silk-300">
                    {entry.wiring.note}
                  </p>
                )}
              </div>
            </Section>
            <Section title="算一算" eyebrow="MATH IT OUT">
              <div className="space-y-3">
                {entry.calc.map((c, i) => (
                  <div key={i} className="panel rounded-lg p-4 text-sm leading-6 text-silk-300">
                    <p className="font-bold text-silk-100">{c.title}</p>
                    <p className="mt-1.5 rounded-md bg-ink-800 px-3 py-1.5 font-mono text-[13px] text-sig-cyan">
                      {c.formula}
                    </p>
                    <p className="mt-2 text-[13px] leading-5 text-silk-300">
                      <span className="font-mono text-[11px] text-pcb-400">代入示例 · </span>
                      {c.example}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* 5. 选型要点 + 6. 常见坑 双栏 */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="选型要点" eyebrow="SELECTION">
              <ul className="panel space-y-2.5 rounded-lg p-5 text-sm leading-6 text-silk-300">
                {entry.selection.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <Wrench className="mt-1 h-3.5 w-3.5 shrink-0 text-pcb-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="常见坑（老周吐槽）" eyebrow="PITFALLS">
              <ul className="space-y-2.5 text-sm leading-6">
                {entry.pitfalls.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-copper-600/50 bg-ink-850 p-3.5 text-silk-300"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* 7. 3D 实物预览与封装（亮背影棚灯箱 + 原封装文字） */}
          <Section title="长什么样" eyebrow="PACKAGE">
            <Codex3DCard entryId={entry.id} name={entry.name} />
            <div className="panel rounded-lg p-5">
              <ul className="space-y-1.5">
                {entry.pkg.packages.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-silk-300">
                    <span className="font-mono text-sig-cyan">{String(i + 1).padStart(2, '0')}</span>
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-ink-700 pt-3 text-xs leading-5 text-silk-500">
                {entry.pkg.note}
              </p>
            </div>
          </Section>

          {/* 8. 在哪关用到 */}
          <Section title="在哪关用到" eyebrow="USED IN LEVELS">
            <div className="flex flex-wrap gap-2">
              {entry.usedIn.map((u, i) => (
                <span
                  key={i}
                  className={cn(
                    'rounded border px-3 py-1.5 font-mono text-xs',
                    u.pending
                      ? 'border-dashed border-silk-700 bg-ink-800/60 text-silk-500'
                      : 'border-ink-600 bg-ink-800 text-silk-300',
                  )}
                >
                  {u.pending ? u.label : `第 ${u.chapter} 章 · ${u.label}`}
                </span>
              ))}
            </div>
          </Section>
        </>
      )}
    </motion.div>
  );
}
