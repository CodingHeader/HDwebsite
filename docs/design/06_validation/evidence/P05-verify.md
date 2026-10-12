# P05 交互 — 独立校验报告

- 校验范围：`dbf3f4b..9a08b09`（分支 `upgrade`，本地，未推送）
- 校验人：独立校验子代理（未参与执行；仅依据 diff 与本地复跑结果）
- 时间：2026-10-12 23:30–23:50（UTC+8）
- 标准：`docs/design/04_planning/review-prompts/P05-交互.md` 验收标准 + orchestration 约束

## 结论：**PASS**（无 FAIL；3 条非阻断观察移交后续方向）

## 检查表

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 1 | diff 仅在允许路径内 | PASS | 55 个文件：`src/components/manager/**`（未触及 `shell/**`）、`src/app/manager/**`、`src/lib/manager-fetch.ts`、`src/contracts/common.ts`（仅新增 `uxStateSchema`/`toastCopy`）、`src/components/web/ChatWidget.tsx`（className 未改，仅逻辑与按钮文案）、`tests/e2e/**`、`package.json`（仅新增 `test:e2e`）、`.gitignore`（仅 e2e.db* 4 行）、`docs/.../evidence/P05*`。无 `src/app/api/**`、`prisma/**`、`globals.css`、其他前台文件改动 |
| 2 | AC1 零原生弹窗 | PASS | `grep -rnE "window\.confirm\|[^.]alert\(\|window\.prompt\|[^.a-zA-Z]prompt\(\|[^.a-zA-Z]confirm\(" src/app/manager src/components/manager` → 无匹配 |
| 3 | AC2 `npm run test:e2e` 4 spec 全过 | PASS | 先 `npm run build`（EXIT 0）后连跑两次：run1 8 passed (1.4m)，run2 8 passed (1.4m)；无波动（4 spec / 8 用例，retries=0） |
| 4 | AC3 `npm run test:visual`（含 /apply） | PASS | `run-visual.sh test` 对 :6789（本次重建产物）→ 46 passed (1.6m) |
| 5 | AC4 Viewer 访问 /manager/users → `data-testid="forbidden"` | PASS | `tests/e2e/auth.spec.ts:45` 断言，两次运行均通过；`manager-fetch.ts:71` 403→`ForbiddenError` |
| 6 | AC5 接口 500 → ErrorState + 重试恢复 | PASS | `crud-article.spec.ts:67`（route 注入 500 → ErrorState → 点"重试"恢复）两次通过；截图 `error-state-articles-500.png` 已查看 |
| 7 | 文章编辑空正文缺陷修复 | PASS | 自写临时用例（运行后删除，未入库）：API 建文章 → UI 编辑仅改标题 → 保存 → `GET /api/articles/:id` 断言 `content` 与原文一致、标题已变 → passed。实现：`articles/page.tsx:73-80` 先拉详情回填，加载中禁止保存 |
| 8 | ChatWidget 会话持久化 | PASS | 自写临时用例：首页打开客服发送 → 刷新 → 重开，消息恢复且 `hd_chat_session_id` 不变 → passed。`apply-chat.spec.ts:47` 另验 /apply 会话 id 落 localStorage 且后台可查 |
| 9 | E2E 不触碰 dev.db | PASS | 运行前后 `md5sum prisma/dev.db` 一致（OK）；global-setup 用 `prisma/e2e.db`（已 gitignore，`.gitignore:21`）+ 测试专用 JWT_SECRET |
| 10 | 无密钥提交 | PASS | diff grep key/secret/token/password/sk-：仅测试桩（`sk-e2e-mock`、e2e JWT 常量、seed 既有 admin123、表单字段名），无真实凭证；无 `.env*`/db 入库 |
| 11 | 绑定决策 | PASS | 前台红色横幅风格保持（视觉 46/46、首页 Banner 断言通过）；main 功能未减（反而补供应商/公众号删除 UI）；未涉及 KB 文件类型；Toast 用 `@base-ui/react/toast`、ConfirmDialog 用既有 radix dialog，无新依赖 |
| 12 | 通用门禁 | PASS | lint 0 error / 22 warning（基线 25）；typecheck EXIT 0；vitest 9 文件 72/72；build EXIT 0 |
| 13 | 运行测试后工作区 | PASS | `git status --short` 为空 |
| 14 | 偏差说明 | PASS | `/apply` 不在本 diff：ApplyClient 已于 P02（4762983）按 main 移植，含 `hd_chat_session_id` 与 `/api/chat/stream` SSE，本方向以 E2E 验证——合理。发布任务标题由前端用 `/api/content-items` 补全（后端 `crud-resources.ts` 不在允许路径），已登记 P06——合理。E2E 绕过 start-next 直接起 standalone（避免 prisma/ 监视触发重建）——合理 |
| 15 | 管理端 UX 质量（截图人工评审） | PASS（附观察） | 已看 6 张证据图 + 自拍 4 张（文章列表/编辑弹窗 @1440、@375）：Forbidden、Error+重试、Empty（带关键词）、行内校验（红框+文案+aria-invalid）、确认删除（标题+后果说明+红色主按钮）、Toast（标题+对象名）均清晰一致，桌面端达到高水准；快捷键提示（Ctrl+Enter/Esc）友好 |

## 回归抽查（≥5）
1. `useManagerQuery` 竞态保护（seq 只采纳最后请求）、已有数据刷新不闪烁 — OK。
2. ChatWidget 停止生成：AbortError 不当错误、保留已生成内容；空回复气泡在 finally 移除 — OK。
3. ChatWidget 输入法组合态 Enter 不误发（`isComposing`）— OK。
4. 旧会话键 `hd_session_id` 兼容迁移到 `hd_chat_session_id` — OK。
5. logs 页走 `CrudPage` 只读，自动获得五态；chat-history/media/settings/publish-jobs 等均引用 `isForbidden`/TableState — OK。
6. 文章删除：ConfirmDialog 取消不删、确认后删除（E2E 覆盖）— OK。

## 非阻断观察（移交）
- **P07**：/manager/articles @375 表格横向溢出，"操作"列被截出视口、"已发布/新闻"逐字竖排换行，移动端列表未达顶级水准（与 P02 已登记的"manager 响应式"同项）。错误/空态时表头列宽与有数据时不一致（轻微）。
- **P05/P07 小瑕疵**：ChatWidget "重试"会再次追加同一条用户消息（失败那条仍在），历史中出现重复提问；建议重试时复用上一条用户消息。
- **测试补强**：`crud-article.spec.ts` 只断言编辑弹窗回填正文，未断言保存后持久化；建议把本次"保存后 GET 复核 content"并入该 spec。

## 环境备注
- 沙箱重启后 chromium 缺 `libatk`，首次 e2e 因此全部启动失败；`sudo npx playwright install-deps chromium` 后复跑通过（与代码无关，上文计数均为修复后结果）。
- 校验开始时 :6789/:6790 均未运行（pgid 15725 已不存在）。校验人在重建后以 `.next/standalone/server.js`（cwd=standalone，加载 .env.local，未显式 DATABASE_URL → 使用 standalone 内 dev.db 副本）在 :6789 重新启动用于视觉测试；该进程在本沙箱 `ps` 中不可见，如需重启请按端口/新会话处理。:6790 未启动（视觉 test 模式只读已存参照图）。
- 日志：`/workspace/work/p05v/{lint,tc,test,build,e2e1,e2e2,e2e3}.log`，`/workspace/work/.visual/test.log`；自拍截图 `/workspace/work/p05v/admin-*.png`、`chatwidget-restored.png`（未入库）。
