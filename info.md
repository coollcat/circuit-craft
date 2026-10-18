# 快速索引：改什么去哪里

> 文档总入口见 [README.md](README.md#文档)；规则速查见 [AGENTS.md](AGENTS.md)。
> 本文只回答一个问题：**我想改 X，该动哪个文件、跑哪个检查。**

## 按需求找文件

| 我想… | 动这里 | 改完跑 |
|---|---|---|
| 加/改关卡（题目、目标、提示、知识卡） | `src/content/levels/{c1..c7,sideA,sideB}.ts` | `npm test`（`levels.test.ts` 会点名） |
| 加一个元件 | `src/engine/solver.ts`（`PORT_NAMES`/`DEFAULT_PARAMS`/`COMP_META`/stamp/读回）+ 两层符号 `components/editor/symbols.tsx`、`features/codex/symbols.tsx` | `npm test` + 浏览器画一遍 |
| 改某个器件的电学模型 | `src/engine/solver.ts`（stamp 与读回必须同步） | `npm test`（`solver.test.ts` 42 例） |
| 改教学推导/验收台文案 | `src/engine/explain.ts`、`src/content/diagnose.ts` | `npm test`（`explain.test.ts`） |
| 改关卡页布局/交互 | `src/pages/LevelPlay.tsx` | `npm run check` + 浏览器 |
| 改自动布线与拖拽防呆 | `src/components/editor/{routing,wireRoutes,CircuitEditor}.ts(x)` | `npm test`（`wires-diag` + `routing`） |
| 改图鉴条目内容 | `src/features/codex/data/entries.ts`（19 字段六段式） | `npm run check` + 手算复验数字 |
| 加图鉴交互实验 | `src/features/codex/labs/`（参考 `ServoLab.tsx`）+ `labs/index.tsx` 注册 | `npm run check` + 浏览器 |
| 加实物图解 | `src/features/figures/<name>/{scene,model,geometry,parts}.ts`（参考 `servo-sg90`） | `node figures/build.mjs <name>` + 浏览器 |
| 改原理图小电路 | `src/features/codex/MiniSchematic.tsx` | 检查走线真的接在引脚上 |
| 改 3D 实物模型 | `src/features/codex3d/`、`src/features/pcb3d/models.ts` | `npm run check` |
| 改主题/配色 | `tailwind.config.js`、`src/index.css`（令牌 `--cc-*`） | 亮/暗两套都看 |
| 改账号/云同步 | `api/queries/account.ts`、`src/features/account/` | `npm run check` |
| 改毕业流程 | `src/features/graduation/`、`src/pages/Graduation.tsx` | 浏览器走一遍 |

## 路由地图

| 路径 | 页面 |
|---|---|
| `/` | 首页（营销 + 迷你交互演示） |
| `/chapters` | 章节地图（主线 7 章 + 支线入口） |
| `/play/:levelId` | 关卡工作台（编辑器 + 验收台 + 示波器） |
| `/sandbox` | 自由沙盒 |
| `/sidequests` | 支线 A / B |
| `/codex` | 图鉴（42 条 + 7 个实验） |
| `/figures` | 实物图解（面包板限流回路 / SG90 舵机） |
| `/graduation` | 毕业流程（原理图复核 → PCB → BOM → Gerber → 下单） |

## 数据与存档

- 进度存档：localStorage `cc-save-v1`（zustand persist），隐私模式下自动降级到内存，键与结构见 `src/store/progress.ts`。
- 调试进度：`localStorage.setItem('cc-save-v1', JSON.stringify({ state: { completed: ['c3-1','c3-2','c3-3','c3-4','c3-5'], stars: {}, hintsUsed: {}, settings: {} }, version: 0 }))`
  可解锁到第 4 章（图鉴按「前一章通关」解锁）。
- 沙盒存档槽：`cc-sandbox-*`；工程导入导出见 `src/features/pcb3d/projectFile.ts`。

## 环境备注

- 本机 Node v24 + npm；依赖已装（`node_modules/`）。
- 构建/测试若报 `esbuild-…: Access is denied`，把 TEMP/TMP 指到工作区内（见 AGENTS.md）。
- 沙箱禁止 node 以管道 stdio 派生进程时，vite/vitest 会报 `spawn EPERM`——需要放开限制再跑。
