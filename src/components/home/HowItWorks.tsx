// S3 玩法三步 —「怎么玩」（Framer Motion 卡片 + 独立循环 SVG 动画微组件）
import { memo } from 'react';
import { motion } from 'framer-motion';
import SilkTag from '@/components/SilkTag';
import TraceDivider from '@/components/TraceDivider';

/** 卡 1：两个焊盘间导线自动绘出（2s loop） */
const WiringAnim = memo(function WiringAnim() {
  return (
    <svg viewBox="0 0 320 120" className="h-28 w-full">
      <circle cx="40" cy="60" r="14" fill="#C9803C" />
      <circle cx="40" cy="60" r="6" fill="#060A08" />
      <circle cx="280" cy="60" r="14" fill="#C9803C" />
      <circle cx="280" cy="60" r="6" fill="#060A08" />
      <path
        d="M54 60 L150 60 L170 40 L266 40"
        fill="none"
        stroke="#3FC47F"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeDasharray="230"
        strokeDashoffset="230"
      >
        <animate attributeName="stroke-dashoffset" values="230;0;0;230" keyTimes="0;0.55;0.85;1" dur="2s" repeatCount="indefinite" />
      </path>
      <circle r="3.5" fill="#6FE3A1">
        <animateMotion dur="2s" repeatCount="indefinite" path="M54 60 L150 60 L170 40 L266 40" keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear" />
      </circle>
    </svg>
  );
});

/** 卡 2：正弦波被滤波后变平（3s loop） */
const WaveAnim = memo(function WaveAnim() {
  return (
    <svg viewBox="0 0 320 120" className="h-28 w-full">
      <path d="M0 60 H320" stroke="#1B2E24" strokeWidth="1" />
      <path d="M0 20 V100 M160 20 V100" stroke="#1B2E24" strokeWidth="1" strokeDasharray="3 4" />
      <path id="inwave" d="M0 60 C13 20 27 20 40 60 C53 100 67 100 80 60 C93 20 107 20 120 60 C133 100 147 100 160 60 C173 20 187 20 200 60 C213 100 227 100 240 60 C253 20 267 20 280 60 C293 100 307 100 320 60"
        fill="none" stroke="#45DCE8" strokeWidth="2" strokeDasharray="420" strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" from="420" to="0" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M160 60 C180 58 200 58 220 59 C250 60 280 60 320 60" fill="none" stroke="#E56BD6" strokeWidth="2" opacity="0.9">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.45;0.6;0.9;1" dur="3s" repeatCount="indefinite" />
      </path>
      <text x="8" y="16" fontSize="9" fontFamily="'JetBrains Mono',monospace" fill="#45DCE8">CH1 IN</text>
      <text x="248" y="16" fontSize="9" fontFamily="'JetBrains Mono',monospace" fill="#E56BD6">CH2 OUT</text>
    </svg>
  );
});

/** 卡 3：Gerber 层叠展开（4s loop） */
const LayersAnim = memo(function LayersAnim() {
  const layers = ['#3FC47F', '#C9803C', '#45DCE8', '#E0A458'];
  return (
    <svg viewBox="0 0 320 120" className="h-28 w-full">
      {layers.map((c, i) => (
        <g key={c}>
          <rect x="90" y="20" width="140" height="60" rx="4" fill="none" stroke={c} strokeWidth="2" opacity="0.9"
            transform={`translate(${i * 8}, ${i * 10})`}>
            <animateTransform attributeName="transform" type="translate"
              values={`0 0;${i * 8} ${i * 10};${i * 8} ${i * 10};0 0`} keyTimes="0;0.4;0.75;1"
              dur="4s" repeatCount="indefinite" />
          </rect>
        </g>
      ))}
      <text x="8" y="112" fontSize="9" fontFamily="'JetBrains Mono',monospace" fill="#8E8976">GERBER · 2 LAYERS · HASL</text>
    </svg>
  );
});

const CARDS = [
  {
    anim: <WiringAnim />,
    title: '拖拽连线，搭出电路',
    body: '从元件库拖出电阻、电容、运放，把端口连成回路。像《while True: learn()》一样解谜，但你连的是真电路。',
  },
  {
    anim: <WaveAnim />,
    title: '打开示波器，看见信号',
    body: '内置简化 SPICE 仿真：电压电流真实计算，RC 充放电、滤波器频率响应，都能在波形上看到。',
  },
  {
    anim: <LayersAnim />,
    title: '打出真板，拿在手里',
    body: '毕业设计是一块 ESP32 最小系统板：画原理图、选料、布板、导出 Gerber，模拟走完嘉立创下单全流程。',
  },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1280px] px-12 py-24">
      <TraceDivider className="mb-16" />
      <div className="mb-12 text-center">
        <SilkTag className="mb-5">HOW IT WORKS</SilkTag>
        <h2 className="mt-5 text-4xl font-bold text-silk-100">像解谜一样学硬件</h2>
      </div>
      <div className="flex justify-center gap-8">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="panel w-[384px] rounded-lg p-6 transition-colors duration-200 hover:border-pcb-400"
          >
            <div className="mb-4 rounded bg-ink-900/60 p-2">{c.anim}</div>
            <h3 className="mb-2 text-xl font-bold text-silk-100">{c.title}</h3>
            <p className="text-sm leading-relaxed text-silk-500">{c.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
