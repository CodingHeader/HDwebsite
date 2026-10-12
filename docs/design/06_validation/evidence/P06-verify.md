# P06 独立校验报告（逻辑）

- 范围：`880c928..f486ee2`（6 个提交：29c96e2 / 6f08974 / cfbbce6 / 0f1d82e / e5cac93 / f486ee2），分支 `upgrade`，未推送
- 标准：`docs/design/04_planning/review-prompts/P06-逻辑.md` 验收标准 + `hdw-orchestration.md` 约束
- 方法：只看 diff 与命令结果；未采信执行者证据。自写临时测试（15 例，跑完已移出仓库，未提交）：`/workspace/work/p06v/zz-p06-verify.test.ts`、`zz-p06-verify-kb.test.ts`
- 校验时间：2026-10-13（UTC+8）

## 结论：**PASS**（无 FAIL；若干非阻断项见末尾）

## 1. 门禁复跑

| 命令 | 结果 |
| --- | --- |
| `npm run lint` | PASS：0 error / 21 warning（未使用的 eslint-disable 等） |
| `npm run typecheck` | PASS：exit 0 |
| `npm test` | PASS：17 个文件 / 210 个测试全部通过（含 P06 的 6 个指定测试文件 + p06-followups + view-stats） |
| `npm run build` | PASS：exit 0 |
| `npm run test:e2e`（先 build） | PASS：8/8（首次因 chromium 缺 libatk 失败 → `sudo npx playwright install-deps chromium` 后重跑通过；属环境问题） |
| `/workspace/work/.visual/run-visual.sh test`（:6789 运行当前构建） | PASS：46/46（含"首页含 Banner 轮播且区块顺序与 main 一致"） |
| 自写测试 | PASS：13/13 + 2/2 |
| 跑完后 `git status` | 干净（无被跟踪文件变动）；`prisma/dev.db` 已从备份恢复（`cmp` 一致） |

## 2. 验收标准（逐条）

| # | 验收标准 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `content:edit` 非超管 PUT `{status:"published"}` → 400；`/review` → 403 | PASS | 自写测试：PUT→400 且状态不变；/review→403（未登录 401）。live（:6789）：超管经通用 PUT 改 published 也是 400"不能直接把状态改为 published"。另验：给待审内容建发布任务并执行 → `failed`，不生成 Article（`publish-executor.ts` 的审核门） |
| 2 | `autoToKb=true` 的源运行后 `knowledgeId` 非空且 `kbSearch` 能检索到 | PASS | 自写 RSS 源测试：`newCount=1`，`knowledgeId` 非空，`kbSearch("ZQXWVERIFY")` 命中；`autoToKb=false` → `knowledgeId=null` |
| 3 | `scheduledAt=null` 的任务执行前产生 before_publish_* 记录 | PASS | 自写测试：执行后有 `before_publish_news` 记录（标题正确），`notifySentAt` 已置，记录 `createdAt` ≤ 任务 `startedAt`，结果为 published（`notify-gateway.ts` 的 `notifyBeforePublish` + 执行器在执行前同步调用） |
| 4 | 路由抛异常 → 500 信封 + 1 条 system_error（10 分钟聚合） | PASS | 自写测试：`withApi` 内抛 `Error("SECRET_DB_PASSWORD=hunter2")` 5 次（含 2 次并发）→ 每次都是 `{code:500,data,message}`，响应体不含 "SECRET"/"hunter2"；只生成 1 条 system_error，`toEmails` = 2 个收件人（publish+admin 组） |
| 5 | `grep -rn "400-001-5729\|hd1994.com" src/lib` 为空；公众号走 chat-service，带入 systemPrompt 与知识 | PASS | grep 结果为空。自写测试（mock gatewayChat）：`answerWechatText` 的 system 消息含场景提示词与知识正文，`preferredProviderId` = 场景模型；第 2 轮带上第 1 轮的问答历史 |
| 6 | 状态机测试覆盖全部合法/非法迁移 | PASS | `publish-state-machine.test.ts`：89 例 = 7×7 发布状态对 + 6×6 内容状态对 + 迁移表全等断言 + 未知状态 + 事件全集 |
| 7 | block-registry 测试；四个区块资源 CRUD 200/401/403/400 | PASS | `block-registry.test.ts` 17/17；自写测试覆盖 page-templates / content-blocks / element-configs / template-blocks：401（未登录）、403（无 block 权限）、400（非法 code/layer/templateId）、增删改查 200/201；template-blocks 部分 PUT 后 blockId 保持不变。live：非法 code → 400，带字段级 `fieldErrors` |
| 8 | 默认区块配置下 `npm run test:visual` 通过 | PASS | 46/46；dev.db 中 `home` 模板有 12 个 TemplateBlock |

## 3. 指定专项检查

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 迁移 `20261012154723_p06_collect_kb_review` 逐行审 | PASS | 共 9 句：CollectSource +autoToKb(默认 true)/+autoApprove(默认 false)；CollectItem +kbSyncedAt；Knowledge +syncStatus(默认 'local')/+syncErr/+syncedAt + 索引 `Knowledge_syncStatus_idx`；ChatScene +llmProviderId（不加外键）。全部是 ADD COLUMN / CREATE INDEX，没有重建表、没有 DROP/UPDATE |
| 在 P06 之前的库上应用 | PASS | `p04-devdb-backup.db` 副本 + 手工套 p04 SQL → 再套 p06：46 张表行数完全不变。另用 `prisma migrate deploy` 应用到 p04 备份副本：行数不变、`integrity_check ok`、`foreign_key_check` 为空；存量 5 个源 autoToKb=1、autoApprove=0；存量知识全部 syncStatus=local |
| schema 与迁移无漂移 | PASS | `prisma migrate diff --from-config-datasource --to-schema`（dev.db 和迁移后副本两次）均输出"empty migration" |
| `prisma/rollback/p06.sql` | PASS | 在迁移后副本上执行：schema 与只到 p04 的库逐对象全等，行数不变，`_prisma_migrations` 中 p06 行被删；之后再 `migrate deploy` 能重新应用，schema/行数与第一次一致 |
| 选模型顺序：场景 → 默认 → 优先级 → 兜底 | PASS | 自写测试 `orderProviders`：选场景 5 → [5,3(default),4,2(priority 升序),1(fallback)]；不选 → [3,4,2,5,1]；场景 id 不存在/停用 → 按默认路由 |
| 部分更新不再重置默认值 | PASS | 自写测试 + live：只 PUT title → status 仍为 pending_review，tags 仍为 `["k"]`，contentType 不变；collect-source 只改 name → autoApprove/autoToKb 保持 |
| settings 能读到非公开键 | PASS | 自写测试：`getAllSettings()` 读到 DB 中 isPublic=false 的 `collectUserAgent`，`getSettings()` 读不到；collect-engine/collect-test/llm-gateway/wechat/content-workflow 均已改用 `getAllSettings` |
| autoApprove 只有 SuperAdmin 能开 | PASS | 自写测试：Editor（有 collect:create/edit）POST autoApprove=true → 403；超管 → 201；Editor 把 false 改成 true → 403；Editor 改其他字段/回传原值 → 200 且 autoApprove 不变 |
| 硬编码电话/域名 | PASS（范围按验收写的 src/lib） | 常量集中到新文件 `src/config/brand.ts`，作为 settings-registry 默认值和 `appOrigin()` 兜底。前台页面里仍有兜底写法（`(web)/about|campus|contact|courses`、Footer、`data/home.ts`、robots/sitemap），P06 禁止改这些文件 → 归 P11 |
| 24 个路由未走 withApi | 后续项（P08） | `grep -rL "withApi\|crud(...)" src/app/api --include=route.ts` = 24（auth/*、users、roles、settings、upload、llm/providers、wechat/accounts、wechat/callback、apply、articles、file、health 等）。P06 验收只要求"路由抛异常 → 500 + system_error"，已在 withApi 上验证通过，不要求全量迁移；这些路由的未捕获异常暂时不会发 system_error |

## 4. 修改路径（`git diff --name-only`）

不在提示词"允许修改"清单内的文件：

| 文件 | 判定 |
| --- | --- |
| `src/components/web/ChatWidget.tsx` | 越界（属禁止的前台文件），可接受：只改重试逻辑（不再重复追加问题气泡），没动 JSX/className；P05 校验时编排已把此项指给 P06；视觉 46/46 |
| `src/app/(web)/articles/[id]/page.tsx` | 越界（禁止的前台文件），可接受：只加 1 行 import + fire-and-forget `recordView`（ViewStats 接入，P04 承接项指给 P06）；不影响渲染；视觉通过 |
| `src/app/api/{notify-rules,manager/dashboard,publish-jobs/*/cancel,retry,collect-sources/*/run,test,kb/test,llm/providers/*/balance}/**` | 越界，可接受：迁入 withApi（P03 承接项指给 P06）；发布取消/重试加了状态机校验 |
| `scripts/import-main-content.mjs` | 越界，可接受：补 site.icp / contact.worktime 映射（P04 承接项） |
| `src/config/brand.ts`（新） | 越界，小问题：集中放品牌默认常量，用来满足"src/lib 不硬编码" |
| `prisma/rollback/p06.sql` | 提示词"回滚"一节要求提供，合规 |
| ADR-017 补充 | 在 docs/design 下，合规 |

迁移里的 Knowledge.sync* 与 ChatScene.llmProviderId 超出提示词点名的字段，但属于"等本方向必需字段"，且都是加列，接受。

## 5. 编排约束

| 约束 | 结果 |
| --- | --- |
| 前台保持 main 的红色横幅轮播外观 | PASS：视觉 46/46；`(web)/page.tsx` 只改组合层（`resolveHomeBlocks()` 决定区块取舍和顺序），区块 JSX 未动 |
| main 的功能没有减少 | PASS：区块配置运行时 + 4 个资源 API 已补齐；SSE 事件仍是 meta/delta/done/error（diff 对照） |
| 知识库文件类型只收 Word/MD/TXT | 不涉及（P06 没碰上传类型） |
| 没提交密钥/dev.db/.env | PASS：diff 中 grep sk-/ghp_/api_key/secret/password 字面量为空；没有 .env*、dev.db、backups 文件 |
| 只新增 1 个迁移 | PASS |

## 6. 回归抽查（≥5）

1. 发布重试/取消：`retry` 只放行 failed/cancelled/scheduled/pending，published → 400（`canTransitionPublishJob`）。PASS（代码）
2. `collect-items` 审核通过：不再在事务里新建 Knowledge，改为 `ingestCollectItem`（有就更新），并自动排期。PASS（代码；e2e collect-publish 通过）
3. 审核通过后自动发布：live 下超管 `/review` → approved + 1 个 website 任务（scheduled，+60 分钟，读取的是非公开设置 `publishAutoChannels`/`publishAutoDelayMinutes`）。PASS
4. 官网 SSE：live 下无模型时返回 502 信封"尚未配置可用的 AI 模型供应商"，行为与 P05 一致；e2e apply-chat 通过。PASS
5. 校验错误：live 400 带字段级中文 `fieldErrors`（"不能为空"、自定义 code 文案）。PASS
6. 首页 DB 读失败或无配置 → 按 main 默认顺序（`block-registry.ts` 的 try/catch 与空配置回落）。PASS（代码 + 测试）
7. scheduler 任务异常 → `notifyJobFailed`（动态 import，失败不影响释放锁）；collect.run 跳过空 cron。PASS（代码 + scheduler-cron/p06-followups 测试）

## 非阻断项（不影响 PASS，转给后续阶段）

- P08：24 个手写路由迁入 withApi（迁完后它们的异常才会发 system_error 邮件）。
- P10：system_error 的 10 分钟去重只在单进程内有效；邮件正文含错误信息 + 5 行堆栈（只发给管理员组，不出现在响应里），建议做脱敏。
- P11：前台页面与 robots/sitemap 里的电话/域名兜底常量，统一改为读 `BRAND_DEFAULTS`/Setting。
- 非超管可以把 autoApprove 从 true 改成 false（只限制了开启，属于更安全的方向）；如需"改动也只限超管"，P07 表单一并处理。
- `api/wechat/callback/route.ts` 的 `settings` 变量读了没用（不影响功能）。
- 环境：live 服务器需要 `JWT_SECRET`（≥32 字符），否则 `/api/auth/login` 返回 500"登录失败"——不是 P06 回归；e2e 有自己的环境变量。
