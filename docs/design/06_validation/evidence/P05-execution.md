---
id: EVD-P05-EXEC
type: evidence
phase: P05
prompt: docs/design/04_planning/review-prompts/P05-交互.md
date: 2026-10-12
status: done（见 §4 验收表）
---

# P05 执行证据：管理端五态 + 反馈组件、/apply AI 咨询对等、E2E 主路径

## 1. 分析（5W1H 简版）

- **Why**：契约⑥要求管理员每个操作都有 加载/空/错/无权限/成功 反馈；现状为 `window.confirm`/`alert`/`window.prompt` 原生弹窗、`data===null` 时空白表格、错误只有一行红字、403 无视图；"交互可用"无回归手段（无 E2E）。用户裁决：管理端顶级易用，前台外观与 main 像素一致。
- **What**：`src/components/manager/feedback/**` 反馈组件库（Toast/ConfirmDialog/EmptyState/ErrorState/Forbidden/PageSkeleton/TableSkeleton + TableState + useManagerQuery）；`manager-fetch` 抛 `ForbiddenError`/网络与非 JSON 异常可读化；CrudPage 与 11 个特殊页接入五态；ChatWidget 交互补强（停止/重试/会话恢复）；Playwright E2E 4 spec / 8 用例 + 本地 mock 上游 + 独立 e2e.db。
- **Who/Where**：仅 prompt 允许路径（管理端组件/页面、manager-fetch、contracts/common 仅新增 UxState、ChatWidget 仅逻辑、tests/e2e、package.json script、.gitignore e2e.db）。未触碰 `src/app/api/**`、`prisma/**`、`globals.css`、shell、其他前台文件。
- **When/How**：先建组件与契约 → CrudPage → 特殊页逐个 → E2E；每段 typecheck/lint 后提交；最后全量门禁 + test:visual + 3 次 E2E。

**自我质疑 / 双方立论**

- *Toast：base-ui Toast vs 新增 sonner*。sonner API 更省事，但 A-5 约束"不新增依赖"，且 `@base-ui/react@1.9` 已含 Toast（`createToastManager` 支持模块级命令式调用）。**选 base-ui**：`toast.success()` 可在任意事件处理函数中调用，无需 hook；渲染器挂在 manager layout。无需新增依赖。
- *确认框：声明式组件 vs 命令式 `await confirmDialog()`*。声明式需每页维护 open/target 状态，替换十余处 `window.confirm` 时代码膨胀且易漏；命令式与原生 API 心智一致、迁移成本低。**两者都提供**：`<ConfirmDialog>`（表单内嵌场景）+ `confirmDialog/promptDialog/alertDialog`（由 layout 中单实例 `<ConfirmHost/>` 队列渲染）。危险操作初始焦点落在"取消"（防 Enter 误删），Esc 取消，Radix 焦点陷阱。
- *Forbidden 判定：前端按菜单权限预判 vs 以接口 403 为准*。前端预判与后端权限可能漂移；**以接口 403 为唯一来源**（`ForbiddenError`），页面整页替换为 `<Forbidden/>`（`data-testid="forbidden"`）。
- *表单弹窗统一 FormDialog*：原各页手写遮罩 div（无焦点陷阱、无 Esc、点遮罩即丢输入）。统一为 Radix Dialog；有未保存修改时关闭需二次确认；`<form>` 提交（Enter 提交、textarea 内 Ctrl/⌘+Enter）；后端错误在弹窗顶部 `role=alert` 呈现并 Toast；必填行内校验（`aria-invalid` + `aria-describedby`，首个错误字段自动聚焦）。
- *test:e2e 脚本形态*：prompt 写 `"playwright test tests/e2e"`，但根 `playwright.config.ts`（P02 视觉回归，不在允许路径）`testDir: tests/visual`，该命令会"No tests found"。**改用 `playwright test -c tests/e2e/playwright.config.ts`**（配置文件位于允许的 `tests/e2e/**`）；`npm run test:e2e` 行为符合验收。
- *E2E 被测服务启动方式*：`scripts/start-next.mjs` 的构建过期判断监视整个 `prisma/` 目录 —— e2e.db 每次重建（或 dev.db 被调度器写入）都会触发整站 `next build`，并在构建期间打断同机 :6789 服务（首轮实测即发生）。**global-setup 直接启动 `.next/standalone/server.js`**，并要求先 `npm run build`（src 比 BUILD_ID 新则报错，杜绝测到旧代码）。
- *"建发布任务 → 通知记录出现"如何不依赖外部*：通知网关在 SMTP 未配置时记录 `skipped(smtp_not_configured)`，属真实链路。用例建 10 分钟后排期 + 发布前提醒的任务，等待 `notify.scan`（每分钟）触发 `before_publish_news`，断言通知记录出现且收件人为用例新建的收件人。真实邮件投递 = UNKNOWN（无 SMTP 凭证，见 §5）。
- *ApplyClient*：P02 已按 main JSX/className 移植并改为 SSE（`/api/chat/stream`）、会话 id `hd_chat_session_id`、服务端持久化；本方向复核 diff 后**不改其 JSX**（避免视觉风险），由 E2E 验证访客发消息收到流式回复且服务端落库。
- *截图自检发现并修复*：文章页/对话日志的筛选下拉 `w-full` 覆盖 `w-auto` 导致独占一行；Forbidden 文案与后端 message 拼接无标点 → 分两行展示。
- *发现并修复的交互缺陷*：①文章"编辑"原实现以空正文打开表单（`content: ""`），保存即清空正文 → 改为先拉 `/api/articles/:id` 详情（加载骨架，失败时禁止保存）；②ChatWidget 从不写入 sessionId（每条消息新会话、无上下文）→ 持久化 `hd_chat_session_id`；③用户表单"角色 ID"需手填数字 → 角色下拉；④文章分类、公众号 AI 场景、发布任务内容条目均由手填 ID 改为下拉；⑤模型供应商/公众号账号接口有 DELETE 但无 UI → 补删除（CRUD 完整）。

## 2. 变更文件

| 区域 | 文件 | 说明 |
| --- | --- | --- |
| 契约 | `src/contracts/common.ts` | 仅新增 `uxStateSchema/UxState`（loading/empty/error/forbidden/success）与 `toastCopy` 文案约定 |
| fetch | `src/lib/manager-fetch.ts` | `ForbiddenError`、`isForbidden`、`errorMessage`；网络失败 → `ApiError(0,"网络异常…")`；非 JSON（502 网关页）→ 可读错误 |
| 反馈组件 | `src/components/manager/feedback/{toast.ts,Toaster,ConfirmDialog,EmptyState,ErrorState,Forbidden,PageSkeleton,TableSkeleton,TableState,useManagerQuery,styles,index}` | 全部基于 P02 `mgr-*` 令牌；Toast = `@base-ui/react` Toast；Dialog = 已有 `@radix-ui/react-dialog`；无新依赖 |
| 通用组件 | `src/components/manager/{FormDialog,DetailDialog,Pagination,SearchInput,FilterTabs,StatusBadge}.tsx` | 表单弹窗（脏检查/快捷键/服务端错误）、只读详情弹窗、分页（窗口页码+总数）、搜索（300ms 防抖、`/` 聚焦、Esc 清空）、状态分段（←/→ 切换）、状态徽标 |
| CRUD | `src/components/manager/CrudPage.tsx`、`SchemaForm.tsx`、`crud-specs.tsx` | 五态、ConfirmDialog 删除、Toast、行内校验、label↔控件关联；试抓结果用信息对话框；执行结果 Toast；用户角色下拉；关联对象列显示名称 |
| 布局 | `src/app/manager/layout.tsx` | 挂载 `<Toaster/>`、`<ConfirmHost/>`；菜单加载失败 Toast |
| 特殊页 | `src/app/manager/{page,articles,media,collect-items,publish-jobs,llm-providers,wechat-accounts,settings,content-hub,chat-history}/page.tsx` | 五态接入；危险操作确认；`window.prompt` → `promptDialog`（行内校验）；设置页 Ctrl/⌘+S、未保存计数、切换分组确认；媒体库拖拽上传/复制链接/部分失败逐条提示；logs 走 CrudPage（只读）自动获得五态 |
| 前台 | `src/components/web/ChatWidget.tsx` | 仅逻辑：会话 id 持久化（兼容旧键）、最近 30 条消息恢复、停止生成（AbortController）、失败重试、去空回复气泡、Esc 关闭、IME 组合输入不误发送；**className 未改**（diff 中唯一 className 行内容逐字相同） |
| E2E | `tests/e2e/{playwright.config.ts,global-setup.ts,auth.spec.ts,crud-article.spec.ts,collect-publish.spec.ts,apply-chat.spec.ts,fixtures/{env,helpers,mock-llm}.ts}` | 见 §3 |
| 配置 | `package.json`（仅 `test:e2e` script）、`.gitignore`（仅 `prisma/e2e.db*`） | |

## 3. E2E 设计

- 独立数据库：`prisma/e2e.db`，每次运行 `prisma migrate deploy` + seed 重建（dev.db 不参与，无需备份/还原）。
- mock 上游（`fixtures/mock-llm.ts`，127.0.0.1:6799）：OpenAI 兼容 `/v1/chat/completions`（stream=true 逐段 SSE，否则 JSON）；采集站点 `/news/list.html`（`ul.list li > a`）与正文页 `/news/:n.html`（`.content`）。
- 被测应用：`.next/standalone/server.js`，端口 6791，`DATABASE_URL=file:prisma/e2e.db`，测试专用 JWT_SECRET；teardown 按进程组 PID 结束（不使用 pkill）。
- 用例（8）：
  1. `auth`：未登录跳登录；错误密码 `aria-invalid` 提示 → 正确密码进仪表盘；**Viewer 访问 `/manager/users` 渲染 `data-testid="forbidden"`**，Viewer 访问有权限的文章页正常。
  2. `crud-article`：空表单提交行内必填错误 → 新建（Toast"已创建"）→ 编辑回填正文不丢失、Ctrl+Enter 保存（Toast"已保存"）→ 删除 ConfirmDialog（默认聚焦"取消"、Esc 取消后记录仍在）→ 确认删除（Toast"已删除"）；**列表接口注入 500 → ErrorState 显示后端 message → 点"重试"恢复**；搜索无结果 → EmptyState。
  3. `collect-publish`：新建通知收件人 → 新建采集源（mock）→ **试抓**（信息对话框列出 2 条，不入库）→ 立即执行（确认 → Toast"新增 2 条"）→ **审核通过**（Toast，离开待审列表）→ **新建发布任务**（下拉选内容条目、10 分钟后排期、发布前提醒）→ 轮询 `notify.scan` 产生的 `before_publish_news` 记录 → 后台「通知记录」页出现该收件人行。
  4. `apply-chat`：后台 UI 新建 OpenAI 兼容供应商（指向 mock）并"测试"连通 → 全新访客上下文打开 `/apply` 发送消息 → **收到流式回复全文** → `hd_chat_session_id` 已持久化 → `/api/chat-history/:sessionId` 可查到用户消息与 AI 回复。

## 4. 验收标准

| # | 标准 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `grep -rnE "window\.confirm\|[^.]alert\(" src/app/manager src/components/manager` 为空 | **PASS** | 输出为空（exit 1 = 无匹配）；`window.prompt` 亦已清零 |
| 2 | `npm run test:e2e` 4 个 spec 全部通过 | **PASS** | 4 spec / 8 用例全部通过，修复后连续 4 次运行全绿（最后一次在最终构建后），`P05/e2e-runs.txt` |
| 3 | `npm run test:visual` 通过（含 /apply） | **PASS** | 46/46（apply @1440/768/375 均通过），最终构建后运行，`P05/visual-summary.txt` |
| 4 | Viewer 访问 `/manager/users` 渲染 Forbidden（`data-testid="forbidden"`） | **PASS** | `auth.spec.ts` 用例 3；截图 `P05/forbidden-viewer-users.png` |
| 5 | （人工）断网/接口 500 时出现 ErrorState 与"重试"，点击后恢复 | **PASS（已自动化）** | `crud-article.spec.ts` 用例 2 以 `page.route` 注入 500 并点重试恢复；截图 `P05/error-state-articles-500.png`。断网分支由 `managerFetch` 捕获 fetch 异常 → `ApiError(0,"网络异常…")` → 同一 ErrorState（代码路径相同，未单独自动化） |

通用门禁（本次最终运行，摘要见 `P05/gates.txt`）：

| 命令 | 结果 |
| --- | --- |
| `npm run lint` | exit 0，0 error / 22 warning（基线 25，均为存量） |
| `npm run typecheck` | exit 0 |
| `npm test` | 9 files / 72 tests 通过 |
| `npm run build` | exit 0 |
| `npm run test:visual` | 46/46 通过 |
| `npm run test:e2e` | 8/8 通过 ×4（`P05/e2e-runs.txt`） |

截图（`docs/design/06_validation/evidence/P05/`）：`forbidden-viewer-users.png`、`error-state-articles-500.png`、`empty-state-articles-search.png`、`inline-validation-article.png`、`confirm-delete-article.png`、`toast-success-article-created.png`。

复现：
```bash
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/.pw-browsers   # 沙箱内浏览器缓存
npm run build
npm run test:e2e                                              # 需 6791/6799 端口空闲
E2E_EVIDENCE_DIR=$PWD/docs/design/06_validation/evidence/P05 npm run test:e2e   # 同时产出截图
```

## 5. UNKNOWN 与原因

- 真实邮件投递：SMTP 凭证缺失，通知记录状态为 `skipped(smtp_not_configured)`；投递/重试逻辑未在真实 SMTP 上验证。
- 真实 LLM 供应商（OpenAI/Coze）流式行为：仅以 OpenAI 兼容 mock 验证；Coze 流式未覆盖。
- 公众号测试/发布：无微信凭证，仅 UI 层（列表/新建/删除/测试按钮错误提示）可用，真实联调 UNKNOWN。

## 6. 偏差

- `test:e2e` 脚本为 `playwright test -c tests/e2e/playwright.config.ts`（理由见 §1）。
- prompt 输出清单中的 `src/app/(web)/apply/ApplyClient.tsx`/`page.tsx`：P02 已完成移植（SSE、`hd_chat_session_id`、服务端持久化），本方向复核后未修改，以 E2E + 视觉门禁验证。
- 发布任务列表接口未 include 关联 ContentItem（`src/lib/crud-resources.ts` 不在允许路径）→ 前端用 `/api/content-items` 标题补全显示，后端修正登记 P06。
- 新增通用组件 `FormDialog/DetailDialog/Pagination/SearchInput/FilterTabs/StatusBadge` 与 `feedback/styles.ts`（均在允许的 `src/components/manager/**`）。

## 7. 后续方向 follow-ups

- **P06**：`publish-jobs` 列表 `include: { item: { select: { id, title } } }`；采集源 `cron` 留空时 `normalizeFormValues` 置 null 导致 zod `min(5)` 报"参数校验失败：cron"（应让 `.default` 生效或后端接受 null）；`users` 新建时密码空 → 通用"参数校验失败"，建议后端返回字段级消息；validationError 只返回首个 issue，前端行内校验目前仅覆盖必填，后端可返回 `path` 供字段级展示。
- **P07**：`feedback/styles.ts` 的按钮/输入类名提升为标准 `Button/Input/Select` 组件（替换 `src/components/ui/**` 深色主题残留）；`TableState` + `tableCls` 抽成 `DataTable`；登录页以外的 manager 页面已无旧令牌依赖后可删除 `.text-muted` 兼容规则；角色编辑页（权限勾选）仍为 CrudPage 文本字段。
- **P10/P11**：`scripts/start-next.mjs` 的 `watchedBuildEntries` 包含整个 `prisma/`（含 dev.db、e2e.db），任一数据库写入都会使下次启动整站重建 —— 建议只监视 `prisma/schema.prisma` 与 `prisma/migrations`。
- **P13**：ChatWidget 停止/重试的视觉呈现仅复用了原按钮（文案切换），如需独立按钮需在不改前台视觉的约束下评审。
