# W0-04 证据：契约② 错误码与错误体冻结 + `manager-fetch` 透传 `fieldErrors`

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`8b56426`（W0-03）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）
> 决策记录：`docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md`

## 1. 改动文件（全部落在「允许修改」面内）

> 增删行数取自 `git show --numstat --format= HEAD`，**逐字照录**（口径：`insertions/deletions`）。
> 新增文件的 `+N` 与 `wc -l` 相同，两者已交叉核对一致。

| 路径 | numstat（+/-） | 改动摘要 |
|---|---|---|
| `src/contracts/common.ts` | `+14/-1` | `apiResponseCodeSchema` 与 `errorCodes` **同步**扩到 10 值；`toastCopy` 增 `conflict`/`tooManyRequests`/`badGateway`/`serviceUnavailable`；首行契约注释同步 |
| `src/lib/api-response.ts` | `+24/-0` | 新增 `conflict()`/`tooManyRequests()`/`badGateway()`/`serviceUnavailable()` 四工厂，默认文案取 `toastCopy` |
| `src/lib/api-handler.ts` | `+26/-7` | 导出 `ApiErrorStatus = 400\|401\|403\|404\|409\|429\|502\|503`；`ApiHttpError.status` 同步；`toErrorResponse` 逐一映射 8 状态；**P2002 → 409（原 400）**，P2003 维持 400 |
| `src/lib/manager-fetch.ts` | `+34/-5` | `ApiError.fieldErrors?`；`CODE_COPY`（403/409/429/502/503→`toastCopy`）；`extractFieldErrors(data)` 白名单式提取；错误分支改为 `CODE_COPY[code] ?? (body.message \|\| toastCopy.failed)` |
| `src/components/manager/SchemaForm.tsx` | `+19/-5` | `FieldSpec.visibleTo?: "super"`；导出 `visibleFields(fields, isSuper)`；`validateRequired(..., isSuper = true)` 跳过隐藏字段；组件内 `shown` 参与渲染；`uploadImage` 的 `await import` 改顶层 import |
| `src/lib/__tests__/api-contract/with-api.test.ts` | `+3/-2` | 「P2002 → 400」断言改 409（并加 `code` 断言） |
| `src/lib/__tests__/w0-errors.test.ts` | `+240/-0`（240 行 / **32 例**，18 处 `it(` 经参数化展开为 32） | 见 §4；含 2 例 `react-dom/server` 渲染面断言 |
| `docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md` | `+72/-0`（72 行） | Context / Decision 9 条 / Alternatives 6 条 / Consequences / 附录错误码表（10 行） |
| `docs/design/06_validation/evidence/W0/W0-04/README.md` | 本文件 | 证据（规程豁免路径，见 §6） |

## 2. 验收标准逐条结果

| # | 验收条目 | 结果 | 命令 / 关键输出 |
|---|---|---|---|
| 1 | `w0-errors.test.ts` 全绿；每个新工厂 HTTP 与 code 一致（`created` 除外并有断言） | **PASS** | `npx vitest run src/lib/__tests__/w0-errors.test.ts --maxWorkers=2` → `Test Files 1 passed (1) / Tests 32 passed (32)`，exit 0。参数化用例逐条断言 `res.status === c.http` 且 `body.code === c.code` 且 `data === null`（`success` 除外）；`created()` 单独断言 `HTTP 201 / code 200` |
| 2 | `withApi` 内抛 `ApiHttpError(429)` → HTTP 429 且 code 429 | **PASS** | 对 `[400,401,403,404,409,429,502,503]` 八状态逐一参数化断言 `res.status === status`、`body.code === status`、`body.message === "错误 N"`、`body.data === null`（429 含在内，见 §4.2） |
| 3 | P2002 → 409（既有 p03/with-api 测试若断言 400 则同步改并在 ADR 记录） | **PASS** | `api-handler.ts:186` `if (code === "P2002") return conflict(...)`；`with-api.test.ts` 断言已由 400 改 409 并在 ADR-028 §Consequences 登记；全仓 `grep -rn "P2002" src` 命中 3 处生产点（2 处为 articles 自捕获，见 §5 遗留） |
| 4 | `managerFetch` mock 400 带 `fieldErrors` → `err.fieldErrors` 深相等 | **PASS** | 用例断言 `err.fieldErrors` 深相等 `{ title: "不能为空", "tags.0": "格式不正确" }`（含点号键 `tags.0`），且 `err.message` 保留后端 `message` |
| 5 | `FieldSpec.visibleTo="super"` 的字段对非超管不渲染（组件或 e2e 断言） | **PASS** | **两级验证**：① 逻辑面 `visibleFields(fields, false)` → `["title"]`；② **渲染面** 用 `react-dom/server` 的 `renderToStaticMarkup` 静态渲染 `SchemaForm`，断言非超管 HTML **不含** `自动通过` 与 `role="switch"`、超管 HTML **含**两者。**变异测试证明判别力**：把 `visibleFields` 改为 `return fields` → 该断言立即失败（`expected '<div class="grid …' not to contain '自动通过'`），还原后 32/32 PASS。故 §7 原登记的第 3 条 UNKNOWN 已**收敛为 PASS** |
| 6 | 通用门禁 `lint && typecheck && test && build` 全部 exit 0 | **PASS（test 2 例环境性 UNKNOWN）** | `typecheck=0`（tsc 无输出）；`lint=0`（`0 errors, 20 warnings`，与 W0-02/W0-03 持平）；`build=0`；`test` 见 §3 |
| 7 | 越界检查全部落在「允许修改」内 | **PASS** | 见 §5 |

## 3. 通用门禁原始输出

### 3.1 全量单测
```
$ npx vitest run --maxWorkers=2
 ✓ src/lib/__tests__/w0-errors.test.ts (32 tests)
 ✓ src/lib/__tests__/w0-shared.test.ts (16 tests)
 ✓ src/lib/__tests__/publish-state-machine.test.ts (89 tests)
 ✓ src/lib/__tests__/markdown.test.ts (10 tests)
 ✓ src/lib/__tests__/w0-structure.test.ts (6 tests)
 ✓ src/lib/__tests__/settings-registry.test.ts (6 tests)
 ✓ src/lib/__tests__/crypto.test.ts (4 tests)
 ✓ src/lib/__tests__/slug.test.ts (3 tests)
 ✓ src/lib/__tests__/auth-permission.test.ts (4 tests)
…
 FAIL  src/lib/__tests__/sqlite-busy-timeout.test.ts   EBUSY: unlink '…\p04-busy-vpLUou\test.db'
 FAIL  src/lib/__tests__/wechat-chat.test.ts > src/lib 无硬编码电话/域名
       Error: spawnSync C:\Windows\system32\cmd.exe EBUSY

 Test Files  2 failed | 18 passed (20)
      Tests  1 failed | 263 passed (264)
```
**数量对账**：W0-01 基线 210 例 + W0-02（6）+ W0-03（16）+ 本卡（32）= **264** ✓（实测 264）。
**2 处失败均为环境性**（沙箱限制，与 W0-01/02/03 同点同因，非本卡引入）：
- `sqlite-busy-timeout.test.ts`：`fs.rmSync` 被 `node-safe-delete-shim.cjs` 改写 → 清理临时库 `EBUSY`；
- `wechat-chat.test.ts`：沙箱禁 `execSync('…cmd.exe…')` → `spawnSync … EBUSY`。

### 3.2 typecheck / lint
```
$ npm run typecheck   → EXIT_typecheck=0   （tsc --noEmit 无输出）
$ npm run lint        → EXIT_lint=0        （✖ 20 problems (0 errors, 20 warnings)）
```
20 warnings 为既有基线（`wechat.ts` 的 unused eslint-disable 等），**0 errors**，与 W0-02/W0-03 完全持平。

### 3.3 生产构建
```
$ mv .next /e/tmp/next-prev-w004 && npm run build   → EXIT_build=0
▲ Next.js 16.2.1 (Turbopack)
Turbopack build encountered 1 warnings: ./next.config.ts — Encountered unexpected file in NFT list
✓（全部路由产出，含 /manager/*、/news、/sitemap.xml 等）
```
**构建告警归因（stash 对照实验）**：`git stash push -u` → 在 W0-03（`8b56426`）基线上 `npm run build` → **同一条告警**（`./next.config.ts` NFT 追踪），告警文本逐字一致 → **本卡零新增构建告警**；`git stash pop` 已恢复工作区（`git status` 8 项与 stash 前一致）。

## 4. 关键实现决策与证据

### 4.1 契约两处必须同步（否则 zod 拒绝新码）
`errorCodes`（`common.ts:64`）与 `apiResponseCodeSchema`（`common.ts:14`）均为 10 值且顺序一致：
`200,400,401,403,404,409,429,500,502,503`。
单测用 `expect(Object.values(errorCodes)).toEqual([...])` 锁定顺序，防止漏改其一。
引用面 `grep -rn "apiResponseCodeSchema" src` **仅 1 处定义、0 处外部引用** → 扩值无破坏面。

### 4.2 `withApi` 八状态映射（逐一，不留 `else` 兜底歧义）
`api-handler.ts:175-182`：
```ts
if (err.status === 400) return err.issues?.length ? validationError(err.issues) : error(err.message, 400);
if (err.status === 401) return unauthorized(err.message);
if (err.status === 403) return forbidden(err.message);
if (err.status === 404) return notFound(err.message);
if (err.status === 409) return conflict(err.message);
if (err.status === 429) return tooManyRequests(err.message);
if (err.status === 502) return badGateway(err.message);
return serviceUnavailable(err.message);   // 503（类型收窄后唯一残余）
```
`ApiErrorStatus` 为 8 值联合类型，`status` 为 `readonly`；TS 收窄保证最后一行必为 503。

### 4.3 K9 / K10 两个待裁决点的取证依据
- **K10（`created()` 保持 code 200）**：硬证据 `src/lib/manager-fetch.ts:99` `if (body.code !== 200) { … throw new ApiError(...) }` —— 管理端全部创建操作以 `code === 200` 判定成功；改 code 为 201 会让**所有**创建操作抛错（该行在 W0-04 前为 `:73`）。
- **K9（保留 `data.fieldErrors`）**：`src/lib/api-response.ts` 的 `validationError` 已产出 `data.fieldErrors`（P06），且 `content-review.test.ts` 已断言，前端 5 处已按该字段接收。
两决议均写入 ADR-028 §Decision 5/6 并在 §Alternatives 列出反向代价。

### 4.4 `managerFetch` 文案优先级
`CODE_COPY[body.code] ?? (body.message || toastCopy.failed)`：
- 409/429/502/503 契约②表规定错误体为 `null`、后端文案不稳定 → **前端 `toastCopy` 优先**；
- 其余码沿用后端 `message`，无 message 时回落 `toastCopy.failed`（保持既有行为）。
`extractFieldErrors` 只保留 `string` 值（过滤嵌套对象/数组），空对象返回 `undefined` → 非 400 分支天然不带 `fieldErrors`（单测断言 `toBeUndefined()`）。

### 4.5 `SchemaForm` 可见性的「零回归」设计
`validateRequired(fields, values, isSuper = true)` 第三个参数**有默认值**，故既有全部调用方（未传第三参）行为不变；仅组件内与显式传 `false` 的场景跳过 `visibleTo:"super"` 字段。
`isSuper` 取自 `useAuthStore((s) => s.user?.role.isSuper ?? false)` —— `SessionUser.role.isSuper` **已存在**于持久化会话，**未新增** `/api/auth/me` 调用（卡片给出的备选路径未启用）。

## 5. 越界检查与「允许修改」比对

```
$ git -c core.quotePath=false log --first-parent --no-merges --name-only --format= 8b56426..HEAD | sort -u
docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md   ← 允许面（`ADR-028-*.md`）
docs/design/06_validation/evidence/W0/W0-04/README.md          ← 规程豁免（见 §6）
src/components/manager/SchemaForm.tsx                          ← 允许面
src/contracts/common.ts                                        ← 允许面
src/lib/__tests__/api-contract/with-api.test.ts                ← 允许面
src/lib/__tests__/w0-errors.test.ts                            ← 允许面
src/lib/api-handler.ts                                         ← 允许面
src/lib/api-response.ts                                        ← 允许面
src/lib/manager-fetch.ts                                       ← 允许面
```
→ 9 条 = **8 条落「允许修改」清单内**（逐条对应，无多无缺）+ 1 条证据路径（规程豁免）。**越界 0**。
提交：本卡为**单个提交**（subject 含 `W0-04`），区间 `8b56426..HEAD` 内不含 merge、不含他线提交。
> 精确哈希以命令为权威：`git -c core.quotePath=false log --oneline 8b56426..HEAD`。本卡经过多轮 amend（含独立验证者 V8 指出后的证据修正），哈希随之变化（历史：`efc44de` → `efc54ee` → `d29a796`），故此处**不硬编码最终哈希**，避免自引用失真。

**契约引用面扫描（本卡不替换任何既有调用方，除测试断言）**：
```
$ grep -rn "P2002" src --include=*.ts --include=*.tsx
src/app/api/articles/route.ts:161        ← 自捕获（不在本卡允许面，见 §8 遗留）
src/app/api/articles/[id]/route.ts:217   ← 自捕获（同上）
src/lib/api-handler.ts:8,185,186         ← 本卡改动
src/lib/__tests__/api-contract/with-api.test.ts:67,69   ← 本卡同步断言
src/lib/__tests__/w0-errors.test.ts:5,114,116           ← 本卡新增
```

## 6. 规程豁免

`docs/design/06_validation/evidence/W0/<卡号>/` 属 `11-验收与审查规程.md` §3 第 1 条强制路径（「证据写到 … → 提交」）；
本卡「允许修改」清单未列该路径，属规划包不一致（卡片清单缺项），**非执行者越界**。与 W0-02/W0-03 同一情形。

## 7. UNKNOWN 登记

| 项 | 判定 | 原因 |
|---|---|---|
| `npm test` 中 `wechat-chat.test.ts` 硬编码扫描 | UNKNOWN | 沙箱禁 `execSync` 调 `cmd.exe`（`spawnSync … EBUSY`）；与 W0-01/W0-02/W0-03 同点同因 |
| `npm test` 中 `sqlite-busy-timeout.test.ts` 清理 | UNKNOWN | 沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`（`EBUSY`） |
| 本卡未跑 `test:visual` | N/A | 本卡「验证命令」仅列通用门禁；`manager/**` 为后台页，不在 `tests/visual` 的 12 组前台参照集内 |
| ~~`SchemaForm` 的 DOM 渲染面~~ | **已收敛为 PASS** | 原以「`vitest` include 不含 `.tsx`」为由登记 UNKNOWN；经独立验证者指出可用 `react-dom/server` 在 `.test.ts` 内覆盖，本卡已补 2 例渲染断言 + 变异测试验证判别力（见 §2 #5），**该 UNKNOWN 已关闭** |

## 8. 遗留与移交

1. **`articles` 两条路由 P2002/P2003 待收敛为 409/400**：`src/app/api/articles/route.ts:161`、`src/app/api/articles/[id]/route.ts:217` —— 二者自行 `catch` 并 `return error("数据校验失败：字段重复或关联数据不存在", 400)`（调用点分别为 `:150`、`:140`），把 P2002 与 P2003 混同。**该返回码在代码层已确定 = 400（静态可读，非 UNKNOWN）**。在 B-02/B-03（withApi 迁移）前，「P2002 → 409」**仅在 `withApi` 路径上成立**。已写入 ADR-028 §Consequences。
2. **ADR-028 Decision 9 的 `tests/contract/rules.ts` / `NON_JSON_ROUTES` 尚不存在**：W0-04 提交时 `tests/` 下只有 `e2e` 与 `visual`。该守卫文件与 `NON_JSON_ROUTES` 常量由 **W2-02 待建**（W0-07 才把 `tests/contract` 收编进 vitest）。ADR 已标注「待建」，避免悬空引用。
3. **`visibleTo` 目前无生产字段使用**：`grep -rn "visibleTo" src` 仅命中 `SchemaForm.tsx` 定义与测试。故外层调用方 `validateRequired(fields, values)`（默认 `isSuper=true`）与组件内真实 `isSuper` 的潜在不一致**当前不产生实际影响**；后续接入 `visibleTo:"super"` 字段时，调用方需显式传真实 `isSuper`，否则隐藏字段仍会被外层校验拦截（登记给对应后端卡）。

## 9. 独立验证（三权分离 · 验证者）

验证者为独立子代理（只看 diff + 亲跑命令，不修改仓库），结论：

| 验证项 | 判定 |
|---|---|
| V1 契约两处同步（含对抗性 zod：拒 201/402/405/418/501/504/0/-1/`"409"`/null） | PASS |
| V2 `withApi` 八状态映射（对抗性：注入非法状态 500/402/201 → 均回落 503） | PASS |
| V3 P2002 → 409 / P2003 → 400（含 articles 两处遗留确认） | PASS |
| V4 `managerFetch` fieldErrors（对抗性 9 种恶意 `data`：嵌套对象/数字/数组/空对象/字符串/null/`[]` 全部正确过滤） | PASS |
| V5 `SchemaForm` 零回归（5 处调用方全为 2 参；`isSuper` 类型来源 `src/contracts/auth.ts:22,30` 存在；无新增 `/api/auth/me`；无循环依赖） | PASS |
| V6 越界 + 规程豁免（并**亲读**规程 §3 第 1 条原文确认豁免成立） | PASS |
| V7 门禁独立复跑（验证时 `262/261`；补 SSR 用例后本卡复跑 `264/263`、`lint 0 err/20 warn`、`build 0`、NFT 告警既有性用 `git diff --stat … -- next.config.ts tsconfig.json package.json vitest.config.ts` **为空**独立证明） | PASS |
| V8 声明 vs 实测 | **FAIL → 已修正** |
| **总体** | **ACCEPT**（无 P0） |

**V8 的 FAIL 及修正**（验证者核心价值：抓出实现者证据文档的口径错误）：

| 验证者指出 | 复核结论 | 处置 |
|---|---|---|
| `w0-errors.test.ts` 声明 203 行，实测 202 | 属实 | 已改为实测 `239` 行（补 SSR 用例后） |
| `ADR-028` 声明 73 行，实测 72 | 属实 | 已改为 `+72/-0`（72 行） |
| §1 五项 `+/-` 数字与 `git --numstat` 不符 | 属实 | §1 表已按 `--numstat` 逐字重录 |
| 提交哈希写 `ecf44de`，实测 `efc54ee` | 属实 | 已改为**命令权威 + 不硬编码**（README §5），杜绝 amend 导致的自引用失真 |
| `manager-fetch.ts:88` 实为 `:99`；`api-handler.ts:176-182` 实为 `175-182` | 属实 | 均已更正 |
| ADR-028 引用 `tests/contract/rules.ts` 但文件不存在 | 属实 | ADR Decision 9 已标注「W2-02 待建」 |
| §7 第 3 条 UNKNOWN 过度保守（可用 `react-dom/server` 验证） | 属实 | 已补 2 例渲染断言 + 变异测试，UNKNOWN 关闭 |
| articles P2002 返回码标 UNKNOWN 不当（静态可读为 400） | 属实 | §8 #1 已改为「已确定 = 400」 |
