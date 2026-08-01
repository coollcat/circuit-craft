// Footer（design.md 6.2）：三段式 + 底部丝印条
import { Link } from 'react-router';

const CHAPTERS = [
  '电是什么',
  '认识元器件',
  '原理图设计',
  'PCB 布局布线',
  '信号处理',
  '无线通信',
  '选型实战',
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-700 bg-ink-900">
      <div className="mx-auto grid max-w-[1280px] grid-cols-3 gap-12 px-12 py-14">
        {/* 左：Logo + slogan */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <img src="/logo.svg" alt="回路工坊" className="h-10 w-10" />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-black text-silk-100">回路工坊</span>
              <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-silk-500">
                CIRCUITCRAFT
              </span>
            </span>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-silk-300">
            从点亮一颗 LED，到打出你的第一块 PCB。
          </p>
          <p className="font-mono text-xs text-silk-500">纯前端运行 · 进度保存在本地</p>
        </div>

        {/* 中：学习路径速览 */}
        <div>
          <h4 className="mb-4 text-sm font-bold text-silk-100">学习路径</h4>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {CHAPTERS.map((c, i) => (
              <li key={c}>
                <Link
                  to="/chapters"
                  className="text-sm text-silk-500 transition-colors hover:text-pcb-300"
                >
                  <span className="mr-1.5 font-mono text-xs text-copper-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 右：现实联动 */}
        <div>
          <h4 className="mb-4 text-sm font-bold text-silk-100">现实联动</h4>
          <p className="mb-3 text-sm leading-relaxed text-silk-300">
            通关毕业设计后，可照着游戏内教程在嘉立创真实打板，把作品拿在手里。
          </p>
          <p className="text-xs leading-relaxed text-silk-700">
            免责声明：本站为教学模拟，仿真结果为简化模型；打板费用自理，本站与任何厂商无利益关系。
          </p>
        </div>
      </div>

      {/* 底部丝印条 */}
      <div className="border-t border-ink-700 py-3 text-center font-mono text-[10px] tracking-[0.25em] text-silk-700">
        DESIGNED BY 回路工坊 · REV A · 2024 · SOLDER MASK GREEN · HASL LEAD-FREE
      </div>
    </footer>
  );
}
