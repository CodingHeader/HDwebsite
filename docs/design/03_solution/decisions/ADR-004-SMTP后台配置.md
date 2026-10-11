---
id: ADR-004
type: architecture-decision
title: SMTP 及提醒收件人后台配置，后补
status: accepted
date: 2026-10-10
---

# ADR-004：SMTP 后台配置、后补

## 状态

accepted（2026-10-10 会话决策 C4，用户确认）

## 背景

邮箱提醒依赖 SMTP 账号（host/端口/授权码），凭证当下未定；提醒框架若等凭证则 S5 无法与其他模块并行开发。

## 决策

- SMTP 配置走 Setting email 分组（后台可配 + 连接测试按钮），凭证后补（DEP-003）
- NotifyRecipient（提醒人）与 NotifyRule（规则）全部后台维护，不写死收件人
- 框架先行：事件埋点、队列、重试、留痕全就绪，凭证录入即生效

## 依据

- 用户问答确认（C4 ✅）
- REQ-C-003（人工运维、一切后台化）

## 备选方案

| 方案 | 评估 | 结论 |
| --- | --- | --- |
| SMTP 走 .env 环境变量 | 改配置需登服务器，运营无法自助 | 弃 |
| 第三方邮件 SaaS API | 新增外部依赖与费用，单机场景过重 | 弃 |
| Setting email 分组后台配置 | 与现有配置体系一致，自助 + 可测试 | **选定** |

## 影响

- 提醒类验收在凭证就绪后执行（REQ-F-011 标记项）
- 未配置 SMTP 时事件入 NotifyRecord（status=skipped, reason=smtp_not_configured），不报错不阻塞主流程

## 关联

- REQ-F-011；SOL-005；DEP-003
