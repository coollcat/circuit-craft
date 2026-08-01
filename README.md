# 回路工坊 CircuitCraft — PCB 电路学习闯关

从「电是什么」到「ESP32 打板毕业」的 PCB 电路设计交互式闯关学习站。纯前端，无需后端，进度存于浏览器 localStorage。

## 玩法

- **闯关解谜**：节点拖拽连线 + 信号流向可视化，即时反馈 + 剧情推进
- **准物理仿真**：简化 SPICE（MNA 求解器），电压/电流真实计算，类 Falstad 实时波形
- **毕业项目**：主线 ESP32 最小系统板（含嘉立创打板流程模拟），支线信号处理传感器小板

## 内容

- 主线 7 章约 30 关，难度递进：电是什么 → 认识元器件 → 原理图设计 → PCB 布局布线 → 信号处理 → 无线通信基础 → 选型实战 + 毕业设计
- 支线 A：ESP32 单片机入门（GPIO / ADC / PWM）
- 支线 B：进阶信号处理（传感器信号链毕业小板）
- 自由沙盒模式：老手向，全部件解锁
- 图鉴系统 + 互动实验台（RC 充放电、LED 特性、运放、能带）

## 技术栈

React 19 + Vite 7 + TypeScript + Tailwind CSS + shadcn/ui + Zustand

## 开发

```bash
npm install
npm run dev     # 本地开发
npm run build   # 生产构建，产出于 dist/
```

## 目录结构

```
src/
├── engine/       # 仿真引擎（MNA 求解器、模拟器、粒子流）
├── content/      # 关卡内容数据（c1-c7 主线 + sideA/sideB 支线）
├── features/
│   ├── codex/    # 图鉴与实验台
│   └── graduation/ # 毕业项目（原理图评审、Gerber 导出、嘉立创下单）
├── components/   # UI 组件（编辑器、首页区块）
└── pages/        # 页面路由
```
