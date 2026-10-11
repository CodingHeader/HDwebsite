---
id: TASK-M1-003
type: task
title: 数据模型基线（42 模型 + 初始迁移 + B 域补录）
status: done
plan-ref: master-plan.md §5
milestone: M1
requires: [REQ-F-012, ADR-022, ADR-019]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-003：数据模型基线

## 归属
- 所属切片：S1
- 来源需求：REQ-F-012（B 域）、各 SOL §4
- 来源方案：ADR-022 / ADR-012（裁剪）/ master-plan §5

## 目标
一次成型的 To-Be 全模型基线迁移，后续切片只做增量迁移。

## 输入
- 文档：04-数据设计.md（31/32 模型）、各 SOL §4 新表字段、B 仓 schema diff（ADR-022）
- 前置任务：TASK-M1-001

## 输出
- prisma/schema.prisma（42 模型：26 存留 + 2 B 域补录 + 14 新增；裁剪 News/PageTemplate/ContentBlock/TemplateBlock/ElementConfig/AIConfig）
- prisma/migrations/20261011052216_init/migration.sql

## Execution Steps
1. [x] 依据文档口径统一（CronJob/ContentItem/CollectItem 状态）写 schema
2. [x] B 域补录（Major/EnrollmentOffering/关联字段）
3. [x] prisma format + migrate dev --name init + generate

## 验收标准
- [x] 迁移成功应用，`prisma migrate status` 无 pending
- [x] JSON-in-String 字段注释齐全；高频过滤列有 @@index
- [x] 无 SQLite 特有 SQL（保持 PG 可迁移）

## 验证命令
```bash
npx prisma migrate status && npx prisma validate
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- prisma/**

## 禁止修改
- src/app/**

## 依赖与阻塞
- Depends on：TASK-M1-001
- Blocks：TASK-M1-004~011
- 阻塞条件：迁移与文档口径冲突 → 回 master-plan §5 更正

## 建议执行档位
opus。理由：数据基线属全局决策（42 模型口径统一）。

## 升级条件
无需。

## 预估规模
中。已完成。
