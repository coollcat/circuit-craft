# AGENTS.md — circuit-craft 项目维护指南

## 项目是什么
电路主题交互网站（React 全栈工程，前端 + API + 数据库）。主线 30 关 + 支线 A 6 关 + 支线 B 8 关 = 44 关，
另有图鉴（Codex，42 条元件条目）、沙盒、毕业流程（原理图复核 / PCB / BOM / Gerber / 下单）。

## 技术栈与结构
- 前端：React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui
- 后端：`api/`（boot.ts/context.ts/router.ts/middleware.ts/queries/lib），`db/` 用 Drizzle ORM（schema.ts/relations.ts/seed.ts/migrations/）
- 目录：`src/sections/` 页面分区、`src/hooks/` 自定义 hooks、`src/types/` 类型、`src/App.tsx` 根组件、`src/main.tsx` 入口、`vite.config.ts` 构建配置

## 命令
- 构建：`npm run build` → `dist/`；开发：`npm run dev`
- 类型检查：`npm run check`（`tsc -b`，必须零错误）
- 单元测试：`npm test`（vitest，当前 9 文件 292 例）
- 数据库迁移：drizzle-kit（db/migrations 下）
- Windows 沙箱注意：esbuild 需要一个可写、可删除的临时目录，若构建/测试报
  `esbuild-…: Access is denied`，把 TEMP/TMP 指到工作区内再跑，例如
  `$env:TEMP="$PWD\.tmp-build"; $env:TMP="$PWD\.tmp-build"; node node_modules/vite/bin/vite.js build`

## 约定
- 组件导入用 `@/components/ui/...` 别名；shadcn 组件 40+ 已装
- 改样式走 `tailwind.config.js` / `src/index.css`；勿破坏组件复用

## 引擎契约（改求解器前必读）
- `src/engine/types.ts` 是跨模块冻结接口：单位（V / mA / Hz / Ω / F）、端口命名、`GoalCheck` 种类都在这里。
- `src/engine/solver.ts`：MNA 直流工作点 + 分段线性器件模型。非线性器件用**单调**分段模型
  （`i = max(0, (Vd − Vf)/rOn)`），stamp 与电流读回必须共用同一判据——历史 bug 就是两处判据不一致
  导致"导通态"落在 `Vd < Vf` 上、二极管倒灌电流。
- `src/engine/explain.ts`：把求解结果翻译成「通式 + 代入数字」的教学推导（`explainComponent` /
  `explainGoal` / `netVoltageTable` / `powerLedger`）。只读 `SolveResult`，不做仿真，供关卡页验收台与结算账本消费。
- 器件参数读取统一走 `numParam(c, [主键, 别名…], 默认值)`：**先扫用户 params，全部缺失才回落默认值**，否则别名永远读不到。

## 内容约定（改关卡前必读）
- 每关数值目标必须在「preset + palette 出厂参数」下**不成立**，否则就是「免费绿灯」——学习者不需要计算。
  这条由 `src/content/levels/levels.test.ts` 的审计用例守护，未修完的写在 `KNOWN_FREE_GREEN` 白名单里，每条必须带原因与 TODO。
- 关卡参考解法由 `src/content/solution.ts` 推导：`param` 目标自动取区间中值，推导不出来的值要写进
  `LEVEL_SOLUTION_PARAMS`（例如需要闭合的开关 `{ SW1: { closed: true } }`）。**不要为了让测试变绿放宽断言。**
- 每关应有 `formula`（主导公式）与 `concept`（概念标签，注册在 `src/content/concepts.ts`，每个概念都要能在目标或探针里找到证据）。
- `LevelDef` 可选教学字段：`formula` / `concept` / `codex`（图鉴深链 id）/ `recap`（通关三行小结）。

## 走线（wires）约定
- 自动布线：`src/components/editor/routing.ts` 的 `route45`（纯几何）与 `route45Avoid`（避让分道，8px lane），
  电路级串行布线在 `wireRoutes.ts`（后画的线避让先画的线与元件本体）。
- **预览路径与落线路径必须逐点相同**，渲染 / 命中测试 / 电流粒子也必须共用同一组折线——历史上它们各自算过，出现过"看得见点不中"。
- 重叠审计：`src/content/levels/wires-diag.test.ts` 对 44 关断言互相覆盖率 < 0.15、近距伴随 < 90px、同网重合段为 0，
  并断言阈值本身没被放松。改动布局或布线后必须跑它。
- 编辑器防呆：非法连线（自连 / 重复端口对 / 已同网 / 正负极短路）一律拦截并说明原因；删除可撤销（Ctrl+Z / Ctrl+Shift+Z）；
  参数非法值钳位不写 NaN；未接线端口有计数提示。

## 教学插图（figures）
- `src/features/figures/kit/` 是等距工程图工具包（camera/solids/SVG renderer/CSS），
  `src/features/figures/<figure>/{scene,parts,model,geometry}.ts` 一个实物一张图：
  `scene.ts` 只放尺寸与相机、`model.ts` 是唯一物理真相、`geometry.ts` 出静态 SVG、`parts.ts` 出可动零件的路径生成器（零依赖，便于内联）。
- 站点内嵌组件用 `BreadboardLed.tsx` 的写法（卡片 HTML 建一次 + effect 里直接写属性），路由 `/figures`。
- 离线预览（用于截图验收）：`node figures/build.mjs <name>` → `figures/out/<name>.html`；
  截图：`$env:CHROME_PATH='…msedge.exe'; node <skill>/scripts/capture.mjs <url|file> --out x.png`。
  预览与站点组件共用同一份 geometry/model，不要各写一套。

## 无障碍与动效
- 循环动画（framer-motion repeat、SMIL、CSS keyframes）必须尊重 `useMotionOn()`（设置开关 ∧ 系统偏好），
  `main.tsx` 的 `MotionConfig reducedMotion` 只覆盖 transform/opacity 类动画，不够。
- 图标按钮必须有 `aria-label`；结算层/抽屉是 `role="dialog"` + 焦点管理 + Esc 关闭。
