# 架构与模块职责

> 面向「要改这个项目的人」。约定类规则见 [AGENTS.md](../AGENTS.md)，引擎口径见 [ENGINE.md](./ENGINE.md)，
> 内容规范见 [CONTENT.md](./CONTENT.md)，本次全面审查的证据见 [AUDIT.md](./AUDIT.md)。

## 一句话结构

前端是一个纯客户端 React 应用（Vite 构建），所有电路计算都在浏览器里的自研求解器上完成；
`api/` 与 `db/` 只负责账号、进度云同步这类外围能力，**没有它们站点也能完整玩**（游客态）。

```
浏览器
 ├─ 关卡/沙盒页 ── CircuitEditor（画布/布线/仪器）── CircuitSimulator（rAF 推进）── solver.ts（MNA 求解）
 ├─ 图鉴页 ── entries.ts（知识数据） + labs/（6 个交互实验） + figures/（实物图解，与关卡同模型）
 ├─ 章节/毕业页 ── progress store（localStorage: cc-save-v1）
 └─ 账号 ── tRPC ── api/（Hono）── db/（Drizzle + MySQL）
```

## 目录职责

| 路径 | 职责 | 备注 |
|---|---|---|
| `src/engine/` | 求解器与器件模型 | `solver.ts` 是唯一物理真相；`explain.ts` 只读结果做教学推导 |
| `src/content/` | 44 关数据、参考解法推导、误解诊断、概念注册表 | 三套自动审计在这里（见 CONTENT.md） |
| `src/components/editor/` | 电路编辑器：布线、命中、防呆、参数、示波器 | 预览/落线/命中/粒子必须共用同一组折线 |
| `src/components/` | 站点外壳：导航、对话框、章节地图、首页分区 | |
| `src/features/codex/` | 图鉴数据（42 条）、手绘原理图（40 张）、7 个交互实验 | 数据与展示分离 |
| `src/features/figures/` | 等距实物图解工具链 + 两张图 | 与关卡共用同一份物理模型 |
| `src/features/graduation/` | 原理图复核 → PCB → DRC → BOM → Gerber → 下单 | |
| `src/features/account/` | 账号与进度云同步 | |
| `src/pages/` | 路由页面：首页/章节/关卡/沙盒/支线/图鉴/图解/毕业 | 除首页外全部 `lazy()` 分包 |
| `src/store/` | zustand + persist（`cc-save-v1`） | 隐私模式下自动降级到内存（`lib/safeStorage.ts`） |
| `api/` `db/` | Hono + tRPC + Drizzle(MySQL) | 账号、存档同步 |
| `figures/` | 图解离线预览构建器（`node figures/build.mjs <name>`） | 产物 `figures/out/` 不入库 |

## 关键数据流

**关卡**：`LevelDef`（内容）→ `buildSolutionCircuit`（参考解法，测试用）/ 玩家电路 →
`compileCircuit`（并查集把导线合成网络、挑参考地）→ `solveCompiled`（牛顿式迭代 + 分段线性器件）→
`SolveResult`（节点电压 / 支路电流）→ `evaluateGoals`（GoalCheck 判定）→ 关卡页验收台。
瞬态（RC/波形关）走 `CircuitSimulator`：`rAF` 推进 → 梯形法伴随模型 → `latest` 同时喂给判定与示波器。

**教学展示**：`SolveResult` → `explain.ts`（通式 + 代入数字 + 结论）→ 验收台 / 结算能量账本；
误解诊断走 `content/diagnose.ts`（只出提示文本，不改判定）。

**图解/图鉴实验**：`<figure>/model.ts`（纯物理）→ `geometry.ts`（静态 SVG）+ `parts.ts`（可动件路径生成器）
→ 站点组件（React）/ 离线预览（内联同源码）/ 图鉴 Lab —— 四处共用同一份实现。

## 前端工程约定

- 路由级分包：`App.tsx` 里除首页外全部 `lazy()`；three.js / GSAP 重依赖只在需要的页面加载。
- UI 组件：shadcn/ui 53 个已装（`src/components/ui/`），导入用 `@/components/ui/...`。
  已装清单：accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button button-group calendar
  card carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu empty field form
  hover-card input input-group input-otp item kbd label menubar navigation-menu pagination popover progress
  radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner spinner switch
  table tabs textarea toggle toggle-group tooltip。
- 样式：Tailwind 3 + 主题令牌（`rgb(var(--cc-*))`），改样式走 `tailwind.config.js` / `src/index.css`，
  **不要在组件里写死十六进制颜色**（亮/暗两套主题会漏）。
- 动效：循环动画必须尊重 `useMotionOn()`；`MotionConfig reducedMotion` 只覆盖 transform/opacity，不够。

## 已知的工程债务

- 主包 `index-*.js` 约 920KB（gzip 305KB），主要是 shadcn + framer-motion + 图标；可继续按路由/组件再拆。
- `route45Avoid` 在极端密集画布上会以「略增一对覆盖率」换取避让元件本体（实测最多 +0.0039，44 关内无越界）。
- 数据库迁移目录尚未纳入实际迁移文件（`db/migrations/.gitkeep`），云同步目前以本地为主。
