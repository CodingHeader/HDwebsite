# V11-LLM-02 执行证据：流式 tokens 计量修正

## 5W1H 简版

- What：流式 usage 从流尾帧取值；失败/重试路径不重复计数。
- Why：原 `gatewayChatStream` 在流启动时即 `recordUsage(providerId, 0, 0, false)`——流式 tokens 恒为 0；
  且流中途失败时叠加路由层 `recordGatewayFailure`（again calls+1）→ 一次尝试计 2 次 calls（双计）。
  OpenAI 兼容端 SSE 尾帧的 usage 被适配器整段丢弃。
- Where：`src/lib/llm-gateway.ts`（成功用量延迟到流读完时一次记录 + onUsage 收集器）、
  `src/lib/llm/types.ts`（接口加可选 `onUsage`）、`src/lib/llm/openai.ts`（解析 usage 尾帧）。

## 现状盘点（读真实代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| 流式 usage 恒 0、失败双计（§LLM.2） | 旧代码 `gatewayChatStream` 建流成功即 `recordUsage(id, 0, 0, false)`；中途失败再 `recordUsage(id, 0, 0, true)`（route.ts catch）→ 单次尝试 calls=2、tokens=0 | **属实，已修** |

## 估算口径（写入证据，对应 Execution Step 1「无则估算口径」）

- 有 usage 帧：openai 兼容端最后一个 `data` 帧的 `usage.prompt_tokens / completion_tokens`（含
  `choices` 为空数组的纯 usage 帧）→ `onUsage` 回调 → 网关在流自然读完时一次 `recordUsage(tokensIn, tokensOut, false)`。
- 无 usage 帧：`tokensIn/tokensOut` 记 **0**（不虚构估算值——按字符数折算会引入系统性偏差，且
  LLMUsage 是聚合统计口径）。**ADR-034 D1 偏差保持**：`llmUsageRow` 仍只有 calls/tokensIn/tokensOut/failures，
  不加列、不动 prisma。
- 主动不加 `stream_options: { include_usage: true }`：部分第三方 OpenAI 兼容端对未知请求字段返回 400，
  保守起见"有则取之、无则记 0"。
- Coze 流式：v3 SSE 的 verbose usage 帧格式在无凭证环境无法实测（真实联调标 UNKNOWN 的既定口径），
  coze 适配器不回调 onUsage → 记 0，与非流式路径原行为一致。

## 改动文件

- `src/lib/llm-gateway.ts`：`StreamUsageCollector` 类型；`gatewayChatStream` 移除建流即记 calls、
  改为 `withStreamTimeouts` 的 `onComplete` 里一次 `recordUsage(usage.tokensIn, usage.tokensOut, false)`；
  失败/取消不回调（中途失败由路由层 `recordGatewayFailure` 单次计数）。
- `src/lib/llm/types.ts`：`stream()` 增加可选第 6 参 `onUsage?: (usage: StreamUsage) => void`（向后兼容，
  既有适配器/测试 stub 不受影响）。
- `src/lib/llm/openai.ts`：SSE 解析 `evt.usage` → `onUsage?.()`。
- `src/lib/__tests__/v11-llm-02-stream-usage.test.ts`（新增，5 例）。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| mock 流 tokens=流尾值 | PASS | 用例「mock 流尾帧 usage → tokens 记流尾值」：`{calls:1, tokensIn:7, tokensOut:13, failures:0}` |
| 重试场景无重复记录 | PASS | 用例「重试不双计」：A 建连失败 `{calls:1, failures:1}`；B 成功 `{calls:1, tokensIn:5, tokensOut:9}`（各一次） |
| 无 usage 帧记 0 不虚构 | PASS | 用例「无 usage 帧 → calls=1、tokens 记 0」 |
| 流中途失败不记成功 usage | PASS | 用例「流中途失败：网关不记成功 usage」：usage 行为 null |
| openai 适配器尾帧解析 | PASS | 用例「SSE 尾帧 usage 被解析并回调」：`{tokensIn:11, tokensOut:22}`，文本增量不受影响 |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-llm-02-stream-usage.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## UNKNOWN

- Coze 流式 usage 帧格式：无真实凭证，无法实测（既有 UNKNOWN 口径延续，记 0 不虚构）。

## 后续方向待办

- 真实 Coze/OpenAI 供应商联调时补测尾帧 usage（Coze dataset 凭证同）。
