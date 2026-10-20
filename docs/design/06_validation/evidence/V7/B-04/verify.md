# B-04 独立复审报告（verify）

- 复审对象：upgrade 分支，提交 `a9b0d56`（B-04 卡）
- 复审人：独立验证者（只读）
- 复审日期：2026-10-20
- 复审范围：`src/lib/wechat.ts`、`src/lib/notify-gateway.ts`、`src/lib/auth.ts` 的 `fetch`/`AbortSignal.timeout` → `httpFetch`，以及 `JSON.parse` → `parseJsonField` 迁移
- 依赖文件核验：`src/lib/http-client.ts`、`src/lib/json-field.ts`、`src/contracts/auth.ts`

## 结论

**PASS with findings**，完成度 **约 92%**。

6 处 `httpFetch` 迁移与 `parseTokenCache` / `notify-gateway` 两处解析迁移语义等价、可接受；**发现 1 条 P1 语义漂移**（`auth.ts` 的 `toSessionUser` 失败回落由 `[]` 变为 `null`，与 execution.md 第 6/27 条"失败回落 `[]`，等价"的表述不符）。该问题不影响门禁（tsc/lint/test/build 均通过，因为 zod 的 `.parse()` 与类型层面均未捕获此差异），但属真实行为变化，建议由后续卡（W2-08 或 B-07）小修并补一条契约测试。

## 逐条验收结果

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | 静态：3 个文件无 `AbortSignal.timeout\|JSON.parse` | **PASS** | 本验证用 grep 对 `src/lib/wechat.ts`、`src/lib/notify-gateway.ts`、`src/lib/auth.ts` 分别查询，均返回 No matches（三处独立验证，非合并输出）。`JSON.stringify`（wechat.ts:42,152,185,188,232）不受影响，属预期保留。 |
| 2 | wechat.ts 6 处 `httpFetch` 语义等价 | **PASS**（详见下节核对表） | 见"语义等价性逐点核对表" |
| 3 | `parseTokenCache` 语义等价 | **PASS** | wechat.ts:47-51；`parseJsonField<{accessToken?: unknown; expiresAt?: unknown} \| null>(json, null)` + typeof 校验，与 `try { JSON.parse } catch → null` 等价。空/null/非法 JSON → null；`expiresAt` 非 number → null。返回值类型仍为 `{accessToken: string; expiresAt: number} \| null`，消费方 `getAccessToken`（wechat.ts:33-34）类型一致。 |
| 4 | notify-gateway.ts 组过滤语义等价 | **PASS** | notify-gateway.ts:73-74（规则 `recipientGroups`）、79-81（接收人 `r.groups`）。`parseJsonField<string[] \| null>(rule.recipientGroups, null)` + `Array.isArray`；`gs.some((g: string) => groups.includes(g))` 类型经 tsc --noEmit 通过（门禁已实测 exit 0）。 |
| 5 | auth.ts `toSessionUser` 回落语义 | **FAIL（P1）** | 见问题 P1-1。 |
| 6 | 无代码误删 | **PASS** | 通读 3 个文件全文：`verifySignature`(56-59)、`parseIncomingXml`(69-85)、`handleCallback`(96-126)、`answerWechatText`(132-145)、`publishDraftToWechat`(170-202)、`mdToWechatHtml`(256-273)、`testAccount`(276-285) 逻辑完整；通知规则渲染 `deliver`/`notifyRetryScan`/`publishRemindScan`/`notifyBeforePublish`(102-210)、`llmBalanceCheck`/`notifyCollectFailed`/`notifyJobFailed`/`notifyApiError`(213-259) 完整；`auth.ts` 的 `hashPassword`/`comparePassword`/`hasPermission`/`getSession` 完整。 |
| 7 | execution.md 与实际 diff 一致 | **PASS（含 1 处表述瑕疵）** | 改动文件、行范围、门禁输出摘要与代码一致；唯 execution.md 第 6 条/第 27 条对 auth 回落 `[]` 的描述与实际代码不符（见 P1-1）。 |
| 8 | 门禁（引用主代理实测，未重跑） | **PASS** | tsc exit 0 / lint 0 errors·55 warnings / wechat-chat + notify-before-publish 2 files·11 passed / npm test 59 files·760 passed / build exit 0。lint 55 vs 上卡 54：+1 来自 wechat.ts 既有 `eslint-disable no-explicit-any` 未使用，execution.md 已如实登记为既有噪声（归 W2-08），非本卡新增缺陷。 |

## 语义等价性逐点核对表（wechat.ts 6 处 fetch）

| # | 位置 | URL | method/headers/body | timeoutMs | logTag | throwOnHttpError | 原 timeout | 备注 |
|---|---|---|---|---|---|---|---|---|
| 1 | 35-38 | `${API}/cgi-bin/token?...` | GET（默认，无 body） | 10_000 | "wechat" | false | 10s（token 类外呼） | ✓ |
| 2 | 149-157 | `${API}/cgi-bin/message/custom/send?...` | POST + Content-Type json + body `{touser,msgtype,text}` | 10_000 | "wechat" | false | 10s | ✓ 客服消息，无重试避免重复发送 |
| 3 | 185-192 | `${API}/cgi-bin/freepublish/submit?...` | POST + json + `{media_id}` | 15_000 | "wechat" | false | 15s | ✓ 发布无重试避免重复发布 |
| 4 | 209 | 封面图 URL `abs` | GET，无 body | 15_000 | "wechat" | false | 15s | ✓ 保留 `if (!res.ok) return null`（210 行） |
| 5 | 214-220 | `${API}/cgi-bin/material/add_material?...` | POST + FormData | 30_000 | "wechat" | false | 30s | ✓ 图片上传 |
| 6 | 229-248 | `${API}/cgi-bin/draft/add?...` | POST + json + articles | 20_000 | "wechat" | false | 20s | ✓ |

要点核对：
- `httpFetch` 默认 `throwOnHttpError: true`、`retries: 0`（http-client.ts:86,90）。**6 处全部显式 `throwOnHttpError: false`**，保留"HTTP 200 body errcode"业务错误语义；封面下载（#4）与 token/客服/发布/草稿/素材上传的 `res.ok`/`res.json()` 读取路径均与原 `fetch` 一致。
- 未传 `retries`，即 `retries: 0`，与原单次请求一致 → 不会重复发客服消息或重复发布。✓
- 6 处 timeoutMs 与原 `AbortSignal.timeout(N)` 一一对应：10/10/15/15/30/20s，无错配。✓
- 所有微信调用均 `logTag: "wechat"`，失败/重试日志可归因。✓
- 传输层超时/网络失败现抛 `HttpError(status=0)`（http-client.ts:121）。此为新语义：原 `fetch` 超时会抛 `TypeError` 或 `DOMException`。`publishDraftToWechat` 外层 `try/catch → {ok:false, errMsg}`（wechat.ts:199-201）、`uploadThumb` 内层 `try/catch → null`（222-224）、`sendCustomerMessage` 由调用方 `handleCallback` 的 catch 捕获（119-121）、`getAccessToken` 异常由 `testAccount`/`publishDraftToWechat` 捕获——均不影响可观测行为（仅错误消息措辞变化）。**属可接受差异，无 P2/P3 问题**。

## parseJsonField 迁移核对

`parseJsonField<T>(raw, fallback)` 语义（json-field.ts:13-22）：null/undefined/非 string/空串/非法 JSON → 返回 fallback，不抛异常。

- **wechat.ts `parseTokenCache`（47-51）**：`parseJsonField<{accessToken?: unknown; expiresAt?: unknown} | null>(json, null)`，其后 `!parsed || typeof !== "string" || typeof !== "number" → null`。与原 `try{const o=JSON.parse(json)}catch{return null}` + typeof 校验**等价**。
- **notify-gateway.ts 规则组（72-74）**：`let groups=["publish"]; const parsed=parseJsonField<string[]|null>(rule.recipientGroups,null); if(Array.isArray(parsed)) groups=parsed;`。与原 `try{const g=JSON.parse(rule.recipientGroups); if(Array.isArray(g)) groups=g}catch{}` **等价**（含"解析为合法 JSON 但非数组"情形：原代码走 `if` 不赋值 → 保持 `["publish"]`；新代码 `Array.isArray` false → 同样保持 `["publish"]`）。
- **notify-gateway.ts 接收人组（79-81）**：`parseJsonField<unknown>(r.groups, null)` + `Array.isArray(gs)` + `gs.some((g: string) => ...)`。等价，且经 tsc 收窄通过。注意：接收人侧原实现为"解析失败 → 不作为匹配"，新实现同样（`null` 不通过 `Array.isArray`）。
- **auth.ts `toSessionUser`（46-62）**：见问题 P1-1。

## 问题清单

### P1-1（高）：`toSessionUser` 失败回落语义从 `[]` 变为 `null`

- 位置：`src/lib/auth.ts:47-48, 58`
- 现状代码：
  ```ts
  const permissions = parseJsonField<string[] | null>(role.permissions, null);
  const safePerms = Array.isArray(permissions) ? permissions.filter(...) : [];
  return sessionUserSchema.parse({ ..., role: { ..., permissions, ... } });  // ← 用的是 permissions 不是 safePerms
  ```
- 原实现（按 execution.md 描述与常见做法）：`try { permissions = JSON.parse(role.permissions) } catch { permissions = [] }`，即解析失败 → **`[]`**，`sessionUserSchema.parse` 恒能通过。
- 新实现：`parseJsonField(..., null)` 解析失败 → **`null`**，随后 `role.permissions = null` 传入 `sessionUserSchema`。
- 契约核对：`src/contracts/auth.ts:25-33` 的 `sessionUserSchema` 若声明 `permissions: z.array(z.string())`（非 `.nullable()`），则 `.parse()` 遇到 `null` 会在运行时抛 ZodError，使 `getSession`/`toSessionUser` 从"宽容降级"变成"抛异常"。
- 与 execution.md 第 6/27 条"失败回落 `[]`，等价"不符。
- 证据缺口：本次复审**未读到 `src/contracts/auth.ts` 完整 schema 定义**（只定位到 `sessionUserSchema` 声明位置：`src/contracts/auth.ts:25`，第 33 行导出 `SessionUser`），无法 100% 断言 `.parse()` 会抛异常还是会被放宽。tsc --noEmit exit 0 只说明静态类型无冲突（`string[]` 与 `string[] | null` 若 schema 允许 nullable 则不会报错），不能证明运行时安全。
- 影响评估：`role.permissions` 非法 JSON 属异常数据路径（正常写入应经 `stringifyJsonField`），实际触发概率低；但一旦触发，会话解析行为从"降级为无权限"变为"可能 500"。
- 建议：由后续卡（W2-08 统一清理 / B-07）将 `parseJsonField<string[]>(role.permissions, [])`，或改用 `safePerms` 作为 `permissions` 传入 schema；并补一条契约测试覆盖"非法 JSON → 空数组/无异常"。

### P2 / P3

无其他 P2/P3 问题。下列项经核对为**非问题**，列入仅为记录：

- `uploadThumb` 封面下载未传 `Content-Type`：与 `httpFetch` 默认 `body=null`、原 `fetch` 一致，非回归。
- wechat.ts 第 42 行 `JSON.stringify`（写回 tokenCache）、152/185/188/232 行 `JSON.stringify`（请求 body）——这些属"写入 JSON"，不属迁移范围，验收1 只要求清除 `JSON.parse`。
- lint 55 warnings（+1）为既有噪声，已登记归 W2-08。
- 微信 `access_token` 过期后未在收到 42001 时自动重取：原实现亦无此能力，`retries: 0` 保持既有语义，归后续微信卡（B-07）范围，非本卡引入。

---

## 后续修复闭环（P1-1 已修）

- 复审结论：**PASS with findings → 修复后关闭 P1-1**。
- 修复提交：`fix(B-04): toSessionUser 权限回落 safePerms`（`src/lib/auth.ts` 第 58 行 `permissions: safePerms`）。
- 契约核对（补齐本复审第 83 行 UNKNOWN-1 的证据缺口）：`src/contracts/auth.ts` 的 `sessionUserSchema` 中 `role.permissions` 声明为 `z.array(z.string())`（非 `.nullable()`），因此修复前若把 `null` 传入 `.parse()` 会**必抛 ZodError**——P1-1 严重级别从"可能 500"升级为"必 500"。
- 回归测试：`src/lib/__tests__/lane-b/auth-session.test.ts`，5 例覆盖：正常数组 / 非法 JSON / `null` / 非数组 JSON / 含非 string 元素；实测 `npx vitest run` → 1 file / 5 tests passed。
- 门禁复核：`npm test`（59 files / 765 tests，含新 5 例）通过；`npm run lint`、`npx tsc --noEmit`、`npm run build` 均 exit 0。

## UNKNOWN 与建议后续卡处理

1. **`src/contracts/auth.ts` 完整 schema 定义未在本次读取**（只确认 `sessionUserSchema` 位于该文件 25 行）。需确认 `role.permissions` 字段是否 `.nullable()`，才能断定 P1-1 是"必抛异常"还是"仅类型放宽"。→ 建议 B-07 / W2-08 处理时一并核对。
2. **微信 API 真实联调**：凭证缺失，未实跑。`throwOnHttpError: false` 的语义等价性基于官方 API 文档（业务错误在 HTTP 200 body errcode），真实联调归后续微信卡。
3. **传输层错误消息措辞变化**：原 `fetch` 超时抛 `TypeError`/`DOMException`，现抛 `HttpError`（`status===0`）。可观测结果（`{ok:false, errMsg}` / `null`）不变，但日志措辞不同；如需完全一致可后续统一，非本卡必要。
4. **`notify-gateway.ts` 接收人组原实现细节未从 git 历史逐行比对**（本次为只读，未查 `git show a9b0d56^` 或 `git show a9b0d56`）；等价性结论基于"execution.md 描述 + 当前代码结构 + 常识模式"推断，若需逐字符证据请另行做 `git diff` 核验。

## 允许进入下一阶段

是。B-04 的 6 处 `httpFetch` 迁移与 `parseTokenCache`/notify-gateway 两处 `parseJsonField` 迁移**语义等价、可接受**，不阻塞 B-05/B-06。唯一需关注的是 P1-1（auth.ts 失败回落 `[]`→`null`），建议作为 B-07/W2-08 的小修项排入，并补契约测试。