---
id: REQ-F-003
type: requirement-feature
title: 自动更新和发布官网信息和新闻
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-003：自动更新和发布官网信息和新闻

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 3 条） |
| 对应原编号 | N3 |
| 优先级 | P0（M3） |

## 2. 背景

官网信息/新闻目前需人工在后台逐篇编辑发布；采集得到的政策素材也无法自动变成官网内容，发布时效与人工成本矛盾。

## 3. 目标

采集（或人工撰写）内容经审核后，可定时/自动发布为官网 Article，形成"采集 → 审核 → 发布"闭环，发布前有邮件提醒。

### 用户故事

作为运营，我想让审核通过的稿件按排期自动发布到官网，以便发布不依赖我在线手动操作。

## 4. 需求描述

发布任务模型 PublishJob 承载渠道（website/wechat）、动作（publish/update/offline）、计划时间与状态机（draft → pending_review → approved → scheduled → publishing → published/failed/cancelled）；调度基座每分钟扫描到点任务执行官网写入（Article, contentType=markdown）；发布前触发邮箱提醒（仅通知语义，默认提前 30 分钟可配）；失败可重试并邮件告警。

## 5. 范围

### In Scope

- PublishJob 模型 + 状态机 + 管理页（发布队列：待发/已发/失败 + 重试）
- 采集审核通过内容一键转 ContentItem 并排期发布
- 官网渠道自动写入（与 C1 合并后的 Article 体系）

### Out of Scope

- Setting 类站点信息的"变更单"定时生效（可选二期，16-新增设计 §3.3）
- 灰度/多环境发布编排

## 6. 约束与依赖

- ADR-008：发布前提醒 = 仅通知，非审批门（不做 waiting_confirm 状态）
- 依赖 SOL-001（调度 + Markdown 管线）、SOL-004（采集来源）；News→Article 迁移（ADR-001）为其数据前提

## 7. 验收条件

- [x] PublishJob 状态机全链路状态可查（含 errMsg 与 result）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 定时任务到点自动执行官网发布（每分钟扫描精度）（证据：src/lib/__tests__/scheduler-cron.test.ts）
- [x] 采集条目审核通过后可一键进入发布排期（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 发布前提醒邮件按配置提前量发出（立即发布则即时"即将发布"通知）（证据：src/lib/__tests__/notify-before-publish.test.ts）
- [x] 发布失败进入 failed 可一键重试，并触发告警邮件（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 发布产物 Article(status=published, contentType=markdown) 在前台正常渲染（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）

## 8. 影响分析

- Article 写入复用现有 API/服务层；viewCount/SEO 字段随发布填充
- 与 REQ-F-011（提醒）同批落地（SOL-005）

## 9. 关联文档

- Solution：SOL-005
- Decision：ADR-001（数据前提）、ADR-008（提醒语义）
- 设计提取：16-新增设计 §3、§9
- Plan：M3（S5）
