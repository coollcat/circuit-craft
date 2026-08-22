/* eslint-disable react-refresh/only-export-components */
// STEP 0 需求工单：林工递来客户订单（全站唯一亮色卡片，纸质工单质感）
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Cpu, Usb, Zap, Radio, Wallet, Layers } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { SealStamp } from './ui';
import { useGrad } from './store';
import type { DialogueLine } from '@/engine/types';

export const STEP0_LINES: DialogueLine[] = [
  { speaker: 'lingong', text: '哟，听说你把前六章都啃下来了？正好，我这儿有个真活儿。' },
  { speaker: 'lingong', text: '客户要做一批「无线温湿度传感器节点」，核心是一块 ESP32 最小系统板。要求都在工单上，自己看。' },
  { speaker: 'laozhou', text: '别慌。毕业设计不是考试，是把前五章学过的东西串成一块真能打的板子。先想想电流从哪儿来，到哪儿去。' },
];

const REQUIREMENTS = [
  { icon: Usb, key: 'J1', label: 'USB Type-C 供电与固件烧录', note: '5V 输入 · CH340 串口' },
  { icon: Zap, key: 'U3', label: '3.3V 稳压（LDO）', note: '持续 ≥500mA · ESP32 峰值 ~240mA 有裕量' },
  { icon: Cpu, key: 'U1', label: 'ESP32-WROOM-32 模组', note: 'WiFi+BT · 板载 PCB 天线' },
  { icon: Radio, key: 'Y1', label: '40MHz 晶振', note: '模组内已含 · 外挂备用位 ±10ppm' },
  { icon: Layers, key: 'SW1/2', label: '复位与 BOOT 按键 + 自动下载电路', note: 'EN / IO0 · DTR/RTS 联动' },
  { icon: Wallet, key: '$$', label: '两层板 · 成本 ≤ ¥30（5 片小批量）', note: '60×40mm 以内' },
];

export default function OrderSlip({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const accepted = useGrad(s => s.orderAccepted);
  const set = useGrad(s => s.set);
  const [stamped, setStamped] = useState(accepted);
  const [checks, setChecks] = useState<boolean[]>(REQUIREMENTS.map(() => false));
  const allChecked = checks.every(Boolean);

  const accept = () => {
    setStamped(true);
    if (!visitor) {
      set({ orderAccepted: true });
      window.setTimeout(onComplete, 900);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="text-center">
        <SilkTag>STEP 0 / 需求简报 BRIEFING</SilkTag>
        <h2 className="mt-3 text-3xl font-black text-silk-100">
          客户订单 <span className="font-display text-copper-300">#PCB-2024-001</span>
        </h2>
      </div>

      {/* 纸质工单卡（全站唯一亮色） */}
      <motion.div
        initial={{ y: -120, opacity: 0, rotate: 2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className="relative w-full max-w-2xl rounded-sm bg-[#F2EFE3] p-8 text-[#2a2620] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 27px, rgba(42,38,32,0.06) 27px 28px)',
        }}
      >
        <div className="flex items-start justify-between border-b-2 border-dashed border-[#8E8976] pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-[#55524A]">
              <ClipboardList className="h-4 w-4" /> 华强北回路工坊 · 外协加工需求单
            </div>
            <h3 className="mt-1 text-2xl font-black">无线温湿度传感器节点</h3>
            <p className="mt-0.5 font-mono text-sm text-[#55524A]">主板：ESP32 最小系统板 ×1</p>
          </div>
          <div className="text-right font-mono text-xs leading-relaxed text-[#55524A]">
            订单号 #PCB-2024-001
            <br />
            客户：林工（产品经理）
            <br />
            交期：越快越好
          </div>
        </div>

        <ul className="mt-4 space-y-2.5">
          {REQUIREMENTS.map((r, i) => (
            <li key={r.key} className="flex items-center gap-3">
              <button
                onClick={() => setChecks(c => c.map((v, j) => (j === i ? !v : v)))}
                className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 font-mono text-xs transition-colors ${
                  checks[i] ? 'border-[#2E9E63] bg-[#2E9E63] text-white' : 'border-[#8E8976] bg-transparent'
                }`}
                aria-label={`确认需求：${r.label}`}
              >
                {checks[i] && '✓'}
              </button>
              <r.icon className="h-4 w-4 shrink-0 text-[#55524A]" />
              <span className="font-mono text-xs text-[#9A5E28]">{r.key}</span>
              <span className="text-sm font-bold">{r.label}</span>
              <span className="ml-auto hidden text-right font-mono text-xs text-[#55524A] sm:block">
                {r.note}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-dashed border-[#8E8976] pt-3 text-sm italic text-[#55524A]">
          「做出来，我给你介绍下一单。」—— 林工
        </p>

        {/* 已受理印章 */}
        <div className="absolute bottom-6 right-8">
          <SealStamp text="已受理" sub="ACCEPTED · 2024" show={stamped} />
        </div>
      </motion.div>

      <div className="flex flex-col items-center gap-2">
        {!allChecked && <p className="font-mono text-xs text-silk-500">逐条勾选，确认你读懂了每一项需求 ↑</p>}
        {stamped ? (
          visitor ? (
            <PadButton variant="copper" size="L" onClick={onComplete}>
              继续参观 →（游客模式不签核）
            </PadButton>
          ) : (
            <div className="flex items-center gap-4">
              <p className="font-mono text-sm text-pcb-300">✓ 订单已受理</p>
              <PadButton variant="copper" size="L" onClick={onComplete}>
                进入原理图考核 →
              </PadButton>
            </div>
          )
        ) : (
          <PadButton variant="copper" size="L" disabled={!allChecked} onClick={accept}>
            接受订单
          </PadButton>
        )}
      </div>
    </div>
  );
}
