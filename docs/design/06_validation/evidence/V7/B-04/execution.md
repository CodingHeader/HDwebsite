# B-04 执行记录（证据）

## 5W1H 简版

- **What**：`src/lib/wechat.ts` 6 处 `AbortSignal.timeout` 改用 `httpFetch`（`src/lib/http-client.ts`）；`auth.ts` / `notify-gateway.ts` / `wechat.ts` 的 DB JSON-in-String 解析改用 `parseJsonField`（`src/lib/json-field.ts`）。
- **Why**：P08 目标 2 / A-ui §2.1-#3/#4——统一外呼客户端（超时+重试+HttpError）与 JSON 字段解析唯一入口，消除手写 `try { JSON.parse } catch` 与 `AbortSignal.timeout` 散布。
- **Where**：`src/lib/{wechat,notify-gateway,auth}.ts`（B-04 允许路径）。
- **Who**：B-04（P1·sonnect·L1），依赖 B-01/B-03。
- **How**：读原文件 → 替换 → 跑既有测试（wechat-chat / notify-before-publish）→ 门禁四连。
- **When**：2026-10-20。

## 改动文件

| 文件 | 行范围 | 说明 |
|---|---|---|
| `src/lib/wechat.ts` | 33-36 / 45-54 / 152-157 / 185-190 / 206-215 / 224-241 | 6 处 `fetch(..., { signal: AbortSignal.timeout(N) })` → `httpFetch(url, { timeoutMs: N, logTag: "wechat", throwOnHttpError: false })`；`parseTokenCache` 的 `JSON.parse` → `parseJsonField` |
| `src/lib/notify-gateway.ts` | 71-84 | `JSON.parse(rule.recipientGroups)` / `JSON.parse(r.groups)` → `parseJsonField` |
| `src/lib/auth.ts` | 44-51 | `toSessionUser` 的 `JSON.parse(role.permissions)` → `parseJsonField` |

## 关键技术决策与证据链

1. **微信外呼统一 `throwOnHttpError: false`**：微信 API 的业务错误（`errcode != 0`）通常在 HTTP 200 body 里返回（如 `access_token` 过期 → 200 + `{"errcode":42001}`）；原代码直接 `r.json()` 读 body 判断。`httpFetch` 默认 `throwOnHttpError: true` 会在非 2xx 抛 `HttpError` 吞掉 body，改变语义。因此所有微信调用显式传 `throwOnHttpError: false`，保留原行为。
2. **超时与重试语义**：原代码只设超时无重试；`httpFetch` 默认 `retries: 0`，与原来一致（不新增重试，避免重复提交微信客服消息）。`timeoutMs` 逐一对应原值（10s/10s/15s/15s/30s/20s）。
3. **`uploadThumb` 的封面图下载**：原来手动 `if (!res.ok) return null`；`httpFetch` + `throwOnHttpError: false` 保留该语义（`res.ok` 判断不抛错）。
4. **`parseTokenCache` 的 `parseJsonField`**：原代码要求 `accessToken` 为 string、`expiresAt` 为 number，否则返回 null；`parseJsonField<{accessToken?: unknown; expiresAt?: unknown} | null>` 之后同样做 typeof 校验，行为等价（空/null/非法 JSON → null）。
5. **notify-gateway 的组过滤**：原代码 `try { JSON.parse(rule.recipientGroups); if Array → groups } catch { 默认 ["publish"] }`；`parseJsonField<string[] | null>(rule.recipientGroups, null)` 后同样 `Array.isArray` 检查。接收人 `r.groups` 同理，`parseJsonField<unknown>(r.groups, null)` + `Array.isArray(gs)`。
6. **auth 的 permissions 解析（P1 修复后）**：原代码 catch → `[]`；`parseJsonField<string[] | null>(role.permissions, null)` 后经 `Array.isArray` + `filter(typeof === "string")` 生成 `safePerms`，**传给 `sessionUserSchema.parse()` 的是 `safePerms`（恒为数组，失败回落 `[]`）**。修复前错误地把可空的 `permissions` 传给 schema，遇到 `role.permissions` 坏 JSON 时会在运行时抛 ZodError（`sessionUserSchema.role.permissions` 是 `z.array(z.string())` 非 nullable），使 `getSession` 从"宽容降级"变成"抛异常"。见 commit `fix(B-04): toSessionUser 权限回落 safePerms` 与回归测试 `src/lib/__tests__/lane-b/auth-session.test.ts`。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 验收1 `grep -n "AbortSignal.timeout\|JSON.parse" src/lib/{wechat,notify-gateway,auth}.ts` 为空 | PASS | grep exit 1，无输出 |
| 验收2 wechat-chat.test.ts + notify-before-publish.test.ts 通过 | PASS | `npx vitest run src/lib/__tests__/wechat-chat.test.ts src/lib/__tests__/notify-before-publish.test.ts` → 2 files / 11 tests passed |
| 验收3 通用门禁 | PASS | lint 0 errors / 55 warnings(既有) / tsc 0 / test 59 files·760 passed / build exit 0 |
| 验收4 diff 落允许路径 | PASS | 仅 `src/lib/{wechat,notify-gateway,auth}.ts` 3 个文件 + `src/lib/__tests__/lane-b/auth-session.test.ts`（lane-b 允许路径内） |
| 验收5 P1-1 回归测试（坏 JSON → 无异常 → 空数组） | PASS | `npx vitest run src/lib/__tests__/lane-b/auth-session.test.ts` → 1 file / 5 tests passed（非法 JSON / null / 非数组 JSON / 含非 string 元素 / 正常数组 5 例全绿） |

## 门禁实测输出摘要

```
$ grep -n "AbortSignal.timeout\|JSON.parse" src/lib/wechat.ts src/lib/notify-gateway.ts src/lib/auth.ts
→ 无输出（exit 1）
$ npx tsc --noEmit            → exit 0
$ npm run lint                → exit 0, 0 errors, 55 warnings（既有）
$ npx vitest run wechat-chat.test.ts notify-before-publish.test.ts → 2 files / 11 passed
$ npm test                    → exit 0, 59 files / 760 tests passed
$ npm run build               → exit 0
```

lint warning 55 vs 上卡 54：新增 1 条来自 `src/lib/wechat.ts` 的既有 `eslint-disable no-explicit-any` 未使用（B-04 未新增，属 W2-08 统一清理范围）。

## UNKNOWN / 局限

- **微信 API 真实联调**：凭证缺失，未实跑；`throwOnHttpError: false` 语义等价基于官方 API 文档（业务错误在 HTTP 200 body errcode）。真实联调归后续微信卡。
- **`httpFetch` 重试行为**：保持 `retries: 0`，与原有单次请求语义一致。若后续微信链路需要重试（如 token 失效重取），由 B-07 单独评估。
- **lint warning 清理**：`wechat.ts` 的未使用 `eslint-disable` 与既有 54 条一起归 W2-08（ESLint 边界规则统一 error）。

## 允许进入下一阶段

是。B-04 验收 1/2/3/4 全部 PASS；遗留项均为既有噪声或后续卡范围，不阻塞 B-05/B-06。

## 独立复审（P1-1 修复闭环）

- 复审报告：`docs/design/06_validation/evidence/V7/B-04/verify-p1-fix.md`（复审对象 commit `b771d6d`，2026-10-20）
- **结论：PASS，完成度 98%**。P1-1 已修复闭环，无新增 P1/P2，仅 1 条 P3 可读性备注。
- 逐条验收 A–F 全部 PASS：A（恒传数组 `safePerms`）✓；B（7 类边界与"原 catch→[]"等价或更稳）✓；C（5 例中 4 例在修复前版本必失败，真实守住回归）✓；D（`typeof === "string"` 类型守卫，`safePerms: string[]` 与 schema 兼容）✓；E（未触碰冻结面，调用方适配而非放宽契约）✓；F（门禁结论与 evidence 一致）。
- 复审者工具受限未实跑门禁；主代理补跑实测闭合：`npx vitest run lane-b/auth-session.test.ts` → 1 file / 5 passed；`npx tsc --noEmit` → exit 0；`npm test` → 60 files / 765 tests passed（前述已记录）；`npm run lint` → 0 errors / 54 warnings；`npm run build` → exit 0。