# P03（后端）独立校验报告

- 校验范围：`97ef7f3..44badf9`（分支 `upgrade`，5 个提交）；标准 = `docs/design/04_planning/review-prompts/P03-后端.md` 验收标准 + `hdw-orchestration.md` 裁决。
- 方法：只看 diff + 本人重跑命令；未采信 `P03-execution.md`。本人日志：`/workspace/work/.visual/p03v/`（lint/tc/test/build/visual.log、curl-redir.sh、live.sh、perm-indep.ts）。
- 环境：本人 build 后重启 :6789（upgrade，`.env.local`）；:6790 为执行者启动的 main 参照服务（未动）。

## 结论：**PASS**（无 FAIL；3 条非阻断观察见文末）

## 检查表

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| 1 | Diff 路径范围 | PASS（有越界，已有依据） | 32 文件。越界：`next.config.ts`、删除 `src/app/(web)/about/[...slug]/page.tsx`、`partners/[...slug]/page.tsx`（前台，原属禁止）——依据 orchestration 21:10 P02 verify 后续项 F1“P03 恢复 main next.config 重定向并删除 about/partners catch-all”；视觉门禁 46/46 证实前台未变。`docs/design/02_requirements/parity-matrix.md` 与 `evidence/P03/**` 为文档/证据，合理。`prisma/**`、`shell/**`、`globals.css` 未改 |
| 2 | 验收①：新增契约测试 ≥20 且全过 | PASS | `npm test`：8 files / 68 passed（P02 基线 33）；`api-contract/p03-endpoints.test.ts` 28 + `with-api.test.ts` 7 = 35 新增 |
| 3 | 验收②：`/api/logs`、`/api/chat-history` 带 token 200 + 信封；无 token 401 | PASS | admin token：两者 200，keys `[code,data,message]`，data keys `[list,pagination]`，pagination `{page,limit,total,totalPages}`；无 token 均 401 |
| 4 | 验收③：`/manager/logs`、`/manager/chat-history` 200 | PASS | curl 均 200；build 路由表含二者 |
| 5 | 验收④：权限一致性 | PASS | 提示词原命令确实坏：在 shell 单引号内 `\\\\s*` 变成匹配字面反斜杠，连 `article:edit` 都判 missing（26/26 missing，exit 1）。执行者修正版 `evidence/P03/permcheck.js`：used 26，missing []，exit 0（已核对仅修正正则转义、加 `\b`，语义等价）。本人独立脚本 `p03v/perm-indep.ts`（tsx 直接 import `permissionCatalog` 与 `crudSpecs`；扫描 `src/app/api`+`src/lib` 全部 `"module:action"` 字面量（requireAuth / withApi permission / hasPermission）+ 每个路由文件 crud 工厂派生的 `spec.permission:list/create/edit/delete`）：used 96，catalog 96，missing [] |
| 6 | 验收⑤：`npm run test:visual` | PASS | 46 passed (1.7m)，EXIT 0 |
| 7 | 通用验证 lint/typecheck/test/build | PASS | lint 0 errors / 26 warnings（与 P02 基线 26 相同）；typecheck exit 0；test 68/68；build exit 0（1 个 Turbopack NFT 警告，P02 build 日志已有，非新增） |
| 8 | next.config 重定向 vs main | PASS | main `redirects()` 29 条 source 与 upgrade 逐字相同（diff 为空）。逐条 curl（`:slug+`→`intro/x`、`:id`→`123`）在 :6789/:6790 对比 status+Location：29/29 SAME，全部 307 且目标一致；另 `/about/intro` 两端均 `307 location: /about` |
| 9 | 导航树公开端点只暴露 active+visible | PASS | 实测：临时插入 `isVisible=false` 与 `status=inactive` 各一条（测后删除）。匿名 `?tree=true` 不含二者；匿名带 `&status=inactive` 参数仍被强制过滤；admin 可见全量；无 `tree` 匿名仍 401；无效 token 按匿名处理（200，已过滤）。`src/app/api/navigations/route.ts` canSeeAll 分支 |
| 10 | withApi 异常映射不泄漏堆栈 | PASS | 本人临时 vitest（测后已删除）：handler 抛 `Error("SECRET_INTERNAL at /srv/db.ts:42")` → 500 `{"code":500,"data":null,"message":"服务器错误"}`，不含消息/堆栈；crud `beforeCreate` 抛普通 Error → 400 且只回 message；抛 `PrismaClient*` → 500 通用文案。P2002/P2003 → 400，P2025 → 404（`src/lib/api-handler.ts` toErrorResponse） |
| 11 | media/batch 权限 | PASS | 实测角色 `[media:list, media:edit]`：`action=delete` → 403“需要 media:delete”；`move-category` → 200；101 个 id → 400“单次最多操作 100 个媒体”；无 token 401 |
| 12 | chat-history DELETE 需 log:delete | PASS | 实测角色 `[log:list]`：GET 列表 200，DELETE → 403“需要 log:delete”；admin 删不存在会话 → 404 |
| 13 | 其他回归抽查 | PASS | `/api/logs` 用 media 角色 403；`startDate=notadate` 400；media PATCH 非法 JSON 400；article PATCH 非法 status 400；B6 嵌套路由用 `findFirst({id,campusId})` 防跨校区 |
| 14 | `logs/` 下强制入库文件 | PASS | `.gitignore:23 logs/`（P03 前已存在）命中的已跟踪文件仅 `src/app/api/logs/route.ts`、`src/app/manager/logs/page.tsx`，均为本方向应有产物；无运行时日志入库。`.gitignore` 改为 `/logs/` 已列入 P04 后续项 |
| 15 | 裁决未违反 | PASS | 前台红色横幅轮播：视觉 46/46，含“首页含 Banner 轮播”用例；main 功能未减少（新增 logs/chat-history/media PATCH+batch/文章 PATCH/嵌套校区图片兼容层，恢复 29 条重定向）；未触碰 KB 文件类型；未改 `prisma/**`、无迁移 |
| 16 | 无密钥入库 | PASS | grep diff 新增行 key/secret/token/password/sk-/ghp_/PRIVATE：只有测试 harness 内运行时签发的 token 变量、`passwordHash: "x"`；无 `.env*`/`dev.db`/`backups/` |
| 17 | 跑完测试后 tracked 文件不变 | PASS | `git status --short` 为空（`prisma/dev.db` 未跟踪；live 测试前已备份，测后已还原） |

## 非阻断观察（建议后续方向处理，不影响本方向 PASS）
1. `src/lib/crud.ts` `runHook` 注释称“沿用原‘抛错即 400’约定”，但 P03 前 `before*` 抛普通 Error 走 catch → 500。现在是 400 并回显 `err.message`（无堆栈）；若 hook 内出现 TypeError 等编程错误，会以 400 + 内部消息返回、且不触发 onApiError。建议 P06 收窄为只把显式业务错误（如 ApiHttpError/badRequest）映射为 400。
2. `validationError` 的英文默认文案识别正则未覆盖 zod v4 的 `Invalid option…`：`PATCH /api/articles/1 {"status":"bogus"}` 返回 400，但 message 是英文 `Invalid option: expected one of "draft"|"published"|"archived"`（13-响应设计要求转成“参数校验失败”）。小修：正则加 `Invalid`。
3. 提示词要求 `/manager/chat-history` 用“CrudPage 只读 + 详情弹窗”，实现为 215 行自定义页（路径在允许范围，200 正常）。P07 换成设计系统组件时一并统一。

## 复现
```bash
cd /workspace/work/HDwebsite
node docs/design/06_validation/evidence/P03/permcheck.js          # 修正版权限检查
npx tsx /workspace/work/.visual/p03v/perm-indep.ts                 # 独立权限检查
bash /workspace/work/.visual/p03v/curl-redir.sh                    # 29 条重定向 :6789 vs :6790
bash /workspace/work/.visual/p03v/live.sh                          # 401/403/信封/batch/chat-history/导航树（会在 dev.db 建 v-* 角色与用户）
```
