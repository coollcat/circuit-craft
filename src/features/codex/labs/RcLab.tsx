// 小实验 ②：RC 充放电曲线（拖 R/C 滑杆，Canvas 实时重绘指数曲线，标 τ 点）
import { useEffect, useRef, useState } from 'react';

function fmt(n: number, unit: string): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M${unit}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k${unit}`;
  if (n >= 1) return `${n.toFixed(1)}${unit}`;
  if (n >= 1e-3) return `${(n * 1e3).toFixed(1)}m${unit}`;
  return `${(n * 1e6).toFixed(1)}µ${unit}`;
}

const W = 640;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 34 };

export default function RcLab() {
  // log10 滑杆：R 1Ω..1MΩ，C 1nF..1000µF
  const [logR, setLogR] = useState(4); // 10kΩ
  const [logC, setLogC] = useState(-5); // 10µF
  const [vs, setVs] = useState(5);
  const [mode, setMode] = useState<'charge' | 'discharge'>('charge');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const R = Math.pow(10, logR);
  const C = Math.pow(10, logC);
  const tau = R * C;
  const tMax = 5 * tau;

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

    const px = (t: number) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r);
    const py = (v: number) => PAD.t + (1 - v / vs) * (H - PAD.t - PAD.b);

    // 网格
    ctx.strokeStyle = 'rgba(63,196,127,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.t + (i / 4) * (H - PAD.t - PAD.b);
      ctx.beginPath();
      ctx.moveTo(PAD.l, y);
      ctx.lineTo(W - PAD.r, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = PAD.l + (i / 5) * (W - PAD.l - PAD.r);
      ctx.beginPath();
      ctx.moveTo(x, PAD.t);
      ctx.lineTo(x, H - PAD.b);
      ctx.stroke();
    }

    // 坐标轴
    ctx.strokeStyle = '#55524A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, H - PAD.b);
    ctx.lineTo(W - PAD.r, H - PAD.b);
    ctx.stroke();

    // 轴标签
    ctx.fillStyle = '#8E8976';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${vs}V`, PAD.l - 6, PAD.t + 4);
    ctx.fillText('0V', PAD.l - 6, H - PAD.b + 4);
    ctx.textAlign = 'center';
    for (let i = 1; i <= 5; i++) {
      ctx.fillText(`${i}τ`, px((tMax * i) / 5), H - PAD.b + 16);
    }

    // 曲线 v(t)
    const curve = (t: number) =>
      mode === 'charge' ? vs * (1 - Math.exp(-t / tau)) : vs * Math.exp(-t / tau);
    ctx.strokeStyle = '#45DCE8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(69,220,232,0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * tMax;
      const x = px(t);
      const y = py(curve(t));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // τ 标记：63.2%（充电）或 36.8%（放电）
    const frac = mode === 'charge' ? 0.632 : 0.368;
    const tauX = px(tau);
    const tauY = py(vs * frac);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#E0A458';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tauX, H - PAD.b);
    ctx.lineTo(tauX, tauY);
    ctx.lineTo(PAD.l, tauY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#E0A458';
    ctx.beginPath();
    ctx.arc(tauX, tauY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`τ 点 ${(frac * 100).toFixed(1)}%`, tauX + 8, tauY - 8);

    // 5τ 标注
    ctx.fillStyle = '#8E8976';
    ctx.textAlign = 'right';
    ctx.fillText(mode === 'charge' ? '5τ ≈ 99.3% 视为充满' : '5τ ≈ 0.7% 视为放完', W - PAD.r - 4, PAD.t + 12);
  }, [R, C, vs, mode, tau, tMax]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            电阻 R <span className="text-copper-300">{fmt(R, 'Ω')}</span>
          </span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.1}
            value={logR}
            onChange={e => setLogR(Number(e.target.value))}
            className="w-full accent-pcb-500"
          />
        </label>
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            电容 C <span className="text-copper-300">{fmt(C, 'F')}</span>
          </span>
          <input
            type="range"
            min={-9}
            max={-3}
            step={0.1}
            value={logC}
            onChange={e => setLogC(Number(e.target.value))}
            className="w-full accent-pcb-500"
          />
        </label>
        <label className="space-y-1">
          <span className="flex justify-between font-mono text-[13px] text-silk-300">
            电源 Vs <span className="text-copper-300">{vs.toFixed(1)}V</span>
          </span>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={vs}
            onChange={e => setVs(Number(e.target.value))}
            className="w-full accent-pcb-500"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            ['charge', '充电曲线 v(t)=Vs(1−e^(−t/τ))'],
            ['discharge', '放电曲线 v(t)=Vs·e^(−t/τ)'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
              mode === m
                ? 'border-pcb-400 bg-pcb-500/15 text-pcb-300'
                : 'border-ink-700 text-silk-500 hover:text-silk-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
        className="panel"
      />

      <div className="grid grid-cols-3 gap-3 font-mono text-[13px]">
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">时间常数 τ = RC = </span>
          <span className="text-sig-cyan">{fmt(tau, 's')}</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">1τ 时电压 = </span>
          <span className="text-sig-cyan">
            {(vs * (mode === 'charge' ? 0.632 : 0.368)).toFixed(2)}V
          </span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">截止频率 fc = </span>
          <span className="text-sig-cyan">{fmt(1 / (2 * Math.PI * tau), 'Hz')}</span>
        </div>
      </div>
      <p className="text-xs text-silk-500">
        拖滑杆观察：R 或 C 越大，τ 越大，曲线越「懒」。MCU 复位电路、按键去抖、PWM 滤波全是这条曲线。
      </p>
    </div>
  );
}
