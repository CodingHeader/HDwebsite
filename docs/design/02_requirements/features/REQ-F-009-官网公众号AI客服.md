---
id: REQ-F-009
type: requirement-feature
title: 官网和公众号的 AI 客服
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-009：官网和公众号的 AI 客服

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 9 条："允许配置官网和公众号的AI客服"） |
| 对应原编号 | N9 |
| 优先级 | P1（M2 官网端 / M4 公众号端） |

## 2. 背景

官网端 AI 咨询现嵌在 apply 页 + 悬浮入口（非流式，等待感强）；公众号端无 AI 应答能力，消息只能人工处理。

## 3. 目标

双端 AI 客服：官网端升级为可挂载、流式输出的客服组件；公众号端实现微信消息自动 AI 应答（含知识库）。

### 用户故事

作为访客，我想在官网和公众号即时获得 AI 答复（最好逐字流出），以便不用等工作时间的人工客服。

## 4. 需求描述

- **官网端**：ChatWidget 抽离为独立可挂载组件（全局悬浮/页面嵌入）；SSE 流式输出；会话续传（sessionId 存 localStorage）；场景（ChatScene）驱动。
- **公众号端**：`/api/wechat/callback`（GET 验签 / POST 消息）→ 5 秒内被动回复（"正在为您查询…"）→ 异步调 llm-gateway（含知识检索）→ 48h 窗口内客服消息接口补发长答案 → 超长截断 + 引导官网。
- 风控：每用户限频（默认 10 次/分钟）、黑名单、敏感词过滤。

## 5. 范围

### In Scope

- 官网 ChatWidget（流式/挂载化/会话续传）
- 公众号回调接口 + 被动回复 + 客服消息补发
- WechatAccount.aiEnabled 开关 + 绑定 ChatScene（默认 faq 场景）

### Out of Scope

- 语音/图片消息理解（文本消息为主）
- 人工客服坐席接管转接

## 6. 约束与依赖

- REQ-C-002（5s/48h 微信限制）；ADR-006（被动+异步补发形态）
- 依赖 SOL-003 网关；公众号端依赖 DEP-001 凭证

## 7. 验收条件

- [x] 官网端聊天组件可全局悬浮挂载，SSE 流式逐字输出（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 刷新后会话可续传（localStorage sessionId）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 公众号文本消息收到 5s 内有被动回复（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [ ] 长答案经客服消息接口补发成功（48h 窗口内实测）
- [x] 限频与黑名单生效；敏感词被过滤（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] aiEnabled 关闭后公众号不自动应答（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）

## 8. 影响分析

- AIChatHistory 留存扩展渠道维度（website/wechat）
- 替换 05-交互 §2 现状规格中的"非流式"约定（88s 超时策略随网关收敛）

## 9. 关联文档

- Solution：SOL-003（官网端）、SOL-006（公众号端）
- Decision：ADR-006
- 设计提取：16-新增设计 §8、05-交互设计 §2
- Plan：M2（官网端）/ M4（公众号端）
