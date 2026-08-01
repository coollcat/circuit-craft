// S8 FAQ（shadcn Accordion 定制 + Framer Motion 入场）
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const QA = [
  {
    q: '完全零基础能玩吗？',
    a: '能。第 1 章假设你连电池正负极都分不清。',
  },
  {
    q: '需要装软件吗？',
    a: '不用，浏览器打开即玩，进度存在你自己的浏览器里。',
  },
  {
    q: '仿真有多「真」？',
    a: '简化 SPICE（MNA 求解），电压/电流/波形真实计算；但它是教学模型，不替代专业仿真器。',
  },
  {
    q: '毕业设计打完板真的能做出来吗？',
    a: '游戏内含真实打板流程教学与 Gerber 讲解，照着做可以在嘉立创下单（打板费用自理，我们与任何厂商无利益关系）。',
  },
  {
    q: '会教写单片机代码吗？',
    a: '支线 A 讲 GPIO/PWM/ADC 的直觉和最小概念，用块式伪代码；深入编程暂不做，留了你「可选择了解」的入口。',
  },
  {
    q: '进度丢了怎么办？',
    a: '进度绑定浏览器 localStorage，清缓存会丢失；沙盒作品可导出分享码备份。',
  },
];

export default function Faq() {
  return (
    <section className="mx-auto max-w-[880px] px-12 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center text-4xl font-bold text-silk-100"
      >
        你可能想问
      </motion.h2>
      <Accordion type="single" collapsible className="flex flex-col gap-3">
        {QA.map((item, i) => (
          <motion.div
            key={item.q}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <AccordionItem
              value={`q-${i}`}
              className="rounded-lg border border-ink-600 bg-ink-800 px-5 data-[state=open]:border-pcb-600"
            >
              <AccordionTrigger className="py-4 text-left text-base font-bold text-silk-100 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-silk-300">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </section>
  );
}
