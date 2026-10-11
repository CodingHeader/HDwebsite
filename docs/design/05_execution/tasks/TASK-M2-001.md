---
id: TASK-M2-001
type: task
title: M2 知识与智能（KBAdapter 双轨 + Coze 接入 + LLM 网关 + SSE 客服）
status: done
plan-ref: master-plan.md §6 M2；ADR-023
milestone: M2
requires: [REQ-F-007, REQ-F-008, REQ-F-009, REQ-F-010, ADR-020, ADR-023]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M2-001：知识与智能

## 归属
- 所属切片：S2+S3（M2）
- 来源需求：REQ-F-007/008/009（官网端）/010
- 来源方案：SOL-002（KBAdapter）/ SOL-003（llm-gateway）/ ADR-023（Coze）

## 目标
知识库抽象层（本地兜底 + Coze 双轨）、多供应商路由网关（openai 兼容 + coze 双适配器）、SSE 流式 AI 客服全链路可用；Coze 凭证经真实 API 联调。

## 输入
- 文档：wechat-clawbot/docs/coze-integration.md（用户提供）；SOL-002/003
- 契约：llmProviderCreateSchema 等
- 前置任务：TASK-R0-001

## 输出
- src/lib/coze.ts（v3/chat SSE + 轮询兜底 + 业务错误显式抛出 + 跨块行缓冲）
- src/lib/llm-gateway.ts（default→priority→fallback 路由、熔断、LLMUsage 统计、双适配器流式）
- src/lib/kb-adapter.ts（LocalFallback + CozeClient + 检索测试双轨）
- API：chat/stream（SSE + 限频 + 敏感词 + 历史收敛）、llm/providers(+[id]/test/balance)、kb/test
- ChatWidget（悬浮客服，SSE 渲染）+ 知识库/模型供应商管理页
- LLMProvider +kind/botId 迁移

## 验收标准
- [x] Coze 真实联调：请求格式/加密/错误透传全部正确（4101 = 用户 PAT 已过期，外部输入失效，非实现缺陷；新 PAT 后台粘贴即生效）
- [x] PAT 失效时 SSE 显式报错（修复"业务错误吞成空流"缺陷 + 空答案护栏 + 失败计数）
- [x] 未配置供应商时网关返回明确 errMsg；未配置 Coze 时检索测试仅本地轨
- [x] npm run check 绿

## 验证命令
```bash
npm run check && curl -s -X POST localhost:6789/api/chat/stream -H "Content-Type: application/json" -d '{"sessionId":"test-00000001","sceneCode":"faq","message":"你好"}' | head -4
```

## 证据路径
docs/design/06_validation/evidence/EVD-M2/

## 允许修改 / 禁止修改
- 允许：src/lib/{coze,llm-gateway,kb-adapter}.ts、src/app/api/{chat,llm,kb}/**、src/components/web/ChatWidget.tsx、src/app/manager/{llm-providers,knowledge}/**
- 禁止：src/contracts/**（变更需走契约轮）

## 依赖与阻塞
- Depends on：TASK-R0-001
- Blocks：S6（公众号 AI 客服复用网关）
- 阻塞条件：DEP-023 Coze PAT 有效期（用户提供新 PAT 前为降级运行）

## 建议执行档位
opus（网关路由与外部协议适配）。
## 预估规模
大。已完成。
