// 公式速查 / 术语表 / 老手角落 区块
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { FORMULAS, GLOSSARY, PRO_CORNER } from './data/reference';
import { cn } from '@/lib/utils';

/* ---------- 公式速查 ---------- */
export function FormulaSection() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {FORMULAS.map((f, i) => (
        <motion.div
          key={f.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
          className="group panel flex flex-col gap-2 rounded-lg p-4 transition-all duration-200 hover:-translate-y-1 hover:border-copper-500/70"
        >
          <div className="font-mono text-xs text-silk-500">{f.name}</div>
          <div className="text-glow-copper font-mono text-lg font-bold text-copper-400">
            {f.formula}
          </div>
          <div className="font-mono text-[11px] leading-5 text-silk-500">{f.vars}</div>
          <p className="text-sm leading-6 text-silk-300">{f.note}</p>
          <div className="mt-auto flex items-center justify-between border-t border-ink-700 pt-2 font-mono text-[11px]">
            <span className="text-silk-500">{f.scene}</span>
            {f.chapter && <span className="text-sig-cyan">第 {f.chapter} 章用到</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- 术语表（可搜索 + 高亮 + 分组锚点） ---------- */
function Highlight({ text, kw }: { text: string; kw: string }) {
  if (!kw) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-sig-cyan/30 text-sig-cyan">{text.slice(idx, idx + kw.length)}</mark>
      {text.slice(idx + kw.length)}
    </>
  );
}

export function GlossarySection() {
  const [kw, setKw] = useState('');
  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return GLOSSARY;
    return GLOSSARY.filter(
      g => g.term.toLowerCase().includes(k) || g.def.toLowerCase().includes(k),
    );
  }, [kw]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof GLOSSARY>();
    for (const g of filtered) {
      const arr = map.get(g.group) ?? [];
      arr.push(g);
      map.set(g.group, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
  }, [filtered]);

  return (
    <div className="space-y-5">
      <label className="panel flex w-72 items-center gap-2 rounded-md px-3">
        <Search className="h-4 w-4 text-silk-500" />
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="搜术语 / 释义…"
          className="h-10 w-full bg-transparent font-mono text-sm text-silk-100 outline-none placeholder:text-silk-700"
        />
      </label>

      <div className="space-y-6">
        {groups.map(([letter, terms]) => (
          <div key={letter} id={`glossary-${letter}`} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-bold text-copper-400">{letter}</span>
              <div className="h-px flex-1 bg-ink-700" />
              <span className="font-mono text-xs text-silk-500">{terms.length} 条</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {terms.map(g => (
                <div
                  key={g.term}
                  className="panel flex gap-3 rounded-md px-3.5 py-2.5 transition-all duration-250"
                >
                  <dt className="w-32 shrink-0 font-mono text-[13px] font-bold text-silk-100">
                    <Highlight text={g.term} kw={kw.trim()} />
                  </dt>
                  <dd className="text-[13px] leading-5 text-silk-300">
                    <Highlight text={g.def} kw={kw.trim()} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center font-mono text-sm text-silk-500">
            没有匹配「{kw}」的术语，换个关键词试试。
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- 老手角落（始终开放，进阶折叠卡） ---------- */
export function ProCornerSection() {
  const [open, setOpen] = useState<string | null>(PRO_CORNER[0].id);
  return (
    <div className="space-y-3">
      <p className="text-sm text-silk-500">
        写给复习的老手：不讲故事，直接上工程判断。此区不受剧透锁定影响，始终开放。
      </p>
      {PRO_CORNER.map(a => {
        const expanded = open === a.id;
        return (
          <div
            key={a.id}
            className={cn(
              'overflow-hidden rounded-lg border transition-colors duration-200',
              expanded ? 'border-copper-500 bg-ink-850' : 'border-copper-600/50 bg-ink-850 hover:border-copper-500/80',
            )}
          >
            <button
              onClick={() => setOpen(expanded ? null : a.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <div className="flex-1">
                <div className="font-bold text-silk-100">{a.title}</div>
                <div className="font-mono text-xs text-copper-400">{a.subtitle}</div>
              </div>
              <ChevronDown
                className={cn('h-4 w-4 text-copper-400 transition-transform duration-200', expanded && 'rotate-180')}
              />
            </button>
            <motion.div
              initial={false}
              animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-3 border-t border-copper-600/40 px-5 py-4">
                {a.body.map((p, i) => (
                  <p key={i} className="text-sm leading-7 text-silk-300">
                    {p}
                  </p>
                ))}
                <p className="copper-window inline-block rounded px-3 py-1.5 font-mono text-[13px] font-bold">
                  一句话带走：{a.takeaway}
                </p>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
