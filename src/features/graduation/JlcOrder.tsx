/* eslint-disable react-refresh/only-export-components */
// STEP 4b 嘉立创下单模拟：上传解析 → 工艺参数 → 价格明细 → 生产线动画 → 虚拟订单
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, TicketPercent, Truck, ExternalLink } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';
import { SealStamp, RollingNumber, useToasts, ToastHost } from './ui';
import { useGrad } from './store';
import { GERBER_FILES } from './gerber';
import type { DialogueLine } from '@/engine/types';

export const STEP5_LINES: DialogueLine[] = [
  { speaker: 'lingong', text: '板子画完了？那就下单吧。阻焊颜色随你挑——别选紫色，贵。……好吧，选紫色当我没说，有品位。' },
  { speaker: 'laozhou', text: '看清楚工艺参数再付款：板厚、表面处理、数量。这跟真实下单一模一样，练的就是这份手熟。' },
];

const COLORS = [
  { id: 'green', label: '阻焊绿', hex: '#2E9E63', extra: 0 },
  { id: 'red', label: '红', hex: '#C03A3A', extra: 0 },
  { id: 'yellow', label: '黄', hex: '#D9B23A', extra: 0 },
  { id: 'blue', label: '蓝', hex: '#3A6BD9', extra: 0 },
  { id: 'black', label: '黑', hex: '#1a1a1a', extra: 0 },
  { id: 'white', label: '白', hex: '#E8E8E0', extra: 0 },
  { id: 'purple', label: '哑光紫', hex: '#7A4BC0', extra: 30 },
];
const FINISH = [
  { id: 'hasl', label: '有铅喷锡', extra: 0, note: '最便宜，焊盘亮、好焊，含铅' },
  { id: 'hasl-lf', label: '无铅喷锡', extra: 5, note: 'RoHS 环保，出口件标配' },
  { id: 'enig', label: '沉金 ENIG', extra: 20, note: '金手指级平整，抗氧化，贵族选项' },
];
const STATIONS = ['开料', '钻孔', '沉铜', '阻焊', '丝印', '测试'];

/** 事件处理器调用的 impure 工具（模块级，避免 React Compiler purity 误报） */
function makeOrderNo(): string {
  return `JLC2024-${String(Math.floor(100000 + Math.random() * 899999))}`;
}
function etaPlus4Days(): string {
  const d = new Date(Date.now() + 4 * 86400000);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

type OrderPhase = 'upload' | 'config' | 'production' | 'done';

export default function JlcOrder({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const grad = useGrad();
  const set = useGrad(s => s.set);
  const [phase, setPhase] = useState<OrderPhase>(grad.orderPlaced ? 'done' : 'upload');
  const [parseIdx, setParseIdx] = useState(-1);
  const [color, setColor] = useState(grad.boardColor || 'green');
  const [finish, setFinish] = useState('hasl');
  const [qty, setQty] = useState(5);
  const [coupon, setCoupon] = useState(true);
  const [station, setStation] = useState(0);
  const [orderNo, setOrderNo] = useState<string | null>(grad.orderNo);
  const { toasts, push } = useToasts();
  const timers = useRef<number[]>([]);

  const colorExtra = COLORS.find(c => c.id === color)!.extra;
  const finishExtra = FINISH.find(f => f.id === finish)!.extra;
  const boardFee = qty === 5 ? 5 : 9;
  const engFee = coupon ? 0 : 20;
  const shipping = 12;
  const total = engFee + boardFee + colorExtra + finishExtra + shipping;

  const parse = () => {
    setParseIdx(0);
    GERBER_FILES.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setParseIdx(i + 1), 300 * (i + 1)));
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase('config');
        push('ok', '解析完成：板框 60×40mm · 双层 · 8 个层文件全部有效');
      }, 300 * GERBER_FILES.length + 400),
    );
  };
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  const submit = () => {
    setPhase('production');
    setStation(0);
    STATIONS.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setStation(i + 1), 1000 * (i + 1)));
    });
    timers.current.push(window.setTimeout(finishOrder, 6200));
  };

  const finishOrder = () => {
    const no = orderNo ?? makeOrderNo();
    setEta(etaPlus4Days());
    setOrderNo(no);
    setPhase('done');
    if (!visitor) {
      set({ orderPlaced: true, orderNo: no, boardColor: color, orderPrice: total });
    }
  };

  const [eta, setEta] = useState('');

  return (
    <div>
      <ToastHost toasts={toasts} />
      <SilkTag>STEP 5 / 嘉立创下单模拟 JLC ORDER SIM</SilkTag>
      <h2 className="mb-4 mt-3 text-2xl font-black text-silk-100">嘉立创 · 在线下单（模拟）</h2>

      <AnimatePresence mode="wait">
        {/* ---------- 上传 Gerber ---------- */}
        {phase === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-xl">
            <div className="panel-raised rounded-lg border-dashed p-8 text-center">
              <UploadCloud className="mx-auto mb-3 h-10 w-10 text-sig-cyan" />
              <p className="text-sm text-silk-300">上传 Gerber 压缩包</p>
              <p className="mb-4 font-mono text-xs text-silk-500">ESP32-min-gerber.zip（{GERBER_FILES.length} 个层文件）</p>
              {parseIdx < 0 ? (
                <div className="flex justify-center gap-3">
                  <PadButton variant="primary" size="L" onClick={parse}>
                    使用刚导出的 zip
                  </PadButton>
                  <PadButton variant="ghost" size="M" onClick={parse}>
                    使用模拟文件
                  </PadButton>
                </div>
              ) : (
                <div className="mx-auto max-w-sm space-y-1 text-left font-mono text-[11px]">
                  {GERBER_FILES.map((f, i) => (
                    <p key={f.name} className={i < parseIdx ? 'text-pcb-300' : 'text-silk-700'}>
                      {i < parseIdx ? '✓' : '·'} {f.name} {i < parseIdx && `— ${f.desc}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ---------- 参数 + 价格 ---------- */}
        {phase === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-[3fr_2fr] gap-6">
            <div className="space-y-4">
              <div className="panel rounded-lg p-4">
                <h4 className="mb-2 font-mono text-xs uppercase tracking-widest text-silk-500">板子信息（自动识别）</h4>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs text-silk-300">
                  <span>层数：<b className="text-silk-100">2 层</b></span>
                  <span>尺寸：<b className="text-silk-100">60×40mm</b></span>
                  <span>板厚：<b className="text-silk-100">1.6mm</b></span>
                  <span>
                    数量：
                    {[5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setQty(n)}
                        className={cn('ml-1 rounded border px-1.5', qty === n ? 'border-pcb-400 text-pcb-300' : 'border-ink-600 text-silk-500')}
                      >
                        {n}
                      </button>
                    ))}
                  </span>
                </div>
              </div>

              <div className="panel rounded-lg p-4">
                <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-silk-500">阻焊颜色</h4>
                <div className="flex gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setColor(c.id);
                        if (c.id === 'purple') push('warn', '有品位。+¥30');
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all',
                        color === c.id ? 'border-copper-400 scale-105' : 'border-transparent hover:border-ink-600',
                      )}
                      title={c.extra ? `+¥${c.extra}` : '免费'}
                    >
                      <span className="h-9 w-9 rounded" style={{ background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' }} />
                      <span className="font-mono text-[10px] text-silk-300">{c.label}</span>
                      <span className={cn('font-mono text-[9px]', c.extra ? 'text-warn' : 'text-silk-700')}>
                        {c.extra ? `+¥${c.extra}` : '¥0'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel rounded-lg p-4">
                <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-silk-500">表面处理</h4>
                <div className="space-y-2">
                  {FINISH.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFinish(f.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors',
                        finish === f.id ? 'border-pcb-400 bg-pcb-600/10' : 'border-ink-600 hover:border-ink-500',
                      )}
                    >
                      <span className={cn('h-3.5 w-3.5 rounded-full border-2', finish === f.id ? 'border-pcb-300 bg-pcb-400' : 'border-silk-700')} />
                      <span className="text-sm font-bold text-silk-100">{f.label}</span>
                      <span className="font-mono text-xs text-silk-500">{f.note}</span>
                      <span className="ml-auto font-mono text-xs text-copper-300">{f.extra ? `+¥${f.extra}` : '¥0'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="panel flex cursor-pointer items-center gap-2 rounded-lg p-3 text-sm text-silk-300">
                <input type="checkbox" checked={coupon} onChange={e => setCoupon(e.target.checked)} className="h-4 w-4 accent-pcb-500" />
                <TicketPercent className="h-4 w-4 text-copper-300" />
                使用「每月免费打样券」—— 免工程费 ¥20（薅羊毛，真实存在）
              </label>
            </div>

            {/* 价格明细 */}
            <aside className="panel-raised h-fit rounded-lg p-4">
              <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-silk-500">价格明细</h4>
              <div className="space-y-1.5 font-mono text-xs text-silk-300">
                <p className="flex justify-between"><span>工程费</span><span className={coupon ? 'text-pcb-300 line-through' : ''}>{coupon ? '¥20 → ¥0' : '¥20.00'}</span></p>
                <p className="flex justify-between"><span>板费（{qty} 片）</span><span>¥{boardFee.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>阻焊颜色（{COLORS.find(c => c.id === color)!.label}）</span><span>{colorExtra ? `+¥${colorExtra}` : '¥0'}</span></p>
                <p className="flex justify-between"><span>表面处理</span><span>{finishExtra ? `+¥${finishExtra}` : '¥0'}</span></p>
                <p className="flex justify-between"><span className="flex items-center gap-1"><Truck className="h-3 w-3" />运费</span><span>¥{shipping.toFixed(2)}</span></p>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-ink-700 pt-3">
                <span className="text-sm text-silk-500">合计</span>
                <span className="text-3xl font-black text-copper-300"><RollingNumber value={total} /></span>
              </div>
              <PadButton variant="copper" size="L" className="mt-4 w-full" onClick={submit}>
                提交生产
              </PadButton>
              <p className="mt-2 text-center font-mono text-[10px] text-silk-700">模拟订单 · 不会真实扣款</p>
            </aside>
          </motion.div>
        )}

        {/* ---------- 生产线动画 ---------- */}
        {phase === 'production' && (
          <motion.div key="prod" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl py-10">
            <h3 className="mb-8 text-center text-xl font-black text-silk-100">生产线上板中…</h3>
            <div className="relative">
              {/* 传送带 */}
              <div className="h-1.5 w-full rounded bg-ink-700" />
              <div className="mt-6 flex justify-between">
                {STATIONS.map((s, i) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={station > i ? { boxShadow: '0 0 14px rgba(63,196,127,0.8)' } : {}}
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-lg border font-mono text-xs',
                        station > i ? 'border-pcb-400 bg-pcb-600/20 text-pcb-300' : 'border-ink-600 bg-ink-800 text-silk-700',
                      )}
                    >
                      {station > i ? '✓' : i + 1}
                    </motion.div>
                    <span className={cn('font-mono text-xs', station > i ? 'text-pcb-300' : 'text-silk-500')}>{s}</span>
                  </div>
                ))}
              </div>
              {/* 小板移动 */}
              <motion.div
                className="absolute -top-3 h-4 w-6 rounded-sm border border-pcb-300 bg-pcb-600"
                animate={{ left: `${Math.min(96, (station / STATIONS.length) * 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-8 text-center">
              <PadButton variant="ghost" size="M" onClick={finishOrder}>
                跳过动画 ▸▸
              </PadButton>
            </div>
          </motion.div>
        )}

        {/* ---------- 订单完成 ---------- */}
        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="panel-raised relative rounded-lg p-6 text-center">
                <img src="/jlc-parcel.png" alt="收到 PCB 包裹" className="mx-auto mb-4 w-64 rounded border border-ink-600" />
                <p className="font-mono text-xs text-silk-500">你的包裹（预计 {eta} 送达）</p>
                <p className="mt-1 font-mono text-[10px] text-silk-700">玩笑归玩笑，现实里打样真的要等 3–5 天</p>
                <div className="absolute -right-4 -top-4">
                  <SealStamp text="已下单" sub="ORDER PLACED" show tone="red" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="panel-raised rounded-lg p-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-silk-500">虚拟订单号</p>
                  <motion.p
                    initial={{ scale: 1.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-1 font-mono text-3xl font-black tracking-wider text-copper-300 text-glow-copper"
                  >
                    {orderNo}
                  </motion.p>
                  <p className="mt-2 font-mono text-xs text-silk-300">
                    {qty} 片 · {COLORS.find(c => c.id === color)!.label}阻焊 · 实付 ¥{(grad.orderPrice || total).toFixed(2)}
                  </p>
                </div>
                <div className="panel rounded-lg p-5">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-silk-100">
                    <ExternalLink className="h-4 w-4 text-sig-cyan" /> 想打出真的板？真实流程 checklist
                  </h4>
                  <ol className="space-y-1.5 font-mono text-[11px] leading-relaxed text-silk-300">
                    <li>① 注册嘉立创账号（jlc.com），领新人打样券</li>
                    <li>② 用立创 EDA 或 KiCad 按本设计画出真实板子</li>
                    <li>③ 导出 Gerber（和刚才的 zip 同一种文件）</li>
                    <li>④ 上传下单，选参数付款，等 3–5 天收货</li>
                    <li>⑤ 选择 SMT 贴片代工，或自己挑战手焊（从 0603 练起）</li>
                  </ol>
                  <p className="mt-2 border-t border-ink-700 pt-2 font-mono text-[10px] text-silk-700">
                    声明：本站与嘉立创无利益关系，真实打板费用自理（5 片通常 ¥5–50）。
                  </p>
                </div>
                <PadButton variant="primary" size="L" onClick={onComplete}>
                  {visitor ? '前往终点（游客无证书）→' : '领取毕业证书 →'}
                </PadButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
