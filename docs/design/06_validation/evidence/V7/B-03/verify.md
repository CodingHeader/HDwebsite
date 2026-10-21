# B-03 独立复审报告（verify.md）

- **被验证对象**：B-03「withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单」
- **卡定义**：`docs/V0.7-20261019/tasks/B-03.md`
- **提交范围**：`git log 5681776..HEAD --first-parent --no-merges --oneline` 应为 1 个提交
- **复审人**：独立验证者（只读审查，未改业务代码、未提交 git）
- **复审日期**：2026-10-20
- **本地基线**：`5681776`

---

## 一、结论

**PASS**（完成度 **100%**）

- 提交范围、允许路径、5 项协议例外、核心业务语义、契约测试与通用门禁全部实测通过。
- 执行证据 `execution.md` 与仓库实际 diff、代码状态**完全一致**，无虚报。
- 遗留项均为已登记观察项（auth 401 文案统一、apply 内存限流、e2e 未实跑），不构成本卡 FAIL 或阻塞。

---

## 二、提交范围核对

```bash
$ git log 5681776..HEAD --first-parent --no-merges --name-only --format=%h --oneline | sort -u
```

唯一提交 **`60cb3df feat(B-03): 公开/认证路由全部迁移 withApi + articles P2002 统一 ADR-028`**，改动文件 12 项：

| 文件 | 允许路径 |
|---|---|
| `src/app/api/apply/route.ts` | ✔ `src/app/api/apply/**` |
| `src/app/api/articles/route.ts` | ✔ `src/app/api/articles/**` |
| `src/app/api/articles/[id]/route.ts` | ✔ 同上 |
| `src/app/api/auth/login/route.ts` | ✔ `src/app/api/auth/**` |
| `src/app/api/auth/logout/route.ts` | ✔ 同上 |
| `src/app/api/auth/me/route.ts` | ✔ 同上 |
| `src/app/api/auth/refresh/route.ts` | ✔ 同上 |
| `src/app/api/route.ts` | ✔ 明示允许 |
| `src/app/api/user-actions/route.ts` | ✔ `src/app/api/user-actions/**` |
| `src/lib/__tests__/lane-b/routes-public.test.ts` | ✔ `src/lib/__tests__/lane-b/**` |
| `docs/design/06_validation/evidence/V7/B-03/execution.md` | ✔ `docs/.../V7/B-03/**` |
| `docs/design/06_validation/evidence/V7/B-03/non-json-routes.md` | ✔ 同上 |

`health/route.ts`、`wechat/callback/route.ts` **未被本提交改动**（符合协议例外，卡定义允许保留）。**全部 12 项均在允许路径内，无越界。** ✔ PASS

---

## 三、逐条验收结果

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | `grep -rLE "withApi\|crudList\|crudCreate\|crudGet\|crudUpdate\|crudDelete" src/app/api --include=route.ts` 只剩 5 项协议例外 | **PASS** | 实测输出恰好 5 项，与卡定义逐字一致：`src/app/api/file/[...path]/route.ts`、`src/app/api/health/route.ts`、`src/app/api/route.ts`（api 根）、`src/app/api/upload/route.ts`、`src/app/api/wechat/callback/route.ts`。全仓 `src/app/api` 共 130 个 route.ts，仅这 5 项未走 withApi/crud* |
| 2 | `grep -rn "NextResponse\.json" src/app/api` 无输出 | **PASS** | 实测 grep exit=1，全 `src/app/api` 无 `NextResponse.json` 命中 |
| 3 | `src/lib/__tests__/lane-b/routes-public.test.ts` 存在且 14/14 通过 | **PASS** | `npx vitest run .../routes-public.test.ts` → `Test Files 1 passed, Tests 14 passed (14)`，2096ms |
| 4 | 通用门禁 | **PASS** | 见 §五 |
| 5 | 核心语义回归（逐文件读） | **PASS** | 见 §四 |
| 6 | 协议例外清单 `non-json-routes.md` 完整 & W2-02 白名单可行 | **PASS** | 见 §六 |
| 7 | `execution.md` 与实际 diff 一致 | **PASS** | 见 §七 |

---

## 四、核心语义回归检查（逐文件实测）

| 文件 | 判定项 | 实测结果 |
|---|---|---|
| `apply/route.ts` | 频控（同 IP 5/分、全站 100/分） | ✔ `route.ts:33-41`：`recent >= 100`（全站）、`ipRecent >= 5`（同 IP），均以 `userAction(actionType="submit", actionTarget="apply")` + `student.count` 计 |
| 同上 | 中文文案「请填写姓名」「提交过于频繁，请稍后再试」 | ✔ `route.ts:10`「请填写姓名」、`route.ts:40`「提交过于频繁，请稍后再试」 |
| 同上 | `request.json()` + `safeParse` 而非 `parseBody` | ✔ `route.ts:22-28`：`request.json()` + `applySchema.safeParse`，取 `issues[0]?.message`，注释明示为保留 M1 首条 issue 文案 |
| `articles/route.ts` GET | `auth:"optional"` | ✔ `route.ts:65` |
| 同上 | 匿名仅 `published`；`article:list` 可见草稿 | ✔ `route.ts:19-30`：`canReadAll` 判 super/`article:list`/`article:*`/`*`，否则 `where.status="published"`；测试 `routes-public.test.ts:101-117` 双向覆盖 |
| `articles/route.ts` POST | `article:create`；slug 冲突 400「slug 已存在」 | ✔ `route.ts:133` permission；`route.ts:73-76` 显式查 slug 后 `ApiHttpError(400, "slug 已存在")`；测试 `routes-public.test.ts:140-149` 实测 message 精确匹配 |
| 同上 | P2002/P2003 交由 withApi 全局 ADR-028 | ✔ `src/lib/api-handler.ts:185-187`：`P2002 → conflict 409`、`P2003 → error 400`；`articles/route.ts` 已无本地 `prismaKnownErrorTo400`（grep 无命中） |
| `articles/[id]/route.ts` PUT | `isPrismaConflictCode` 本地分支已删除 | ✔ 全仓 grep `isPrismaConflictCode\|prismaKnownErrorTo400` 仅命中 `execution.md` 历史描述；`[id]/route.ts:119-123` 仅 `console.error` + `throw err`，交全局映射 |
| 同上 | DELETE/PATCH 未被误改 | ✔ `route.ts:128-185` DELETE/PATCH 逻辑完整（鉴权 `article:delete`/`article:publish`、日志、publishedAt 语义均在） |
| `auth/login` | 10 次/分内存限流 +「用户名或密码错误」 | ✔ `route.ts:11-20` `loginAttempts` Map、`>= 10` 触发；`route.ts:35,38` 两次「用户名或密码错误」；测试 `routes-public.test.ts:160-164` 精确断言 message |
| `auth/logout` | `auth:"optional"`，无 session 也 200 | ✔ `route.ts:22`；`route.ts:10-20` 无 session 直接 `success(null,"已退出登录")`；测试 `routes-public.test.ts:166-170` 验证 |
| `auth/me` / `auth/refresh` | `auth:true` | ✔ `me route.ts:9`、`refresh route.ts:13`；测试 `routes-public.test.ts:172-180` 匿名 401 验证 |
| `user-actions/route.ts` | GET 仍 `crudList` 工厂；POST 公开 withApi | ✔ `route.ts:12` `crudList(crudSpecs["user-actions"])`；`route.ts:15-33` POST 无 permission/auth → 公开；测试 `routes-public.test.ts:185-197` 匿名 201 验证 |
| `api/route.ts` | 改用 `success({ok:true},"HDwebsite API")`，无 `NextResponse` | ✔ `route.ts:7`；测试 `routes-public.test.ts:202-206` 断言 `data === {ok:true}` |
| `health/route.ts` | 保持裸 handler（协议例外） | ✔ `route.ts:7-18` 裸 `export async function GET()`，未被本提交改动；测试 `routes-public.test.ts:212-217` status=ok/db=up 验证 |
| `wechat/callback/route.ts` | 保持裸 handler（XML/echostr） | ✔ `route.ts:8,24` 裸 handler，返回 `new Response(echostr)` / `text/xml`；未被本提交改动 |

---

## 五、门禁实测输出摘要（本机实测）

```
$ npx tsc --noEmit                              → exit 0（无输出）
$ npm run lint                                  → ✖ 54 problems (0 errors, 54 warnings)
$ npm test                                      → Test Files 59 passed, Tests 760 passed
$ npm run build                                 → exit 0（○/ƒ 全路由生成完成）
$ npx vitest run src/lib/__tests__/lane-b/routes-public.test.ts
                                                → Tests 14 passed (14)
```

- lint 的 54 个 warning 全部来自既有文件（`src/lib/crud.ts`、`src/lib/jobs/backup.ts`、`src/lib/wechat.ts`、`tests/e2e/*` 等，`no-unused-vars` / `Unused eslint-disable directive`），**B-03 新增/改写文件无告警**。与 `execution.md §门禁实测输出摘要` 记录完全一致。
- `npm test` 尾行：`Test Files  59 passed (59)  Tests  760 passed (760)`。
- `npm run build` 尾行：`○ (Static) / ƒ (Dynamic)` 汇总 + `build_exit=0`。

---

## 六、协议例外清单与 W2-02 白名单

`docs/design/06_validation/evidence/V7/B-03/non-json-routes.md` 包含且仅包含 5 项：`file/[...path]`、`upload`、`wechat/callback`、`health`、`route.ts`（api 根），每项均写明豁免理由与所有权归属（file/upload → D 线；wechat/callback → B 线；health/api 根 → B 线）。与验收 1 实测的 5 个未包装文件**一一对应**。

**W2-02 白名单建议可行性**：可行。建议的 5 条路径 + `src/app/api/llm/providers/route.ts` 全部经 `git ls-files` 实测存在，路径书写使用 `/` 分隔，与 `git ls-files` 输出逐字一致，可直接落 `tests/contract/rules.ts` 的 `NON_JSON_ROUTE_ALLOWLIST`。建议 W2-02 实现时按清单末尾提醒用 `git ls-files` 自校验（避免 Windows 路径大小写/转义不一致误判）。白名单「不得新增、需 ADR」的更新规则已写入清单，约束清晰。

---

## 七、执行证据与事实一致性

`execution.md` 关键声明逐条比对：

- **5W1H / Where**：与真实改动文件 100% 一致（含 health 明确标注「未迁移」）。
- **§四 验收 1**：实测 5 项与清单逐字一致 ✔。
- **§四 验收 2**：实测 grep exit=1，`NextResponse.json` 无命中 ✔。
- **§四 验收 4 门禁**：lint 0 errors/54 warnings、tsc 0、test 59/760、build 0、routes-public 14/14——全部复现 ✔。
- **§三 决策 3（articles PUT P2 闭合）**：`[id]/route.ts` 已无 `isPrismaConflictCode`，`api-handler.ts:185-187` 存在 P2002→409 / P2003→400 全局映射，ADR-028 文档存在（`docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md`）✔。
- **§UNKNOWN**：e2e 未实跑（无 Playwright）、auth me/refresh 401 文案统一、apply 内存限流——三者在 execution.md 均如实登记，未虚报。

无「报告与实际不符」之处。

---

## 八、问题清单

**P1（阻塞/严重）**：无。

**P2（应修）**：无。

**P3（观察/建议，不影响本卡 PASS）**：

1. **auth me/refresh 401 文案统一（已登记观察项）**：`refresh` 原「认证无效或已过期」→ 现 `requireAuth` 默认「未提供认证令牌」（execution.md §三-4）。执行方已 grep 确认前端无文案依赖。建议 W2-05 全量回归时验证前端 401 处理仍正常。
2. **apply 频控与 auth login 限流均为进程内 Map（已登记）**：`apply/route.ts:33-41` 与 `login/route.ts:11-20` 使用内存计数，重启/多实例丢失。属 M1 既有实现、受 REQ-C-003 单机口径约束，非本卡范围；若日后部署多实例需升级为持久化/共享存储。
3. **`articles/[id]/route.ts:119-123` 的 `console.error` + `throw err` 结构**：语义正确（错误交全局 ADR-028 映射），但 `console.error` 与 withApi 全局告警路径有少量重复输出，属风格建议，可留待后续清理。
4. **`api/route.ts` 与 `health/route.ts` 保留 `export const dynamic = "force-dynamic"`**：与 `success()` 信封无冲突，保留正确；仅记录。
5. **W2-02 白名单中的 `src/app/api/llm/providers/route.ts`**：B-03 未改动该文件（所有权属 C 线），non-json-routes.md 已正确标注「由 C 线迁移」。白名单条目是前瞻性登记，需 W2-02 在实现时确认 C 线迁移结果是否一致。

---

## 九、UNKNOWN 与后续卡建议

| 项 | 状态 | 建议归属 |
|---|---|---|
| `npm run test:e2e`（auth / apply-chat）未实跑 | UNKNOWN（本机无 Playwright 工具） | **W2-05 全量回归**统一跑，覆盖 auth 四路由与 apply 端到端 |
| `npm run test:visual` 前台风格门禁 | 未在本卡验证命令内，B-03 未触碰 `src/app/(web)/**`、`src/components/web/**`、`globals.css`，风险极低 | W2-01/W2-05 阶段门禁重跑确认 |
| auth 401 文案统一后的前端行为 | UNKNOWN（前端无文案依赖，静态确认） | W2-05 回归 + 手工验证 401 提示 |
| W2-02 `tests/contract/rules.ts` 白名单落地 | 建议可行（路径已核验） | W2-02 实现，并用 `git ls-files` 自校验 |
| 多实例限流 / 401 文案契约一致性 | 已登记观察项 | 后续部署/契约轮次评估 |

**放行下一卡（B-04）**：建议放行。本卡范围内无未闭合 P1/P2，遗留项均为已登记观察项或移交 W2-02/W2-05。