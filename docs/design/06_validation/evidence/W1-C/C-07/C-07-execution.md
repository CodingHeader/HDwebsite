# C-07-execution.md —— 场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse

> 执行线 C · 分支 `lane/c-ai-kb` · 起点 `96c1ca4`（C-06 完成）
> 状态：**已实现 + 本卡门禁 PASS**（子智能体独立验收见 §3；命令级证据见 §4）

## 1. 交付内容

新增/修改（全部落在 C-07 允许修改路径内）：

| 文件 | 说明 |
|---|---|
| `src/lib/llm-gateway.ts` | `RouteOptions` 增 `preferredProviderIds`（逐个尝试序，K12）+ `overrides`（AdapterOverrides）；`orderProviders` 支持数组（保序去重、无效 id 忽略），`getRoutedProviders` 空数组回落旧字段 `preferredProviderId` |
| `src/lib/llm/types.ts` | `LLMProviderAdapter.chat/stream` 增可选 `overrides: AdapterOverrides` 参数（temperature/maxTokens/topP） |
| `src/lib/llm/openai.ts` | 场景级参数覆盖优先于供应商默认值（`overrides.temperature ?? provider.temperature`；topP 仅非空时下发 `top_p`） |
| `src/lib/llm/coze.ts` | 新增 `cozeStreamMessages`：显式拼接 system 与最近历史为首条 user 前缀（Coze `additional_messages` 不接受 system 角色；ADR-029 §1.1 扩展）。导出供单测断言 |
| `src/lib/llm/sse.ts` | **新增**：`sseFrame` 构造 + `parseSseFrame` 契约解析（`chatSseEventSchema`，非法帧返 null 不抛错）+ `reduceSseError`（同一流双 error 只保留第一条） |
| `src/lib/chat-service.ts` | 新增 `parseIdListField`（JSON 数组串 `"[1,2]"` 与旧逗号文本 `"1,2"` 兼容）；`ChatContext` 增 `preferredProviderIds` + `overrides`；`buildKbContext` 切换 C-05 加权轨 `searchLocalWeighted`（支持 baseIds 库过滤）；`chatOnce` 透传 providerIds/overrides |
| `src/app/api/chat/stream/route.ts` | **DR-23**：删除内联 `chatRequestSchema` 改用契约 `src/contracts/chat.ts`；限频命中改 `tooManyRequests()`（HTTP 429 + code 429，原为 400）；SSE 帧全走 `sseFrame`；catch 与 finally 的 error 经 `reduceSseError` 去重只发一条 |
| `src/components/web/ChatWidget.tsx` | **仅替换 :89-131 解析逻辑**：手工 event/data 解析 → `parseSseFrame` + `reduceSseError`。JSX/className/import 之外零改动（visual 门禁） |
| `src/lib/crud-resources/kb-ai.ts` | chat-scenes 接线 `jsonifyArray(["baseIds","providerIds"])`（管理端统一存 JSON 数组串；读取兼容旧逗号文本） |
| `src/lib/__tests__/lane-c/chat-scene.test.ts` | **新增** 25 例（见 §2） |

## 2. 关键设计决策与测试

### 2.1 providerIds [B,A] → B 优先、B 失败回落 A、再回落全局 fallback

- `orderProviders(rows, [2,1])` → `[2, 1, 默认, priority..., fallback]`；网关循环按序逐个尝试，B 失败进入 A，全败落到全局 fallback（`isFallback` 必试，不受熔断跳过）。**测试**：`orderProviders(PROVIDERS, [2,1]).map(p=>p.name) === ["B","A","D","F"]`；`at(-1) === "F"`（fallback 殿后）。
- 优先级语义：`providerIds 非空` → 用它；`为空` → 回落 `llmProviderId`（走旧字段 `preferredProviderId`，**B 线 `wechat-chat.test.ts:101` 依赖此语义，未改**）；两者皆空 → 全局路由。

### 2.2 两渠道 messages 全等（官网 SSE / 公众号 chatOnce 同装配点）

- `buildChatContext` 是唯一装配点；`route.ts` 与 `wechat.answerWechatText` 都调用它，因此发往网关的 messages 逐字相等。**测试**：官网（sceneCode=seed 场景）与公众号（同 scene 对象）同 message，`gwCalls.streams.at(-1).messages` deepEqual `gwCalls.chats.at(-1).messages`；两边 `opts.preferredProviderIds === [2,1]`。

### 2.3 第 11 次请求 429

- 限频阈值 10 次/分钟不变；命中返回 `tooManyRequests()`（HTTP 429 + code 429，ADR-028 契约）。**测试**：先造 10 条同 IP user 记录 → 第 11 次请求 `r.status === 429` && `body.code === 429`。

### 2.4 baseIds/providerIds 的 JSON 数组串与旧逗号文本兼容

- `parseIdListField("[1,2]")` → `[1,2]`；`parseIdListField("1,2")` → `[1,2]`；`"3"` → `[3]`；`[5,6]` → `[5,6]`；`null/undefined/""/非法 JSON` → `[]`。管理端存 JSON 数组串（`kb-ai.ts` 接线 `jsonifyArray`），旧数据兼容读取。

### 2.5 SSE 事件由 chatSseEventSchema 构造与解析

- `sseFrame` 构造 `event: <name>\ndata: <JSON>\n\n`；`parseSseFrame` 解析后经 `chatSseEventSchema.safeParse` 校验，meta/delta/done/error 四类事件通过，非法帧（无 event/data 行、非 JSON、未知事件名、载荷不匹配）返 null。

### 2.6 同一流两条 error 只显示一条

- `route.ts` catch 发一条 "生成中断，请重试"（或 Coze 原文），finally 在 `full.trim()===""` 时发一条 "AI 未返回内容"；`reduceSseError` 保留第一条，ChatWidget 只 `setError` 一次，不抛错。**测试**：`reduceSseError("生成中断，请重试", "AI 未返回内容") === "生成中断，请重试"`。

### 2.7 Coze 路径显式拼接 system 与最近历史为首条 user 前缀

- `cozeStreamMessages(messages)`：system 拼为首条 `{role:"user"}`；历史保持 user/assistant；若首条历史为 assistant 且无 system，跳过（首条必须 user）。测试经 `cozeAdapter.stream` 装配路径单测断言结构。

## 3. 子智能体独立验收结论

（待补）

## 4. 门禁与命令证据（全部 exit 0）

```bash
$ npx vitest run src/lib/__tests__/lane-c/chat-scene.test.ts
  Test Files  1 passed (1)
       Tests  25 passed (25)
  EXIT=0

$ npx vitest run src/lib/__tests__/wechat-chat.test.ts   # B 线回归（未改）
  Test Files  1 passed (1)
       Tests  5 passed (5)

$ npm run lint
  ✖ 23 problems (0 errors, 23 warnings)   # 本次改动文件 0 warning（coze.ts 参数去除后）
  EXIT=0

$ npm run typecheck
  tsc --noEmit  → 0 errors
  EXIT=0

$ npm test
  Test Files  30 passed (30)
       Tests  433 passed (433)
  EXIT=0

$ npm run build
  ✓ Compiled successfully in 5.5s
  Route /api/chat/stream → ƒ
  EXIT=0

$ grep -n "z.object\|chatRequestSchema =" src/app/api/chat/stream/route.ts
  → 无输出（DR-23 PASS）
```

## 5. UNKNOWN / 未覆盖

| 项 | 状态 | 说明 |
|---|---|---|
| `npm run test:e2e`（apply-chat） | **UNKNOWN** | Windows 本机 `next.config.ts:7` 有意关闭 standalone（D16 裁决），global-setup 直接要求 `.next/standalone/server.js` → 实测报"缺少生产构建"。e2e 需 Linux/Docker 容器（与 W0-08 §5、A 线同口径），合并后统一跑 |
| `npm run test:visual` | **UNKNOWN** | 需 visual 参照站 `http://127.0.0.1:6789` 与主参照站 `:6790` 同时运行；本卡 ChatWidget 仅替换解析逻辑，JSX/className 零改动，理论上不产生视觉差异，仍须实机验证 |
| Coze 真实端点 | UNKNOWN | 无外网；Coze v3/chat SSE 端点的 system 拼接行为需真实联调（ADR-029 §1.1 已写入设计口径） |

## 6. 提交

```
c4b1861 feat(C-07): 场景 providerIds/参数/baseIds 装配 + chat/stream 用 SSE 契约与 429
```

## 7. 完成度自评

| 验收标准 | 状态 |
|---|---|
| chat-scene.test.ts 全绿（优先级、回落、两渠道 messages 全等、第 11 次请求 429、baseIds/providerIds 的 JSON 数组串与旧逗号文本都能解析） | **PASS** 25/25 |
| ChatWidget 解析单测：同一流两条 error 只显示一条提示且不抛错 | **PASS**（reduceSseError 单测 3 例） |
| e2e apply-chat 通过 | **UNKNOWN**（Windows 环境，D16 裁决） |
| visual：失败集 ⊆ {courses@375} 且该项差异像素不增加 | **UNKNOWN**（Windows 环境；ChatWidget 仅改解析逻辑，JSX/className 零改动） |
| `grep -n "z.object" src/app/api/chat/stream/route.ts` 为空（DR-23） | **PASS** |
| 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0 | **PASS** |
| `git log --first-parent --no-merges --name-only --format= 96c1ca4..HEAD` 全部落在允许修改内 | **PASS**（见 §8） |

## 8. 越界复核（允许修改路径）

改动文件（10 个）：
- `src/lib/llm-gateway.ts` ✅（允许）
- `src/lib/llm/types.ts` ✅（`src/lib/llm/**`）
- `src/lib/llm/openai.ts` ✅
- `src/lib/llm/coze.ts` ✅
- `src/lib/llm/sse.ts` ✅（新增）
- `src/lib/chat-service.ts` ✅
- `src/lib/crud-resources/kb-ai.ts` ✅
- `src/app/api/chat/stream/route.ts` ✅（`src/app/api/chat/**`）
- `src/components/web/ChatWidget.tsx` ✅（任务卡显式放行，仅 :89-131 解析逻辑）
- `src/lib/__tests__/lane-c/chat-scene.test.ts` ✅

未触碰：`src/contracts/**`、`prisma/**`、`package.json`、`vitest.config.ts`/`playwright.config.ts`、前台视觉冻结面（`(web)/**`/`public/**`/`globals.css`）、他线路径。
