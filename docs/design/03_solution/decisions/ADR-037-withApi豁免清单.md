# ADR-037：`withApi` 适用边界与豁免清单

- 状态：accepted（V8-T-04）
- 日期：2026-10-22
- 关联：ADR-028（错误映射）、V8-T-04、`src/lib/api-handler.ts`

## 背景

V0.7 曾统计「119 路由中 5 条未经 withApi/crud」。V0.8 要求逐条给结论：迁移，或写明豁免理由与等效防护。
本轮已把 5 条**全部迁入 withApi**，因此**豁免清单当前为空**。本 ADR 记录迁移后的语义边界，
避免后续有人把「非 JSON 响应」误当成可以绕开统一包装的理由。

## 决策

### 1. `withApi` 是全部 `route.ts` 的统一入口（当前 100% 覆盖）

```bash
for f in $(find src/app/api -name route.ts); do grep -qE 'withApi|crud' "$f" || echo "$f"; done
# 输出为空
```

`withApi` 承担三件事，与响应形态无关：

| 职责 | 说明 |
| --- | --- |
| 鉴权 | `permission` / `auth:true` / `auth:"optional"` 三档 |
| 参数解析 | `ctx.params` 统一 await |
| 异常映射 | `ApiHttpError` → 对应状态码；`P2002/P2003/P2025` → 409/400/404；其余 → 500 + `errorMessage` |

**它不强制响应体为 JSON 信封**——handler 仍可 `return new Response(...)` 返回原始字节流/XML/纯文本。
这正是「流式与原始响应」不需要豁免的原因。

### 2. 本轮 5 条的处置

| 路由 | 迁移前 | 处置 | 依据 |
| --- | --- | --- | --- |
| `POST /api/upload` | 手写 `requireAuth(request,"media:create")` + `try/catch` → `serverError` | **迁移** `{ permission:"media:create" }` | 鉴权与异常映射与 withApi 完全同构，无理由手写 |
| `GET /api/file/[...path]` | 原始文件流 + 手写路径穿越防护 | **迁移**（保留原始流响应） | 声明式路由：请求只是取字节；withApi 只加包装不加信封 |
| `GET/POST /api/wechat/callback` | 原始文本/XML + 签名校验 | **迁移**（保留原始响应与 403 语义） | 同上；签名校验是**业务鉴权**，不能换成 `permission`（微信不可能带 JWT） |
| `GET /api/health` | 直接 `success()` / `serverError()` | **迁移** + 0 参兼容包装 | 公开探活；包装保持既有测试 `healthGET()` 可调用 |
| `GET /api` | 直接 `success()` | **迁移** + 0 参兼容包装 | 同上 |

### 3. 允许「0 参兼容包装」的理由

`health` 与 `api` 根被既有契约测试（`lane-b/routes-public.test.ts`）以 `GET()` 无参调用。
直接改成 `withApi` 导出会让 `Request` 变必填，破坏既有测试。处置：

```ts
const handler = withApi(async () => success(...), { route: "health/GET" });
export async function GET(request?: Request) {
  return handler(request ?? new Request("http://localhost/api/health"));
}
```

- 仍然是 withApi 包装（统一异常映射生效）；
- 仍然可 0 参调用（既有测试不破）；
- 代价：`request` 为可选，绕过 withApi 时用的是构造出来的假 URL —— 对这两个**不读 query/header** 的探活路由无影响。

### 4. 未来若要新增豁免，必须满足

1. 响应体无法用 `Response` 表达（当前不存在这种情形）；
2. 在**本 ADR** 追加一行，写明路由、理由、等效防护措施与负向用例路径；
3. 同步更新 `tests/contract/routes.test.ts` 的 inventory 覆盖，不得出现「无规则」的路由。

## 后果

- 正面：异常映射、审计埋点（`emitApiError`）、鉴权语义在全部 API 上一致；新增路由忘记包装会被 T-04 的 grep 门禁发现。
- 负面：`file` 路由多一层 async 包装（可忽略）；两个探活路由需要用假 Request 兜底。
- 风险：`withApi` 的 `toErrorResponse` 会把未捕获异常转成 500 信封——对 `file`/`wechat` 这类**客户端期望原始响应**的路由，
  异常时会返回 JSON。这属可接受取舍（异常本就是非预期路径），已在负向用例中确认 404 分支不受影响。

## 验证

```bash
# 1. 全部路由走 withApi
for f in $(find src/app/api -name route.ts); do grep -qE 'withApi|crud' "$f" || echo "$f"; done   # 空
# 2. 文件穿越防护
#    /api/file/../../etc/passwd → 404（parts 含 ".." 即拒）
# 3. 上传未登录 → 401（withApi permission 生效）
# 4. 微信错签名 → 403（签名校验保留）
npx vitest run src/lib/__tests__/lane-b/routes-public.test.ts   # 14 passed
```
