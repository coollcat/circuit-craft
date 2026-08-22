# AGENTS.md — circuit-craft 项目维护指南

## 项目是什么
电路主题交互网站（React 全栈工程，前端 + API + 数据库）。

## 技术栈与结构
- 前端：React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui
- 后端：`api/`（boot.ts/context.ts/router.ts/middleware.ts/queries/lib），`db/` 用 Drizzle ORM（schema.ts/relations.ts/seed.ts/migrations/）
- 目录：`src/sections/` 页面分区、`src/hooks/` 自定义 hooks、`src/types/` 类型、`src/App.tsx` 根组件、`src/main.tsx` 入口、`vite.config.ts` 构建配置

## 命令
- 构建：`npm run build` → `dist/`；开发：`npm run dev`
- 数据库迁移：drizzle-kit（db/migrations 下）

## 约定
- 组件导入用 `@/components/ui/...` 别名；shadcn 组件 40+ 已装
- 改样式走 `tailwind.config.js` / `src/index.css`；勿破坏组件复用
