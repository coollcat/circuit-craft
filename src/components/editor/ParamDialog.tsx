// 编辑器 — 参数弹窗（双击元件，220px 小卡）：滑杆 + 数字输入 + 一句说明
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ComponentSpec } from '@/engine/types';
import { COMP_META, formatSI } from '@/engine/solver';
import { PARAM_SCHEMA, type ParamField } from './symbols';

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
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  const setParam = (key: string, value: number | string | boolean) => {
    onChange({ ...(comp.params ?? {}), [key]: value });
  };

  const left = Math.min(anchor.x + 16, window.innerWidth - 260);
  const top = Math.min(anchor.y, window.innerHeight - 60 - schema.length * 72 - (onRotate ? 52 : 0));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="panel-raised fixed z-[60] w-[236px] rounded-lg p-3"
      style={{ left, top }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-xs text-sig-cyan">{comp.id}</span>
        <span className="text-xs text-silk-500">{COMP_META[comp.type].name}</span>
      </div>
      {/* 方向（旋转）：四个朝向小按钮，与画布上 R 键 / 悬浮旋转按钮同一状态；locked 元件禁用 */}
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
  const num = typeof raw === 'number' ? raw : Number(raw ?? f.min ?? 0);
  const min = f.min ?? 0;
  const max = f.max ?? 100;
  // 对数滑杆
  const toSlider = (val: number) => (f.log ? (Math.log10(Math.max(val, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (val - min) / (max - min));
  const fromSlider = (t: number) => {
    if (f.log) return Math.pow(10, Math.log10(min) + t * (Math.log10(max) - Math.log10(min)));
    return min + t * (max - min);
  };
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-silk-500">{f.label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            value={Number.isFinite(num) ? Number(num.toPrecision(4)) : 0}
            step={f.step ?? 1}
            onChange={e => {
              const val = Number(e.target.value);
              if (Number.isFinite(val)) onSet(f.key, val);
            }}
            className="w-20 rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-right font-mono text-[11px] text-silk-100 outline-none focus:border-sig-cyan"
          />
          {f.unit && <span className="w-6 font-mono text-[10px] text-silk-700">{f.unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={0} max={1} step={0.001}
        value={Math.min(Math.max(toSlider(num), 0), 1)}
        onChange={e => {
          let val = fromSlider(Number(e.target.value));
          if (f.step && !f.log) val = Math.round(val / f.step) * f.step;
          onSet(f.key, Number(val.toPrecision(4)));
        }}
        className="w-full accent-pcb-500"
      />
      {f.help && <p className="mt-0.5 text-[10px] text-silk-700">{f.help}</p>}
      {f.log && <p className="text-[10px] text-silk-700">当前：{formatSI(num, f.unit ?? '')}</p>}
    </div>
  );
}
