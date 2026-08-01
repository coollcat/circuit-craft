// 小实验 ⑤：上拉 / 下拉电阻（开关节点为什么需要「确定的电平」）
// 3.3V 电源 + 10kΩ 上拉/下拉/悬空 + 按键闭合到地 + 电压表读数节点。
// 无上拉时节点高阻悬空，电压表读数随机漂移（sig-amber 警告）。
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Mode = 'up' | 'down' | 'none';

const MODES: { id: Mode; label: string }[] = [
  { id: 'up', label: '上拉 10kΩ → 3.3V' },
  { id: 'down', label: '下拉 10kΩ → GND' },
  { id: 'none', label: '悬空（不接电阻）' },
];

// 真值表：行 = 模式，列 = 松开 / 按住
const TRUTH: { mode: Mode; open: string; openV: number | null; closed: string }[] = [
  { mode: 'up', open: '3.3V · H', openV: 3.3, closed: '0V · L（0.33mA）' },
  { mode: 'down', open: '0V · L', openV: 0, closed: '0V · L（按键失效！）' },
  { mode: 'none', open: '漂移 · 高阻', openV: null, closed: '0V · L' },
];

const SILK = '#F2EFE3';
const WIRE = { stroke: SILK, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const MONO = 'JetBrains Mono, monospace';

export default function PullUpLab() {
  const [mode, setMode] = useState<Mode>('up');
  const [pressed, setPressed] = useState(false);
  const [noise, setNoise] = useState<number[]>(() => Array(8).fill(1.6));

  const floating = mode === 'none' && !pressed;

  // 悬空时电压表读数随机抖动（随机游走，~10Hz）
  useEffect(() => {
    if (!floating) return;
    const id = window.setInterval(() => {
      setNoise(n =>
        n.map(v => Math.min(3.3, Math.max(0, v + (Math.random() - 0.5) * 1.7))),
      );
    }, 100);
    return () => window.clearInterval(id);
  }, [floating]);

  const voltage = floating ? noise[noise.length - 1] : mode === 'up' && !pressed ? 3.3 : 0;
  const currentMa = mode === 'up' && pressed ? 0.33 : 0;
  const vColor = floating ? '#FFB84D' : voltage > 1.6 ? '#6FE3A1' : '#8E8976';
  const stateText = floating
    ? '高阻悬空 · 读数漂移'
    : voltage > 1.6
      ? '高电平 H（确定）'
      : '低电平 L（确定）';

  const hold = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div className="space-y-4">
      {/* 控制区 */}
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'rounded border px-3 py-1.5 font-mono text-xs transition-colors',
              mode === m.id
                ? 'border-pcb-400 bg-pcb-500/15 text-pcb-300'
                : 'border-ink-700 text-silk-500 hover:text-silk-300',
            )}
          >
            {m.label}
          </button>
        ))}
        <button
          {...hold}
          className={cn(
            'select-none rounded border px-4 py-1.5 font-mono text-xs transition-colors',
            pressed
              ? 'border-copper-400 bg-copper-500/20 text-copper-300'
              : 'border-ink-600 text-silk-300 hover:border-copper-500 hover:text-copper-300',
          )}
        >
          {pressed ? '■ 已按下（闭合到 GND）' : '▢ 按住按键'}
        </button>
      </div>

      {/* 电路场景 */}
      <svg viewBox="0 0 640 300" className="panel block w-full rounded-lg" style={{ height: 'auto' }}>
        {/* 3.3V 电源轨 */}
        <line x1={90} y1={40} x2={330} y2={40} stroke="#C9803C" strokeWidth={3} strokeLinecap="round" />
        <text x={86} y={34} fontSize={12} fill="#F0C078" fontFamily={MONO}>3.3V</text>

        {/* 上拉电阻（mode=up 实接 / mode=none 幽灵虚线 / mode=down 不画） */}
        {mode !== 'down' && (
          <g
            {...WIRE}
            stroke={mode === 'none' ? '#55524A' : SILK}
            strokeDasharray={mode === 'none' ? '5 4' : undefined}
            opacity={mode === 'none' ? 0.6 : 1}
          >
            <line x1={220} y1={40} x2={220} y2={52} />
            <path d="M220 52 L226 60 L214 68 L226 76 L214 84 L226 92 L214 100 L220 108" />
            <line x1={220} y1={108} x2={220} y2={140} />
          </g>
        )}
        {mode === 'up' && (
          <text x={236} y={84} fontSize={11} fill="#CFC9B4" fontFamily={MONO}>R 10kΩ</text>
        )}
        {mode === 'none' && (
          <>
            <text x={234} y={80} fontSize={13} fill="#FFB84D" fontFamily={MONO}>✕</text>
            <text x={234} y={96} fontSize={10} fill="#8E8976" fontFamily={MONO}>未接</text>
          </>
        )}

        {/* 下拉电阻（mode=down 时从节点左侧到地） */}
        {mode === 'down' && (
          <g {...WIRE}>
            <line x1={220} y1={140} x2={140} y2={140} />
            <path d="M140 140 L146 148 L134 156 L146 164 L134 172 L146 180 L134 188 L140 196" />
            <line x1={140} y1={196} x2={140} y2={236} />
            <text x={150} y={170} fontSize={11} fill="#CFC9B4" fontFamily={MONO} stroke="none">R 10kΩ</text>
          </g>
        )}

        {/* 节点 → 电压表 连线（随节点电平变色） */}
        <line x1={220} y1={140} x2={388} y2={140} stroke={vColor} strokeWidth={2} opacity={0.9} />
        <circle cx={220} cy={140} r={4.5} fill={vColor} style={floating ? { filter: 'drop-shadow(0 0 5px rgba(255,184,77,0.8))' } : voltage > 1.6 ? { filter: 'drop-shadow(0 0 5px rgba(111,227,161,0.8))' } : undefined} />
        <text x={210} y={132} fontSize={10} fill="#8E8976" fontFamily={MONO} textAnchor="end">节点</text>

        {/* 节点 → 按键 → 地 */}
        <line x1={220} y1={140} x2={220} y2={180} {...WIRE} />
        <circle cx={220} cy={180} r={2.5} fill={SILK} />
        <circle cx={220} cy={206} r={2.5} fill={SILK} />
        {pressed ? (
          <line x1={220} y1={180} x2={220} y2={206} stroke="#F0C078" strokeWidth={2.5} strokeLinecap="round" />
        ) : (
          <g {...WIRE}>
            <line x1={206} y1={171} x2={234} y2={171} />
            <line x1={220} y1={171} x2={220} y2={177} />
          </g>
        )}
        <line x1={220} y1={206} x2={220} y2={236} {...WIRE} />
        <text x={240} y={198} fontSize={10} fill="#8E8976" fontFamily={MONO}>SW 按键 → GND</text>
        {/* 按键热区（SVG 上也可按住） */}
        <rect x={196} y={158} width={48} height={62} fill="transparent" style={{ cursor: 'pointer' }} {...hold}>
          <title>按住 = 闭合到地</title>
        </rect>

        {/* 电压表 */}
        <circle cx={414} cy={140} r={24} {...WIRE} />
        <text x={414} y={146} fontSize={15} fill="#45DCE8" fontFamily={MONO} textAnchor="middle">V</text>
        <line x1={414} y1={164} x2={414} y2={236} {...WIRE} />
        <text x={450} y={128} fontSize={10} fill="#8E8976" fontFamily={MONO}>节点电压</text>
        <text x={450} y={150} fontSize={20} fontWeight={700} fill={vColor} fontFamily={MONO}>
          {voltage.toFixed(2)}V
        </text>
        <text x={450} y={168} fontSize={11} fill={vColor} fontFamily={MONO}>{stateText}</text>

        {/* 悬空漂移小波形 */}
        {floating && (
          <g>
            <rect x={246} y={96} width={106} height={36} fill="none" stroke="#55524A" strokeWidth={1} strokeDasharray="3 3" />
            <polyline
              points={noise.map((v, i) => `${246 + (i / (noise.length - 1)) * 106},${128 - (v / 3.3) * 28}`).join(' ')}
              fill="none"
              stroke="#FFB84D"
              strokeWidth={1.5}
            />
            <text x={246} y={90} fontSize={9} fill="#FFB84D" fontFamily={MONO}>悬空漂移 ⚠</text>
          </g>
        )}

        {/* 地线母排 + 接地符号 */}
        <line x1={110} y1={236} x2={430} y2={236} stroke="#8E8976" strokeWidth={2} />
        {[220, 414].map(x => (
          <g key={x} {...WIRE} stroke="#8E8976">
            <line x1={x - 10} y1={242} x2={x + 10} y2={242} />
            <line x1={x - 6} y1={248} x2={x + 6} y2={248} />
            <line x1={x - 2.5} y1={254} x2={x + 2.5} y2={254} />
          </g>
        ))}
      </svg>

      {/* 读数面板 */}
      <div className="grid grid-cols-3 gap-3 font-mono text-[13px]">
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">节点电压 = </span>
          <span style={{ color: vColor }}>{floating ? '~漂移中' : `${voltage.toFixed(2)}V`}</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">逻辑电平 = </span>
          <span style={{ color: vColor }}>{floating ? '不确定 ✗' : voltage > 1.6 ? 'H ✓' : 'L ✓'}</span>
        </div>
        <div className="panel rounded px-3 py-2">
          <span className="text-silk-500">回路电流 = </span>
          <span className="text-sig-cyan">{currentMa > 0 ? `${currentMa.toFixed(2)}mA` : '≈0'}</span>
        </div>
      </div>

      {/* 真值表（当前行高亮） */}
      <div className="panel rounded-lg p-3 font-mono text-xs">
        <div className="mb-2 grid grid-cols-[7rem_1fr_1fr] gap-2 text-silk-500">
          <span>接法</span><span>松开按键</span><span>按住按键</span>
        </div>
        {TRUTH.map(r => (
          <div
            key={r.mode}
            className={cn(
              'grid grid-cols-[7rem_1fr_1fr] gap-2 rounded px-1 py-1',
              mode === r.mode ? 'bg-pcb-500/10 text-silk-100' : 'text-silk-500',
            )}
          >
            <span className={mode === r.mode ? 'text-pcb-300' : ''}>{MODES.find(m => m.id === r.mode)!.label}</span>
            <span className={mode === r.mode ? (r.openV === null ? 'text-sig-amber' : r.openV > 0 ? 'text-pcb-300' : 'text-silk-300') : ''}>{r.open}</span>
            <span className={mode === r.mode && r.mode === 'down' ? 'text-warn' : ''}>{r.closed}</span>
          </div>
        ))}
      </div>

      {/* 教学注解 */}
      <ul className="space-y-2 text-xs leading-5 text-silk-300">
        <li className="border-l-2 border-sig-amber pl-3">
          按键一脚接地，松开时若节点没有别的通路，就成了「高阻悬空」：静电、WiFi、你的手指都能把它的电压扯来扯去——MCU 读到的是随机的 0/1。
        </li>
        <li className="border-l-2 border-pcb-400 pl-3">
          一颗 10kΩ 上拉把节点「默认」钉在 3.3V；按下按键短路到地只花 3.3V ÷ 10kΩ = 0.33mA，就换来确定的低电平。便宜、省电、可靠。
        </li>
        <li className="border-l-2 border-copper-400 pl-3">
          方向别接反：按键到地要配上拉（按下=0、松开=1，「低有效」）；若配下拉，节点永远是 0，按键白按。多数 MCU 引脚内置上拉，代码里启用即可省掉这颗电阻。
        </li>
      </ul>
    </div>
  );
}
