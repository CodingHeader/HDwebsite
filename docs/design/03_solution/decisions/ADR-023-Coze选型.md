---
id: ADR-023
type: decision
title: 外部知识库与大模型通道选用扣子（Coze）
status: accepted
owner: 开发
created: 2026-10-11
updated: 2026-10-11
requires: [REQ-F-007, REQ-F-008, ADR-020]
---

# ADR-023：外部知识库与大模型通道选用扣子（Coze）

## Context（背景）

ADR-020 留下知识库选型待定（Dify/FastGPT 候选）。用户 2026-10-11 拍板：**使用扣子（Coze，coze.cn）**，并提供参考项目 wechat-clawbot 中的现成凭证（PAT + bot_id，存于该项目 .env，未向本仓抄录明文）与完整接入指南（docs/coze-integration.md）。

## Decision（决策）

1. **LLM 网关新增 provider kind = `coze`**：与 OpenAI 兼容型 provider 并列为两种适配器。
   - 通道：`POST {COZE_API_BASE}/v3/chat`（Bearer PAT；bot_id + user_id + additional_messages；stream=true SSE 优先，轮询 retrieve + message/list 兜底）。
   - 知识能力：Coze 智能体（bot）自带知识库编排，"大模型使用知识库"经 bot 侧满足；会话历史由本端留存（AIChatHistory），user_id 用 hash 策略脱敏。
2. **KBAdapter 增加 CozeClient 实现位**：search/pushFile/upsertFile/remove 抽象不变；Coze 知识库（datasets）API 需要 PAT 勾选 dataset 权限——现成 PAT 仅保证 chat 权限，因此：
   - chat 链路（含知识问答）立即可用；
   - dataset 级 push/search 在 PAT 无权限时**优雅降级**（返回明确的 permission 提示，管理页可见），不阻塞 M2；
   - 本地兜底双轨（LocalFallback + Knowledge 表）始终可用，检索测试页对两条链路分别出结果。
3. 凭证治理：PAT/bot_id 属敏感值，落库走 isEncrypted 字段（AES-GCM），界面回显脱敏；不进 git、不进文档、不进日志。
4. Coze 参数（api_base 默认 https://api.coze.cn、超时 60s 可配、user_id 策略 hash）进 Registry（llm 组）。

## Consequences（后果）

- 正面：M2 的 chat/知识问答链路可用真实凭证联调；公众号 AI 客服（S6）与官网 ChatWidget 共用同一 Coze 通道，一处配置两端生效。
- 代价/限制：Coze 非 OpenAI 兼容协议 → 网关需两种适配器（接口统一）；PAT 有有效期（30 天级），到期需后台更新（llm.balance-check/报错提醒会覆盖该场景）；dataset 权限待用户在 Coze 后台补勾选。
- 风险：Coze 平台政策/接口变动 → 封装收敛单模块（RISK-002 同口径）。

## Related

- SOL-003（llm-gateway 双适配器）、SOL-002（KBAdapter）、SOL-006（公众号 AI 客服复用通道）、REQ-F-007/008/010。
