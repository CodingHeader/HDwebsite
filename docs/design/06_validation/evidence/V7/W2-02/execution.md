# W2-02 执行证据：全路由契约测试自动发现

> 卡定义：`docs/V0.7-20261019/tasks/W2-02.md`
> 分支：`upgrade`（单主线，未新建分支）
> 执行日期：2026-10-21
> 执行记录：`docs/V0.7-20261019/EXEC-round3.md`

## 1. 一句话结论

契约测试从 **148 failed / 717 passed（865）** 修复到 **865/865 全绿**；并额外做到 **打乱顺序同样全绿**（证明用例间无状态泄漏）；全部改动落在 W2-02 允许路径内，业务代码零改动。

## 2. 交付物

| 文件 | 说明 |
|---|---|
| `tests/contract/fixtures.ts` | 新增。显式 id 分槽夹具（1..稳定行 / 901 GET / 902 PUT / 903 DELETE / 904-905 动作端点） |
| `tests/contract/rules.ts` | 重写。规则表：显式 id 贯穿、`mockUpdateBody` 防默认值重放 + 唯一值、语义修正、补 `/media/:id` |
| `tests/contract/routes.test.ts` | 重写。`rule.params` 贯穿四场景、DATA_DIR 临时隔离、出网模块全 mock、`:id` 的 400 用非法 id |
| `tests/contract/route-handlers.gen.ts` | 既有生成物（本轮未改，首次入库） |
| `tests/contract/route-inventory.json` | 既有生成物（本轮未改，首次入库） |
| `src/lib/__tests__/api-contract/gen-route-inventory.mjs` | 既有生成脚本（首次入库） |
| `src/lib/__tests__/api-contract/zz-mock.test.ts` | `any` → `unknown`，消除 3 个 lint error |

## 3. 命令与输出摘要（一周后可复现）

### 3.1 修复前基线

```bash
npx vitest run tests/contract/routes.test.ts
# Test Files  1 failed (1)
#      Tests  148 failed | 717 passed (865)
# exit=1
```

### 3.2 修复后

```bash
npx vitest run tests/contract/routes.test.ts
# Test Files  1 passed (1)
#      Tests  865 passed (865)
#   Duration  6.61s
# exit=0
```

```bash
npx vitest run tests/contract/routes.test.ts --sequence.shuffle
# Test Files  1 passed (1)
#      Tests  865 passed (865)
#   Duration  8.17s
# exit=0
```

```bash
npx vitest run tests/contract
# Test Files  10 passed (10)
#      Tests  874 passed (874)
# exit=0
```

> 874 = 865（routes.test.ts）+ 9（既有调试探针 `zz-dbg*.test.ts` / `zz-probe.test.ts`，属既有本地文件，不随本卡入库）。

### 3.3 通用门禁

```bash
npx tsc --noEmit          # exit=0
npx eslint                # exit=0，0 error（68 warning，均为既有 unused-vars 类）
npm test                  # Test Files 76 passed (76) | Tests 1697 passed (1697) | exit=0
npm run build             # exit=0
```

## 4. 根因 → 修复 对照

| 根因 | 修复位置 | 验证方式 |
|---|---|---|
| 401/ok 用例未传 `rule.params`，`/roles/:id` PUT 降级超管 → 60+ 例 403 级联 | `routes.test.ts` `resolveParams(route, rule.params)` 全场景使用 | 403 用例由 60+ 降为 0 |
| 夹具缺行 / 外键悬空 | `fixtures.ts` 补齐 category(course 型)/major/partner/course/offering/student/campus/image/gallery/banner/homeCard/hotMajor/serviceGuide/navigation/template/block/element/media/article/log/chat/recipient/template/rule/wechatAccount/llmProvider/kb/file/chunk/contentItem/publishJob/collect*/chatScene/role/user/setting | `关联数据不存在` 类错误归零 |
| `mockBody` 语义错值（phone="active"、parentId 自引用、唯一键撞值） | `rules.ts` `mockUpdateBody`：跳过带默认值字段；字符串用 `w202-uN` 唯一值 | `409 唯一字段冲突` 归零 |
| 规则与路由实现不符 | `rules.ts`：`GET /settings` 去 permission（`auth:"optional"` 事实）、`/settings/email/test` 去 bad（不解析 body）、`/apply` okStatus 200→201、`/user-actions` 补 `actionType/actionTarget/sessionId`、`content-items/review` 用 `decision`、`llm/usage` 补 `from/to` | 对应用例由失败转通过 |
| DELETE/PUT ok 用例真删真改被引用行 | `fixtures.ts` 显式 id 分槽 + `rules.ts` ROW.get/put/del/extra 分配 | `--sequence.shuffle` 865/865 |
| `/media/:id` PATCH 无规则 | `rules.ts` 补 `media/:id` 的 GET/PATCH/DELETE | 覆盖率守卫 221=221 |

## 5. 出网隔离清单（结构隔离，不依赖「夹具恰好没数据」）

| 模块 | 替换行为 |
|---|---|
| `@/lib/collect-engine` | `runSource` → `{newCount:0,skipCount:0,fetched:0,failed:0}` |
| `@/lib/collect-test` | `fetchTextOnce`/`testParseSource` → 空 |
| `@/lib/wechat` | `testAccount` → `{ok:true}` |
| `@/lib/publish-executor` | `executePublishJob` → `"published"` |
| `@/lib/llm/registry` | `getAdapter().chat` → `{reply:"ok"}` |
| `@/lib/notify-gateway` | `notifyEvent` → no-op |
| `@/lib/kb-adapter` | `searchViaCoze` → 未配置（原先靠数据巧合，现为结构隔离） |
| `@/lib/kb/manage` | `rebuildBase` → mock jobId（原先会起真实后台任务） |
| `@/lib/cache-tags` | `invalidateWebContent` → no-op |

磁盘隔离：`process.env.DATA_DIR = mkdtemp(tmpdir/hdw-contract-data-)`，`afterAll` 递归删除。
（`src/lib/storage.ts` 的 `dataRoot()` 在调用时读取该变量，故模块体赋值即可覆盖全部 uploads/kb/backups 路径。）

## 6. skip 台账（共 2 条，阈值 ≤5）

| 路由 | 理由 |
|---|---|
| `POST /chat/stream` | SSE 流式响应，非 JSON 信封 |
| `PUT /publish-jobs/:id` | 业务缺陷 F-01，修在 B 线所有权 |

## 7. 新发现业务缺陷 F-01（移交）

**`PUT /api/publish-jobs/:id` 恒 500。**

```
[api-error] PUT publishJob/PUT:id Error: .partial() cannot be used on object schemas containing refinements
    at Module.partial (node_modules/zod/v4/core/util.js:503:15)
    at crudUpdate (src/lib/crud.ts:157:68)
```

- `src/lib/crud.ts:157`：`spec.updateSchema ?? spec.createSchema!.partial()`
- `publishJobCreateSchema` 带两条 `refine`（channels/channel 二选一、scheduledAt 晚于现在）→ zod4 禁止 `.partial()`
- 影响：管理端「发布任务编辑」功能完全不可用
- 归属：需改 `src/lib/crud.ts`（B 线）或为 publish-jobs 补 `updateSchema`（涉及契约），均越出 W2-02 允许路径

## 8. 未达成 / UNKNOWN

| 项 | 状态 | 说明 |
|---|---|---|
| `node scripts/check-root.mjs` | FAIL（既有，非本轮引入） | 根目录 19 条白名单外：`w*.out`×16、`IDENTITY.md`、`USER.md`、`.openclaw`。按「存疑文件不删」纪律未删除，提交时排除 |
| 调试探针入套件 | 已知 | `tests/contract/zz-dbg*.test.ts`、`zz-probe.test.ts` 仍被 vitest include 命中（865→874）。未删除（存疑文件纪律），已排除提交 |
| `test:visual` | 未执行 | 本轮零前台文件改动（`(web)/**`、`components/web/**`、`globals.css` 均未触碰），视觉门禁无输入变化；且本地无可用浏览器运行时 |
| 真实微信/Coze/SMTP 联调 | UNKNOWN | 凭证缺失，按 AGENTS.md §2 用 mock；真实联调仍 UNKNOWN |
