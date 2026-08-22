// S5 毕业项目展示（Framer Motion + hover 3D 倾斜）
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SilkTag from '@/components/SilkTag';
import PadButton from '@/components/PadButton';

const STEPS = ['原理图', '选型 BOM', 'PCB 布局', 'Gerber', '下单模拟'];

export default function FinalProject() {
  const imgRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 8, ry: px * 8 });
  };

  return (
    <section className="mx-auto max-w-[1280px] px-12 py-24">
      <div className="flex items-center gap-16">
        {/* 左：ESP32 板渲染图（Gerber 网格底座 + hover 3D 倾斜） */}
        <motion.div
          initial={{ opacity: 0, y: 48, rotateX: 8 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-[520px] shrink-0"
        >
          <div
            ref={imgRef}
            onMouseMove={onMove}
            onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
            className="gerber-grid panel relative rounded-lg p-6"
            style={{
              perspective: '900px',
            }}
          >
            <img
              src="/esp32-board-hero.png"
              alt="ESP32 最小系统板渲染图"
              className="w-full rounded transition-transform duration-200"
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transformStyle: 'preserve-3d',
              }}
              draggable={false}
            />
            {/* 丝印装饰标注 */}
            <span className="absolute left-8 top-8 border border-dashed border-silk-500 px-1.5 font-mono text-[10px] text-silk-300">
              U1 ESP32-WROOM
            </span>
            <span className="absolute bottom-8 right-8 border border-dashed border-silk-500 px-1.5 font-mono text-[10px] text-silk-300">
              J3 USB-C
            </span>
          </div>
        </motion.div>

        {/* 右：文案 */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.09 }}
          className="flex-1"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
            <SilkTag className="mb-5">FINAL PROJECT</SilkTag>
          </motion.div>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="mb-4 mt-5 text-4xl font-bold leading-tight text-silk-100"
          >
            毕业设计：一块真能打板的{' '}
            <span className="font-display text-copper-400">ESP32</span> 最小系统板
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="mb-6 leading-relaxed text-silk-300"
          >
            电源、晶振、复位、USB 转串口、LDO 选型——一步不缺。完成原理图与 PCB
            布局后，你会导出真实命名的 Gerber 文件清单，并在模拟的嘉立创下单流程里「下单」。拿着游戏里的教程，你可以直接去打出一块真板。
          </motion.p>

          {/* 五步流程条 */}
          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            className="mb-6 flex items-center"
          >
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0.4 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: 0.2 + i * 0.2, type: 'spring', stiffness: 300, damping: 18 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="h-4 w-4 rounded-full border-2 border-copper-400 bg-ink-850" />
                  <span className="whitespace-nowrap font-mono text-xs text-silk-300">{s}</span>
                </motion.div>
                {i < STEPS.length - 1 && (
                  <motion.span
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.3 }}
                    className="mx-2 mb-5 h-[2px] w-10 origin-left bg-copper-500"
                  />
                )}
              </div>
            ))}
          </motion.div>

          {/* 参数条（铜色开窗底纹） */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="copper-window mb-6 w-fit rounded px-4 py-2 font-mono text-[13px] font-bold"
          >
            2 层板 · 1.6mm · 无铅喷锡 · 预计 ¥30 内 / 5 片
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
            <PadButton to="/graduation" variant="ghost" size="M">
              查看毕业设计流程 →
            </PadButton>
            <p className="mt-4 text-xs text-silk-700">
              支线 B 另有毕业小板：传感器信号处理板（传感器→放大→滤波→ADC）。
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
