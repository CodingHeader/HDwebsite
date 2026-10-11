---
id: SOL-003
type: solution
title: LLM 网关与 AI 客服（官网端）
status: proposed
owner: 开发
created: 2026-10-10
updated: 2026-10-10
requires: [REQ-F-008, REQ-F-009, REQ-F-010]
---

# SOL-003：LLM 网关与 AI 客服

## 1. 目标

模型调用收敛 llm-gateway 单点（多 Provider 路由/降级/统计），官网端 AI 客服升级为流式可挂载组件；ChatScene 应用层可绑知识库与提示词参数。

## 2. 覆盖需求

| 需求 | 覆盖点 |
| --- | --- |
| REQ-F-008 | 场景绑库/参数/gateway 单点/用量统计 |
| REQ-F-009（官网端） | ChatWidget 流式/全局挂载/会话续传/限频风控 |
| REQ-F-010 | LLMProvider 路由降级/默认兜底/余额填报 |

## 3. 设计要点

### 3.1 LLMProvider 与路由

- 模型：endpoint/apiKey(加密)/model/temperature/maxTokens/priority/isDefault(唯一)/isFallback(唯一)/status/balance/balanceThreshold
- 路由：default(active) → 失败(网络/5xx/timeout/429) → priority 升序遍历 active → 全败 → fallback 必试
- 网关超时默认 30s 可配（88s 策略收敛，保留冷启动容忍项）
- 调用留痕：tokens/耗时/成败 → 按模型/日统计
- AIConfig → LLMProvider 迁移映射（现有配置无损迁移）

### 3.2 ChatScene 应用层

- 绑定 baseId 列表（替代单一 tag 白名单；tags 保留为库内过滤）
- systemPrompt/greeting/token 上限等按场景独立
- 官网/公众号共用场景配置（公众号端默认 faq）

### 3.3 官网端 ChatWidget

- 独立组件：全局悬浮挂载（站点布局级）或页面嵌入；SSE 流式输出（`/api/chat/stream`）
- 会话续传：sessionId 存 localStorage；历史挂 AIChatHistory
- 风控：IP+用户限频（默认 10 次/分钟，REQ-NF-002）、敏感词过滤、黑名单 Setting

### 3.4 公众号端

见 SOL-006 §3.3（本方案提供网关与场景能力，公众号接入层归 SOL-006）。

### 3.5 API 与页面

| API | 说明 |
| --- | --- |
| POST /api/chat/stream | SSE 流式对话（官网 ChatWidget） |
| GET/POST /api/llm/providers | 模型列表 / 新建 |
| PATCH/DELETE /api/llm/providers/[id] | 编辑 / 启停（isDefault/isFallback 唯一性保护） |
| POST /api/llm/providers/[id]/test | 连通性测试（返回延迟 + 回复摘要） |
| POST /api/llm/providers/[id]/balance | 余额人工填报 |
| GET /api/llm/usage | 用量统计（?date=，按模型/日） |
| /api/chat-scenes（现有） | +baseIds 等场景参数字段 |

页面/组件：`manager/llm-providers`（列表 + 拖拽 priority + 设默认/兜底）、`manager/chat-scenes` 升级、`src/components/web/ChatWidget.tsx`（全局悬浮挂载）。

### 3.6 技术选型（新增依赖声明，REQ-C-001）

SSE 用原生 `ReadableStream` 实现（不引库）；模型调用用 `fetch` 直连 OpenAI 兼容端点（不引 SDK，防依赖锁定）；会话历史裁剪（≤40 条/4000 字，TN-012）收敛入网关。

### 3.7 风险与缓解

- 流式响应被反代缓冲 → 响应头 `X-Accel-Buffering: no` + 宝塔反代关闭 buffering
- Provider 故障 → 路由降级（REQ-F-010）+ 30s 超时 + 失败计数熔断（连续 3 次失败暂停该 Provider 5 分钟）

## 4. 数据模型变更

| 模型 | 变更 | 字段要点 |
| --- | --- | --- |
| LLMProvider（新增） | — | endpoint/apiKey（加密）/model/temperature/maxTokens/priority/isDefault/isFallback/status/balance/balanceThreshold |
| LLMUsage（新增） | — | date+providerId（唯一）/calls/tokensIn/tokensOut/failures |
| ChatScene | +baseIds[]（绑定知识库列表）、+场景参数字段 | tags 保留为库内过滤 |
| AIChatHistory | +channel（website/wechat） | 渠道维度审计 |
| AIConfig | 迁移后下线 | endpoint/model/提示词等映射入 Provider 与场景 |

## 5. 关键取舍

- 余额人工填报（ADR-005），不调供应商余额接口
- 流式仅官网端（微信端为两段式应答，ADR-006）

## 6. 验证方式（VAL 摘要）

- 主模型模拟 5xx → 自动切换次级（日志+统计可见）
- SSE 首包 ≤3s（Modelscope 冷启动场景记录实际值）
- 官网端 fqa 场景 3 问回归通过

## 7. 关联

- 依赖：SOL-002（检索）
- 被依赖：SOL-006（公众号 AI 客服）、SOL-005（余额提醒事件）
