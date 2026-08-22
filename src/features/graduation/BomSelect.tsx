/* eslint-disable react-refresh/only-export-components */
// STEP 2 元器件选型 & BOM：模拟立创商城货架 + 实时热校核 / 成本 / 供货
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Flame, Truck, Snowflake, AlertTriangle } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';
import { SealStamp, RollingNumber, useToasts, ToastHost } from './ui';
import { useGrad } from './store';
import type { BomSelection } from './store';
import type { DialogueLine } from '@/engine/types';

export const STEP2_LINES: DialogueLine[] = [
  { speaker: 'laozhou', text: '原理图签了，接下来是花钱的艺术——选型。记住三件事：电气够用、钱包受得了、买得到。' },
  { speaker: 'lingong', text: '预算卡死在 30 块一片。哦对，别给我选缺货料，产线等料等我可不等。' },
  { speaker: 'xiaohan', text: '0402 我可以焊！但是……手会抖成示波器上的纹波……' },
];

interface Part {
  id: string;
  cat: keyof BomSelection;
  name: string;
  pkg: string;
  params: [string, string][];
  price: number;
  qty: number; // 每片用量
  stock: number; // 0 = 缺货
  lead: string;
  verdict: 'ok' | 'warn' | 'bad' | 'out';
  note: string;
}

const PARTS: Part[] = [
  // ---- LDO ----
  {
    id: 'ams1117', cat: 'ldo', name: 'AMS1117-3.3', pkg: 'SOT-223', price: 0.12, qty: 1, stock: 53200, lead: '现货',
    params: [['压差 Vdrop', '≈1.1V'], ['最大电流', '800mA'], ['静态电流 Iq', '5mA'], ['输入范围', '4.4–15V']],
    verdict: 'warn',
    note: '经典老料。压差 1.1V 意味着满载 500mA 发热 0.85W，SOT-223 会烫到 90°C+；ESP32 平均百 mA 级、瞬时峰值 >500mA，按典型持续负载 240mA 校核（0.41W）可承受，注意留散热铜皮。',
  },
  {
    id: 'xc6206', cat: 'ldo', name: 'XC6206P332MR', pkg: 'SOT-23', price: 0.08, qty: 1, stock: 89100, lead: '现货',
    params: [['压差 Vdrop', '0.68V@200mA'], ['最大电流', '250mA'], ['静态电流 Iq', '1µA'], ['输入范围', '≤6V']],
    verdict: 'bad',
    note: '便宜是便宜，可最大输出 250mA——ESP32 平均百 mA 级、瞬时峰值 >500mA，一点裕量都没有，WiFi 一喊话就掉电复位。',
  },
  {
    id: 'me6211', cat: 'ldo', name: 'ME6211C33M5G', pkg: 'SOT-23-5', price: 0.35, qty: 1, stock: 41500, lead: '现货',
    params: [['压差 Vdrop', '0.10V@100mA'], ['最大电流', '500mA'], ['静态电流 Iq', '40µA'], ['输入范围', '2–6V']],
    verdict: 'ok',
    note: '500mA 刚好满足工单，Iq 仅 40µA 适合电池节点；压差低、PSRR 好。贵两毛钱，买省心。',
  },
  {
    id: 'ht7833', cat: 'ldo', name: 'HT7833', pkg: 'SOT-89', price: 0.28, qty: 1, stock: 0, lead: '缺货 · 交期 8 周',
    params: [['压差 Vdrop', '0.36V@500mA'], ['最大电流', '500mA'], ['静态电流 Iq', '4µA'], ['输入范围', '≤8V']],
    verdict: 'out', note: '参数漂亮，但没货。产线等料八周，客户等不了。',
  },
  // ---- 晶振 ----
  {
    id: 'xtal40p', cat: 'crystal', name: '40MHz 无源晶振', pkg: '3225', price: 0.9, qty: 1, stock: 30200, lead: '现货',
    params: [['频率', '40MHz'], ['频偏', '±10ppm'], ['负载电容', '12pF']],
    verdict: 'ok', note: 'ESP32 标准主晶振就是 40MHz，±10ppm 保证 WiFi 射频频率精度。配两个 12–18pF 负载电容。',
  },
  {
    id: 'xtal40a', cat: 'crystal', name: '40MHz 有源晶振', pkg: '3225', price: 3.5, qty: 1, stock: 5600, lead: '现货',
    params: [['频率', '40MHz'], ['频偏', '±10ppm'], ['供电', '3.3V 自带振荡']],
    verdict: 'warn', note: '性能过剩：ESP32 内部振荡电路配无源晶振即可，有源省不了事还贵 4 倍。',
  },
  {
    id: 'xtal8', cat: 'crystal', name: '8MHz 无源晶振', pkg: '3225', price: 0.6, qty: 1, stock: 12800, lead: '现货',
    params: [['频率', '8MHz'], ['频偏', '±20ppm'], ['负载电容', '20pF']],
    verdict: 'bad', note: '8MHz 是 51 单片机的时代眼泪。ESP32 Boot ROM 按 40MHz 设计，换频率 PLL 配置全乱，直接起不来。',
  },
  // ---- USB 座 ----
  {
    id: 'typec', cat: 'usb', name: 'Type-C 母座 16Pin', pkg: 'SMD', price: 0.45, qty: 1, stock: 66800, lead: '现货',
    params: [['接口', 'USB Type-C'], ['触点', '16Pin 贴片'], ['CC 脚', '需 5.1k 下拉×2']],
    verdict: 'ok', note: '工单指定 Type-C。别忘了 CC1/CC2 各接 5.1kΩ 下拉，否则 C-to-C 线不认你这块板。',
  },
  {
    id: 'microusb', cat: 'usb', name: 'MicroUSB 母座', pkg: 'SMD', price: 0.3, qty: 1, stock: 91200, lead: '现货',
    params: [['接口', 'MicroUSB-B'], ['触点', '5Pin 贴片']],
    verdict: 'bad', note: '工单白纸黑字写 Type-C。省一毛五得罪客户，不值。',
  },
  // ---- 按键 ----
  {
    id: 'tact66', cat: 'button', name: '轻触按键 6×6×5', pkg: '插件', price: 0.06, qty: 2, stock: 152000, lead: '现货',
    params: [['尺寸', '6×6mm'], ['寿命', '10 万次'], ['用量', '×2（RST + BOOT）']],
    verdict: 'ok', note: '复位和 BOOT 各一颗，手感清晰、插件耐操。',
  },
  {
    id: 'sidekey', cat: 'button', name: '贴片侧按开关', pkg: 'SMD', price: 0.15, qty: 2, stock: 0, lead: '缺货 · 替代料审批中',
    params: [['尺寸', '3×4mm 侧按'], ['寿命', '5 万次']],
    verdict: 'out', note: '板边侧按确实优雅，但缺货。',
  },
  // ---- 阻容封装 ----
  {
    id: 'r0603', cat: 'passives', name: '0603 阻容包', pkg: '0603', price: 0.22, qty: 1, stock: 999000, lead: '现货',
    params: [['包含', '电阻×12 + 电容×10'], ['手焊难度', '★★☆ 镊子+放大镜'], ['占板面积', '适中']],
    verdict: 'ok', note: '手焊与面积的黄金平衡点，毕业设计首选。',
  },
  {
    id: 'r0402', cat: 'passives', name: '0402 阻容包', pkg: '0402', price: 0.18, qty: 1, stock: 999000, lead: '现货',
    params: [['包含', '电阻×12 + 电容×10'], ['手焊难度', '★★★ 地狱'], ['占板面积', '最小']],
    verdict: 'warn', note: '手焊难度：地狱。一粒 0402 比芝麻小，烙铁头一哆嗦就立碑（tombstone）。',
  },
  {
    id: 'r0805', cat: 'passives', name: '0805 阻容包', pkg: '0805', price: 0.26, qty: 1, stock: 999000, lead: '现货',
    params: [['包含', '电阻×12 + 电容×10'], ['手焊难度', '★☆☆ 闭眼焊'], ['占板面积', '偏大']],
    verdict: 'warn', note: '好焊是好焊，就是 60×40 的小板会被挤得转不开身。',
  },
];

const CAT_LABEL: Record<keyof BomSelection, string> = {
  ldo: 'LDO 稳压器',
  crystal: '晶振',
  usb: 'USB 连接器',
  button: '按键 ×2',
  passives: '阻容封装',
};

/** 固定物料（不占选型位） */
const FIXED_ROWS = [
  { ref: 'U1', name: 'ESP32-WROOM-32E 模组', pkg: 'Module', qty: 1, price: 14.5 },
  { ref: 'U2', name: 'CH340C USB 转串口', pkg: 'SOP-16', qty: 1, price: 2.2 },
  { ref: 'Q1/Q2', name: 'S8050 NPN 三极管', pkg: 'SOT-23', qty: 2, price: 0.04 },
  { ref: 'PCB', name: '双层板 60×40mm（5 片摊销）', pkg: '1.6mm', qty: 1, price: 1.0 },
];

const REF_OF: Record<keyof BomSelection, string> = {
  ldo: 'U3',
  crystal: 'Y1',
  usb: 'J1',
  button: 'SW1/SW2',
  passives: 'R1..C10',
};

/** 封装热阻 θJA（°C/W，典型值，铺铜一般条件下的估算） */
const THETA_JA: Record<string, number> = {
  'SOT-223': 90,
  'SOT-89': 100,
  'SOT-23-5': 150,
  'SOT-23': 150,
};
const TA_AMBIENT = 25; // 环境温度估算
const TJ_SCALE = 150; // 温度条满刻度 °C
const TJ_WARN = 85;
const TJ_MAX = 125;

export default function BomSelect({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const grad = useGrad();
  const set = useGrad(s => s.set);
  const [sel, setSel] = useState<BomSelection>(grad.bom);
  const [frozen, setFrozen] = useState(grad.bomFrozen);
  const [confirm0402, setConfirm0402] = useState(false);
  const [loadMa, setLoadMa] = useState(240); // LDO 负载电流滑杆（mA）：默认取 ESP32 典型持续负载 240mA（瞬时峰值 >500mA，电源按 ≥500mA 设计）
  const { toasts, push } = useToasts();

  const partOf = (cat: keyof BomSelection) => PARTS.find(p => p.id === sel[cat]) ?? null;

  const fixedTotal = FIXED_ROWS.reduce((s, r) => s + r.price * r.qty, 0);
  const selTotal = (Object.keys(sel) as (keyof BomSelection)[]).reduce((s, cat) => {
    const p = partOf(cat);
    return s + (p ? p.price * p.qty : 0);
  }, 0);
  const total = fixedTotal + selTotal;

  /** 每类目判定：bad/out 阻止冻结 */
  const catStatus = (cat: keyof BomSelection): 'empty' | 'ok' | 'warn' | 'bad' => {
    const p = partOf(cat);
    if (!p) return 'empty';
    if (p.verdict === 'bad' || p.verdict === 'out') return 'bad';
    if (p.verdict === 'warn') return 'warn';
    return 'ok';
  };
  const allChosen = (Object.keys(sel) as (keyof BomSelection)[]).every(c => sel[c] !== null);
  const noBad = (Object.keys(sel) as (keyof BomSelection)[]).every(c => catStatus(c) !== 'bad');
  const canFreeze = allChosen && noBad && total <= 30;
  const extreme = canFreeze && total <= 22;

  // 热校核（按所选 LDO，React Compiler 自动 memo）
  const ldoPart = partOf('ldo');
  const thermal = ldoPart ? { part: ldoPart, full: 1.7 * 0.5, real: 1.7 * 0.24 } : null;
  // 互动温升：P = (Vin−Vout)·I，Tj ≈ Ta + P·θJA（θJA 按所选 LDO 封装）
  const thetaJA = ldoPart ? (THETA_JA[ldoPart.pkg] ?? 150) : null;
  const ldoPower = 1.7 * (loadMa / 1000);
  const tj = thetaJA !== null ? TA_AMBIENT + ldoPower * thetaJA : null;
  const tjPct = tj !== null ? Math.min(100, (tj / TJ_SCALE) * 100) : 0;

  const choose = (p: Part) => {
    if (frozen) return;
    if (p.verdict === 'out') {
      push('warn', `「${p.name}」缺货（交期 8 周）——供货状态也是选型指标！`);
      return;
    }
    if (p.id === 'r0402') {
      setConfirm0402(true);
      return;
    }
    applyChoose(p);
  };

  const applyChoose = (p: Part) => {
    const next = { ...sel, [p.cat]: p.id };
    setSel(next);
    set({ bom: next, bomCost: 0 });
    if (p.verdict === 'bad') push('danger', `选型不合理：${p.note}`);
    else if (p.id === 'ams1117')
      push('warn', '热警告：压差 1.7V × 0.5A = 0.85W，SOT-223 满载会烫到 90°C+。ESP32 典型持续负载 ~240mA 可用，但瞬时峰值 >500mA，电源按 ≥500mA 设计，别按满载跑。');
    else if (p.verdict === 'warn') push('warn', p.note);
    else push('ok', `${p.name} 已选入 BOM`);
  };

  const freeze = () => {
    setFrozen(true);
    if (!visitor) {
      set({
        bomFrozen: true,
        bom: sel,
        bomCost: total,
        extremeSaver: extreme,
      });
      push('ok', extreme ? 'BOM 冻结！达成「极限降本」徽章 ≤¥22' : 'BOM 冻结！');
    }
  };

  return (
    <div className="grid grid-cols-[2fr_3fr] gap-6">
      <ToastHost toasts={toasts} />
      {/* 左：货架 */}
      <div>
        <SilkTag>STEP 2 / 元器件选型 LCSC SHELF</SilkTag>
        <h2 className="mb-1 mt-3 text-2xl font-black text-silk-100">立创货架</h2>
        <p className="mb-4 font-mono text-xs text-silk-500">点击元件选入 BOM · 缺货料不可选 · 预算 ≤ ¥30/片</p>
        <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-2">
          {(Object.keys(CAT_LABEL) as (keyof BomSelection)[]).map(cat => (
            <div key={cat}>
              <h4 className="mb-2 font-mono text-xs uppercase tracking-widest text-sig-cyan">{CAT_LABEL[cat]}</h4>
              <div className="space-y-2">
                {PARTS.filter(p => p.cat === cat).map(p => {
                  const selected = sel[cat] === p.id;
                  const out = p.verdict === 'out';
                  return (
                    <button
                      key={p.id}
                      onClick={() => choose(p)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-all',
                        selected
                          ? 'border-pcb-400 bg-pcb-600/15 glow-pcb'
                          : out
                            ? 'border-ink-700 bg-ink-850 opacity-55'
                            : 'border-ink-700 bg-ink-850 hover:border-pcb-500',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-silk-100">{p.name}</span>
                        <span className="font-mono text-sm text-copper-300">¥{p.price.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-silk-500">
                        <span className="text-sig-cyan">{p.pkg}</span>
                        {p.params.map(([k, v]) => (
                          <span key={k}>
                            {k} <span className="text-silk-300">{v}</span>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px]">
                        <span className={out ? 'text-danger' : 'text-pcb-300'}>
                          {out ? <Snowflake className="mr-1 inline h-3 w-3" /> : <Truck className="mr-1 inline h-3 w-3" />}
                          {out ? p.lead : `库存 ${p.stock.toLocaleString()} · ${p.lead}`}
                        </span>
                        {selected && <span className="text-pcb-300">✓ 已入 BOM</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右：BOM 表 + 校核 */}
      <div className="flex flex-col gap-4">
        <div className="panel-raised relative rounded-lg p-4">
          <h4 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-silk-500">
            <Package className="h-4 w-4" /> BOM · 物料清单（单片）
          </h4>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-ink-700 text-left text-silk-500">
                <th className="py-1.5">位号</th>
                <th>型号</th>
                <th>封装</th>
                <th className="text-right">数量</th>
                <th className="text-right">单价</th>
                <th className="text-right">小计</th>
                <th className="w-16 text-right">判定</th>
              </tr>
            </thead>
            <tbody>
              {FIXED_ROWS.map(r => (
                <tr key={r.ref} className="border-b border-ink-700/50 text-silk-300">
                  <td className="py-1.5 text-sig-cyan">{r.ref}</td>
                  <td>{r.name}</td>
                  <td className="text-silk-500">{r.pkg}</td>
                  <td className="text-right">{r.qty}</td>
                  <td className="text-right">¥{r.price.toFixed(2)}</td>
                  <td className="text-right">¥{(r.price * r.qty).toFixed(2)}</td>
                  <td className="text-right text-pcb-300">固定</td>
                </tr>
              ))}
              <AnimatePresence>
                {(Object.keys(CAT_LABEL) as (keyof BomSelection)[]).map(cat => {
                  const p = partOf(cat);
                  const st = catStatus(cat);
                  return (
                    <motion.tr
                      key={cat}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'border-b border-ink-700/50',
                        st === 'bad' ? 'text-danger' : st === 'ok' ? 'text-silk-100' : 'text-silk-300',
                      )}
                    >
                      <td className="py-1.5 text-sig-cyan">{REF_OF[cat]}</td>
                      <td>{p ? p.name : <span className="text-silk-700">待选型 · {CAT_LABEL[cat]}</span>}</td>
                      <td className="text-silk-500">{p?.pkg ?? '—'}</td>
                      <td className="text-right">{p?.qty ?? '—'}</td>
                      <td className="text-right">{p ? `¥${p.price.toFixed(2)}` : '—'}</td>
                      <td className="text-right">{p ? `¥${(p.price * p.qty).toFixed(2)}` : '—'}</td>
                      <td
                        className={cn(
                          'text-right font-bold',
                          st === 'ok' && 'text-pcb-300',
                          st === 'warn' && 'text-warn',
                          st === 'bad' && 'text-danger',
                        )}
                      >
                        {st === 'empty' ? '—' : st === 'ok' ? '✓' : st === 'warn' ? '⚠' : '✗'}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {/* 不合理选型提示 */}
          {(Object.keys(sel) as (keyof BomSelection)[]).map(cat => {
            const p = partOf(cat);
            if (!p || (p.verdict !== 'bad' && p.verdict !== 'out')) return null;
            return (
              <p key={cat} className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-danger">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {p.note}
              </p>
            );
          })}

          {/* 合计 + 预算条 */}
          <div className="mt-4 flex items-end justify-between border-t border-ink-700 pt-3">
            <div className="text-xs text-silk-500">
              单片合计（含 5 片摊销 PCB 费）
              <div className="mt-1 text-2xl font-black">
                <RollingNumber value={total} />
                <span className="ml-2 text-xs font-normal text-silk-500">×5 ≈ ¥{(total * 5).toFixed(2)}</span>
              </div>
            </div>
            <div className="w-48">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-silk-500">
                <span>预算 ¥30</span>
                <span className={extreme ? 'text-copper-300' : ''}>徽章 ≤¥22</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
                <motion.div
                  className={cn('h-full rounded-full', total > 30 ? 'bg-danger' : total <= 22 ? 'bg-copper-400' : 'bg-pcb-500')}
                  animate={{ width: `${Math.min(100, (total / 30) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              {total > 30 && <p className="mt-1 font-mono text-[10px] text-danger">超支！换便宜方案</p>}
              {extreme && <p className="mt-1 font-mono text-[10px] text-copper-300">★ 极限降本达成线内</p>}
            </div>
          </div>

          {/* BOM 冻结章 */}
          <div className="absolute -right-3 -top-3">
            <SealStamp text="BOM 冻结" sub="BOM FROZEN" show={frozen} tone="copper" />
          </div>
        </div>

        {/* 热设计校核 */}
        <div className="panel rounded-lg p-4">
          <h4 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-silk-500">
            <Flame className="h-4 w-4 text-warn" /> 热设计校核（LDO）
          </h4>
          {thermal && tj !== null ? (
            <div className="space-y-3 font-mono text-xs text-silk-300">
              {/* 负载电流滑杆 */}
              <label className="block space-y-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-silk-300">负载电流 I</span>
                  <span>
                    <span className="text-sm font-bold text-copper-300">{loadMa}mA</span>
                    <span className="ml-2 text-[10px] text-silk-500">ESP32 持续 ≈240 · 瞬时 &gt;500 · 按 ≥500 设计</span>
                  </span>
                </span>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={loadMa}
                  onChange={e => setLoadMa(Number(e.target.value))}
                  className="w-full accent-pcb-500"
                />
              </label>
              <div className="flex gap-2">
                {([240, 500] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setLoadMa(v)}
                    className={cn(
                      'rounded border px-2 py-0.5 text-[10px] transition-colors',
                      loadMa === v
                        ? 'border-pcb-400 bg-pcb-500/15 text-pcb-300'
                        : 'border-ink-700 text-silk-500 hover:text-silk-300',
                    )}
                  >
                    {v === 240 ? '持续 240mA（典型）' : '满载 500mA（峰值口径）'}
                  </button>
                ))}
              </div>
              {/* 实时功耗 / 结温读数 */}
              <p>
                P = (5V − 3.3V) × {(loadMa / 1000).toFixed(2)}A ={' '}
                <span className={ldoPower > 0.6 ? 'text-warn' : 'text-pcb-300'}>{ldoPower.toFixed(2)}W</span>
                <span className="ml-3 text-silk-500">
                  θJA（{thermal.part.pkg}）≈ {thetaJA}°C/W
                </span>
              </p>
              <p>
                估算结温 Tj ≈ {TA_AMBIENT}°C + {ldoPower.toFixed(2)}W × {thetaJA}°C/W ={' '}
                <span
                  className={cn(
                    'text-sm font-bold',
                    tj > TJ_MAX ? 'text-danger' : tj > TJ_WARN ? 'text-warn' : 'text-pcb-300',
                  )}
                >
                  {tj.toFixed(0)}°C
                </span>
              </p>
              {/* 温度进度条：pcb-300 → warn → danger 渐变，85°C / 125°C 刻度线 */}
              <div>
                <div className="relative h-3 overflow-hidden rounded-full bg-ink-700">
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, #6FE3A1 0%, #FFB020 ${(TJ_WARN / TJ_SCALE) * 100}%, #FF5263 ${(TJ_MAX / TJ_SCALE) * 100}%)`,
                      ...(tj > TJ_MAX ? { filter: 'drop-shadow(0 0 6px rgba(255,82,99,0.6))' } : {}),
                    }}
                    animate={{ clipPath: `inset(0 ${(100 - tjPct).toFixed(1)}% 0 0)` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                  <div className="absolute top-0 h-full w-px bg-silk-100/70" style={{ left: `${(TJ_WARN / TJ_SCALE) * 100}%` }} />
                  <div className="absolute top-0 h-full w-px bg-silk-100/70" style={{ left: `${(TJ_MAX / TJ_SCALE) * 100}%` }} />
                </div>
                <div className="relative mt-0.5 h-3.5 text-[9px] text-silk-500">
                  <span className="absolute -translate-x-1/2" style={{ left: `${(TJ_WARN / TJ_SCALE) * 100}%` }}>85°C</span>
                  <span className="absolute -translate-x-1/2" style={{ left: `${(TJ_MAX / TJ_SCALE) * 100}%` }}>125°C</span>
                  <span className="absolute right-0">{TJ_SCALE}°C</span>
                </div>
              </div>
              {tj > TJ_MAX ? (
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-danger">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  结温超限！换封装（θJA 更小）或降压差——压差 1.7V 这么大，就别按这个电流持续跑。
                </p>
              ) : tj > TJ_WARN ? (
                <p className="text-[11px] text-warn">△ 超过 85°C：留足散热铜皮，或换 θJA 更小的封装。</p>
              ) : (
                <p className="text-[11px] text-pcb-300">✓ 结温安全，热设计有裕量。</p>
              )}
              <p className="text-silk-500">
                {thermal.part.id === 'xc6206'
                  ? '✗ 最大输出 250mA < 瞬时峰值 >500mA，连平均百 mA 级都没裕量 —— 不合格'
                  : thermal.part.id === 'me6211'
                    ? '✓ 500mA 额定 + 40µA 静态电流，无线传感器节点的省电之选'
                    : thermal.part.id === 'ams1117'
                      ? '△ 压差大、Iq 5mA 偏高，但皮实便宜，NodeMCU 全系同款'
                      : '—'}
              </p>
            </div>
          ) : (
            <p className="font-mono text-xs text-silk-700">先从货架选一颗 LDO…</p>
          )}
        </div>

        {/* 冻结按钮 */}
        <div className="flex items-center gap-4">
          {frozen ? (
            <>
              <p className="font-mono text-sm text-pcb-300">
                ✓ BOM 已冻结 · 单片 ¥{total.toFixed(2)}
                {extreme && ' · 🏅 极限降本'}
              </p>
              <PadButton variant="primary" size="L" onClick={onComplete}>
                进入 PCB 布局 →
              </PadButton>
            </>
          ) : (
            <>
              <PadButton variant="copper" size="L" disabled={!canFreeze} onClick={freeze}>
                {visitor ? '冻结 BOM（游客模式不签核）' : '冻结 BOM'}
              </PadButton>
              {!canFreeze && (
                <p className="font-mono text-[11px] text-silk-500">
                  冻结条件：五类全部选型 · 无 ✗ 项 · 总成本 ≤ ¥30
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 0402 地狱确认 */}
      <AnimatePresence>
        {confirm0402 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
            onClick={() => setConfirm0402(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="panel-raised w-96 rounded-lg p-5"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-lg font-black text-warn">手焊难度：地狱</h4>
              <p className="mt-2 text-sm leading-relaxed text-silk-300">
                0402 封装尺寸 1.0×0.5mm，比芝麻还小。手焊极易立碑、连锡、被烙铁吸走。老周劝你三思。
              </p>
              <p className="mt-1 font-mono text-xs text-silk-500">（坚持使用会在毕业证书留下彩蛋记录）</p>
              <div className="mt-4 flex gap-3">
                <PadButton
                  variant="danger"
                  size="M"
                  onClick={() => {
                    setConfirm0402(false);
                    const p = PARTS.find(x => x.id === 'r0402')!;
                    applyChoose(p);
                    if (!visitor) set({ used0402: true });
                    push('warn', '你选择了地狱难度。烙铁头已预热，祝好运。');
                  }}
                >
                  我偏要 0402
                </PadButton>
                <PadButton variant="ghost" size="M" onClick={() => setConfirm0402(false)}>
                  听劝，换 0603
                </PadButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
