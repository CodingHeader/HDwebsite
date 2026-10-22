# V8-T-02 执行证据：/chat/stream SSE 契约测试（契约 skip 清零）

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`tests/contract/**`、`evidence/V8/T-02/**`

## 1. 起点：最后 1 条契约 skip

```bash
grep -c 'skip:' tests/contract/rules.ts   # 1
grep -n 'skip:' tests/contract/rules.ts
# 658: skip: "SSE 流式响应，非 JSON 信封，单独测"
```

**这条理由本身是对的，但结论错了**：「不能用 JSON 信封的四场景断言」≠「无法测」。
SSE 有自己的线格式契约（`src/contracts/chat.ts` 的 `chatSseEventSchema`），可以逐帧校验。

## 2. 契约事实（读代码得到，不是推测）

`src/contracts/chat.ts`：

```ts
export const chatSseEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("meta"),  data: { scene:{code,name}, greeting?, provider? } }),
  z.object({ event: z.literal("delta"), data: { text: string } }),
  z.object({ event: z.literal("done"),  data: { conversationId: string } }),
  z.object({ event: z.literal("error"), data: { message: string } }),
]);
```

关键语义（`contracts/chat.ts` 头注释原文）：

> 失败语义：**流开始前**的失败（限频 429、无模型 502、额度 503）仍返回 JSON 信封，不走 SSE；
> 流中途失败才发 `event: error`。

→ 这决定了测试必须分 3 类：正常流 / 流前失败（JSON 信封）/ 流中失败（error 帧）。

## 3. 新增测试：`tests/contract/chat-stream-sse.test.ts`（4 用例）

手法：mock `@/lib/llm-gateway`、`@/lib/chat-service`、`@/lib/prisma`（可控行为、不触网），
**真实调用路由导出的 `POST`**——验证的是路由真实装配逻辑，不是另写一份假实现。

| 用例 | 断言要点 |
| --- | --- |
| 正常流 | 首帧 `meta`；delta 拼接 === 上游输出；末帧 `done` 且 `conversationId` 正确；**无 error**；每帧都过 `chatSseEventSchema.parse` |
| 流开始前上游失败 | HTTP 502 + `application/json` + `message` 含上游原因（证明走 JSON 信封而非 SSE） |
| 流中途失败 | 至少 1 帧 `error` 且 message 非空；**不出现 done** |
| 请求体非法 | 400 + JSON 信封（`sessionId` 过短 + `message` 空） |

运行：

```
npx vitest run tests/contract/chat-stream-sse.test.ts
# ✓ 4 tests passed
```

## 4. 撤 skip 后遇到的真实问题（已修）

撤掉 skip 后，通用契约套件里 `POST /chat/stream → 200` 失败：

```
[W2-02-ok-fail] POST /chat/stream: got 502
body={"code":502,"message":"AI 服务暂时不可用：模型GET: __vite_ssr_import_4__.getAdapter(...).stream is not a function；..."}
```

**原因**：`tests/contract/routes.test.ts` 里的适配器 mock 只提供了 `chat()`，没有 `stream()`。
之前因为有 skip，这条路径从未被执行过——所以这个 mock 缺口一直没暴露。

**修复**：mock 补 `stream()`，返回一个只含一帧的 `ReadableStream`。
这同时证明了一件事：**撤 skip 是有价值的**，它让一条从未被执行的代码路径第一次真正跑了起来。

另外把规则里的请求体改成真实契约字段：

```ts
body: { sessionId: "sess-w2-02-stream", message: "你好", sceneCode: "float" }   // 原: { message, channel }
bad:  { body: { sessionId: "x", message: "" } }
```

（原 body 里的 `channel` 不是 `chatRequestSchema` 的字段，属过期写法。）

## 5. 验证

```bash
grep -c 'skip:' tests/contract/rules.ts
# 0

npx vitest run tests/contract
# Tests  876 passed (876)      exit=0

npx vitest run tests/contract --sequence.shuffle
# Tests  876 passed (876)      exit=0
```

- 契约 skip **0 条**（卡定义验收项 1 达成）
- 3 场景各有 ≥1 用例（卡验收项 2 达成，实际做了 4 个用例）
- 默认与 shuffle 结果一致（卡验收项 3 达成）
- 用例数 868 → **876**（+4 SSE 专用 +4 通用四场景：401/403/400/200）

## 6. 改动文件

| 文件 | 类型 |
| --- | --- |
| `tests/contract/chat-stream-sse.test.ts` | 新增（4 用例） |
| `tests/contract/rules.ts` | 删除 /chat/stream 的 skip；请求体改真实契约字段；补 `bad` |
| `tests/contract/routes.test.ts` | 适配器 mock 补 `stream()`（撤 skip 后暴露的缺口） |
| `docs/V0.8-20261022/state.json` | V8-T-02 → done |

## 7. 遗留

- SSE 用例 mock 了网关，**未覆盖真实上游的流式行为**（如 provider 中途半关闭）。真实流的行为由 e2e `apply-chat.spec.ts` 覆盖（mock LLM 站点）。
- 未覆盖「客户端 abort → 服务端停止写」：`ReadableStream` 的 `cancel` 在当前路由里没有显式处理逻辑，
  若要测需要先确认是否**应该**有（属功能问题而非测试问题）。已如实登记为未做，不计入完成。
