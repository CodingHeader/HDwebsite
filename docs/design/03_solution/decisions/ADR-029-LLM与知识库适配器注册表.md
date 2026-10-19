# ADR-029 · LLM 与知识库适配器注册表（C-01，2026-10-16）

> 状态：已采纳。来源：P09（LLM 可扩展）、P08 #6（providers 路由未包装）、B-domain §2.2。
> 执行线：C AI 与知识库（lane/c-ai-kb）。
> C-09 扩展（2026-10-17）：见 §1.5 配额/限频与日界口径（D4 修正）。

## 1. 决策

### 1.1 LLM 适配器注册表（src/lib/llm/**）

- `llm-gateway.ts` 只保留**路由/熔断/统计**（getRoutedProviders/orderProviders/recordUsage/gatewayChat/gatewayChatStream 的调度骨架）；按 kind 的调用细节全部收敛到适配器：
  - `src/lib/llm/types.ts`：`LLMProviderAdapter{kind, chat, stream}` + `AdapterChatResult{reply, tokensIn, tokensOut}`（ChatMessage 类型移此，llm-gateway re-export）
  - `src/lib/llm/openai.ts`：openaiAdapter（/chat/completions 非流式 + SSE 流式；跨块行缓冲 P1-4 随实现搬入）
  - `src/lib/llm/coze.ts`：cozeAdapter（cozeChat/cozeChatStream 装配 + botId 解析 + userId hash 派生）
  - `src/lib/llm/registry.ts`：kind → adapter 唯一注册点；`getAdapter(kind)` 未知 kind 抛错（防误配静默失败）
- **开放/封闭**：新增供应商类型 = 实现 LLMProviderAdapter + registry 注册一行；llm-gateway 无需改动。
- **验收口径**：`kind === "coze"` 字面量比较在 src/lib 与 src/app/api 中为 0（kb-adapter 的检索查找改用具名常量 `COZE_KIND`）；原生超时信号在 coze/llm-gateway/llm/ 中为 0（全部走 http-client）。

### 1.2 HTTP 统一（coze.ts + llm/**）

- coze.ts 的 4 处 fetch、llm/openai.ts 的 2 处 fetch 全部改用 `httpFetch`（超时 timeoutMs、统一 HttpError）：
  - 流式：`throwOnHttpError` 默认 true（与原 `!res.ok` 抛错语义一致）
  - coze 轮询（create/retrieve/list）：`throwOnHttpError: false`（与原"业务错误以 200 + code 字段返回、由 code 检查处理"语义一致，Coze Open API 的业务错误不抛 HTTP 错误）

### 1.3 providers 路由 withApi 化（src/app/api/llm/**）

- `route.ts` GET/POST、`[id]/route.ts` GET/PUT/DELETE、`[id]/test/route.ts` POST 全部迁 `withApi`（`permission`/`route`/`errorMessage` 语义）；balance 路由已是 withApi（P06）。
- 行为保持：apiKey 加密落库/脱敏回显、isDefault/isFallback 唯一性保护、logOperation 审计字段不变；test 路由保持"空体允许 + 失败以 data.ok=false 返回"。
- test 路由**复用适配器**（去独立 fetch 实现与类型分支）：`getAdapter(kind).chat(provider, key, [{role:"user",content:prompt}], 60_000)`；max_tokens 语义从固定 100 收敛为 provider.maxTokens（登记偏差，测试端点与真实调用口径统一）。

### 1.4 知识库侧（kb-adapter.ts）

- `searchViaCoze` 的 coze 供应商查找改用具名常量（`COZE_KIND: LlmKind = "coze"`）——语义不变，字面量比较归零（验收 grep）。

### 1.5 配额/限频与日界口径（C-09，2026-10-17）

- 新增 `src/lib/llm/limits.ts`（纯函数、不 import prisma/适配器）：
  - `usageDate(now)`：**Asia/Shanghai（UTC+8）日界**，返回 `YYYY-MM-DD`（实现：UTC 时间 + 8h 后取 UTC 日期）
  - `isDailyQuotaExceeded(calls, dailyQuota)`：`dailyQuota > 0 && calls >= dailyQuota`（≤0 视为不限制，防御契约 `min(1)` 被绕过）
  - `isRateLimited(providerId, rateLimit, at)`：进程内 60 秒滑动窗口；`recordRateCall` 入窗、`recentRateCalls` 查窗
  - `__setClock` / `__now`：可注入时钟（测试用假时钟），生产默认 `Date.now`
- `llm-gateway.ts` 在 `gatewayChat`/`gatewayChatStream` 的**调度前**调用 `quotaSkipReason(provider)`：
  - 配额满/限频命中的供应商本轮跳过（**不记失败、不计费、不消耗滑窗名额外的配额**），把原因并入 errMsg
  - **熔断判断先于滑窗记录**：被熔断跳过的供应商不占 60 秒滑窗名额（独立验证者指出：原实现先 `recordRateCall` 再判熔断，可能让被熔断的供应商提前触发 rateLimit）
  - 全部供应商都被跳过（未真正尝试任何供应商）→ 返回 `status: 503`；否则（至少尝试一次）→ `status: 502`
  - `providers.length === 0`（**未配置任何供应商**）→ `status: 502`，与"全部超配额"区分（503 专指配额/限频用尽）
  - `src/app/api/chat/stream/route.ts`：`routed.status === 503 ? serviceUnavailable(...) : error(..., 502)`
- 跳过原因中文记录（运维可读）：`${provider.name}: 当日调用量已达上限（N 次），今日跳过` / `${provider.name}: 调用频率超限（N 次/分钟），请稍后再试`

## 2. 偏差登记

| # | 偏差 | 说明 |
|---|---|---|
| D1 | test 路由 max_tokens 从固定 100 → provider.maxTokens | 复用适配器的必然结果；测试端点与真实调用口径统一，行为更真实 |
| D2 | coze HTTP 级错误信息从"Coze HTTP xxx" → HttpError"HTTP xxx" | 轮询路径 `throwOnHttpError:false` 保持 code 检查；仅流式路径的 HTTP 错误文案变化（errMsg 透传链不变） |
| D3 | ChatMessage 类型定义移至 llm/types.ts | llm-gateway re-export，引用方（chat-service 等）无感 |
| D4 | LLMUsage 日期口径由 **UTC** 改为 **Asia/Shanghai**（C-09） | 原 `llm-gateway.ts:79/95` 用 `new Date().toISOString().slice(0,10)`（UTC）。配额/熔断统计改用 `usageDate()` 后，当日计数与运维/管理后台"今天"口径一致；历史数据日期标签可能偏移（跨 UTC 午夜区间），无需迁移——下次写入自动按新口径。 |

## 3. 影响

- C-02/C-07/C-11（知识库管理/接线/用量）直接消费注册表与适配器接口。
- wechat-chat、p06-followups 测试通过（10→16 例含 lane-c 6 例）；通用门禁 4 项全过。
- E-10（模型运营页）可消费 `registeredKinds()` 展示已支持类型。
