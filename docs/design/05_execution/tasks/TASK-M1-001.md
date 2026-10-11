---
id: TASK-M1-001
type: task
title: 新仓初始化（脚手架/env 规范/启动链路/git 基线）
status: done
plan-ref: current-plan.md「下一轮：开工 M1」
milestone: M1
requires: [ADR-011, SOL-001]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-001：新仓初始化

## 归属
- 所属切片：S1（M1 步行骨架）
- 来源需求：任务书「平行新仓重写」；REQ-C-001 技术栈约束
- 来源方案：SOL-001 / ADR-011

## 目标
`hdwebsite_1011` 成为可 build、可 start、可测试的独立 Next.js 16 仓，依赖版本与原仓对齐。

## 输入
- 文档：docs/design（全部）、原仓 package.json/next.config/tsconfig/start-next.mjs（已验证配置）
- 契约：无（本卡先行）
- 前置任务：无

## 输出
- package.json（next 16.2.1/react 19.2.4/prisma ^7.7/zod ^4/vitest ^3，scripts: dev/build/start/lint/typecheck/test/check）
- tsconfig.json、next.config.ts（Windows 不产 standalone；图片域名白名单；/uploads rewrite；CORS 头）、postcss.config.mjs、eslint.config.mjs、prisma.config.ts、.env.example、.gitignore、scripts/start-next.mjs(+utils)、vitest.config.ts

## Execution Steps
1. [x] 按 B 仓已验证配置落脚手架文件（新增 vitest 接线）
2. [x] npm install（npmmirror，721 包）
3. [x] .env 注入本地 JWT_SECRET（≥32 字符）

## 验收标准
- [x] npm install 无错误
- [x] .env.example 只含键名与占位值，无真实凭据
- [x] .gitignore 覆盖 node_modules/.next/.env*/prisma dev.db/backups/.local

## 验证命令
```bash
node -v && npm install --dry-run && git status --short | head
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/（安装日志摘要、文件清单）

## 允许修改
- 根目录脚手架配置、package.json、scripts/start-next*

## 禁止修改
- docs/design/**（除本卡状态）、src/contracts/**

## 依赖与阻塞
- Depends on：无
- Blocks：TASK-M1-002~011 全部
- 阻塞条件：npm install 失败（网络/版本冲突）

## 建议执行档位
sonnet。理由：配置搬运 + 已验证模板复制，无架构决策。

## 升级条件
Next 16/Prisma 7 出现未知 breaking change 需要仲裁时升 opus。

## 预估规模
小（<2 小时，实际 ~0.5h）。已完成。
