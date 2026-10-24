# V11-SEC-02 执行证据（2026-10-24）

## 5W1H 简版

- **What**：限流取 IP 改为 TRUST_PROXY 受控（默认不信任 x-forwarded-for，伪造不可换键）；登录限流响应 400 → 429 + Retry-After。
- **Why**：V1.1 审计 §安全.2/3——原 `clientIp()` 无条件取 XFF 首跳作限流键，爆破方可每次伪造 XFF 换键绕过；登录被限流返回 400 无退避语义。
- **Who/Where**：P2 lane；`src/lib/rate-limit.ts`（新建）、`src/lib/api-handler.ts`、`src/app/api/auth/login/route.ts`。
- **When**：2026-10-24，基线 0728c46 / HEAD d95e103（升级分支单主线）。
- **How**：共享滑窗限流器（进程内、可注入时钟，REQ-C-003 单机口径，复用 llm/limits 模式）+ `ApiHttpError` 附加响应头机制。

## 现状盘点（以代码为准，审计复核）

| 审计声明 | 复核结论 | 证据 |
|---|---|---|
| 限流 IP 可被 XFF 伪造 | **属实** | `src/lib/log.ts:38-44` clientIp 无条件取 XFF 首跳；login 路由 `isRateLimited(clientIp(request))` 直接用它作键 |
| 登录限流返回 400 | **属实** | 原 `src/app/api/auth/login/route.ts:27` `ApiHttpError(400, "尝试过于频繁…")` |
| 限流语义/数量 | 沿用 | 10 次/分钟、内存计数、被限请求不记时间戳（不自我续期）——全部保留 |

**实现口径说明（socket 地址的边界）**：App Router route handler 无 socket 访问能力；Next 服务端仅在请求**未携带** XFF 时把 socket 地址回填进该头（`node_modules/next/dist/server/base-server.js:567` `??=`），伪造值与服务端回填值在 handler 内不可区分。故 TRUST_PROXY=false（默认）时**忽略一切转发头**，限流键回落共享桶 `unknown`（fail-closed：伪造无法换键即无法绕过）；部署在可信反代后设 `TRUST_PROXY=1` 才按 XFF 首跳分桶。TRUST_PROXY=true 下"首跳"口径适配**覆盖式**反代（`proxy_set_header X-Forwarded-For $remote_addr`）；追加式反代请配合覆盖式配置使用（追加链的首跳仍客户端可控）。

## 改动文件

1. **新增 `src/lib/rate-limit.ts`**：`isTrustedProxy` / `trustedClientIp` / `checkRateLimit`（滑窗，返回 allowed/remaining/retryAfterSeconds）+ 测试钩子 `__setRateLimitClock` / `__resetRateLimitBuckets`。纯内存无 IO。
2. **`src/lib/api-handler.ts`**：`ApiHttpError` 增加第 4 可选参 `headers`；`toErrorResponse` 映射响应后逐项 set（对所有状态码通用，不改变既有信封语义）。
3. **`src/app/api/auth/login/route.ts`**：键 `login:${trustedClientIp(request) ?? "unknown"}`；命中 → `ApiHttpError(429, "尝试过于频繁，请稍后再试", undefined, { "Retry-After": "<秒>" })`；本地 `isRateLimited` 删除，数量/窗口不变（10/min）。

## 验收逐条

| 验收标准 | 结果 | 证据 |
|---|---|---|
| 伪造 X-Forwarded-For 不能绕过限流（单测） | **PASS** | `v11-sec02-rate-limit.test.ts`：10 次不同伪造 XFF 全计入同键，第 11 次 429；"换不带头也 429"；`trustedClientIp` 纯函数断言各伪造值 → 恒 null |
| 登录被限流返回 429（原 400） | **PASS** | 单测断言 `status===429 && body.code===429`；**手工 curl**（dev :3456）：10×伪造 XFF → `400×10`，第 11 次 `HTTP/1.1 429 Too Many Requests` + `retry-after: 60`，信封 `{"code":429,"message":"尝试过于频繁，请稍后再试"}` |
| Retry-After 头 | **PASS** | 单测断言 1 ≤ Retry-After ≤ 60；curl 实测 `retry-after: 60` |
| 契约测试相应更新且全绿 | **PASS** | 既有契约无 400 限流断言需更新；`routes-public.test.ts`（login 分支）、`w0-errors.test.ts`（ApiHttpError 全状态映射）、`api-contract/*` 全部原样通过 |

## 验证命令输出摘录

```
npx vitest run src/lib/__tests__/v11-sec02-rate-limit.test.ts
  ✓ 9 tests passed

npx vitest run src/lib/__tests__/w0-errors.test.ts src/lib/__tests__/api-contract src/lib/__tests__/lane-b/routes-public.test.ts
  Test Files 5 passed (5)  Tests 82 passed (82)

npm run lint                        exit 0（--max-warnings 0）
npx tsc --noEmit                    exit 0（0 errors，2026-10-24 22:32 复跑）
npx vitest run src/lib/__tests__    761 passed | 18 failed → 复跑 761/12 failed（失败全部为非本卡域，见下）
npm run build                       exit 0
```

### 全量套件中的非本卡失败（归属说明，非本卡引入）

`npx vitest run src/lib/__tests__` 存在 12~18 个失败，全部位于 chat（lane-c，8）与 collect（lane-d，4）域 + MAIL-01 中间态。**控制变量实验**：将本卡全部 tracked 改动 `git stash push` 后复跑，同样 18 个失败原样复现（22:31:06，`18 failed | 52 passed`），随后 stash pop 恢复。失败根因均为 `d95e103 fix(V11-SEC-04)`（SSRF 黑名单 fail-closed 拦下 lane-d 测试的 127.0.0.1 mock 服务；chat HMAC 会话 cookie 使 chat-guard 用例先得 400）——该提交在 G-01 基线五连全绿之后落库。本卡未触碰 collect-engine.ts / chat-service.ts（禁碰清单）。截至证据写作时该 lane 正在继续修复（工作树中 collect-engine.ts 已有未提交改动）。

## UNKNOWN

- **TRUST_PROXY=false 下按 socket 分桶不可实现**：route handler 无 socket 访问，伪造与 Next 服务端回填不可区分（base-server `??=` 行为）。采用 fail-closed 共享桶，部署侧需设 `TRUST_PROXY=1`。此为能力边界而非缺陷，已写入 rate-limit.ts 模块注释与 .env 提示待办。

## 后续方向待办

1. `.env.example` 增补 `TRUST_PROXY` 说明（不在本卡允许路径，未越界改动；建议随下一张涉及部署配置的卡补）。
2. 生产部署（宝塔 nginx → 127.0.0.1:6789）必须设 `TRUST_PROXY=1`，否则全站登录共享 10 次/分钟桶。
3. chat/stream 的 DB 滑窗限流仍用 `clientIp`（log.ts）取 IP——属 V11-SEC-04 chat 域，本卡未动。

## 附：本机 dev 环境痕迹

curl 证据在本地 dev server（:3456，dev.db）产生：probe 登录、31 条 user-actions、2 条 media 记录（含 1 真实 1×1 PNG 及缩略图）落在本地 gitignored 的 dev.db/uploads，无需清理入证据。
