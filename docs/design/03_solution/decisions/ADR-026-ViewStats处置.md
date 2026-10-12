---
id: ADR-026
type: decision
title: ViewStats 模型保留但闲置（不删表、不在 P04 接入）；按日浏览统计接入登记为 P06 待办
status: accepted
owner: P04 执行者（待独立验证）
created: 2026-10-12
updated: 2026-10-12
requires: [REQ-F-013, REQ-NF-004]
related: [ADR-024, PLAN-CURRENT, parity-matrix D4]
---

# ADR-026：ViewStats 处置

## Context（背景）
- `ViewStats`（contentType/contentId/viewDate 唯一，pageViews/uniqueVisitors/source/referrer）在 main@94dbbbb 与 upgrade 的 schema 中字段一致，但两侧代码**零引用**（`grep -rn "viewStats\|ViewStats" src scripts` 无结果；parity-matrix D4）。
- 文章浏览量现由 `Article.viewCount` 累加（`src/app/(web)/articles/[id]/page.tsx:58`），前台"阅读数/热门排行"只依赖该列。
- 用户裁决：main 的每个功能都必须在 upgrade 存在；表结构也是 main 资产的一部分。P04 只允许一个加法迁移，禁止删列/删表。

## Options（选项，正反两面）
1. **保留但闲置**（选中）
   - 正：与 main 结构对等；零迁移、零风险；未来接入无需新表。
   - 反：存在一张无写入方的空表，后台无入口，可能被误认为"已有统计"。
2. **P04 即接入文章浏览统计**（文章详情页按日 upsert pageViews）
   - 正：仪表盘可出趋势图。
   - 反：属业务代码（`src/app/**` 不在 P04 允许路径），且前台请求链路多一次写入，需与 RISK-007（SQLite 写并发）一并评估；uniqueVisitors 需要访客去重口径（cookie/IP），属于需求未定项。
3. **删除模型**
   - 反：违反"main 功能/结构必须存在"与"仅加法迁移"，否决。

## Decision（决策）
选 1：P04 保留 `ViewStats` 不动、不种数据、不写业务代码。

## Consequences / 待办
- **P06（逻辑）待办**：如需仪表盘浏览趋势，在文章/课程详情的浏览累加处（与 `Article.viewCount` 同一处）按 `(contentType, contentId, viewDate=当天 00:00 Asia/Shanghai)` upsert `pageViews += 1`；uniqueVisitors 口径（匿名 cookie 去重）先写入需求再实现；写入失败不得影响页面渲染（fire-and-forget + 日志）。
- 唯一约束 `@@unique([contentType, contentId, viewDate])` 已覆盖该 upsert 的查询路径，接入时无需新增索引。
- 未接入前，后台不展示 ViewStats 入口，避免误导。
