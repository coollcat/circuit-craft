// 小实验 ③：LED 限流电阻计算器（Vcc / LED Vf / 目标电流 → 阻值 + 功耗校核 + 最近 E24 档）
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

/** E24 系列（±5%）基数 */
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

/** 找 ≥ target 的最近 E24 阻值（宁大勿小，保护 LED） */
function nearestE24Up(target: number): number {
  const exp = Math.floor(Math.log10(target));
  for (let e = exp - 1; e <= exp + 1; e++) {
    for (const b of E24) {
      const v = b * Math.pow(10, e);
      if (v >= target) return v;
    }
  }
  return 9.1 * Math.pow(10, exp + 1);
}

const LED_PRESETS = [
  { name: '红', vf: 2.0, hex: '#FF4444' },
  { name: '黄', vf: 2.1, hex: '#FFC832' },
  { name: '绿', vf: 2.2, hex: '#43E08A' },
  { name: '蓝', vf: 3.1, hex: '#5B8DEF' },
  { name: '白', vf: 3.2, hex: '#F2EFE3' },
];

function fmtR(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}MΩ`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}kΩ`;
  return `${Math.round(v)}Ω`;
}

export default function LedLab() {
  const [vcc, setVcc] = useState(5);
  const [preset, setPreset] = useState(0);
  const [vf, setVf] = useState(LED_PRESETS[0].vf);
  const [iTarget, setITarget] = useState(5); // mA

  const result = useMemo(() => {
    const over = vcc - vf;
    if (over <= 0) return null;
    const rIdeal = (over * 1000) / iTarget; // Ω
    const rE24 = nearestE24Up(rIdeal);
    const iReal = (over * 1000) / rE24; // mA
    const pR = (over * iReal) / 1000; // W
    const pLed = (vf * iReal) / 1000;
    const wattage = pR <= 0.1 ? '1/10W (0603)' : pR <= 0.125 ? '1/8W (0805)' : pR <= 0.25 ? '1/4W' : '≥1/2W';
    const warn = pR > 0.125;
    return { rIdeal, rE24, iReal, pR, pLed, wattage, warn, over };
  }, [vcc, vf, iTarget]);

  const led = LED_PRESETS[preset];
  const brightness = result ? Math.min(1, result.iReal / 20) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="flex justify-between font-mono text-[13px] text-silk-300">
              电源电压 Vcc <span className="text-copper-300">{vcc.toFixed(1)}V</span>
            </span>
            <input
              type="range"
              min={3}
              max={24}
              step={0.1}
              value={vcc}
              onChange={e => setVcc(Number(e.target.value))}
              className="w-full accent-pcb-500"
            />
          </label>

          <div className="space-y-1">
            <span className="font-mono text-[13px] text-silk-300">
              LED 颜色（决定 Vf）：<span className="text-copper-300">{led.name} Vf≈{led.vf}V</span>
            </span>
            <div className="flex gap-2 pt-1">
              {LED_PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setPreset(i);
                    setVf(p.vf);
                  }}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    preset === i ? 'scale-110 border-silk-100' : 'border-ink-700 hover:border-ink-600',
                  )}
                  style={{ backgroundColor: p.hex }}
                  title={`${p.name} Vf≈${p.vf}V`}
                />
              ))}
              <label className="ml-2 flex items-center gap-2 font-mono text-xs text-silk-500">
                自定义 Vf
                <input
                  type="number"
                  min={1.6}
                  max={4}
                  step={0.1}
                  value={vf}
                  onChange={e => setVf(Number(e.target.value))}
                  className="w-16 rounded border border-ink-700 bg-ink-800 px-1.5 py-1 text-silk-100"
                />
              </label>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="flex justify-between font-mono text-[13px] text-silk-300">
              目标电流 If <span className="text-copper-300">{iTarget}mA</span>
            </span>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={iTarget}
              onChange={e => setITarget(Number(e.target.value))}
              className="w-full accent-pcb-500"
            />
            <span className="text-xs text-silk-500">指示灯 2~5mA 就够亮；20mA 是多数 LED 的额定上限。</span>
          </label>
        </div>

        {/* 亮度预览 */}
        <div className="panel flex w-40 flex-col items-center justify-center gap-3 rounded-lg p-4">
          <span className="font-mono text-xs text-silk-500">亮度预览</span>
          <div
            className="h-16 w-16 rounded-full transition-all duration-200"
            style={{
              backgroundColor: result ? led.hex : '#55524A',
              opacity: result ? 0.25 + 0.75 * brightness : 0.3,
              boxShadow: result ? `0 0 ${8 + 40 * brightness}px ${led.hex}` : 'none',
            }}
          />
          <span className="font-mono text-[13px] text-silk-300">
            {result ? `${result.iReal.toFixed(1)}mA` : '—'}
          </span>
        </div>
      </div>

      {result ? (
        <div className="grid grid-cols-4 gap-3 font-mono text-[13px]">
          <div className="panel rounded px-3 py-2">
            <div className="text-silk-500">理论阻值</div>
            <div className="text-base text-silk-100">{fmtR(result.rIdeal)}</div>
            <div className="text-xs text-silk-500">R=(Vcc−Vf)/If</div>
          </div>
          <div className="panel rounded px-3 py-2">
            <div className="text-silk-500">推荐 E24 档</div>
            <div className="text-base text-pcb-300">{fmtR(result.rE24)}</div>
            <div className="text-xs text-silk-500">宁大勿小</div>
          </div>
          <div className="panel rounded px-3 py-2">
            <div className="text-silk-500">实际电流</div>
            <div className="text-base text-sig-cyan">{result.iReal.toFixed(2)}mA</div>
            <div className="text-xs text-silk-500">按 E24 阻值复算</div>
          </div>
          <div className={cn('panel rounded px-3 py-2', result.warn && 'border-warn/60')}>
            <div className="text-silk-500">电阻功耗</div>
            <div className={cn('text-base', result.warn ? 'text-warn' : 'text-silk-100')}>
              {(result.pR * 1000).toFixed(0)}mW
            </div>
            <div className="text-xs text-silk-500">选 {result.wattage} 以上</div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border-l-[3px] border-danger bg-danger/10 px-3 py-2 font-mono text-[13px] text-danger">
          Vcc（{vcc.toFixed(1)}V）≤ Vf（{vf.toFixed(1)}V）：这颗 LED 点不亮！3.3V 系统带蓝/白光 LED 就是这个窘境——换低压差颜色、升压或恒流驱动。
        </div>
      )}

      <p className="text-xs text-silk-500">
        老周提醒：算出来的阻值直接靠 E24 档、功耗再留一倍余量。LED 的命是限流电阻给的。
      </p>
    </div>
  );
}
