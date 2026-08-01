// 元件图鉴 Codex（路由 /codex）
// 元件百科 + 可交互小实验 + 公式速查 + 术语表 + 老手角落，支持 /codex#<entryId> 直达
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import SilkTag from '@/components/SilkTag';
import TraceDivider from '@/components/TraceDivider';
import PadButton from '@/components/PadButton';
import { useProgress } from '@/store/progress';
import { CATEGORIES, ENTRIES, ENTRY_MAP } from '@/features/codex/data/entries';
import { isEntryUnlocked } from '@/features/codex/unlock';
import EntryCard from '@/features/codex/EntryCard';
import EntryDetail from '@/features/codex/EntryDetail';
import { FormulaSection, GlossarySection, ProCornerSection } from '@/features/codex/ReferenceSections';
import Lab, { LAB_DESCS, LAB_TITLES } from '@/features/codex/labs/index';
import type { LabKind } from '@/features/codex/data/entries';
import { cn } from '@/lib/utils';

const LAB_ORDER: LabKind[] = ['bands', 'rc', 'led', 'opamp'];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionHead({
  id,
  eyebrow,
  title,
  desc,
}: {
  id: string;
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div id={id} className="scroll-mt-20 space-y-3">
      <SilkTag>{eyebrow}</SilkTag>
      <h2 className="text-2xl font-bold text-silk-100">{title}</h2>
      {desc && <p className="text-sm text-silk-500">{desc}</p>}
    </div>
  );
}

/** 小实验区：4 个实验 Tab 切换 */
function LabsSection() {
  const [active, setActive] = useState<LabKind>('bands');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {LAB_ORDER.map(k => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={cn(
              'panel rounded-lg p-3 text-left transition-all duration-200',
              active === k
                ? 'glow-pcb border-pcb-400'
                : 'hover:border-ink-600',
            )}
          >
            <div className={cn('text-sm font-bold', active === k ? 'text-pcb-300' : 'text-silk-100')}>
              {LAB_TITLES[k]}
            </div>
            <div className="mt-1 text-xs leading-5 text-silk-500">{LAB_DESCS[k]}</div>
          </button>
        ))}
      </div>
      <div className="panel-raised rounded-lg p-5">
        <Lab kind={active} />
      </div>
    </div>
  );
}

export default function Codex() {
  const completed = useProgress(s => s.completed);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // /codex#<entryId> 直达（关卡内 📖 跳转）
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace('#', '');
      setSelected(ENTRY_MAP[id] ? id : null);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const openEntry = (id: string) => {
    setSelected(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeEntry = () => {
    setSelected(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const unlockedMap = useMemo(
    () => Object.fromEntries(ENTRIES.map(e => [e.id, isEntryUnlocked(completed, e.unlockChapter)])),
    [completed],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENTRIES;
    return ENTRIES.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.en.toLowerCase().includes(q) ||
        e.refdes.toLowerCase().includes(q) ||
        e.keywords.some(k => k.toLowerCase().includes(q)),
    );
  }, [query]);

  const entry = selected ? ENTRY_MAP[selected] : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-12 pb-24">
      {/* 顶部标题区 */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-end justify-between py-10"
      >
        <div className="space-y-3">
          <SilkTag>CODEX / KNOWLEDGE BASE</SilkTag>
          <h1 className="text-4xl font-black text-silk-100">元件图鉴</h1>
          <p className="text-silk-500">每一个元件，都值得被认真对待。</p>
        </div>
        <label className="panel flex w-80 items-center gap-2 rounded-md px-3">
          <Search className="h-4 w-4 text-silk-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜元件 / 术语 / 公式…"
            className="h-10 w-full bg-transparent font-mono text-sm text-silk-100 outline-none placeholder:text-silk-700"
          />
        </label>
      </motion.header>

      <div className="flex gap-10">
        {/* S1 分类侧栏（224px sticky） */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="sticky top-20 w-56 shrink-0 self-start"
        >
          <nav className="space-y-6">
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="space-y-1.5">
                <h4 className="text-sm font-bold tracking-wide text-silk-100">{cat.label}</h4>
                {ENTRIES.filter(e => e.category === cat.id).map(e => {
                  const active = selected === e.id;
                  const locked = !unlockedMap[e.id];
                  return (
                    <button
                      key={e.id}
                      onClick={() => openEntry(e.id)}
                      className={cn(
                        'block w-full border-l-[3px] py-1 pl-3 text-left text-sm transition-colors',
                        active
                          ? 'border-pcb-400 text-silk-100'
                          : 'border-transparent text-silk-500 hover:border-ink-600 hover:text-silk-300',
                      )}
                    >
                      {e.name}
                      {locked && <span className="ml-1.5 font-mono text-[10px] text-silk-700">Ch.{e.unlockChapter}</span>}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="space-y-1.5 border-t border-ink-700 pt-4">
              <h4 className="text-sm font-bold tracking-wide text-silk-100">工具箱</h4>
              {(
                [
                  ['labs', '可交互小实验'],
                  ['formulas', '公式速查'],
                  ['glossary', '术语表'],
                  ['corner', '老手角落'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    closeEntry();
                    window.setTimeout(() => scrollToId(id), 60);
                  }}
                  className="block w-full border-l-[3px] border-transparent py-1 pl-3 text-left text-sm text-silk-500 transition-colors hover:border-ink-600 hover:text-copper-300"
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* 小焊提示卡 */}
          <div className="panel mt-8 flex gap-3 rounded-lg p-3.5">
            <img src="/npc-xiaohan.png" alt="小焊" className="h-11 w-11 shrink-0 rounded-full border border-pcb-400/50" />
            <p className="text-xs leading-5 text-silk-300">
              <span className="font-bold text-pcb-300">小焊：</span>
              在关卡里卡住了？点元件面板上的 📖 会直接跳到这里对应的一页。
            </p>
          </div>
        </motion.aside>

        {/* 主区域 */}
        <main className="min-w-0 flex-1">
          {entry ? (
            <EntryDetail entry={entry} unlocked={unlockedMap[entry.id]} onBack={closeEntry} />
          ) : (
            <div className="space-y-16">
              {/* S2 条目网格 */}
              <section className="space-y-8">
                {CATEGORIES.map(cat => {
                  const list = filtered.filter(e => e.category === cat.id);
                  if (list.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-4">
                      <h3 className="text-base font-bold text-silk-300">
                        {cat.label}
                        <span className="ml-2 font-mono text-xs text-silk-500">{list.length} 件</span>
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {list.map((e, i) => (
                          <EntryCard
                            key={e.id}
                            entry={e}
                            index={i}
                            unlocked={unlockedMap[e.id]}
                            onOpen={openEntry}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="panel rounded-lg py-10 text-center font-mono text-sm text-silk-500">
                    没有匹配「{query}」的元件。术语和公式可以去下方工具箱搜。
                  </p>
                )}
              </section>

              <TraceDivider />

              {/* 可交互小实验 */}
              <section className="space-y-6">
                <SectionHead
                  id="labs"
                  eyebrow="SECTION / LABS"
                  title="可交互小实验"
                  desc="纯前端闭式计算，不依赖关卡引擎——调参数，看曲线，把公式玩出肌肉记忆。"
                />
                <LabsSection />
              </section>

              <TraceDivider />

              {/* S4 公式速查 */}
              <section className="space-y-6">
                <SectionHead
                  id="formulas"
                  eyebrow="SECTION / FORMULAS"
                  title="公式速查"
                  desc="每张卡配一句人话注解，考前扫一眼，干活查一下。"
                />
                <FormulaSection />
              </section>

              <TraceDivider />

              {/* S5 术语表 */}
              <section className="space-y-6">
                <SectionHead
                  id="glossary"
                  eyebrow="SECTION / GLOSSARY"
                  title="术语表"
                  desc="Gerber、DRC、去耦、铺铜……数据手册与板厂黑话速查。"
                />
                <GlossarySection />
              </section>

              <TraceDivider />

              {/* 老手角落（始终开放） */}
              <section className="space-y-6">
                <SectionHead
                  id="corner"
                  eyebrow="SECTION / PRO CORNER"
                  title="老手角落"
                  desc="进阶折叠卡：去耦布局、地平面之争、TVS、负载电容——写给复习的老手。"
                />
                <ProCornerSection />
              </section>

              {/* S6 页底 CTA */}
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4 }}
                className="panel-raised flex items-center justify-between rounded-lg p-8"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-silk-100">学了就用</h3>
                  <p className="text-sm text-silk-500">
                    图鉴里的每一颗元件，都能在沙盒里拖出来通电试试。
                  </p>
                </div>
                <div className="flex gap-4">
                  <PadButton to="/sandbox" variant="ghost" size="M">
                    去沙盒里搭一个试试 →
                  </PadButton>
                  <PadButton to="/chapters" variant="primary" size="M">
                    回章节地图继续闯关 →
                  </PadButton>
                </div>
              </motion.section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
