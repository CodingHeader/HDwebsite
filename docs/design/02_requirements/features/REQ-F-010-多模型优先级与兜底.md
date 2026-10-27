---
id: REQ-F-010
type: requirement-feature
title: 多模型配置：对话优先级、默认与兜底模型
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-010：多模型优先级与兜底

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 10 条） |
| 对应原编号 | N10 |
| 优先级 | P0（M2） |

## 2. 背景

当前单供应商单模型（Modelscope + 配置的单一 model），一旦服务异常/余额耗尽，AI 咨询全站瘫痪（RISK-003）。

## 3. 目标

支持配置多个大模型，明确对话优先级，并指定默认模型（新会话首选）与兜底模型（全部失败后必用），保障 AI 服务高可用。

### 用户故事

作为管理员，我想配置多个模型并设置默认与兜底，以便任一供应商故障时咨询不中断。

## 4. 需求描述

LLMProvider 模型：endpoint/apiKey(isEncrypted)/model/temperature/maxTokens + **priority（小值优先）** + **isDefault（唯一）** + **isFallback（唯一）** + status(active/inactive) + balance/balanceThreshold（人工填报，低于阈值邮件）。
路由策略（llm-gateway 单点）：默认模型（active）→ 失败（网络/5xx/超时/429）→ 按 priority 升序逐个尝试其余 active → 全部失败 → isFallback 必试；每次调用记录 tokens/耗时/成败，汇总按模型/日统计。

## 5. 范围

### In Scope

- LLMProvider 多记录 + 唯一性约束（isDefault/isFallback 各一）
- 路由与降级逻辑 + 模型管理页（拖拽调 priority、设默认/兜底）
- 余额人工填报 + 阈值提醒（衔接 REQ-F-011 llm_balance_low 事件）

### Out of Scope

- 余额自动查询接口（ADR-005 明确人工填报）
- 按场景绑定不同默认模型（场景级路由，二期评估）

## 6. 约束与依赖

- ADR-005；网关超时默认 30s 可配（REQ-NF-001 预算）
- isDefault 与 isFallback 允许同一 Provider（全部失败重试默认兜底位）

## 7. 验收条件

- [x] 可配置 ≥2 个 Provider 并全部通过连通性测试（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] priority 拖拽排序持久化，小值优先生效（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 主模型故障（模拟 5xx/超时）自动切换次级模型，用户无感（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 全部非兜底失败后兜底模型必被调用（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] isDefault / isFallback 唯一性受约束（重复设置被拒绝或自动迁移）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 每次调用成败与耗时入统计，按模型/日可查（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）

## 8. 影响分析

- AIConfig → LLMProvider 迁移映射（数据迁移进 SOL-003）
- 替换 chat/completion 内联调用（与 REQ-F-008 同步）

## 9. 关联文档

- Solution：SOL-003
- Decision：ADR-005
- 设计提取：16-新增设计 §7
- Plan：M2（S3）
