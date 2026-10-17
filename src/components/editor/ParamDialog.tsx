// 编辑器 — 参数弹窗（双击或再次点击元件，236px 小卡）
// 数值编辑三通道：滑杆（即时生效）· 数字框（本地草稿，Enter/失焦提交）· ± 步进按钮
// B6 参数防呆：空值/NaN/越界一律不写入，钳位到 schema min~max 并用 toast 说明。
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ComponentSpec } from '@/engine/types';
import { COMP_META, formatSI } from '@/engine/solver';
import { PARAM_SCHEMA, type ParamField } from './symbols';
import { toast } from './toast';

export interface ParamDialogProps {
  comp: ComponentSpec;
  /** 屏幕坐标锚点 */
  anchor: { x: number; y: number };
  onChange: (params: Record<string, number | string | boolean>) => void;
  /** 方向（旋转）变更；不传则不显示方向行（旧调用方不受影响） */
  onRotate?: (rotation: 0 | 90 | 180 | 270) => void;
  onClose: () => void;
}

export default function ParamDialog({ comp, anchor, onChange, onRotate, onClose }: ParamDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const schema = PARAM_SCHEMA[comp.type] ?? [];

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const setParam = (key: string, value: number | string | boolean) => {
    // B6：NaN / Infinity 绝不写进电路（否则求解器矩阵直接烂掉）
    if (typeof value === 'number' && !Number.isFinite(value)) {
      toast('参数值非法（NaN / 无穷大），已忽略这次修改。', 'error');
      return;
    }
    onChange({ ...(comp.params ?? {}), [key]: value });
  };

  // 贴边摆放：优先出现在锚点右下，越界时向左/上收，且不压住顶栏
  const width = 244;
  const estHeight = 96 + schema.length * 74 + (onRotate ? 56 : 0);
  const left = Math.max(8, Math.min(anchor.x + 16, window.innerWidth - width - 12));
  const top = Math.max(68, Math.min(anchor.y - 8, window.innerHeight - estHeight - 12));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="panel-raised fixed z-[60] rounded-lg p-3"
      style={{ left, top, width }}
      onPointerDown={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-xs text-sig-cyan">{comp.id}</span>
        <span className="text-xs text-silk-500">{COMP_META[comp.type].name}</span>
      </div>
      {/* 方向（旋转）：四个朝向小按钮，与画布上 R 键同一状态；locked 元件禁用 */}
      {onRotate && (
        <div className="mb-2">
          <span className="mb-1 block text-xs text-silk-500">方向</span>
          <div className="flex gap-1">
            {([0, 90, 180, 270] as const).map(rot => {
              const on = (comp.rotation ?? 0) === rot;
              return (
                <button
                  key={rot}
                  type="button"
                  disabled={comp.locked === true}
                  onClick={() => onRotate(rot)}
                  title={comp.locked ? '元件已锁定，不能旋转' : `转到 ${rot}°`}
                  className={
                    'flex-1 rounded border px-1 py-1 font-mono text-[11px] transition-colors ' +
                    (on ? 'border-pcb-400 bg-pcb-600/30 text-pcb-300' : 'border-ink-700 text-silk-500 hover:border-ink-600') +
                    (comp.locked ? ' cursor-not-allowed opacity-40' : '')
                  }
                >
                  {rot}°
                </button>
              );
            })}
          </div>
        </div>
      )}
      {schema.length === 0 && (
        <p className="text-xs text-silk-500">该元件无可调参数。</p>
      )}
      {schema.map(f => (
        <FieldRow key={f.key} field={f} comp={comp} onSet={setParam} />
      ))}
      {COMP_META[comp.type].note && (
        <p className="mt-2 border-t border-ink-700 pt-2 text-[10px] leading-relaxed text-silk-700">
          模型：{COMP_META[comp.type].note}
        </p>
      )}
      <p className="mt-1 text-right font-mono text-[9px] text-silk-700">Esc 关闭 · 再次点击元件也可唤出</p>
    </motion.div>
  );
}

function FieldRow({ field: f, comp, onSet }: { field: ParamField; comp: ComponentSpec; onSet: (k: string, v: number | string | boolean) => void }) {
  const raw = comp.params?.[f.key];
  if (f.toggle) {
    return (
      <label className="mb-2 flex cursor-pointer items-center justify-between text-xs text-silk-300">
        <span>{f.label}</span>
        <input
          type="checkbox"
          checked={raw === true}
          onChange={e => onSet(f.key, e.target.checked)}
          className="h-4 w-4 accent-pcb-500"
        />
      </label>
    );
  }
  if (f.options) {
    return (
      <div className="mb-2">
        <span className="mb-1 block text-xs text-silk-500">{f.label}</span>
        <div className="flex gap-1">
          {f.options.map(o => (
            <button
              key={o.value}
              onClick={() => onSet(f.key, o.value)}
              className={
                'flex-1 rounded border px-1 py-1 text-xs transition-colors ' +
                (raw === o.value ? 'border-pcb-400 bg-pcb-600/30 text-pcb-300' : 'border-ink-700 text-silk-500 hover:border-ink-600')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <NumericField field={f} comp={comp} onSet={onSet} />;
}

export interface NumericCommit {
  /** 可写入的值；null = 输入非法、应保持原值 */
  value: number | null;
  /** 给玩家看的说明（钳位/恢复原值），无需提示时为 undefined */
  notice?: string;
  kind: 'info' | 'error';
}

/** B6 纯函数：把数字框的原始文本规范化成可写入的合法值（空/NaN → null；越界 → 钳位） */
export function normalizeNumericInput(field: ParamField, text: string, current: number): NumericCommit {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const show = (v: number) => String(Number(v.toPrecision(6)));
  const cleaned = text.trim().replace(',', '.');
  const val = Number(cleaned);
  const safeCurrent = Number.isFinite(current) ? Math.min(Math.max(current, min), max) : min;
  if (cleaned === '' || !Number.isFinite(val)) {
    return {
      value: null, kind: 'error',
      notice: `「${field.label}」要填数字，已恢复原值 ${show(safeCurrent)}${field.unit ?? ''}。`,
    };
  }
  let v = Math.min(Math.max(val, min), max);
  let notice: string | undefined;
  if (v !== val) {
    notice = `「${field.label}」超出允许范围（${show(min)}~${show(max)}${field.unit ?? ''}），已自动钳位到 ${show(v)}。`;
  }
  if (field.step && !field.log) v = Math.min(Math.max(Math.round(v / field.step) * field.step, min), max);
  if (!Number.isFinite(v)) return { value: null, kind: 'error', notice };
  return { value: Number(v.toPrecision(6)), notice, kind: 'info' };
}

/** 数值：滑杆即时 + 文本框草稿式提交 + ± 步进（独立组件保证 hooks 顺序稳定） */
function NumericField({ field: f, comp, onSet }: { field: ParamField; comp: ComponentSpec; onSet: (k: string, v: number | string | boolean) => void }) {
  const raw = comp.params?.[f.key];
  const min = f.min ?? 0;
  const max = f.max ?? 100;
  const rawNum = typeof raw === 'number' ? raw : Number(raw ?? f.min ?? 0);
  // B6：历史数据里可能存着 NaN/越界值，显示与步进一律用「已钳位的安全值」
  const num = Number.isFinite(rawNum) ? Math.min(Math.max(rawNum, min), max) : min;
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  const show = (v: number) => String(Number(v.toPrecision(6)));

  // 文本框走本地草稿：聚焦期间随便打字，Enter 或失焦才提交 —— 不再和 toPrecision 打架
  const [draft, setDraft] = useState<string | null>(null); // null = 非编辑态，显示规范值
  const commitDraft = () => {
    if (draft === null) return;
    const result = normalizeNumericInput(f, draft, num);
    if (result.notice) toast(result.notice, result.kind);
    if (result.value !== null) onSet(f.key, result.value);
    setDraft(null); // 无论有效与否都退出编辑态，回显规范值
  };

  const nudge = (dir: 1 | -1) => {
    let v: number;
    if (f.log) {
      // 对数参数按 1-2.2-4.7 标称序列步进（E3），手感接近真实元件选型
      v = nextPreferred(num, dir, min, max);
    } else {
      const st = f.step ?? (max - min <= 20 ? 1 : (max - min) / 100);
      v = num + dir * st;
      if (f.step) v = Math.round(v / f.step) * f.step;
    }
    onSet(f.key, Number(clamp(v).toPrecision(6)));
  };

  const toSlider = (val: number) =>
    f.log
      ? (Math.log10(Math.max(val, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
      : (val - min) / (max - min);
  const fromSlider = (t: number) => {
    if (f.log) return Math.pow(10, Math.log10(min) + t * (Math.log10(max) - Math.log10(min)));
    return min + t * (max - min);
  };

  const display = draft ?? show(num);

  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between gap-1 text-xs">
        <span className="shrink-0 text-silk-500">{f.label}</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => nudge(-1)}
            title="减小"
            className="h-5 w-5 rounded border border-ink-600 font-mono leading-none text-silk-300 transition-colors hover:border-sig-cyan hover:text-sig-cyan"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={display}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => setDraft(display)}
            onBlur={commitDraft}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                commitDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-[72px] rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-right font-mono text-[11px] text-silk-100 outline-none focus:border-sig-cyan"
          />
          {f.unit && <span className="w-7 font-mono text-[10px] text-silk-700">{f.unit}</span>}
          <button
            type="button"
            onClick={() => nudge(1)}
            title="增大"
            className="h-5 w-5 rounded border border-ink-600 font-mono leading-none text-silk-300 transition-colors hover:border-sig-cyan hover:text-sig-cyan"
          >
            ＋
          </button>
        </span>
      </div>
      <input
        type="range"
        min={0} max={1} step={0.001}
        value={Math.min(Math.max(toSlider(num), 0), 1)}
        onChange={e => {
          let val = fromSlider(Number(e.target.value));
          if (f.step && !f.log) val = Math.round(val / f.step) * f.step;
          val = clamp(val); // B6：滑杆也兜一层，绝不写入越界/NaN
          if (Number.isFinite(val)) onSet(f.key, Number(val.toPrecision(6)));
        }}
        className="w-full accent-pcb-500"
      />
      {(f.help || f.log) && (
        <p className="mt-0.5 text-[10px] leading-relaxed text-silk-700">
          {f.log && <span className="font-mono">当前 {formatSI(num, f.unit ?? '')}{f.help ? ' · ' : ''}</span>}
          {f.help}
        </p>
      )}
    </div>
  );
}

/** 对数参数的 1-2.2-4.7 标称序列步进（E3 系列），dir=-1 往小、+1 往大 */
function nextPreferred(cur: number, dir: 1 | -1, min: number, max: number): number {
  const SERIES = [1, 2.2, 4.7];
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(cur), 1e-12))));
  const norm = cur / magnitude; // ∈ [1,10)
  let idx = SERIES.findIndex(s => s >= norm - 1e-9);
  if (idx < 0) idx = SERIES.length; // norm > 4.7 → 下一个是下一档的 1
  let ni = idx + dir;
  let mag = magnitude;
  if (ni < 0) { ni = SERIES.length - 1; mag /= 10; }
  if (ni >= SERIES.length) { ni = 0; mag *= 10; }
  const v = SERIES[ni] * mag;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
