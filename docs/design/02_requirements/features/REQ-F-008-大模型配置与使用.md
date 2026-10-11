---
id: REQ-F-008
type: requirement-feature
title: 配置和使用大模型（知识库、提示词及其他参数）
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-008：大模型配置与使用

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 8 条） |
| 对应原编号 | N8 |
| 优先级 | P0（M2） |

## 2. 背景

现状 AIConfig 单模型单配置（Modelscope），模型与应用（场景）耦合：提示词、知识、参数无法按场景独立编排，供应商切换需改配置。

## 3. 目标

模型与应用解耦：模型层多 Provider 可配，应用层（ChatScene）可绑定知识库、配置提示词与参数，经统一 llm-gateway 调用。

### 用户故事

作为管理员，我想为每个 AI 场景绑定知识库、配置提示词与参数，以便不同入口的回答各有侧重且可控。

## 4. 需求描述

- ChatScene 扩展：可绑定知识库（baseId 列表，替代单一 tag 白名单，tags 保留为库内过滤）、systemPrompt/greeting、token 上限等参数。
- llm-gateway 统一入口：官网/公众号/内部任务（摘要等）共用，路由与降级见 REQ-F-010。
- 模型管理页：Provider 列表、参数配置、连通性测试（一键发测试消息返回延迟与回复）。

## 5. 范围

### In Scope

- ChatScene 绑定知识库 + 参数扩展
- llm-gateway 服务 + 模型管理页
- 用量统计（按模型/日，tokens 与调用数）

### Out of Scope

- Fine-tune / 私有模型部署
- 自动提示词优化（prompt 工程工具）

## 6. 约束与依赖

- ADR-005：任意 OpenAI 兼容端点，余额人工填报
- 依赖 SOL-002（知识库 baseId 绑定）；替代现有 chat/completion 内联调用逻辑

## 7. 验收条件

- [ ] ChatScene 可配置绑定多个知识库并生效于检索
- [ ] 提示词/温度/上限等参数按场景独立配置生效
- [ ] llm-gateway 成为唯一模型调用入口（chat/completion 等 0 处直连供应商）
- [ ] 连通性测试按钮可用（返回延迟与回复内容）
- [ ] 用量统计按模型/日可见（tokens/调用数/成败）

## 8. 影响分析

- AIConfig 模型被 LLMProvider 体系替代/升级（迁移映射：endpoint/apiKey/model/temperature/maxTokens/systemPrompt/greeting 各归其位）
- 88s 超时策略收敛为网关统一超时（默认 30s 可配，保留冷启动容忍配置项）

## 9. 关联文档

- Solution：SOL-003
- Decision：ADR-005
- 设计提取：16-新增设计 §7、12-知识库 §3.5
- Plan：M2（S3）
