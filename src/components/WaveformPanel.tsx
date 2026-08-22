/* eslint-disable react-refresh/only-export-components */
// 示波器面板（design.md 6.10 / level.md S4.1）：3 通道 cyan/magenta/amber、
// 时基与 V/DIV 旋钮（± 步进）、暂停态十字游标测量、大读数行、CSV 导出（沙盒）。
import { useEffect, useRef, useState } from 'react';
import { Crosshair, Download, Minus, Plus, X } from 'lucide-react';
import type { PortRef } from '@/engine/types';
import { formatSI } from '@/engine/solver';
import { waveStats, type CircuitSimulator, type RingBuffer } from '@/engine/simulator';
import { cn } from '@/lib/utils';

export const CH_COLORS = ['#45DCE8', '#E56BD6', '#FFB84D'] as const;
export const CH_NAMES = ['CH1', 'CH2', 'CH3'] as const;

const TIMEBASE_STEPS = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 1e-1, 2e-1, 5e-1, 1];
const VDIV_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];

export interface ScopeChannel { probe: PortRef | null }

export interface WaveformPanelProps {
  simRef: React.MutableRefObject<CircuitSimulator>;
  channels: ScopeChannel[];
  running: boolean;
  /** 点击通道探头按钮 → 父级进入画布探头模式 */
  onRequestProbe?: (chIdx: number) => void;
  probingChannel?: number | null;
  onClearProbe?: (chIdx: number) => void;
  timebase: number;
  onTimebase: (v: number) => void;
  voltsPerDiv: number;
  onVoltsPerDiv: (v: number) => void;
  onExportCsv?: () => void;
  className?: string;
}

function stepDown(steps: number[], v: number) {
  const i = steps.findIndex(s => s >= v * 0.999);
  return steps[Math.max(0, (i === -1 ? steps.length : i) - 1)];
}
function stepUp(steps: number[], v: number) {
  const i = steps.findIndex(s => s > v * 1.001);
  return steps[i === -1 ? steps.length - 1 : i];
}

export default function WaveformPanel({
  simRef, channels, running, onRequestProbe, probingChannel, onClearProbe,
  timebase, onTimebase, voltsPerDiv, onVoltsPerDiv, onExportCsv, className,
}: WaveformPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cursorX, setCursorX] = useState<number | null>(null); // 0..1
  const [stats, setStats] = useState<{ vpp: number; vavg: number; freq: number; duty: number }[]>([]);
  const pausedOffset = useRef(0); // 暂停回看偏移（采样数）
  const dragStart = useRef<{ x: number; offset: number } | null>(null);

  const propsRef = useRef({ channels, running, timebase, voltsPerDiv, cursorX });
  propsRef.current = { channels, running, timebase, voltsPerDiv, cursorX };

  /* ---------- 读数刷新（200ms 节流） ---------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      const sim = simRef.current;
      const out = channels.map(ch => {
        const s = ch.probe ? sim.nodeSeries(ch.probe) : undefined;
        if (!s || s.size < 2) return { vpp: 0, vavg: 0, freq: 0, duty: 0 };
        return waveStats(s, sim.dt, timebase * 10);
      });
      setStats(out);
    }, 200);
    return () => window.clearInterval(id);
  }, [channels, timebase, simRef]);

  /* ---------- Canvas 绘制循环 ---------- */
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = rect.width, H = rect.height;
      const { channels: chs, running: run, timebase: tb, voltsPerDiv: vdiv, cursorX: cx } = propsRef.current;
      const sim = simRef.current;

      // CRT 底 + 网格 8×10
      ctx.fillStyle = '#060A08';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(46,158,99,0.18)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath(); ctx.moveTo((W / 10) * i, 0); ctx.lineTo((W / 10) * i, H); ctx.stroke();
      }
      for (let i = 1; i < 8; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 8) * i); ctx.lineTo(W, (H / 8) * i); ctx.stroke();
      }
      // 中轴
      ctx.strokeStyle = 'rgba(46,158,99,0.35)';
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

      const windowSec = tb * 10;
      const nTotal = Math.min(
        Math.floor(windowSec / sim.dt),
        sim.timeHist.size,
      );
      const stride = Math.max(1, Math.floor(nTotal / W));
      const offset = run ? 0 : pausedOffset.current;

      chs.forEach((ch, ci) => {
        if (!ch.probe) return;
        const series: RingBuffer | undefined = sim.nodeSeries(ch.probe);
        if (!series || series.size < 2) return;
        ctx.strokeStyle = CH_COLORS[ci];
        ctx.lineWidth = 2;
        ctx.shadowColor = CH_COLORS[ci];
        ctx.shadowBlur = 4;
        ctx.beginPath();
        let started = false;
        for (let x = W - 1; x >= 0; x--) {
          const back = offset + Math.floor((W - 1 - x) * stride);
          if (back >= series.size) break;
          const v = series.at(back);
          const y = H / 2 - (v / (vdiv * 4)) * (H / 2);
          const cy = Math.max(-20, Math.min(H + 20, y));
          if (!started) { ctx.moveTo(x, cy); started = true; }
          else ctx.lineTo(x, cy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 暂停态十字游标
      if (!run && cx !== null) {
        const px = cx * W;
        ctx.strokeStyle = 'rgba(242,239,227,0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [simRef]);

  /* ---------- 游标读数 ---------- */
  const cursorReadout = (() => {
    if (running || cursorX === null) return null;
    const sim = simRef.current;
    const windowSec = timebase * 10;
    const back = pausedOffset.current + Math.floor((1 - cursorX) * windowSec / sim.dt);
    const t = sim.timeHist.at(Math.min(back, sim.timeHist.size - 1));
    const vals = channels.map(ch => {
      if (!ch.probe) return null;
      const s = sim.nodeSeries(ch.probe);
      return s && s.size > back ? s.at(back) : null;
    });
    return { t, vals };
  })();

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 屏幕 */}
      <div
        ref={wrapRef}
        className="relative h-[210px] w-full overflow-hidden rounded-md border border-ink-700 shadow-inner"
        style={{ cursor: running ? 'default' : 'crosshair' }}
        onPointerDown={e => {
          if (running) return;
          const r = e.currentTarget.getBoundingClientRect();
          dragStart.current = { x: e.clientX, offset: pausedOffset.current };
          setCursorX((e.clientX - r.left) / r.width);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (running) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (dragStart.current) {
            const sim = simRef.current;
            const dSamples = Math.floor((dragStart.current.x - e.clientX) / r.width * (timebase * 10) / sim.dt);
            pausedOffset.current = Math.max(0, dragStart.current.offset + dSamples);
          }
          setCursorX(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1));
        }}
        onPointerUp={() => { dragStart.current = null; }}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <span className="absolute right-2 top-1.5 font-mono text-[10px] tracking-wider text-sig-cyan/80">AUTO · TRIG</span>
        {!running && cursorReadout && (
          <div className="absolute left-2 top-1.5 rounded bg-ink-900/90 px-2 py-1 font-mono text-[10px] text-silk-300">
            t = {formatSI(cursorReadout.t, 's')}
            {cursorReadout.vals.map((v, i) => v !== null && (
              <span key={i} style={{ color: CH_COLORS[i] }} className="ml-2">
                {CH_NAMES[i]}={formatSI(v, 'V')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 通道探头 */}
      <div className="mt-2 flex gap-1.5">
        {channels.map((ch, i) => (
          <div key={i} className="flex flex-1 items-center gap-1 rounded border border-ink-700 bg-ink-900/60 px-1.5 py-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CH_COLORS[i] }} />
            <button
              onClick={() => onRequestProbe?.(i)}
              className={cn(
                'min-w-0 flex-1 truncate text-left font-mono text-[10px]',
                probingChannel === i ? 'animate-pulse text-silk-100' : ch.probe ? 'text-silk-300' : 'text-silk-700',
              )}
              title={ch.probe ? `${ch.probe.comp}:${ch.probe.port}` : '点击后到画布上点一个端口/导线接探头'}
            >
              {probingChannel === i ? '点画布接探头…' : ch.probe ? `${ch.probe.comp}:${ch.probe.port}` : `${CH_NAMES[i]} 未接`}
            </button>
            {ch.probe && onClearProbe && (
              <button onClick={() => onClearProbe(i)} className="text-silk-700 hover:text-silk-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 旋钮行：TIME/DIV + V/DIV */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Knob label="TIME/DIV" value={formatSI(timebase, 's')} onMinus={() => onTimebase(stepDown(TIMEBASE_STEPS, timebase))} onPlus={() => onTimebase(stepUp(TIMEBASE_STEPS, timebase))} />
        <Knob label="V/DIV" value={formatSI(voltsPerDiv, 'V')} onMinus={() => onVoltsPerDiv(stepDown(VDIV_STEPS, voltsPerDiv))} onPlus={() => onVoltsPerDiv(stepUp(VDIV_STEPS, voltsPerDiv))} />
      </div>

      {/* 大读数行 */}
      <div className="copper-window mt-2 flex items-center justify-between rounded px-3 py-1.5 font-mono text-[13px] font-bold">
        {channels.some(c => c.probe) ? (() => {
          const st = stats.find((_, i) => channels[i].probe) ?? { vpp: 0, vavg: 0, freq: 0, duty: 0 };
          return (
            <>
              <span>Vpp {formatSI(st.vpp, 'V')}</span>
              <span>Vavg {formatSI(st.vavg, 'V')}</span>
              <span>f {st.freq ? formatSI(st.freq, 'Hz') : '—'}</span>
              <span>D {Math.round(st.duty * 100)}%</span>
            </>
          );
        })() : (
          <span className="text-[11px] font-normal">接探头到节点开始测量</span>
        )}
      </div>

      {onExportCsv && (
        <button
          onClick={onExportCsv}
          className="mt-2 flex items-center justify-center gap-1.5 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-silk-300 transition-colors hover:border-sig-cyan hover:text-sig-cyan"
        >
          <Download className="h-3.5 w-3.5" /> 数据记录：导出最近波形 CSV
        </button>
      )}
      {!running && (
        <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-silk-700">
          <Crosshair className="h-3 w-3" /> 暂停态：拖动波形回看，移动显示游标读数
        </p>
      )}
    </div>
  );
}

function Knob({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center justify-between rounded border border-ink-700 bg-ink-900/60 px-2 py-1">
      <button onClick={onMinus} className="rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100" aria-label={`${label} 减小`}>
        <Minus className="h-3 w-3" />
      </button>
      <div className="text-center">
        <div className="font-mono text-[9px] tracking-wider text-silk-700">{label}</div>
        <div className="font-mono text-[11px] font-bold text-silk-100">{value}</div>
      </div>
      <button onClick={onPlus} className="rounded p-1 text-silk-500 hover:bg-ink-800 hover:text-silk-100" aria-label={`${label} 增大`}>
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
