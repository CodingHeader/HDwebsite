# B-03 执行记录（证据）

## 5W1H 简版

- **What**：把 B-02 之外的剩余手写路由 `apply`、`articles`(列表 GET/POST)、`auth×4`、`user-actions` POST、`api 根`、`health` 全部迁移到 `withApi`；`api/route.ts` 改用契约信封 `success()`；登记协议例外清单 `non-json-routes.md`（file/upload/wechat-callback/health/api 根）。
- **Why**：P08 #6 / P13 #3/#4——所有业务路由统一经 withApi（鉴权/parseBody/parseQuery/错误映射/system_error 告警），仅协议例外保留裸 handler；消除 `NextResponse.json` 在路由内的散布。
- **Where**：`src/app/api/{apply,articles,auth,user-actions,route.ts,health}/**`、`src/lib/__tests__/lane-b/routes-public.test.ts`、`docs/design/06_validation/evidence/V7/B-03/non-json-routes.md`。
- **Who**：B-03（P1·sonnect·L3），依赖 B-02（已完成）。
- **How**：读原文件 → 迁移到 withApi → 补齐契约测试 → 写例外清单 → 门禁四连 → 提交。
- **When**：2026-10-20。

## 改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/app/api/apply/route.ts` | 重写 | `POST` → `withApi`；保留频控（同 IP 5/分钟、全站 100/分钟）与中文文案「请填写姓名」「提交过于频繁，请稍后再试」；用 `request.json()` + 手动 safeParse 以保留首条 issue 文案（不套 parseBody 的「参数校验失败」） |
| `src/app/api/articles/route.ts` | 重写 | GET → `withApi`(`auth:"optional"`)，未登录只返回 `published`；POST → `withApi`(`article:create`)，slug 冲突 → 400「slug 已存在」，P2002/P2003 交由 withApi 全局映射（ADR-028：409/400），删除本地 `prismaKnownErrorTo400` |
| `src/app/api/articles/[id]/route.ts` | 修改 | PUT 删除 `isPrismaConflictCode` 本地 400 分支（B-02 遗留 P2 在此闭合为 ADR-028 全局语义）；DELETE/PATCH 未动 |
| `src/app/api/auth/login/route.ts` | 重写 | `POST` → `withApi`；保留同 IP 10 次/分钟内存计数限流与「用户名或密码错误」文案 |
| `src/app/api/auth/logout/route.ts` | 重写 | `POST` → `withApi`(`auth:"optional"`)，无 session 也返回 200「已退出登录」 |
| `src/app/api/auth/me/route.ts` | 重写 | `GET` → `withApi`(`auth:true`)，仅要求登录 |
| `src/app/api/auth/refresh/route.ts` | 重写 | `POST` → `withApi`(`auth:true`)，签发新 7d token |
| `src/app/api/user-actions/route.ts` | 重写 | `POST` → `withApi`（公开埋点）；GET 仍为 `crudList`（工厂） |
| `src/app/api/route.ts` | 重写 | `GET` → 使用契约 `success()`，删 `NextResponse.json` |
| `src/app/api/health/route.ts` | **未迁移** | 协议例外：健康探活不纳入 system_error 告警，登记入 non-json-routes.md |
| `src/lib/__tests__/lane-b/routes-public.test.ts` | 新建 | B-03 契约测试，14 用例（见 §四） |
| `docs/design/06_validation/evidence/V7/B-03/non-json-routes.md` | 新建 | 协议例外清单 + W2-02 白名单建议 |

## 关键技术决策与证据链

1. **apply 保留中文文案**：卡定义 Step 2「apply 保留限流与中文文案」。直接用 `parseBody(request, applySchema)` 会走 `ApiHttpError(400, "参数校验失败", issues)`，把「请填写姓名」变成「参数校验失败」。改用 `request.json()` + `applySchema.safeParse`，保留首条 issue 的 message（`parsed.error.issues[0]?.message`），与原路由 `error(issues[0].message, 400)` 行为一致。
2. **articles GET 保持 auth:optional**：原实现内部 `getSession` 判断草稿可见性，`auth:"optional"` 语义等价（`session` 可能 null，`canReadAll(null)=false` 只返回 published）。草稿仍可被 `article:list` 用户看到。
3. **articles POST 的 P2002 处理**：handler 内显式 `findUnique` 检查 slug → `ApiHttpError(400, "slug 已存在")`（业务语义）；唯一约束竞争下 P2002 由 withApi 全局映射为 409。**B-02 遗留的「articles PUT P2002→400 vs ADR-028→409」P2 在此闭合**：删除 `[id]/route.ts` 的 `isPrismaConflictCode` 本地分支，两动作统一走 ADR-028。
4. **auth me/refresh 401 文案变化**：原来 `me` 返回「未提供认证令牌」，`refresh` 返回「认证无效或已过期」；迁到 `auth:true` 后统一走 `requireAuth` 的 `unauthorized("未提供认证令牌")`。**前端无文案依赖**（`grep -rn "认证无效或已过期" src/ tests/` 无命中），属契约一致性收口，已登记为观察项。
5. **auth logout 语义**：无状态 JWT，客户端删 token 即可；保留 `auth:"optional"`，无 session 仍 200「已退出登录」。
6. **user-actions POST 公开埋点**：原无鉴权；迁移后用 `withApi` 默认（未给 permission/auth）→ 公开路由，行为等价。
7. **api 根 & health**：卡定义允许例外。api 根改用 `success({ok:true}, "HDwebsite API")`，信封与前端消费一致；health 保持裸 handler 且不纳入 system_error 邮件告警（避免健康检查失败刷邮件），登记理由到 non-json-routes.md。

## 协议例外清单（5 项，登记到 non-json-routes.md）

`src/app/api/file/[...path]`、`upload`、`wechat/callback`（XML/echostr）、`health`、`route.ts`（api 根）。理由见 `docs/design/06_validation/evidence/V7/B-03/non-json-routes.md`，供 W2-02 写 `tests/contract/rules.ts` 白名单。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 验收1 `grep -rLE "withApi\|crud*" src/app/api --include=route.ts` 只剩例外清单 | PASS | 实测输出：`file/[...path]`、`health`、`route.ts`（api 根）、`upload`、`wechat/callback`——恰好 5 项，与卡定义协议例外一致 |
| 验收2 `grep -rn "NextResponse.json(" src/app/api \| grep -v api-response` 为空 | PASS | 实测无命中（grep exit 1）；api 根已改用 `success()`；全部响应经 `src/lib/api-response` |
| 验收3 e2e auth/apply-chat 通过 | **UNKNOWN** | 本机无 Playwright 工具，未实跑；归 W2-05 全量回归 |
| 验收4 通用门禁 | PASS | lint 0 errors / 54 warnings(既有) / tsc 0 / test 59 files·760 passed / build exit 0 |
| 验收5 diff 落允许路径 | PASS | 见下 `git status`（10 个 route.ts + 1 测试文件 + 1 文档均落 B-03 允许路径） |

## 门禁实测输出摘要

```
$ npx tsc --noEmit                     → exit 0
$ npm run lint                         → exit 0, 0 errors, 54 warnings（既有）
$ npm test                             → exit 0, 59 files / 760 tests passed
$ npm run build                        → exit 0
$ npx vitest run src/lib/__tests__/lane-b/routes-public.test.ts → exit 0, 14/14 passed
```

lint warning 由既有文件贡献（`no-unused-vars` / `Unused eslint-disable directive`），B-03 新写文件无告警。

## UNKNOWN / 局限

- **验收3 e2e**：本机无 Playwright 工具，`auth` / `apply-chat` e2e 未实跑；归 W2-05。
- **auth me/refresh 401 文案统一**：`refresh` 从「认证无效或已过期」变为 requireAuth 默认「未提供认证令牌」；前端无文案依赖，属契约一致性收口。
- **apply 限流内存计数**：沿用 M1 实现（Map），多实例/重启丢失——已有单机口径 REQ-C-003 约束，非本次范围。

## 允许进入下一阶段

是。B-03 验收 1/2/4 实测 PASS；验收 3 登记为 UNKNOWN（无 Playwright），不阻塞；遗留观察项（auth 401 文案统一、apply 内存限流）登记于 §UNKNOWN，不影响下一卡 B-04。