// 小实验 ④：运放演示（反相/同相增益，滑杆调 Rf/Rin，输出波形与削顶饱和实时可视）
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const W = 640;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 30 };
const VS = 12; // 双电源 ±12V
const VSAT = 10.5; // LM358 类输出摆幅（摸不到轨）

function fmtK(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}kΩ` : `${Math.round(v)}Ω`;
}

export default function OpAmpLab() {
  const [mode, setMode] = useState<'inv' | 'noninv'>('inv');
  const [logRf, setLogRf] = useState(4.48); // ≈30k
  const [logRin, setLogRin] = useState(4); // 10k
  const [vin, setVin] = useState(1.5); // 输入幅值 V
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const Rf = Math.pow(10, logRf);
  const Rin = Math.pow(10, logRin);
  const gain = mode === 'inv' ? -Rf / Rin : 1 + Rf / Rin;
  const voutPeak = Math.abs(gain) * vin;
  const clipped = voutPeak > VSAT;
  const gainDb = 20 * Math.log10(Math.abs(gain));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const vMax = VS + 1;
    const px = (t: number) => PAD.l + t * (W - PAD.l - PAD.r); // t: 0..1 两个周期
    const py = (v: number) => PAD.t + (1 - (v + vMax) / (2 * vMax)) * (H - PAD.t - PAD.b);

    // 网格 + 零线
    ctx.strokeStyle = 'rgba(63,196,127,0.10)';
    ctx.lineWidth = 1;
    for (let v = -12; v <= 12; v += 4) {
      ctx.beginPath();
      ctx.moveTo(PAD.l, py(v));
      ctx.lineTo(W - PAD.r, py(v));
      ctx.stroke();
    }
    ctx.strokeStyle = '#55524A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.l, py(0));
    ctx.lineTo(W - PAD.r, py(0));
    ctx.stroke();

    // 饱和轨虚线
    ctx.setLineDash([6, 4]);
    for (const rail of [VSAT, -VSAT]) {
      ctx.strokeStyle = clipped ? 'rgba(255,82,99,0.7)' : 'rgba(224,164,88,0.45)';
      ctx.beginPath();
      ctx.moveTo(PAD.l, py(rail));
      ctx.lineTo(W - PAD.r, py(rail));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#8E8976';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`+饱和 ≈ +${VSAT}V`, PAD.l + 4, py(VSAT) - 3);
    ctx.fillText(`−饱和 ≈ −${VSAT}V`, PAD.l + 4, py(-VSAT) + 11);
    ctx.fillText('0V', PAD.l - 22, py(0) + 4);

    const N = 480;
    const vinAt = (i: number) => vin * Math.sin((i / N) * Math.PI * 4);
    const voutAt = (i: number) => {
      const v = gain * vinAt(i);
      return Math.max(-VSAT, Math.min(VSAT, v));
    };

    // CH1 输入（cyan）
    ctx.strokeStyle = '#45DCE8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = px(i / N);
      const y = py(vinAt(i));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // CH2 输出（magenta，削顶段 danger）
    ctx.lineWidth = 2.5;
    let segColor: string | null = null;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const raw = gain * vinAt(i);
      const isClip = raw > VSAT || raw < -VSAT;
      const color = isClip ? '#FF5263' : '#E56BD6';
      if (color !== segColor) {
        if (segColor !== null) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.shadowColor = isClip ? 'rgba(255,82,99,0.6)' : 'rgba(229,107,214,0.5)';
        ctx.shadowBlur = 5;
        ctx.moveTo(px(Math.max(0, (i - 1) / N)), py(voutAt(Math.max(0, i - 1))));
        segColor = color;
      }
      ctx.lineTo(px(i / N), py(voutAt(i)));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 图例
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#45DCE8';
    ctx.fillText('CH1 输入', W - PAD.r - 120, PAD.t + 10);
    ctx.fillStyle = '#E56BD6';
    ctx.fillText('CH2 输出', W - PAD.r - 60, PAD.t + 10);
    if (clipped) {
      ctx.fillStyle = '#FF5263';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ 输出削顶：增益×输入超过供电能力', W / 2, H - 8);
    }
  }, [mode, Rf, Rin, vin, gain, clipped]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(
          [
            ['inv', '反相放大 G = −Rf/Rin'],
            ['noninv', '同相放大 G = 1 + Rf/Rin'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded border px-3 py-1.5 font-mono text-xs transition-colors',
              mode === m
                ? 'border-pcb-400 bg-pcb-500/15 text-pcb-300'
                : 'border-ink-700 text-silk-500 hover:text-silk-300',
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-silk-500">双电源 ±12V，LM358 级输出摆幅 ±10.5V</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            反馈电阻 Rf <span className="text-copper-300">{fmtK(Rf)}</span>
          </span>
          <input type="range" min={3} max={5.3} step={0.05} value={logRf} onChange={e => setLogRf(Number(e.target.value))} className="w-full accent-pcb-500" />
        </label>
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            {mode === 'inv' ? '输入电阻 Rin' : '接地电阻 Rg'} <span className="text-copper-300">{fmtK(Rin)}</span>
          </span>
          <input type="range" min={3} max={5.3} step={0.05} value={logRin} onChange={e => setLogRin(Number(e.target.value))} className="w-full accent-pcb-500" />
        </label>
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            输入幅值 Vin <span className="text-copper-300">{vin.toFixed(1)}V</span>
          </span>
          <input type="range" min={0.2} max={6} step={0.1} value={vin} onChange={e => setVin(Number(e.target.value))} className="w-full accent-pcb-500" />
        </label>
      </div>

      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }} className="panel" />

      <div className="grid grid-cols-4 gap-3 font-mono text-[13px]">
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">闭环增益 G = </span>
          <span className="text-sig-magenta">{gain.toFixed(2)}×</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">|G| = </span>
          <span className="text-silk-100">{gainDb.toFixed(1)}dB</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">输出峰值 = </span>
          <span className={cn(clipped ? 'text-danger' : 'text-silk-100')}>
            {voutPeak.toFixed(1)}V{clipped ? ' → 削到 ±10.5V' : ''}
          </span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">相位 = </span>
          <span className="text-silk-100">{mode === 'inv' ? '反相 180°' : '同相 0°'}</span>
        </div>
      </div>
      <p className="text-xs text-silk-500">
        虚短虚断让增益只看电阻比；但输出永远逃不出电源轨——把 Rf 拉大或输入拉大，看波形被「削顶」的样子，这就是饱和失真。
      </p>
    </div>
  );
}
