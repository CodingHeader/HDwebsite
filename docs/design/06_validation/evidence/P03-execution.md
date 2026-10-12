---
id: EVD-P03-EXEC
type: evidence
phase: P03
prompt: docs/design/04_planning/review-prompts/P03-后端.md
date: 2026-10-12
status: done（见 §4 验收表）
---

# P03 执行证据：补齐 main 缺失 API、权限目录修复、统一路由异常包装

附带 P02 follow-ups：导航树查询（/api/navigations?tree=true）、恢复 main 全部 next.config 服务端重定向并移除 about/partners catch-all 页、parity B6（校区图片路径）。

## 1. 分析（5W1H 简版）

- **Why**：main 的 logs / chat-history / media PATCH·batch / 文章状态 PATCH 在 upgrade 缺失（parity B3/B7/B8/B11/B12、C4/C5）；`permissionCatalog` 缺 `*:list` 等权限点 → 非超管无法被授予 AI/通知/采集/公众号等菜单；路由各自 try/catch，未捕获异常无法派生错误提醒（REQ-F-011 接入点）。用户裁决"main 每个功能必须存在"。
- **What**：`src/lib/api-handler.ts`（withApi + onApiError 钩子 + parseBody/parseQuery/parseId + ApiHttpError）；crud 工厂内部全部改走 withApi；新增 7 组路由；2 个管理页；35 个契约测试；next.config 29 条重定向。
- **Who/Where**：后端路由与契约；前台仅删除 2 个 catch-all 重定向页（由服务端重定向取代，视觉不变）。
- **How**：先改契约（auth.ts / resources.ts），再写 withApi，再写路由，测试用 prisma/migrations 在临时 SQLite 上建库直接调用 handler（不依赖 gitignored 的 dev.db）。
- **自我质疑 / 双方立论**：
  - *chat-history DELETE 用 `log:list`（prompt 原文）vs 新增 `log:delete`*：前者与 prompt 字面一致、seed 无需新权限；后者让"只读查看日志"的角色无法删除审计数据，符合最小权限。**选 `log:delete`**（只新增不改名，超管不受影响；P04 seed 需把 `log:delete` 授给需要的角色）。偏差已记录。
  - *B6 保持扁平 vs 补嵌套*：`git grep` main 嵌套路径调用点仅 main 的 `src/app/manager/campus/page.tsx:77,101`（upgrade 已用 CrudPage 取代，前台无调用）。保持扁平最简单；但"main 每个功能（含 API 契约）都存在"且兼容层成本低、可测 → **补嵌套兼容层**，数据契约仍以扁平 `/api/campus-images` 为唯一源（同一 zod schema `campusImageCreateSchema`）。
  - *导航树公开 vs 需登录*：main 的 GET /api/navigations 公开（前台菜单）。公开全量会暴露停用/隐藏菜单 → 匿名或无 `navigation:list` 时强制 `status=active & isVisible=true`；管理端可按参数取全量。无 `tree` 参数仍是管理端分页列表（navigation:list）。
  - *media/batch：main 的 DELETE+PATCH 两方法 vs prompt 的 POST+action*：按 prompt 收敛为 `POST {action}`，按 action 分别要求 `media:delete` / `media:edit`。与单条 DELETE 一致只删记录，物理文件清理归 P14。
  - *crud before\* 钩子抛错*：原注释称"抛错即 400"，实际落入 500。withApi 化后：普通 Error（非 Prisma、无 code）→ 400，Prisma 错误照常映射（P2002/P2003 → 400，其余 → 500 + 钩子）。
  - *重定向用 next.config（服务端 307）vs P02 的页面内 redirect()（200+meta）*：前者与 main 完全一致、对爬虫/书签更正确；`redirects()` 先于文件系统路由匹配，所以 catch-all 页成为死代码 → 删除。

## 2. 变更文件

| 区域 | 文件 |
| --- | --- |
| 契约 | `src/contracts/auth.ts`（permissionCatalog：article+publish；log+delete；setting+create/delete；content/collect/publish/kb/notify → list/create/edit/delete；llm/wechat → list/edit；只新增不改名）、`src/contracts/resources.ts`（operationLogQuerySchema、chatSessionIdSchema、chatHistoryQuerySchema、mediaUpdateSchema、mediaBatchSchema、articleStatusPatchSchema、navigationTreeQuerySchema） |
| 包装器 | `src/lib/api-handler.ts`（新）、`src/lib/crud.ts`（5 个工厂改为 withApi，保留原文案与日志） |
| 新路由 | `src/app/api/logs/route.ts`、`src/app/api/chat-history/route.ts`、`src/app/api/chat-history/[id]/route.ts`、`src/app/api/media/batch/route.ts`、`src/app/api/campus/[id]/images/route.ts`、`src/app/api/campus/[id]/images/[imageId]/route.ts`、`src/app/api/navigations/tree.ts` |
| 改路由 | `src/app/api/media/[id]/route.ts`（+PATCH）、`src/app/api/articles/[id]/route.ts`（+PATCH）、`src/app/api/navigations/route.ts`（GET ?tree=true） |
| 管理页 | `src/app/manager/logs/page.tsx`（CrudPage 只读，既有 logs 规格）、`src/app/manager/chat-history/page.tsx`（会话列表 + 详情弹窗 + 删除） |
| 测试 | `src/lib/__tests__/api-contract/harness.ts`、`p03-endpoints.test.ts`（28 例）、`with-api.test.ts`（7 例） |
| 越界（经编排者指令） | `next.config.ts`（恢复 main 29 条 redirects）、删除 `src/app/(web)/about/[...slug]/page.tsx`、`src/app/(web)/partners/[...slug]/page.tsx`、`docs/design/02_requirements/parity-matrix.md`（B6 等行更新，prompt 输出要求） |

注意：`.gitignore:23` 的 `logs/` 规则会忽略 `src/app/api/logs/` 与 `src/app/manager/logs/`，两文件以 `git add -f` 入库（已跟踪文件不受影响）。建议 P11 将其改为 `/logs/`。

## 3. 新端点契约摘要

| 端点 | 权限 | 说明 |
| --- | --- | --- |
| GET /api/logs | log:list | page/limit(≤100)/keyword/module/action/username/startDate/endDate → `{list,pagination}` |
| GET /api/chat-history | log:list | 按 sessionId+channel 聚合：messageCount/firstAt/lastAt/lastUserMessage；筛选 channel/sessionId/keyword/时间 |
| GET /api/chat-history/[sessionId] | log:list | 会话消息正序；404 不存在 |
| DELETE /api/chat-history/[sessionId] | log:delete | 删除整个会话 + OperationLog(module=chat-history) |
| PATCH /api/media/[id] | media:edit | filename/category/type（strict，至少一项） |
| POST /api/media/batch | media:list + (delete→media:delete / move-category→media:edit) | ids 1..100；返回 affected/missing |
| PATCH /api/articles/[id] | article:publish | `{status}`；首次发布写 publishedAt，草稿清空；OperationLog(action=status) |
| GET /api/navigations?tree=true | 公开（可选登录） | 树数组；匿名强制 active+visible，孤儿子项不提升 |
| /api/campus/[id]/images[/imageId] | campus:list/create/edit/delete | main 路径兼容层；跨校区 404 |
| withApi 钩子 | — | `onApiError(listener)` 返回取消函数；默认 console.error；P06 订阅发邮件 |

main 公开 `POST /api/chat-history` 不恢复（replaced：upgrade 由 `/api/chat/stream` 服务端写入 AIChatHistory，避免前台伪造记录），已在 `chatHistoryQuerySchema` 注释说明。

## 4. 验收标准

| # | 验收项 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `npm test` 新增契约测试全部通过（≥20） | PASS | 新增 35 例（28+7）；全量 68/68（原 33 + 35）`P03/test.log` |
| 2 | 登录后 `/api/logs`、`/api/chat-history` 200 且 `{code,data:{list,pagination},message}`；无 token 401 | PASS | `P03/curl.log`：`/api/logs 200`、`/api/chat-history 200`；keys `[code,data,message]`/`[list,pagination]`；nologin 401 ×2 |
| 3 | `/manager/logs`、`/manager/chat-history` 200 | PASS | `P03/curl.log` |
| 4 | 权限一致性脚本：路由权限点 ⊆ permissionCatalog | PASS（见注） | 修正版脚本 `used 26 missing perms: []`；P03 前同脚本 `missing: collect:list,kb:list,llm:list,notify:list,wechat:list`。另有 vitest 两例覆盖 withApi `permission:` 字面量与 crud 工厂派生权限 |
| 5 | `npm run test:visual` 通过（前台未变） | PASS | `P03/visual.log`：46 passed（15 路由 × 3 宽度 + 首页区块顺序），EXIT 0 |

**注（#4）**：prompt 中验证命令的正则在 shell 单引号内写成 `"\\\\s*"`，JS 字符串得到 `\\s*`（匹配字面反斜杠），因此对任何仓库都会把全部 26 个权限判为 missing（P03 前后均 exit 1）。按规则不修改 prompt 验收标准；使用语义等价的修正版（`docs/design/06_validation/evidence/P03/permcheck.js`）验证，并建议编排者修正 prompt 命令。

### P02 follow-ups

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 导航树 /api/navigations?tree=true | PASS | 契约测试 4 例；curl `nav tree code 200 roots 9` |
| 恢复 main 29 条服务端重定向，移除 catch-all | PASS | `P03/curl.log`：31 个旧 URL（含 /about/a/b、/partners/pku/y 多段）upgrade 与 main 均 `307 → 同一目标`，31/31 MATCH；`curl -i /about/intro` → `HTTP/1.1 307 Temporary Redirect`、`location: /about` |
| parity B6 | PASS（决定：扁平唯一契约 + 嵌套兼容层） | 契约测试 3 例；parity-matrix B6 行已更新 |

## 5. 通用验证

最终代码（HEAD 前一提交）上的一轮完整链（`/workspace/work/.visual/p03-chain2.sh`：先停 :6789 服务 → lint → typecheck → test → build → 起 upgrade(:6789)/main(:6790) → curl 对比 → 视觉回归）：

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `npm run lint` | EXIT 0（0 error / 26 warning，全部为既有文件，P03 新增文件 0 warning） | `P03/lint.log` |
| `npm run typecheck` | EXIT 0 | `P03/typecheck.log` |
| `npm test` | EXIT 0，8 files / 68 tests passed | `P03/test.log` |
| `npm run build` | EXIT 0 | `P03/build.log` |
| curl（重定向 31/31 MATCH、API/页面状态码、信封形态） | PASS | `P03/curl.log` |
| `npm run test:visual`（PLAYWRIGHT_BROWSERS_PATH=/workspace/work/.pw-browsers） | 46 passed，EXIT 0 | `P03/visual.log` |
| 权限一致性（修正版脚本） | `missing perms: []`，EXIT 0 | `P03/permcheck.log` |

环境备注：第一轮视觉回归因沙箱重置丢失 Chromium 系统库（`libatk-1.0.so.0`）全部启动失败（非代码问题）；`sudo npx playwright install-deps chromium` 重装后第二轮 46/46 通过。

## 6. UNKNOWN

- onApiError → 邮件提醒的真实投递：本方向只定义钩子（默认 console.error），SMTP 无凭证，P06 接入后用 mock 验证；真实投递 UNKNOWN。
- seed 中角色是否已含新权限点（`*:list`、`article:publish`、`log:delete`、`setting:create/delete`）：prisma/** 禁改，非超管角色实际授予情况待 P04。

## 7. Follow-ups

- **P04**：seed 菜单补 `/manager/chat-history`；Editor/Viewer 等角色补授新权限点（`article:publish`、`log:delete` 等，按需）；`.gitignore` `logs/` → `/logs/`（或 P11）。
- **P06**：`onApiError(listener)` 订阅 → notify-gateway `system_error`；其余手写 try/catch 的管理路由（articles GET/PUT/DELETE、users、roles、settings、llm、wechat、collect、publish、upload 等）逐步迁移到 withApi（本方向已覆盖 crud 工厂 25 资源 + 全部新增/修改端点）。
- **P07**：/manager/logs（加筛选：模块/动作/时间）、/manager/chat-history 升级为设计系统组件；文章列表接入 PATCH 一键上下线；媒体库接入改名/批量。
- **P14**：media 单删/批删的物理文件清理。
- 编排者：修正 P03 prompt 权限一致性命令的正则转义。
