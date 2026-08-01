// S9 底部 CTA：蜿蜒走线 + hover 通电
import { useState } from 'react';
import { motion } from 'framer-motion';
import PadButton from '@/components/PadButton';

export default function BottomCta() {
  const [energized, setEnergized] = useState(false);

  return (
    <section className="relative overflow-hidden py-28">
      {/* 背景走线：从左缘蜿蜒到按钮 */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M-10 250 L300 250 L340 210 L560 210 L600 250 L680 250"
          fill="none"
          stroke={energized ? '#3FC47F' : '#9A5E28'}
          strokeWidth="3"
          strokeLinejoin="round"
          className="transition-colors duration-500"
          style={energized ? { filter: 'drop-shadow(0 0 6px rgba(63,196,127,0.6))' } : undefined}
        />
        <path
          d="M-10 70 L220 70 L260 110 L480 110 L520 70 L640 70"
          fill="none"
          stroke="#1B2E24"
          strokeWidth="2"
        />
        <circle cx="-10" cy="250" r="6" fill="#C9803C" />
        {energized && (
          <circle r="4" fill="#6FE3A1">
            <animateMotion
              dur="1.4s"
              repeatCount="1"
              path="M-10 250 L300 250 L340 210 L560 210 L600 250 L680 250"
            />
          </circle>
        )}
      </svg>

      <div className="relative flex flex-col items-center gap-8 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ staggerChildren: 0.06 }}
          className="text-4xl font-bold text-silk-100"
        >
          {'现在开始，第一课免费'.split('，').map((seg, i, arr) => (
            <motion.span
              key={seg}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              className="inline-block"
            >
              {seg}
              {i < arr.length - 1 && '，'}
            </motion.span>
          ))}
        </motion.h2>
        <div onMouseEnter={() => setEnergized(true)} onMouseLeave={() => setEnergized(false)}>
          <PadButton to="/play/m1-1" variant="primary" size="L">
            ▶ 开始第 1 关
          </PadButton>
        </div>
      </div>
    </section>
  );
}
