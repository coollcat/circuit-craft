/* eslint-disable react-refresh/only-export-components */
// 编辑器 — 元件面板（左栏 264px，可折叠）：搜索 + 分组手风琴 + 拖拽/双击放入画布
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Lock, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import type { ComponentSpec, ComponentType } from '@/engine/types';
import { COMP_META, DEFAULT_PARAMS } from '@/engine/solver';
import { SymbolGlyph } from './symbols';
import { cn } from '@/lib/utils';

export interface PalettePanelProps {
  /** 可用 palette 元件（关卡：固定 id；沙盒：全量） */
  items: ComponentSpec[];
  /** 已在画布上的 palette id（每 palette 件限放一个 → 灰显） */
  usedIds: Set<string>;
  /** 锁定分组（未解锁章节），显示锁 */
  lockedGroups?: Set<string>;
  onAdd: (item: ComponentSpec) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  footer?: React.ReactNode;
  className?: string;
}

const GROUP_ORDER = ['电源', '无源', '半导体', '集成', '机电', '无线', '仪器'];

export default function PalettePanel({
  items, usedIds, lockedGroups, onAdd, collapsed, onToggleCollapse, footer, className,
}: PalettePanelProps) {
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(GROUP_ORDER));

  const groups = useMemo(() => {
    const map = new Map<string, ComponentSpec[]>();
    const q = query.trim().toLowerCase();
    for (const item of items) {
      const meta = COMP_META[item.type];
      if (q && !meta.name.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q) && !item.type.includes(q)) continue;
      const g = meta.group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return GROUP_ORDER.filter(g => map.has(g)).map(g => ({ name: g, items: map.get(g)! }));
  }, [items, query]);

  const toggleGroup = (g: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className={cn('flex w-12 flex-col items-center border-r border-ink-700 bg-ink-850 py-3', className)}>
        <button onClick={onToggleCollapse} className="rounded p-2 text-silk-300 hover:bg-ink-800 hover:text-silk-100" title="展开元件面板">
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <span className="mt-4 font-mono text-[10px] tracking-widest text-silk-700" style={{ writingMode: 'vertical-rl' }}>元件面板</span>
      </div>
    );
  }

  return (
    <div className={cn('flex w-[264px] shrink-0 flex-col border-r border-ink-700 bg-ink-850', className)}>
      <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded border border-ink-700 bg-ink-900 px-2">
          <Search className="h-3.5 w-3.5 text-silk-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索元件 / 位号…"
            className="w-full bg-transparent text-xs text-silk-100 outline-none placeholder:text-silk-700"
          />
        </div>
        <button onClick={onToggleCollapse} className="rounded p-1.5 text-silk-500 hover:bg-ink-800 hover:text-silk-100" title="折叠">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {groups.map(g => {
          const locked = lockedGroups?.has(g.name);
          const open = openGroups.has(g.name) || query.length > 0;
          return (
            <div key={g.name} className="mb-1">
              <button
                onClick={() => toggleGroup(g.name)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs font-bold text-silk-300 hover:bg-ink-800"
              >
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {g.name}
                {locked && <Lock className="h-3 w-3 text-silk-700" />}
                <span className="ml-auto font-mono text-[10px] text-silk-700">{g.items.length}</span>
              </button>
              {open && (
                <div className="grid grid-cols-2 gap-1.5 p-1">
                  {g.items.map(item => (
                    <PaletteChip key={item.id} item={item} used={usedIds.has(item.id)} locked={locked} onAdd={() => onAdd(item)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-silk-700">没有匹配的元件</p>
        )}
      </div>

      {footer && <div className="border-t border-ink-700 px-3 py-2">{footer}</div>}
    </div>
  );
}

function PaletteChip({ item, used, locked, onAdd }: { item: ComponentSpec; used?: boolean; locked?: boolean; onAdd: () => void }) {
  const meta = COMP_META[item.type];
  const disabled = used || locked;
  const mainParam = Object.entries(DEFAULT_PARAMS[item.type])
    .filter(([k]) => ['resistance', 'capacitance', 'inductance', 'voltage', 'vout', 'impedance', 'ratio', 'light', 'temp', 'r25'].includes(k))
    .map(([, v]) => v)[0];
  return (
    <button
      draggable={!disabled}
      onDragStart={e => {
        e.dataTransfer.setData('application/x-cc-palette', item.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onDoubleClick={() => !disabled && onAdd()}
      onClick={() => !disabled && onAdd()}
      disabled={disabled}
      title={locked ? '后续章节解锁' : used ? '已在画布上（每种限放一个）' : `${meta.name} · 点击或拖入画布${meta.note ? `\n模型：${meta.note}` : ''}`}
      className={cn(
        'group flex flex-col items-center gap-1 rounded-md border border-ink-700 bg-ink-900/60 p-2 transition-all',
        disabled ? 'cursor-not-allowed opacity-35' : 'hover:scale-[1.03] hover:border-pcb-400 active:scale-95 cursor-grab',
      )}
    >
      <div className="h-12 w-12 text-silk-100">
        {/* 符号色票固定阻焊深底：明暗主题下元件符号始终按暗底丝印渲染（与实物板一致） */}
        <svg viewBox="-40 -40 80 80" className="h-full w-full rounded-md" style={{ background: '#0E1611' }}>
          <SymbolGlyph type={item.type} closed={item.params?.closed === true} />
        </svg>
      </div>
      <span className="text-[11px] leading-tight text-silk-300">{meta.name}</span>
      <span className="font-mono text-[10px] leading-none text-sig-cyan">
        {item.id}{typeof mainParam === 'number' ? ` · ${mainParam}` : ''}
      </span>
    </button>
  );
}

/** 沙盒全量 palette（所有元件类型） */
export function fullSandboxPalette(): ComponentSpec[] {
  const types = Object.keys(COMP_META) as ComponentType[];
  return types.map(t => ({
    id: `NEW-${t}`,
    type: t,
    x: 0, y: 0,
    params: { ...DEFAULT_PARAMS[t] },
  }));
}
