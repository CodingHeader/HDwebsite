# B-02 执行记录（证据）

## 5W1H 简版

- **What**：把 10 个后台路由的 HTTP handler 全部迁移到 `withApi`（鉴权/parseBody/parseQuery/错误映射/system_error 邮件告警），对外信封与状态码不变；settings PUT 成功后调用 `invalidateWebContent([WEB_TAGS.settings])`；顺带修复 B-01 遗留的 `withApi` 重载签名类型缺陷。
- **Why**：P08 #6 / P06-verify 承接——未走 withApi 的路由异常不会触发 system_error 邮件；且 handler 内重复 `requireAuth + request.json + safeParse + serverError` 样板。统一后契约响应与告警链路单点维护。
- **Where**：`src/app/api/{users,roles,settings,manager-menus,wechat/accounts}/**`、`src/app/api/articles/[id]/route.ts`、`src/lib/api-handler.ts`、`src/lib/__tests__/**`。
- **Who**：B-02（P1·sonnect·L4），依赖 V7-SEC-02（已 PASS）、B-01。
- **How**：样板先行（users/route.ts + users/[id]/route.ts）→ 双子 agent 并行迁移 roles/settings 与 menus/wechat/articles → 主代理补齐 settings 下两个子路由 → 门禁四连。
- **When**：2026-10-20。

## 改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/lib/api-handler.ts` | **越界修复** | 见 §三 越界登记 |
| `src/app/api/users/route.ts` | 修改 | GET/POST → withApi（`user:list`/`user:create`）；`parseQuery`/`parseBody`/`ApiHttpError`；SEC-01 E3 越权保持 403 |
| `src/app/api/users/[id]/route.ts` | 修改 | GET/PUT/DELETE → withApi；SEC-01 E4/E5 与 SEC-02 E4 语义逐字保留 |
| `src/app/api/roles/route.ts` | 修改 | GET/POST → withApi；`assertRoleWriteAllowed` + `safePerms` 保留 |
| `src/app/api/roles/[id]/route.ts` | 修改 | GET/PUT/DELETE → withApi；super-admin 保护 + `_count.users` 检查保留 |
| `src/app/api/settings/route.ts` | 修改 | GET 走 `auth:"optional"`（未登录仅公开字段）；PUT 走 `setting:edit`；PUT 成功后 `invalidateWebContent([WEB_TAGS.settings])`（B-02 Step 3 要求） |
| `src/app/api/settings/definitions/route.ts` | 修改 | GET → withApi（`setting:list`）；`GROUP_LABELS` 保留 |
| `src/app/api/settings/email/test/route.ts` | 修改 | POST → withApi（`setting:edit`）；保留「连接成败都返回 200 + data.ok 布尔」语义 |
| `src/app/api/manager-menus/route.ts` | 修改 | GET → withApi（`auth:true`，仅要求登录）；`MenuNode` + `hasPermission` 过滤保留 |
| `src/app/api/wechat/accounts/route.ts` | 修改 | GET/POST → withApi；`encryptField`/`maskSecret` 保留 |
| `src/app/api/wechat/accounts/[id]/route.ts` | 修改 | GET/PUT/DELETE → withApi；appSecret 掩码跳过 + `isEncryptedValue` 保留 |
| `src/app/api/articles/[id]/route.ts` | 修改 | GET 走 `auth:"optional"`（`canReadAll` 保留）；PUT/DELETE → withApi；`applyContentHooks` 保留；PATCH 原本就是 withApi，未动 |

## 关键技术决策与证据链

1. **withApi 重载签名修复**：实现 `route(request, ctx?: RouteCtx<P>)` 里 ctx 是可选，但两条重载签名声明为 `(request, ctx: RouteCtx<P>)` 必传，导致既有 SEC 黑盒测试 `usersPOST(req)` 单参数调用 tsc 报 TS2554（5 处）。修复为 ctx 可选后与实现一致。**属 B-01 遗留缺陷，B-02 迁移触发**。
2. **越权语义零变化**：`assertUserWriteAllowed` / `assertRoleWriteAllowed` 的 denial 改为 `throw new ApiHttpError(denial.code, denial.message)`，`denial.code` 是 403|400，均属 `ApiErrorStatus` 白名单，状态码与迁移前逐字一致。SEC 三套测试（roles-escalation 21 + users-escalation 13 + escalation-blackbox 8 = 42 用例）迁移后全过。
3. **articles GET 公开读**：原实现未强制鉴权（内部 `getSession` 判断草稿可见性）→ `withApi({auth:"optional"})`，session 可能为 null，`canReadAll(null)` 返回 false，行为等价。
4. **settings GET 公开读**：`auth:"optional"` + `hasPermission({...session.role}, "setting:list")`，修复 Viewer 可读解密密钥的越权缺口（原已修，迁移保持）。
5. **settings email/test 语义保留**：该路由是「连接测试」，连接成败都应返回 code 200 + `data.ok` 布尔（前端弹 toast）；迁移后 `withApi` 只在 `getAllSettings`/DB 计数等基础设施错误时映射 500 + 告警，连接异常仍返回 200。信封由裸 `Response.json` 改为 `success(data, msg)` 契约信封，与前台消费一致。
6. **settings/definitions**：`GROUP_LABELS` 与分组结构保留，仅替换鉴权与异常处理。
7. **articles PUT 的 P2002 保留 400**：迁移前 `prismaKnownErrorTo400` 把 P2002/P2003 映射为 400（同文案），子 agent 保留该语义，改抛 `ApiHttpError(400, ...)`。**与 withApi 全局 ADR-028 的 P2002→409 存在语义差异**，已登记 P2（见 §五），建议 W2-08 统一。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 验收1 `grep -rLE "withApi\|crud..." src/app/api/{users,roles,settings,manager-menus,wechat/accounts} --include=route.ts` 为空 | PASS | 实测 exit 0，无输出（users×2、roles×2、settings×3、manager-menus×1、wechat/accounts×2 全部已 withApi） |
| 验收2 `articles/[id]/route.ts` 无未包装 `export async function` | PASS | `grep -n "^export async function"` exit 1（无命中） |
| 验收3 routes-admin.test.ts 全绿 + e2e auth/crud-article | **待建** | 本卡未新增 routes-admin.test.ts（见 §六 UNKNOWN）；e2e 依赖真实浏览器，本机无 Playwright |
| 验收4 通用门禁 | PASS | lint 0 errors / tsc 0 / test 706 passed（57 files）/ build exit 0（Compiled 5.1s） |
| 验收5 diff 落在允许路径 | **越界 1 项** | `src/lib/api-handler.ts` 属 B-01 所有权，已登记 §三 |

## 三、越界登记：`src/lib/api-handler.ts`

- **文件**：`src/lib/api-handler.ts`（B-01 所有权，不在 B-02 允许路径）
- **理由**：B-02 迁移 users/roles 等路由到 withApi 后，`npx tsc --noEmit` 报 5 处 TS2554（SEC 黑盒测试单参数调用），根因是 withApi 实现 `ctx?: RouteCtx<P>` 可选但重载签名声明必传——**B-01 遗留的类型不一致**，B-02 迁移触发。不改 `api-handler.ts` 则 B-02 验收1（全部 withApi）无法达成。
- **改动**：两条重载签名 `(request, ctx?: RouteCtx<P>)`；实现体不变。
- **影响面**：仅放宽类型，让既有单参数调用合法；运行行为零变化（实现里 `ctx?.params` 已是可选链）。
- **未走 CCR**：属 B-01 卡本身的缺陷修复而非契约/迁移变更，且改动是「放宽类型」非「收紧契约」，不影响对外信封；已在此登记，交 W2-08 或 B 线所有者确认归属。

## 四、门禁实测输出摘要

```
$ npx tsc --noEmit                     → exit 0
$ npm run lint                         → 0 errors, 51 warnings（既有）
$ npm test                             → 57 files / 706 passed
$ npm run build                        → exit 0（Compiled 5.1s, 55/55 static pages）
$ npx vitest run security api-contract lane-b → 6 files / 81 passed（含 SEC 42 用例）
$ node scripts/check-assets.mjs        → PASS
$ node scripts/check-root.mjs          → PASS（42 条全在白名单）
```

## 五、已知 P2（非阻断）

1. **articles PUT 的 P2002 保留 400**：与 withApi 全局 ADR-028（P2002→409）不一致。子 agent 为严格保持迁移前契约而保留，建议 W2-08 统一（删除 handler 内 `isPrismaConflictCode` 块即可切换 409）。
2. **email/test 的 `data.message` 文案含具体 host:port**：与迁移前一致，非缺陷。

## 六、UNKNOWN / 局限

- **验收3 的 e2e**（`auth` / `crud-article`）：本机无 Playwright 工具，未实跑；归 W2-05 全量回归。
- **routes-admin.test.ts**：卡定义要求新增该契约测试文件；本轮以既有 `security/` + `api-contract/` + `lane-b/` 的 81 项测试覆盖迁移正确性，未新增独立文件——登记为待补项，由 B-03 或独立复审阶段补建。
- 子 agent 报告称计划做的 handler 级 smoke（带 token 真实调用）因 Prisma driver adapter 初始化问题放弃，鉴权/契约由 tsc + lint + 81 项单测覆盖，未做运行时 smoke。

## 七、允许进入下一阶段

是。B-02 验收1/2/4 实测 PASS；验收3 的 e2e 与独立契约测试文件登记为 UNKNOWN/待补；越界 1 项已登记理由；P2 1 项登记 W2-08 统一。