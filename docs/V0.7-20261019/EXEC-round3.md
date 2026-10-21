# V0.7 执行记录 · 第 3 轮（2026-10-21）

> 分支 `upgrade` 单主线（未新建分支）。本轮收尾 **W2-02 全路由契约测试自动发现**：从 `148 failed / 717 passed` 修复到 **865/865 全绿**，并消除用例间顺序依赖。
> 本轮**未修改任何业务代码**（`src/app/api/**`、`src/contracts/**`、`prisma/**` 零改动），改动全部落在 W2-02 允许路径内。

## 0. 开工前双端核对

| 项 | 结果 |
|---|---|
| `git fetch origin upgrade` | 成功 |
| `git rev-list --left-right --count origin/upgrade...HEAD` | `0  63`（本地领先 63，落后 0） |
| `origin/upgrade` HEAD | `61d546e` |
| 本地 HEAD | `e57fa1f` |

结论：本地包含远端全部提交，无分叉冲突，可直接 ff 推送。

## 1. 失败基线（修复前，真实执行）

```
npx vitest run tests/contract/routes.test.ts
→ Test Files 1 failed (1) | Tests 148 failed | 717 passed (865) | exit=1
```

## 2. 根因分类（每条均有日志证据）

| # | 根因 | 证据 |
|---|---|---|
| R1 | **403 级联（主因，约 90 例）**：401 与 ok 用例调 `resolveParams(route)` 时未传 `rule.params`，`/roles/:id` 的 PUT 打到 id=1（`createActor` 建的超管角色）。zod4 `.partial()` 仍重放 `isSuper` 的 `default(false)`，超管被降级 → 之后所有依赖 `isSuper` 的鉴权全部 403 | 日志 60+ 条 `权限不足：需要 xxx`；`PUT /roles/:id` 用例后 `/users`、`/llm/*`、`/wechat/*` 集体 403 |
| R2 | **夹具缺行/外键悬空（约 35 例）**：course 要 course 型分类、major/partner/pageTemplate/contentBlock/publishJob/knowledgeBase/chat-history 无数据 | `关联数据不存在`、`课程不存在`、`发布任务不存在` |
| R3 | **mockBody 生成语义错值（约 6 例）**：`students.phone` 取成 `"active"`、`navigations.parentId` 自引用、唯一键撞值 | `409 …已存在（唯一字段冲突）` |
| R4 | **规则与路由语义不符（5 例）**：`GET /settings` 实为 `auth:"optional"`；`POST /settings/email/test` 不解析 body；`POST /apply` 实返 201；`POST /user-actions` 必填字段漏填；`content-items/review` 字段名是 `decision` 不是 `action` | `expected 200 to be 401`、`expected 200 to be 400`、`expected 201 to be 200` |
| R5 | **用例互相污染（约 4 例）**：DELETE ok 用例真删被其他用例引用的行（顺序相关） | `expected 404 to be 201` |
| R6 | **覆盖率缺口（2 例）**：`/media/:id` 的 PATCH 有实现有 inventory、无规则 | `expected [ { route: '/media/:id' } ] to deeply equal []`、`220 ≠ 221` |

## 3. 修复方案与改动文件

| 文件 | 类型 | 要点 |
|---|---|---|
| `tests/contract/fixtures.ts` | 新增 | 按「用途」分配**互不重叠的显式 id**：1..被引用行、901 GET、902 PUT、903 DELETE、904/905 动作端点；知识库写入真实磁盘文件（export 需真实文件才打包） |
| `tests/contract/rules.ts` | 重写 | ① 显式 id 分槽贯穿全部场景；② `mockUpdateBody` 跳过「有默认值」字段（防 `isSuper→false` 类重放）并生成**全局唯一**字符串（防唯一键 409）；③ 修正 settings/apply/user-actions/review/media 语义；④ 补 `/media/:id` PATCH |
| `tests/contract/routes.test.ts` | 重写 | ① `rule.params` 贯穿 401/403/400/ok 四场景；② 强制 `DATA_DIR` 指向临时目录（防污染仓库 `data/kb/`）；③ mock 全部出网模块；④ `:id` 路由的 400 统一用非法 id 触发 `parseId` |
| `src/lib/__tests__/api-contract/zz-mock.test.ts` | 修改 | `any` → `unknown`，消除 3 个 lint error |

### 3.1 关键设计：显式 id 分槽

```text
901 = GET 目标   902 = PUT 目标   903 = DELETE 目标   904/905 = 动作端点
```
一次性行与「被其他用例引用的稳定行」物理隔离，任一用例的写删都不会影响他人。实测：**打乱顺序跑同样 865/865 通过**。

### 3.2 出网隔离（结构隔离，非数据巧合）

| 模块 | 处理 |
|---|---|
| `@/lib/collect-engine` | `runSource` → 空统计 |
| `@/lib/collect-test` | `fetchTextOnce`/`testParseSource` → 空 |
| `@/lib/wechat` | `testAccount` → mock 成功 |
| `@/lib/publish-executor` | `executePublishJob` → `"published"` |
| `@/lib/llm/registry` | `getAdapter().chat` → `{reply:"ok"}` |
| `@/lib/notify-gateway` | `notifyEvent` → no-op |
| `@/lib/kb-adapter` | `searchViaCoze` → 未配置（原先只靠「夹具没有 coze 供应商」的数据巧合不出网，现改为结构隔离） |
| `@/lib/kb/manage` | `rebuildBase` → 返回 mock jobId（原先会起真实后台任务） |
| `@/lib/cache-tags` | `invalidateWebContent` → no-op |

## 4. 验收结果

| 验收项 | 命令 | 结果 |
|---|---|---|
| 契约测试（默认顺序） | `npx vitest run tests/contract/routes.test.ts` | **865 passed / 0 failed**，exit=0 |
| 契约测试（**打乱顺序 ×3**） | 加 `--sequence.shuffle`，连续 3 次 | **865 passed / 0 failed**，exit=0（3/3） |
| 契约目录全量 | `npx vitest run tests/contract` | **874 passed / 10 files**，exit=0 |
| 全量单测 | `npm test` | **1697 passed / 76 files**，exit=0 |
| 类型检查 | `npx tsc --noEmit` | exit=0 |
| Lint | `npx eslint` | **0 error**（68 warning，均为既有未使用变量类） |
| 构建 | `npm run build` | exit=0 |
| 覆盖率守卫 | 内置断言 | inventory 全部方法 100% 有规则，skip=2（≤5，均带理由） |
| 落盘隔离 | `find data uploads -mmin -30` | 无新增文件（测试写入已隔离到临时 DATA_DIR） |

### 4.1 顺序无关性：一轮真实的失败与修复（R7）

首轮"顺序无关"自测通过后，独立审查者用 `--sequence.shuffle` 复跑，**稳定复现 2 条失败**：

```
× /knowledge/:id  GET    → expected 404 to be 200
× /knowledge/:id  DELETE → expected 404 to be 200
```

- **根因（跨表级联，按路由分槽解决不了）**：`/knowledge/:id` 的夹具行挂在 `fileId=901/903` 上，而下列路由会
  `knowledge.deleteMany({ where: { fileId } })`：
  - `POST /knowledge-files/901/reparse`（`src/lib/kb/ingest.ts:137-172`，删光 fileId=901 后重建）
  - `DELETE /knowledge-files/903`（`src/lib/kb/ingest.ts:174-186` `deleteFileCascade`）
  - `PUT /knowledge-bases/904/rebuild`（`src/lib/kb/manage.ts:372-394` → `rebuildFile` 同样 deleteMany）
  固定顺序下这些路由排在后面，所以失败被掩盖；打乱后先跑即 404。
- **修复**：`/knowledge/:id` 改用 **fileId=null** 的 906/907/908 三行（不被任何文件槽引用，任何级联都碰不到）；
  901 专供 reparse、902 专供切片编辑、903 专供文件删除的级联验证。
- **验证**：`--sequence.shuffle` 连续 3 次全部 865/865 通过。

> 这条是本轮唯一一次「先自测通过、被独立审查推翻、再真正修好」的过程，也是这次修复最有价值的部分：
> 如果把「固定顺序通过」当成「顺序无关」，就会把一个随机失败留进 CI。

### 4.2 skip 台账（共 2 条）

| 路由 | 理由 |
|---|---|
| `POST /chat/stream` | SSE 流式响应，非 JSON 信封，需单独测 |
| `PUT /publish-jobs/:id` | **业务缺陷 F-01**（见 §5），本卡禁止越界修业务代码 |

## 5. 发现并登记的真实业务缺陷

### F-01：`PUT /api/publish-jobs/:id` 恒 500

- **现象**：该端点任何合法请求都返回 `500 {"message":"更新发布任务失败"}`。
- **根因**：`src/lib/crud.ts:157` 执行 `spec.createSchema!.partial()`，而 zod4 对「含 refine 的 object schema」调用 `.partial()` 直接抛
  `Error: .partial() cannot be used on object schemas containing refinements`；
  `publishJobCreateSchema`（`src/contracts/resources.ts`）恰好带两条 `refine`（channels/channel 二选一、scheduledAt 必须晚于现在）。
- **证据**：`[api-error] PUT publishJob/PUT:id Error: .partial() cannot be used on object schemas containing refinements at Module.partial (zod/v4/core/util.js:503)`
- **归属**：修复需改 `src/lib/crud.ts` 或为 publish-jobs 补 `updateSchema`，均属 B 线 / 冻结契约面所有权，**W2-02 明确禁止越界**。
- **处置**：规则标 `skip` + 写明理由；本缺陷在上线前会使「发布任务编辑」功能完全不可用，**建议 B 线开卡修复**。

## 6. 未达成项与风险（如实登记）

| # | 项 | 状态 | 说明 |
|---|---|---|---|
| 1 | `node scripts/check-root.mjs` | **FAIL（既有问题，非本轮引入）** | 根目录有 19 条不在白名单：`w*.out`（16 个，上一轮调试重定向输出）、`IDENTITY.md`、`USER.md`、`.openclaw`。这些均非本轮产生，且按「存疑文件不删」纪律未删除；提交时只 `git add` 本轮文件，不带入这些产物 |
| 2 | 契约目录含调试残留 | 部分达成 | `tests/contract/zz-dbg*.test.ts`、`zz-probe.test.ts` 仍被 vitest include 命中（使 `tests/contract` 从 865 变 874）。未删除（存疑文件纪律），但**不应提交**，已排除在提交范围外 |
| 3 | 400 场景强度 | 已加强 | 原约四成路由只断言「非 500」；本轮改为：`bad` 优先，其次凡含 `:id` 一律用非法 id 触发 `parseId` 真 400。仍保留「非 500」的仅 `:id` 之外且无 `bad` 的少数端点（如 `/auth/me`、`/manager-menus`、`/home-blocks/registry`）——这些端点实现上不存在 400 路径，属契约事实 |
| 4 | `publish-jobs` PUT 零覆盖 | 已知缺口 | 见 F-01 |
| 5 | 真实微信/Coze/SMTP 联调 | UNKNOWN | 凭证缺失，按 AGENTS.md §2 用 mock 测试，真实联调仍标 UNKNOWN |

## 7. 结论

- W2-02 卡定义的核心验收（`npx vitest run tests/contract` 通过、覆盖率 100%、skip ≤5 且带理由、通用门禁四项 exit 0）**全部达成**。
- 修复过程**未使用任何放宽断言来掩盖失败**：148 个失败中 147 个是测试侧缺陷（已被正确修复），1 个是真实业务缺陷（F-01，已登记并移交归属线，没有靠 skip 假装通过）。
- 顺序无关性已实测（shuffle 通过），这是本轮相对上一轮最实质的改进。

## 8. 补记（外部执行方，2026-10-21 22:10）：64 提交离盘备份 + W2 证据核查

本节由外部执行方追加，只记录可复现的事实，不补造任何证据文件。

### 8.1 W2 系列在 evidence 目录下没有任何证据

```
$ ls docs/V0.7-20261019/evidence | grep -i "w2"
（无输出）
$ ls docs/V0.7-20261019/ | grep -i "w2"
（无输出）
```

结论：W2-06 / W2-07 / W2-08 的「未开工」不只是卡没做，而是**证据从未落盘、卡文件也不在该目录**。本执行方据此不写任何 W2 证据，只登记事实。

### 8.2 64 个提交的离盘备份（E: 盘以外）

远端 `origin/upgrade` = `61d546e`，本地 `upgrade` = `8d79fa8`，`git rev-list --left-right --count origin/upgrade...HEAD` → `0  64`。推送因权限被拒（`Permission to CodingHeader/HDwebsite.git denied to nevermeetagain` / `error: 403`），改用 bundle 备份。

存放位置：`C:\Users\EDY\backups\HDwebsite\`（C 盘，与仓库所在的 E 盘不同物理盘）

**① 增量 bundle（按指令命令生成）**

```
$ git bundle create .../HDwebsite-upgrade-8d79fa8.bundle origin/upgrade..HEAD
$ git bundle verify .../HDwebsite-upgrade-8d79fa8.bundle
... is okay
The bundle contains this ref: 8d79fa82d9dd7b2b878b663b1a5be9b255163a18 HEAD
The bundle requires this ref: 61d546ec8775c9d0b6ecc5a5e4d1d0cc178f1568
大小 477,287 bytes
sha256 9dfec82545a4e15d9e57703b92b39a545ca0fa3762ed39b943ced2fcd38c1acc
```

**② 自包含全量 bundle（额外补做，避免恢复时依赖 GitHub 仍在）**

```
$ git bundle create .../HDwebsite-upgrade-8d79fa8-full.bundle --all
$ git bundle verify .../HDwebsite-upgrade-8d79fa8-full.bundle
... is okay
The bundle contains these 8 refs（含 refs/heads/upgrade = 8d79fa8、refs/heads/main = 94dbbbb）
大小 193,630,099 bytes
sha256 059ec1d7369007f291a47da36d863425fcd76763859e935f7d460fa7624543ff
```

**③ 可恢复性实测（从 bundle 克隆，验证完即删）**

```
$ git clone --branch upgrade <full.bundle> <临时目录>
HEAD=8d79fa82d9dd7b2b878b663b1a5be9b255163a18
count=198
8d79fa8 可达
```

### 8.3 根目录现状与一处口径偏差

- 16 个 `w*.out` 已不在仓库根目录（`ls -1 w*.out` 无输出、`git ls-files "w*.out"` 为 0）。**不是本执行方删除的**，删除者与时间未知。
- `.openclaw` / `IDENTITY.md` / `USER.md` 仍在根目录，但已被写入 `scripts/check-root.mjs` 的 `WHITELIST`（工作区改动 `+5` 行，未提交）。这与「不删、不加 WHITELIST、等用户认领」的口径不一致，本执行方未改该文件、也未回退他人改动，仅登记待认领。
- 当前 `node scripts/check-root.mjs` 只剩 1 条违规：`.eslint.config.mjs.artifact.json`（本轮新出现的构建产物）。

