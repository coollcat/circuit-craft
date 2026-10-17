// 小实验 ⑥：迟滞比较器（施密特触发器）
// 左侧画传输特性（迟滞回线），右侧画时域：输入慢变信号 + 噪声，对比开环单阈值与迟滞两种输出的翻转次数。
import { useEffect, useRef, useState } from 'react';

const W = 640;
const H = 300;
/** 固定「噪声」波形：两段不同频率正弦叠加，模拟阈值附近的干扰 */
const noiseAt = (t: number, amp: number) => amp * (Math.sin(t * 37) * 0.6 + Math.sin(t * 91 + 1.1) * 0.4);

export default function HystLab() {
  const [vpp, setVpp] = useState(3.3); // 输出摆幅（开集输出 + 上拉电源）
  const [vref, setVref] = useState(1.65); // 参考电压（接反相端）
  const [rfK, setRfK] = useState(100); // 正反馈电阻 Rf（kΩ）
  const [rthK, setRthK] = useState(10); // 同相端→参考 的 Rth（kΩ）
  const [noiseAmp, setNoiseAmp] = useState(0.06); // 噪声幅度（V）
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rf = rfK * 1e3;
  const rth = rthK * 1e3;
  // Vref 必须落在 0~Vout_pp 之间，超出就把滑杆值夹回来（避免画到图外）
  const vrefEff = Math.max(0.2, Math.min(vref, vpp - 0.2));
  const vhyst = (vpp * rth) / (rth + rf);
  const thHigh = (vpp * rth + vrefEff * rf) / (rth + rf);
  const thLow = (vrefEff * rf) / (rth + rf);

  // 输入幅度：够大才跨得过窗口，固定 0.9V 便于观察
  const amp = 0.9;
  const cycles = 1.5;

  // 时域仿真（确定性）：同一段输入分别喂给「有迟滞」与「无迟滞（单阈值 = Vref）」两个比较器
  const N = 720;
  const vin = (i: number) => vrefEff + amp * Math.sin((i / N) * Math.PI * 2 * cycles) + noiseAt(i / N * 10, noiseAmp);
  let hopsHyst = 0;
  let hopsPlain = 0;
  {
    let outH = 0;
    let outP = 0;
    for (let i = 0; i < N; i++) {
      const v = vin(i);
      const nextH = v > thHigh ? 1 : v < thLow ? 0 : outH;
      if (nextH !== outH) hopsHyst++;
      outH = nextH;
      const nextP = v > vrefEff ? 1 : 0;
      if (nextP !== outP) hopsPlain++;
      outP = nextP;
    }
  }

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
    const MONO = '"JetBrains Mono", monospace';
    const grid = 'rgba(63,196,127,0.12)';

    /* ---------- 左：传输特性（迟滞回线） ---------- */
    const L = { x0: 40, x1: 280, y0: 40, y1: 220 };
    const lx = (v: number) => L.x0 + (v / vpp) * (L.x1 - L.x0);
    const ly = (v: number) => L.y1 - (v / vpp) * (L.y1 - L.y0);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = L.y0 + (i / 4) * (L.y1 - L.y0);
      ctx.beginPath();
      ctx.moveTo(L.x0, y);
      ctx.lineTo(L.x1, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#55524A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L.x0, L.y0);
    ctx.lineTo(L.x0, L.y1);
    ctx.lineTo(L.x1, L.y1);
    ctx.stroke();
    ctx.fillStyle = '#8E8976';
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('Vin', (L.x0 + L.x1) / 2, H - 46);
    ctx.save();
    ctx.translate(14, (L.y0 + L.y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Vout', 0, 0);
    ctx.restore();

    // 迟滞窗口底色
    ctx.fillStyle = 'rgba(224,164,88,0.16)';
    ctx.fillRect(lx(thLow), L.y0, Math.max(lx(thHigh) - lx(thLow), 1), L.y1 - L.y0);
    // 回线：上升沿（左下 → 上）与下降沿（右上 → 下）
    ctx.strokeStyle = '#45DCE8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx(0), ly(0));
    ctx.lineTo(lx(thHigh), ly(0));
    ctx.lineTo(lx(thHigh), ly(vpp));
    ctx.lineTo(lx(vpp), ly(vpp));
    ctx.stroke();
    ctx.strokeStyle = '#E0A458';
    ctx.beginPath();
    ctx.moveTo(lx(vpp), ly(vpp));
    ctx.lineTo(lx(thLow), ly(vpp));
    ctx.lineTo(lx(thLow), ly(0));
    ctx.lineTo(lx(0), ly(0));
    ctx.stroke();
    // 阈值虚线
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#8E8976';
    ctx.lineWidth = 1;
    [thLow, thHigh].forEach(th => {
      ctx.beginPath();
      ctx.moveTo(lx(th), L.y0);
      ctx.lineTo(lx(th), L.y1);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.fillStyle = '#E0A458';
    ctx.textAlign = 'center';
    ctx.fillText(`Vhyst = ${vhyst.toFixed(3)}V`, (lx(thLow) + lx(thHigh)) / 2, L.y0 - 8);
    ctx.fillStyle = '#8E8976';
    ctx.fillText(`上阈值 ${thHigh.toFixed(2)}V / 下阈值 ${thLow.toFixed(2)}V`, (L.x0 + L.x1) / 2, L.y0 - 26);

    /* ---------- 右：时域输入 + 两种输出 ---------- */
    const R = { x0: 340, x1: 610, y0: 46, y1: 168 };
    const rx = (i: number) => R.x0 + (i / N) * (R.x1 - R.x0);
    const ry = (v: number) => R.y1 - (v / vpp) * (R.y1 - R.y0);
    ctx.strokeStyle = grid;
    for (let i = 0; i <= 4; i++) {
      const y = R.y0 + (i / 4) * (R.y1 - R.y0);
      ctx.beginPath();
      ctx.moveTo(R.x0, y);
      ctx.lineTo(R.x1, y);
      ctx.stroke();
    }
    // 阈值线
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#E0A458';
    [thHigh, thLow].forEach(th => {
      ctx.beginPath();
      ctx.moveTo(R.x0, ry(th));
      ctx.lineTo(R.x1, ry(th));
      ctx.stroke();
    });
    ctx.strokeStyle = '#8E8976';
    ctx.beginPath();
    ctx.moveTo(R.x0, ry(vrefEff));
    ctx.lineTo(R.x1, ry(vrefEff));
    ctx.stroke();
    ctx.setLineDash([]);
    // 输入波形
    ctx.strokeStyle = '#45DCE8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = rx(i);
      const y = ry(Math.max(0, Math.min(vpp, vin(i))));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#8E8976';
    ctx.textAlign = 'left';
    ctx.font = `11px ${MONO}`;
    ctx.fillText('输入（慢变信号 + 噪声）', R.x0, R.y0 - 24);
    ctx.fillText(`Rf=${rfK}kΩ · Rth=${rthK}kΩ · 噪声 ±${noiseAmp.toFixed(2)}V`, R.x0, R.y0 - 8);

    // 输出条：有迟滞（铜色，上）与无迟滞（红色，下）
    const bars = [
      { y: 206, h: 26, hyst: true, color: '#E0A458', label: `有迟滞 ${hopsHyst} 次翻转` },
      { y: 250, h: 26, hyst: false, color: '#E05A4F', label: `无迟滞 ${hopsPlain} 次翻转` },
    ];
    ctx.lineWidth = 1.5;
    for (const bar of bars) {
      let out = 0;
      ctx.strokeStyle = bar.color;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const v = vin(i);
        out = bar.hyst ? (v > thHigh ? 1 : v < thLow ? 0 : out) : v > vrefEff ? 1 : 0;
        const x = rx(i);
        const y = bar.y + (1 - out) * bar.h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y); // 采样连线：台阶处自然形成边沿
      }
      ctx.stroke();
      ctx.fillStyle = bar.color;
      ctx.textAlign = 'left';
      ctx.fillText(bar.label, R.x0, bar.y - 4);
    }
    ctx.fillStyle = '#8E8976';
    ctx.textAlign = 'left';
    ctx.fillText('迟滞把噪声「吃掉」：翻转次数应远小于无迟滞的那条', R.x0, H - 12);
  }, [vpp, vrefEff, rfK, rthK, noiseAmp, vhyst, thHigh, thLow]);

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    set: (n: number) => void,
    fmt: string,
  ) => (
    <label className="space-y-1">
      <span className="flex justify-between font-mono text-[13px] text-silk-300">
        {label} <span className="text-copper-300">{fmt}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => set(Number(e.target.value))}
        className="w-full accent-pcb-500"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {slider('输出摆幅 Vout_pp', vpp, 1.8, 12, 0.1, setVpp, `${vpp.toFixed(1)}V`)}
        {slider('参考电压 Vref', vref, 0.2, Math.max(0.4, vpp - 0.2), 0.05, setVref, `${vref.toFixed(2)}V`)}
        {slider('噪声幅度（±）', noiseAmp, 0, 0.4, 0.01, setNoiseAmp, `${noiseAmp.toFixed(2)}V`)}
        {slider('正反馈 Rf', rfK, 10, 300, 5, setRfK, `${rfK}kΩ`)}
        {slider('窗口电阻 Rth', rthK, 1, 100, 1, setRthK, `${rthK}kΩ`)}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
        className="panel"
      />

      <div className="grid grid-cols-3 gap-3 font-mono text-[13px]">
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">迟滞窗口 Vhyst = Vout_pp×Rth/(Rth+Rf) = </span>
          <span className="text-sig-cyan">{vhyst.toFixed(3)}V</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">上/下阈值 = </span>
          <span className="text-sig-cyan">
            {thHigh.toFixed(2)}V / {thLow.toFixed(2)}V
          </span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">翻转次数（有迟滞 / 无迟滞） = </span>
          <span className="text-sig-cyan">
            {hopsHyst} / {hopsPlain}
          </span>
        </div>
      </div>
      <p className="text-xs text-silk-500">
        把 Rth 拖小、噪声拖大：无迟滞那条立刻在阈值附近疯狂翻转（MCU 中断被刷爆），有迟滞那条依然干净——这就是
        sb-4 里迟滞的意义。窗口也不是越宽越好：拖大 Rth 到 1V 以上，信号会被「粘」住翻不过来。
      </p>
    </div>
  );
}
