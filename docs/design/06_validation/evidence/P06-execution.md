---
id: EVIDENCE-P06-EXEC
type: evidence
phase: P06 逻辑
branch: upgrade
created: 2026-10-12
---

# P06 逻辑——执行证据

提交（均在 `upgrade`，未推送）：
| hash | 内容 |
| --- | --- |
| 29c96e2 | 契约 `contracts/events.ts`（NotifyEvent、PublishJob/ContentItem 状态机）+ `contracts/blocks.ts` + `block` 权限点；contentItem 通用 CRUD 状态收窄；迁移 `20261012154723_p06_collect_kb_review`；**先失败**测试（`P06/tests-before.txt`） |
| 6f08974 | ADR-024 区块配置运行时（block-registry/resolveHomeBlocks、四资源 CRUD、首页组合层）；crud 部分更新修复、runHook、字段级校验、发布任务标题 |
| cfbbce6 | 业务闭环：审核端点、采集默认入库 + 同步队列、autoApprove、审核后自动排期发布、立即发布前提醒、API/调度异常邮件、chat-service、去硬编码、ChatWidget 重试去重、私有设置读取修复 |
| 0f1d82e | 承接项：10 个路由迁 withApi、ViewStats、import-main-content 映射、e2e 适配、补测 |
| e5cac93 | autoApprove 仅超管可开启；ADR-017 补充；`prisma/rollback/p06.sql` |
| （本文件提交） | 证据 |

## 1. 深度分析（5W1H + 自问 + 双方立场，简版）

- **What**：把"审核门 / 采集入库 / 提醒 / 公众号客服 / 发布状态机 / 首页区块配置"六条业务规则从"代码里大致有"变成"有契约、有测试、不可绕过"。
- **Why**：用户目标——采集默认进知识库、审核后自动发布到官网与公众号、发布前/余额低/出错都发邮件、模型按优先级/默认/兜底且可按场景选、公众号 AI 与官网一致且不写死联系方式；ADR-017 审核权超管独享。
- **Who**：SuperAdmin（审核/预授权）、Editor（起草、调整区块开关顺序）、运营收件人（publish 组）、管理员收件人（admin 组）、公众号用户、官网访客。
- **When**：采集时入库（不等审核）；审核通过即排期（默认 +60 分钟），提前 30 分钟提醒；立即发布在执行前同步提醒；异常发生即提醒（10 分钟聚合）。
- **Where**：`src/lib/{content-workflow,kb-sync,chat-service,block-registry,notify-gateway,publish-executor,collect-engine,wechat,llm-gateway}.ts`。
- **How**：契约先行（events/blocks）→ 迁移（仅 ADD COLUMN）→ 先写 6 个失败测试 → 实现 → 全量门禁。

自问与取舍：
1. *采集默认入库会不会把未审核内容喂给 AI 客服？* 立场 A（入库=审核后）：安全。立场 B（入库=采集即入）：用户明确"collected items go to knowledge base by default"，知识库是客服参考资料而非对外发布。**取 B**，但审核门只管"发布"，并保留 `autoToKb` 开关（源级即时关闭）与"拒绝的条目知识保留、可在知识库页停用"的说明。
2. *立即发布的提醒：同步发送 vs 强制最短提醒窗口？* 窗口方案会推迟用户点"立即发布"的效果；**取同步发送**（执行前发 before_publish_*，`notifySentAt` 先抢占防重复），审核后自动发布则通过默认 60 分钟延迟天然获得提前提醒窗口。
3. *autoApprove 与 ADR-017 冲突？* 自洽方式：autoApprove = 超管事先对该源做的审核决定（预授权），仅超管能开启/改动（非超管 403），每条自动通过写 OperationLog。写入 ADR-017 补充。
4. *新增 `api_error` 事件还是复用 `system_error`？* 复用 `system_error`（已有规则、模板、聚合与防风暴逻辑），不新增事件，seed 无需同步新规则；错误/余额/失败类规则新建时收件组为 `["publish","admin"]`（多收件人）。
5. *场景模型字段要不要外键？* 加外键会触发 SQLite 整表重建；取 `ChatScene.llmProviderId Int?` 无外键，停用/删除的模型在路由层被忽略（回落默认路由）。
6. *Navigation.templateId 索引？* 本方向未按 templateId 查询导航，**不加**（按承接说明"if queried"）。

## 2. 变更清单

新增：`src/contracts/events.ts`、`src/contracts/blocks.ts`、`src/config/brand.ts`（品牌出厂默认，见偏差 D1）、`src/lib/{block-registry,chat-service,content-workflow,kb-sync,app-origin,view-stats}.ts`、`src/app/api/content-items/[id]/review/route.ts`、`src/app/api/{content-blocks,page-templates,template-blocks,element-configs}/{route.ts,[id]/route.ts}`、`prisma/migrations/20261012154723_p06_collect_kb_review/migration.sql`、`prisma/rollback/p06.sql`、测试 `src/lib/__tests__/{content-review,collect-autokb,notify-before-publish,publish-state-machine,wechat-chat,block-registry,view-stats,p06-followups}.test.ts`。

修改：`prisma/schema.prisma`、`prisma/seed.ts`（block 权限授予 Editor list/edit、Viewer list；错误类 NotifyRule 收件组）、`src/contracts/{auth,resources}.ts`、`src/lib/{api-handler,api-response,crud,crud-resources,collect-engine,collect-test,kb-adapter,llm-gateway,notify-gateway,publish-executor,scheduler,settings-registry,wechat,jobs/index}.ts`、`src/app/(web)/page.tsx`（仅组合层）、`src/app/api/chat/stream/route.ts`、`src/app/api/collect-items/**`、10 个迁 withApi 的路由、`src/components/web/ChatWidget.tsx`（仅 send 逻辑）、`src/app/(web)/articles/[id]/page.tsx`（一行 recordView）、`scripts/import-main-content.mjs`、`tests/e2e/collect-publish.spec.ts`、`docs/design/03_solution/decisions/ADR-017-*.md`。

迁移 SQL（逐行审阅：全部为 `ALTER TABLE ... ADD COLUMN` 与 1 条 `CREATE INDEX`，无整表重建、无数据改写；`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` → "empty migration"）：
```
CollectSource.autoToKb BOOLEAN NOT NULL DEFAULT true; CollectSource.autoApprove BOOLEAN NOT NULL DEFAULT false
CollectItem.kbSyncedAt DATETIME
Knowledge.syncStatus TEXT NOT NULL DEFAULT 'local'; Knowledge.syncErr TEXT; Knowledge.syncedAt DATETIME; INDEX Knowledge_syncStatus_idx
ChatScene.llmProviderId INTEGER
```
已对 dev.db 执行 `prisma migrate deploy`（备份 `/workspace/work/p06-devdb-backup.db`）；`rollback/p06.sql` 在 dev.db 副本上执行通过（CollectSource 列恢复为 p04 形态）。

## 3. 业务逻辑落点（对照用户目标）

| 目标 | 实现 |
| --- | --- |
| 采集默认进知识库（Coze 由 P12） | `collect-engine` 新条目 → `kb-sync.ingestCollectItem`（本地 Knowledge，`syncStatus=pending`，回链 `knowledgeId`）；`KbRemoteAdapter` 接口 + `registerKbRemoteAdapter()` + `processKbSyncQueue()`（collect.run 末尾调用；未注册适配器则保持排队）；审核通过时更新同一条知识而不重复建 |
| 审核门 | 通用 CRUD 不能"变更到" approved/published/rejected；`POST /api/content-items/[id]/review`（review:edit）；执行器拒发未审核内容 |
| 自动发布官网 + 公众号（mock） | `content-workflow.scheduleAutoPublish`：审核通过（含采集审核、autoApprove）后按 `publishAutoChannels`（默认 website,wechat）/`publishAutoDelayMinutes`（默认 60）建 scheduled 任务；公众号仅在有启用服务号时建（凭证缺 → 发布失败 → job_failed 邮件） |
| 发布前提醒 | 定时：notify.scan 提前量；立即：执行器执行前同步 `notifyBeforePublish`（抢占 `notifySentAt` 防重复） |
| 余额低提醒 | 每日 `llm.balance-check` + 人工填报余额时低于阈值即发 `llm_balance_low`（修复阈值读取：原用公开设置读不到 `llmBalanceThreshold`） |
| 错误提醒 | `api-handler` 默认 onApiError → `notifyApiError` → `system_error`（多收件人、10 分钟聚合、进程内串行防并发重复）；调度任务异常 → `job_failed` |
| 模型优先级/默认/兜底 + 按场景选 | `llm-gateway.orderProviders`：场景模型置顶 → isDefault → priority 升序 → isFallback 殿后；`ChatScene.llmProviderId`；官网与公众号都传 `preferredProviderId` |
| 公众号 AI = 场景提示词 + 知识库 | `chat-service`（场景装配/知识检索/历史裁剪/网关）被 `/api/chat/stream` 与 `wechat.answerWechatText` 共用；会话 `wx:<openid>`；兜底文案 Setting `wechatFallbackReply`（`{contactPhone}`/`{siteUrl}` 占位），截断长度 Setting `wechatReplyMaxLength`；去除 wechat.ts:118-119 硬编码 |
| 首页区块配置（ADR-024） | `block-registry.resolveHomeBlocks()` 读 home 模板 TemplateBlock（sort/启用/config）；无配置/模板停用/读库失败 → main 默认顺序；首页只改组合层 |

顺带修复的真实缺陷（测试暴露）：
- **私有设置读不到**：collect-engine/collect-test/llm-gateway/wechat/余额路由用 `getSettings()`（仅公开键），而 `collect*`/`llmTimeoutMs`/`publishWechatDailyLimit`/`llmBalanceThreshold` 都是 `isPublic=false` → 后台配置一直不生效。改用 `getAllSettings()`。
- **部分更新被默认值覆盖**：zod v4 `partial()` 仍套用 `.default()`（PUT 只改标题会把 status 置 draft、tags 置 []）。`crudUpdate` 只保留请求体中出现的键（影响所有通用资源，属修复）。
- **中文检索**：本地兜底检索只按空白分词，中文问句几乎命不中；增加 CJK bigram 重叠评分。

## 4. 验收标准

| # | 标准 | 结果 | 依据 |
| --- | --- | --- | --- |
| 1 | content:edit 非超管 `PUT {status:"published"}` → 400；`POST /review` → 403 | PASS | content-review.test.ts（10 例，含 401/400/重复审核 400/日志） |
| 2 | autoToKb=true 运行后 knowledgeId 非空且可检索（Coze 由 P12 接钩子） | PASS | collect-autokb.test.ts（本地 HTTP mock 站点；含队列、适配器同步、autoToKb=false、autoApprove） |
| 3 | scheduledAt=null 任务执行前产生 before_publish_* NotifyRecord（SMTP mock） | PASS | notify-before-publish.test.ts（vi.mock nodemailer；记录 createdAt ≤ startedAt、status=sent；preNotify=false 不发；未审核不发布） |
| 4 | 路由抛异常 → 500 信封 + system_error（10 分钟聚合 1 条） | PASS | 同上：两次异常 1 条记录，收件人 admin1/admin2 两人；另测调度异常 → job_failed、余额低 → llm_balance_low |
| 5 | `grep -rn "400-001-5729\|hd1994.com" src/lib` 为空；公众号走 chat-service（断言 systemPrompt 与知识上下文） | PASS | 命令输出为空；wechat-chat.test.ts（systemPrompt、KB、场景模型、历史、兜底文案引用 contactPhone） |
| 6 | 状态机测试覆盖全部合法/非法迁移 | PASS | publish-state-machine.test.ts：PublishJob 7×7 + ContentItem 6×6 全组合 |
| 7 | block-registry 测试；四资源 CRUD 契约 200/401/403/400 | PASS | block-registry.test.ts（默认顺序、排序、停用两种方式、未知 code、模板停用回落；4 资源 × 401/403/400/201/200） |
| 8 | 默认区块配置下 `npm run test:visual` 通过 | PASS | 46/46（`P06/visual.log`，:6789 用新构建 + dev.db，dev.db 中 home 模板 12 个 TemplateBlock 生效路径） |

通用门禁：`npm run lint` 0 error / 21 warning（P0 基线 25）；`npm run typecheck` 通过；`npm test` 17 文件 210 例全过；`npm run build` 通过；`npm run test:e2e` 8/8（§6）。

## 5. UNKNOWN

- 真实 SMTP 投递、真实公众号回调/客服消息/草稿发布：凭证缺失（U-B1/U-B4 裁决），仅 mock 验证。
- Coze 知识库推送：P12 在 `registerKbRemoteAdapter` 上接入；本方向只验证了 mock 适配器的队列语义。

## 6. E2E

`npm run build`（e5cac93 之后重建）→ `PLAYWRIGHT_BROWSERS_PATH=/workspace/work/.pw-browsers npm run test:e2e`：**8/8 passed（1.8m）**，日志 `P06/e2e.log`。collect-publish 用例已适配：审核通过后自动排期 1 个官网任务，发布任务页同标题行数断言为 2；before_publish_news 通知记录照常出现。

其余日志：`P06/tests-before.txt`（6 个文件先失败）、`P06/tests-after.txt`（6 文件 126 例通过）、`P06/npm-test.log`（17 文件 210 例）、`P06/visual.log`（46/46）。

## 7. 偏差（跨出允许路径，均有理由）

- D1 `src/config/brand.ts`（新目录）：验收要求 src/lib 无品牌电话/域名，而 settings-registry 默认值需要它们；集中为唯一出处，业务读 Setting/`appOrigin()`。
- D2 `src/components/web/ChatWidget.tsx`：仅 `send()` 重试逻辑（不追加重复问题气泡），无 JSX/className 变化；视觉 46/46。服务端 chat-service 同时去重（不重复写入、不重复进历史）。
- D3 `src/app/(web)/articles/[id]/page.tsx`：一行 `recordView`（ADR-026 指定接入点"与 viewCount 同一处"），无渲染变化。
- D4 `scripts/import-main-content.mjs`：补 `site.icp`/`contact.worktime` 映射（编排承接项）。
- D5 迁 withApi 的路由中 `notify-rules`、`manager/dashboard`、`publish-jobs/*`、`collect-sources/*`、`kb/test`、`llm/providers/[id]/balance`、`wechat/accounts/[id]/test` 部分不在提示词列举路径内（编排承接项"move remaining hand-written routes onto withApi"）。
- D6 迁移额外包含 `Knowledge.syncStatus/syncErr/syncedAt` 与 `ChatScene.llmProviderId`（同步队列与按场景选模型为编排明确要求；均 ADD COLUMN）。

## 8. 后续方向承接

- **P07**：内容中枢表单的状态下拉仍列出"已通过/已发布"（后端已拒绝"变更到"这两态，表单需改为只读展示 + 审核按钮调用 `/review`）；采集源表单加 `autoToKb`/`autoApprove`（后者仅超管可见）/cron 留空=仅手动；AI 场景表单加"专属模型"；区块配置管理页（四资源 API 已就绪，权限 `block:*`，需加菜单）；校验错误使用 `data.fieldErrors` 逐项标红；发布任务列表可直接用返回的 `title`。
- **P11**：`collect.run` 任务行 cron 为每日 04:00，源级 cron 只在该频率下判定到期——若需更细粒度，把任务行改为 `*/10 * * * *`；`publishAutoChannels`/`publishAutoDelayMinutes`/`wechatFallbackReply`/`siteUrl` 设置分组的 UI 呈现。
- **P12**：实现 Coze `KbRemoteAdapter` 并在启动时 `registerKbRemoteAdapter`；检索可叠加 Coze 轨；考虑把 kb.sync 独立为 CronJob（本方向 seed 不允许加任务行）。
- **P06 未完成的 withApi 迁移（24 个）**：auth/*（4）、apply、articles(GET 列表)、file、health、upload、根 route、llm/providers（3）、manager-menus、roles（2）、settings（3）、users（2）、wechat/accounts（2）、wechat/callback（XML 协议，需保留自定义响应）。公开/协议类路由需逐个评估是否适合统一信封。
- **P10**：`notifyEvent` 聚合串行仅进程内；多进程部署需 DB 级唯一约束或锁。
