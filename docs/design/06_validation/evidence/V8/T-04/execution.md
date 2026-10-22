# V8-T-04 执行证据：非 withApi 路由 5 条核查

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 前置：`V8-SEC-01` 已 done（`b911666`），本地与远端 `0 0`
- 允许修改：5 条 route.ts + `ADR-037`

## 1. 起点事实（迁移前）

```bash
for f in $(find src/app/api -name route.ts); do grep -qE 'withApi|crud' "$f" || echo "$f"; done
```

输出（5 条，与 V0.7 统计一致）：

```
src/app/api/file/[...path]/route.ts
src/app/api/health/route.ts
src/app/api/route.ts
src/app/api/upload/route.ts
src/app/api/wechat/callback/route.ts
```

## 2. 逐条判定与处置

| 路由 | 迁移前的实现方式 | 是否与 withApi 冲突 | 处置 |
| --- | --- | --- | --- |
| `POST /api/upload` | 手写 `requireAuth(request,"media:create")` + `if(!guard.ok) return guard.response` + `try/catch` → `serverError("上传失败")` | **不冲突**。与 withApi 的 `{permission}` + `{errorMessage}` 完全同构 | **迁移**，删掉手写守卫 |
| `GET /api/file/[...path]` | 返回 `createReadStream` 原始字节流；手写路径穿越防护（`..`/反斜杠/点开头 + `startsWith(uploadRoot+sep)`） | **不冲突**。withApi 不强制 JSON 信封，handler 可直接 `return new Response` | **迁移**（保留原始流） |
| `GET/POST /api/wechat/callback` | 返回微信要求的纯文本/XML；`verifySignature` 签名校验 → 403 | **不冲突**。签名是业务鉴权，不能用 JWT `permission` 替代；响应形态 withApi 不管 | **迁移**（保留 XML 与 403） |
| `GET /api/health` | 直接 `success()` / `serverError()` | 不冲突，但**被既有测试以 0 参调用** | **迁移 + 0 参兼容包装** |
| `GET /api` | 直接 `success()` | 同上 | **迁移 + 0 参兼容包装** |

### 2.1 为什么没有走"豁免"

卡定义给了两条出路（迁移 / 登记豁免）。实测**5 条全部可迁移**：`withApi` 只负责鉴权+参数+异常映射，
**不强制响应体形态**（handler 可 `return new Response(...)`）。因此豁免清单为空。

### 2.2 0 参兼容包装（health / api 根）

既有测试 `lane-b/routes-public.test.ts:203,213` 以 `apiRootGET()`、`healthGET()` **无参**调用。
直接导出 `withApi` 结果会让 `Request` 变必填 → `TS2554 Expected 1-2 arguments, but got 0`（**实测到该报错**）。

处置：

```ts
const handler = withApi(async () => success(...), { route: "health/GET" });
export async function GET(request?: Request): Promise<Response> {
  return handler(request ?? new Request("http://localhost/api/health"));
}
```

- 保留 withApi（异常映射生效）＋ 保留 0 参可调用（既有测试不破）
- 代价：兜底时用构造的假 URL；这两个路由**不读 query/header**，无影响

> 这一点是本卡唯一的取舍，已写入 ADR-037 §3。

## 3. 验证

### 3.1 门禁（全绿）

| 命令 | 退出码 |
| --- | --- |
| `npm run lint` | **0**（0 errors / 57 warnings，warning 归 T-03） |
| `npx tsc --noEmit` | **0** |
| `npm test` | **0**（71 files / 1705 passed） |
| `npm run build` | **0** |
| `npx vitest run src/lib/__tests__/lane-b/routes-public.test.ts` | **14 passed**（含 health 与 api 根） |

### 3.2 卡定义的三条负向要求

| 要求 | 现状证据 |
| --- | --- |
| `file` 路由 `../` 穿越返回 400/404 | handler 保留原防护：`parts.some(p => p === ".." \|\| p.includes("\\") \|\| p.startsWith("."))` → 404；且有 `abs.startsWith(uploadRoot + sep)` 二次校验 |
| `upload` 未登录 401 | 已改 `{ permission: "media:create" }`，withApi 内部 `requireAuth` 未登录即 401（不再手写） |
| `wechat` 错误签名拒绝 | `verifySignature` 保留，失败 `new Response("签名校验失败", { status: 403 })` |

### 3.3 覆盖守卫（卡定义验收项 1）

```bash
for f in $(find src/app/api -name route.ts); do grep -qE 'withApi|crud' $f || echo $f; done
# 输出为空
```

**5 条全部迁移，豁免清单为空**，满足「输出 ⊆ ADR-037 豁免清单」（空集是任何集合的子集）。

## 4. 改动文件

| 文件 | 类型 |
| --- | --- |
| `src/app/api/upload/route.ts` | 迁移：`requireAuth` + 手写 try/catch → `withApi({permission:"media:create"})` |
| `src/app/api/file/[...path]/route.ts` | 迁移：包 `withApi`，保留原始流与穿越防护 |
| `src/app/api/wechat/callback/route.ts` | 迁移：包 `withApi`，保留 XML/纯文本与 403 签名校验 |
| `src/app/api/health/route.ts` | 迁移 + 0 参兼容包装 |
| `src/app/api/route.ts` | 迁移 + 0 参兼容包装 |
| `docs/design/03_solution/decisions/ADR-037-withApi豁免清单.md` | 新增（豁免清单为空 + 未来豁免准入条件） |
| `docs/V0.8-20261022/state.json` | V8-T-04 → done |

## 5. 未做 / 遗留

1. **没有为 `file`/`upload`/`wechat` 新增独立负向单测**——卡定义 §Execution 第 3 步要求
   「不可迁移的各补 1 条负向用例」。由于 5 条**全部迁移成功、无豁免项**，该步的前置条件（"不可迁移的"）不成立，
   故未新增。现有防护由 handler 内既有逻辑保证，且 `routes-public.test.ts` 覆盖了 health/api 根。
   **如实登记为"按条件不适用"，不记为已完成**。
2. `withApi` 对 `file`/`wechat` 的异常会返回 JSON 信封而非原始响应（非预期路径才触发），已在 ADR-037 §后果 登记。
