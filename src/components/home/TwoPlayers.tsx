// S6 两种玩家（Framer Motion 双卡）
import { motion } from 'framer-motion';

const CARDS = [
  {
    title: '我是零基础',
    tone: 'green' as const,
    body: '从「电是什么」开始。每一关都有小焊陪着你：三级渐进提示、失败不扣任何东西、卡关三次自动出现「示教重影」手把手带。你只管连，知识会自己长出来。',
    list: ['剧情引导', '三级提示', '防卡关示教', '每关一张知识卡'],
  },
  {
    title: '我是老硬件/学生',
    tone: 'copper' as const,
    body: '仿真不是过家家：MNA 求解器真实计算电压电流，示波器看纹波与频率响应。选型章讲数据手册与供货，布局章讲回流路径与去耦——说不定有你一直没搞懂的细节。',
    list: ['准物理仿真', '真实选型/成本', '自由沙盒', '全解锁挑战'],
  },
];

export default function TwoPlayers() {
  return (
    <section className="mx-auto max-w-[1280px] px-12 py-24">
      <div className="flex justify-center gap-8">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, x: i === 0 ? -32 : 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`panel w-[592px] rounded-lg border-t-2 p-8 ${
              c.tone === 'green' ? 'border-t-pcb-400' : 'border-t-copper-400'
            }`}
          >
            <h3 className="mb-3 text-2xl font-bold text-silk-100">{c.title}</h3>
            <p className="mb-6 text-sm leading-relaxed text-silk-300">{c.body}</p>
            <ul className="grid grid-cols-2 gap-3">
              {c.list.map((item, j) => (
                <li key={item} className="flex items-center gap-2 text-sm text-silk-100">
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{
                      delay: 0.3 + j * 0.07,
                      type: 'spring',
                      stiffness: 400,
                      damping: 15,
                    }}
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      c.tone === 'green'
                        ? 'bg-pcb-500/20 text-pcb-300'
                        : 'bg-copper-500/20 text-copper-300'
                    }`}
                  >
                    ✓
                  </motion.span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
