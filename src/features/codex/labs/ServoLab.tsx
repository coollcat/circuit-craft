// 图鉴实验 · SG90 舵机：把实物图解搬进图鉴，用预设按钮 + 拖拽演示「脉宽决定角度」与堵转。
import { useState } from 'react';
import ServoFigure from '@/features/figures/servo-sg90/ServoFigure';
import { PULSE_MAX_MS, PULSE_MIN_MS, STALL_CURRENT_A, servoState } from '@/features/figures/servo-sg90/model';

const PRESETS: [string, number][] = [
  ['0°', PULSE_MIN_MS],
  ['45°', 1.0],
  ['90° 中位', 1.5],
  ['135°', 2.0],
  ['180°', PULSE_MAX_MS],
  ['拧过头（2.7ms）', 2.7],
];

export default function ServoLab() {
  const [pulse, setPulse] = useState(1.5);
  const st = servoState(pulse);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(([label, value]) => (
          <button
            key={label}
            onClick={() => setPulse(value)}
            className={
              'rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ' +
              (Math.abs(pulse - value) < 1e-6
                ? 'border-pcb-400 bg-pcb-400/15 text-pcb-200'
                : 'border-ink-700 bg-ink-900/60 text-silk-300 hover:border-pcb-400/60 hover:text-pcb-200')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 实物图解：与 /figures 页、离线预览共用同一份几何与模型 */}
      <ServoFigure pulseMs={pulse} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="脉宽" value={`${st.pulseMs.toFixed(2)} ms`} sub={`周期 20ms（50Hz）`} />
        <Stat label="占空比" value={`${st.duty.toFixed(1)} %`} sub={`${st.pulseMs.toFixed(2)} / 20 ms`} />
        <Stat
          label="角度"
          value={`${st.angle.toFixed(0)} °`}
          sub={st.stalled ? '顶到限位 → 堵转' : `全程约 ${((180 / 60) * 0.1).toFixed(1)}s 走完 180°`}
        />
      </div>

      <p
        className={
          'rounded-md border px-3 py-2 text-xs leading-relaxed ' +
          (st.stalled ? 'border-danger/50 bg-danger/10 text-danger' : 'border-ink-700 bg-ink-900/60 text-silk-300')
        }
      >
        {st.verdict}
        {st.stalled && `（堵转电流约 ${(STALL_CURRENT_A * 1000).toFixed(0)}mA，是空载的 ${(STALL_CURRENT_A / 0.01).toFixed(0)} 倍 —— 长时间顶住会把齿轮和线圈烧掉）`}
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/60 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-silk-500">{label}</div>
      <div className="mt-0.5 font-mono text-lg text-silk-100">{value}</div>
      <div className="mt-0.5 text-[11px] text-silk-500">{sub}</div>
    </div>
  );
}
