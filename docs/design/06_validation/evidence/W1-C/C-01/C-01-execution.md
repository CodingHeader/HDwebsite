# C-01 执行记录：LLM 适配器注册表 + providers 路由 withApi

分支 `lane/c-ai-kb`（自 w1-base-ccr-1 = f158501）。执行：本会话（P2/Agent-AI 角色）。

## 改动（全部在 allow 内，10 文件）

- 新增 `src/lib/llm/{types,registry,openai,coze}.ts`：适配器注册表（LLMProviderAdapter{kind,chat,stream}、openaiAdapter、cozeAdapter、getAdapter 未知 kind 抛错、registeredKinds）
- `src/lib/llm-gateway.ts`：收敛为路由/熔断/统计——`kind === "coze"` 类型分支归零（registry 调度）、`getAllSettings as getSettings` 别名去除（B-01 语义）、ChatMessage 类型移至 llm/types.ts re-export
- `src/lib/coze.ts`：4 处 fetch 改 httpFetch（流式 throwOnHttpError 默认；轮询 throwOnHttpError:false 保持 code 检查语义）
- `src/app/api/llm/providers/route.ts` GET/POST、`[id]/route.ts` GET/PUT/DELETE、`[id]/test/route.ts` POST：全部迁 withApi；test 路由复用适配器（去独立 fetch 与类型分支）
- `src/lib/kb-adapter.ts`：coze 供应商查找改具名常量 COZE_KIND（字面量比较归零）
- 测试：`src/lib/__tests__/lane-c/llm-registry.test.ts`（新，6 用例：注册表/未知 kind/适配器形态/调度联调）
- ADR-029（新）：适配器注册表决策 + 偏差登记（test max_tokens 收敛、coze HTTP 错误文案、ChatMessage 移位）

## 验收结果

| 项 | 结果 |
|---|---|
| grep 'kind === "coze"' src/lib src/app/api | 空 ✅ |
| grep AbortSignal.timeout（coze/llm-gateway/llm/） | 空 ✅ |
| lane-c/llm-registry.test.ts | 6/6 PASS |
| wechat-chat + p06-followups | 16/16 PASS（含 lane-c） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-c01.log） |
| 越界检查 | 10 文件 ⊆ allow ✅ |

## 登记

- test 路由 max_tokens 从固定 100 → provider.maxTokens（复用适配器口径统一，ADR-029 D1）。
- coze 流式路径 HTTP 错误文案变化（ADR-029 D2）；errMsg 透传链不变。
