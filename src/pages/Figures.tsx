// 教学插图页 /figures —— 把「实物怎么接」用等距工程图讲清楚：
// 每张图都是一个真实物件 + 会动的机构，读数由与关卡引擎同一套口径的物理模型算出。
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ensureIsoStyles } from '@/features/figures/isoStyles';

const BreadboardLed = lazy(() => import('@/features/figures/breadboard-led/BreadboardLed'));

function FigureFallback() {
  return (
    <div className="flex h-72 items-center justify-center font-mono text-xs text-silk-500">
      <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-pcb-400" />
      正在装配实物图…
    </div>
  );
}

interface FigureMeta {
  id: string;
  title: string;
  level: string;
  levelId: string;
  points: string[];
  node: React.ReactNode;
}

const FIGURES: FigureMeta[] = [
  {
    id: 'breadboard-led',
    title: '面包板 · LED 限流电路',
    level: '第 1 章 · LED 限流电阻',
    levelId: 'c1-4',
    points: [
      '拨动电阻箱四个拨盘 = 换限流电阻，表针与 LED 亮度立刻跟着变。',
      '公式 I = (V_cc − V_f) / (R + r_on)：9V 电池、红光 LED 取 V_f = 2V、r_on = 5Ω。',
      '拨到 470Ω：14.7mA，正常亮；拨到 220Ω：31mA，表盘进入红区（超过 20mA 额定）；拨到 100Ω：66.7mA，0.1 秒后 LED 烧毁。',
      '烧了就点一下 LED 换一颗新灯 —— 真实实验里也是这么做的，但记得先把电阻调大。',
    ],
    node: <BreadboardLed />,
  },
];

export default function Figures() {
  ensureIsoStyles();
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Badge variant="outline" className="border-pcb-400/40 text-pcb-300">
            图解
          </Badge>
          <span className="font-mono text-xs text-silk-500">INTERACTIVE FIGURES</span>
        </div>
        <h1 className="text-2xl font-black text-silk-100">实物怎么接：看得见的电路</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-silk-300">
          关卡里算出来的数字，在真实台面上长什么样？这里每张图都是一件真东西——面包板、电阻箱、毫安表、电池——
          并且会动：你拨一下，电流就变，灯就亮或烧。读数用的物理模型与关卡引擎完全同一套口径
          （LED：V<sub>f</sub> = 2V、r<sub>on</sub> = 5Ω、额定 20mA、超过 3 倍持续 0.1 秒烧毁）。
        </p>
      </header>

      <div className="space-y-10">
        {FIGURES.map(fig => (
          <Card key={fig.id} className="border-ink-700 bg-ink-900/60">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg text-silk-100">{fig.title}</CardTitle>
                <Link
                  to={`/play/${fig.levelId}`}
                  className="font-mono text-xs text-pcb-300 underline-offset-4 hover:underline"
                >
                  {fig.level} → 去关卡练一遍
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ErrorBoundary variant="viewer">
                <Suspense fallback={<FigureFallback />}>{fig.node}</Suspense>
              </ErrorBoundary>
              <ul className="space-y-2 text-sm leading-relaxed text-silk-300">
                {fig.points.map(point => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pcb-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
