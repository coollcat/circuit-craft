// /graduation 毕业设计：ESP32 最小系统板五步向导
// 解锁门槛：主线前 6 章（c1-1..c6-4）全通关；?dev=1 旁路（验收用）；游客模式可参观不签核
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, GraduationCap, ChevronRight } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import DialogueBar from '@/components/DialogueBar';
import { useProgress } from '@/store/progress';
import type { DialogueLine } from '@/engine/types';
import { isGraduationUnlocked, useGrad } from '@/features/graduation/store';
import StepTrace from '@/features/graduation/StepTrace';
import { StepPanel } from '@/features/graduation/ui';
import OrderSlip, { STEP0_LINES } from '@/features/graduation/OrderSlip';
import SchematicReview, { STEP1_LINES } from '@/features/graduation/SchematicReview';
import BomSelect, { STEP2_LINES } from '@/features/graduation/BomSelect';
import PcbEditor, { STEP3_LINES } from '@/features/graduation/PcbEditor';
import GerberExport, { STEP4_LINES } from '@/features/graduation/GerberExport';
import JlcOrder, { STEP5_LINES } from '@/features/graduation/JlcOrder';
import Certificate, { STEP6_LINES } from '@/features/graduation/Certificate';

const FLOW = [
  ['需求工单', '林工的客户订单：无线温湿度传感器节点'],
  ['原理图考核', '三轮设计评审：电源 / 复位启动 / USB 转串口'],
  ['选型 BOM', '立创货架实战：热校核、成本、供货三重约束'],
  ['PCB 布局', '双层板 mini-game：45° 走线 + 铺铜 + 实时 DRC'],
  ['Gerber 下单', '真实导出 Gerber zip + 嘉立创下单全流程模拟'],
] as const;

/** 未解锁预览页 */
function LockedPreview({ onVisit }: { onVisit: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12">
      <div className="grid grid-cols-2 items-center gap-10">
        <div>
          <SilkTag>FINAL PROJECT / 毕业设计</SilkTag>
          <h1 className="mt-4 text-4xl font-black leading-tight text-silk-100">
            ESP32 最小系统板
            <br />
            <span className="text-copper-300 text-glow-copper">五步毕业向导</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-silk-300">
            从一张客户订单开始，走完原理图考核、元器件选型、PCB 布局布线、Gerber 导出与嘉立创下单的完整流程——
            最后领到盖着三枚签核章的毕业证书。导出的 Gerber 是真实文件，可以直接送去打板。
          </p>
          <div className="mt-6 space-y-2.5">
            {FLOW.map(([t, d], i) => (
              <div key={t} className="flex items-center gap-3 font-mono text-xs text-silk-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-600 text-silk-700">
                  {i + 1}
                </span>
                <span className="text-silk-100">{t}</span>
                <span className="hidden sm:inline">— {d}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-4">
            <PadButton variant="copper" size="L" to="/chapters">
              <Lock className="h-4 w-4" /> 先去通关主线前 6 章
            </PadButton>
            <button
              onClick={onVisit}
              className="flex items-center gap-1.5 text-sm text-sig-cyan underline-offset-4 hover:underline"
            >
              <Eye className="h-4 w-4" /> 我想先参观一下
            </button>
          </div>
          <p className="mt-3 font-mono text-[11px] text-silk-700">
            游客模式可查看完整流程，但签核章与毕业证书不可用。
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <img
            src="/esp32-board-hero.png"
            alt="ESP32 最小系统板渲染图"
            className="w-full rounded-lg border border-ink-600 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink-950/45">
            <span className="flex items-center gap-2 rounded-full border border-copper-400/60 bg-ink-950/80 px-4 py-2 font-mono text-sm text-copper-300">
              <GraduationCap className="h-4 w-4" /> 通关第 6 章解锁完整流程
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Graduation() {
  const completed = useProgress(s => s.completed);
  const devBypass = useMemo(
    () => new URLSearchParams(window.location.search).get('dev') === '1',
    [],
  );
  const unlocked = devBypass || isGraduationUnlocked(completed);
  const [visitor, setVisitor] = useState(false);

  // 完整模式：step 存 store；游客模式：本地 state
  const grad = useGrad();
  const set = useGrad(s => s.set);
  const [vStep, setVStep] = useState(0);
  const [vMax, setVMax] = useState(0);

  const step = visitor ? vStep : grad.step;
  const maxReached = visitor ? vMax : grad.step;
  const [sub4, setSub4] = useState<'gerber' | 'order'>(grad.gerberExported ? 'order' : 'gerber');

  const goStep = (s: number) => {
    if (visitor) {
      setVStep(s);
      setVMax(m => Math.max(m, s));
    } else {
      set({ step: s });
    }
  };
  const next = () => goStep(Math.min(5, step + 1));

  if (!unlocked && !visitor) {
    return <LockedPreview onVisit={() => setVisitor(true)} />;
  }

  const lines: DialogueLine[] =
    step === 0
      ? STEP0_LINES
      : step === 1
        ? STEP1_LINES
        : step === 2
          ? STEP2_LINES
          : step === 3
            ? STEP3_LINES
            : step === 4
              ? sub4 === 'gerber'
                ? STEP4_LINES
                : STEP5_LINES
              : STEP6_LINES;

  return (
    // 与 LevelPlay / Sandbox 统一：页面高度 = 视口 − 64px 导航，底部 DialogueBar 恒定在首屏内；
    // 步骤内容改在内部滚动容器里滚，文档整体不再恒高 64px。
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      <StepTrace step={step} maxReached={maxReached} onJump={goStep} visitor={visitor} />

      {visitor && (
        <div className="border-b border-copper-600/40 bg-copper-600/10 px-6 py-1.5 text-center font-mono text-[11px] text-copper-300">
          游客参观模式 · 流程完整可看，签核章与毕业证书不可用 ·{' '}
          <a href="/chapters" className="underline">
            去通关解锁完整模式
          </a>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <StepPanel key={visitor ? `v${step}` : step}>
          {step === 0 && <OrderSlip visitor={visitor} onComplete={next} />}
          {step === 1 && <SchematicReview visitor={visitor} onComplete={next} />}
          {step === 2 && <BomSelect visitor={visitor} onComplete={next} />}
          {step === 3 && <PcbEditor visitor={visitor} onComplete={next} />}
          {step === 4 &&
            (sub4 === 'gerber' ? (
              <GerberExport visitor={visitor} onComplete={() => setSub4('order')} />
            ) : (
              <JlcOrder visitor={visitor} onComplete={next} />
            ))}
          {step === 5 && <Certificate visitor={visitor} />}
        </StepPanel>

        {step < 5 && (visitor || devBypass) && (
          <div className="mx-auto flex max-w-[1280px] justify-end px-6 pb-4">
            <button
              onClick={next}
              className="flex items-center gap-1 font-mono text-[11px] text-silk-700 hover:text-silk-300"
              title="跳过本步（参观/调试用）"
            >
              跳过本步 <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <DialogueBar lines={lines} />
    </div>
  );
}
