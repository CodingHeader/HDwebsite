---
id: REQ-C-001
type: requirement-constraint
title: 技术栈约束
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-C-001：技术栈约束

## 1. 约束内容

重构不更换技术栈，在现状栈内演进：

| 层 | 约束（锁定） |
| --- | --- |
| 框架 | Next.js 16（App Router）+ React 19，本仓已升级版本（AGENTS.md：非训练数据中的 Next，写码前查 `node_modules/next/dist/docs/`） |
| 语言 | TypeScript strict，禁 `any` |
| UI | Tailwind CSS v4 + shadcn/ui + Radix，`cn()` 工具 |
| 数据 | Prisma ORM + SQLite（libsql），不切 PostgreSQL（预留兼容，Icebox ICE-PG） |
| 认证 | 自研 JWT 双 token（现状保留） |
| 部署 | Node standalone + 宝塔 PM2（REQ-C-003） |
| 新引入库 | 需在 Solution 文档声明并给出理由（如 markdown 渲染、RSS 解析、cron 调度选型），经 ADR 或 Solution 评审后引入 |

## 2. 依据

- AGENTS.md 技术栈约定；13-配置设计（现状依赖清单）
- DEP-008（Prisma libsql）、DEP-007（Node+sharp）

## 3. 违反后果

偏离锁定项（如引入新 ORM、切库）须先走 ADR 变更，否则视为返工。

## 4. 关联文档

- 00_governance/document-standard.md（§50 AI 规则同源）
- 03_solution/architecture.md
