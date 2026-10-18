# AGENTS.md — circuit-craft 维护指南

> 这里是**速查**：命令 + 不能踩的硬约束。细节见 `docs/`：
> [架构](docs/ARCHITECTURE.md) · [引擎](docs/ENGINE.md) · [内容规范](docs/CONTENT.md) · [审查记录](docs/AUDIT.md)。

## 项目是什么
电路主题交互网站（React 全栈工程）。主线 30 关 + 支线 A 6 关 + 支线 B 8 关 = **44 关**，
另有图鉴 **42 条**、沙盒、实物图解 2 张、毕业流程（原理图复核 / PCB / BOM / Gerber / 下单）。

## 命令
```bash
npm run dev        # 开发
npm test           # vitest：9 文件 292 例，必须全绿
npm run check      # tsc -b：必须零输出
npm run build      # 生产构建 → dist/
node figures/build.mjs <name>   # 重建图解离线预览（figures/out/，不入库）
```
- **Windows**：构建/测试报 `esbuild-…: Access is denied` 时，把 TEMP/TMP 指到工作区内再跑：
  `$env:TEMP="$PWD\.tmp-build"; $env:TMP="$PWD\.tmp-build"; npm run build`
- 图解/页面的交互改动，用 `drive.mjs` 真实驱动页面验证（键盘 / 拖拽 / 超范围），不要只看代码。

## 硬约束（每条都有自动化守护，别绕过）

1. **引擎**：非线性器件用**单调**分段模型，`stamp` 与电流读回必须共用同一判据；
   单位口径（V / **mA** / Hz / Ω / F）与端口命名只在 `src/engine/types.ts` 与 `PORT_NAMES` 定义一次。
2. **参数读取**：一律走 `numParam(c, [主键, 别名…], 默认值)`——先扫用户 params，全缺才回落默认值。
3. **关卡数值目标**不得被「preset + palette 出厂参数」预先满足（免费绿灯）；未修完的进
   `KNOWN_FREE_GREEN` 白名单，**每条写原因与 TODO**（白名单带反向断言）。不要放宽断言让测试变绿。
4. **参考解法**推导不出来的值写进 `solution.ts` 的 `LEVEL_SOLUTION_PARAMS`；动态关必须跑真实瞬态采样。
5. **每关要有** `formula`（主导公式）与 `concept`（每个概念都要能在目标或探针里找到证据）。
6. **走线**：预览路径 = 落线路径 = 命中测试 = 电流粒子，四处必须共用同一组折线；
   44 关重叠审计（覆盖 <0.15 / 伴随 <90px / 同网重合 0）与阈值断言不得放松。
7. **编辑器防呆**不得退化：非法连线拦截并说明原因、删除可撤销、参数钳位不写 NaN、悬空引脚有计数。
8. **图鉴数值**必须自洽可复算；不确定的值标「约」并写来源，不编造精确数字。
9. **图解**四件套（scene/model/geometry/parts）共用一份实现；`parts.ts` 必须零依赖以便内联；
   可动件在世界坐标重算，不要用屏幕 `rotate` 糊。
10. **无障碍**：图标按钮必须有 `aria-label`；对话框/抽屉用 `role="dialog"` + 焦点管理 + Esc；
    循环动画（framer-motion repeat / SMIL / CSS keyframes）必须尊重 `useMotionOn()`。
11. **样式**走 `tailwind.config.js` / `src/index.css` 与主题令牌（`rgb(var(--cc-*))`），
    不要在组件里写死十六进制颜色；shadcn 组件 53 个已装，用 `@/components/ui/...` 复用，勿重复造。

## 改动后必须做的事
跑 `tsc -b` + `vitest run`；动过关卡内容还要看 `levels.test.ts` 的审计用例是否点名；
动过布局/布线要看 `wires-diag.test.ts`；浏览器里过一眼相关路由（console 必须干净、无横向滚动）。
