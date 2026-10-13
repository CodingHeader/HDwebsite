# B-domain 审计：P09 拓展 / P12 知识库 / P13 响应 —— 提示词 vs 当前代码

- 仓库：`/workspace/work/hd/repo`，分支 `upgrade`，HEAD `bb2c0e5`（最后一次代码提交 `e5cac93`，其后仅 docs）；`git status` 干净
- 方法：只读（cat/grep/find/sed/git log）；**未运行**任何 build/test/lint；凡依赖运行结果的结论标"未验证"
- 读过的文档：`docs/design/04_planning/review-prompts/P09-拓展.md`、`P12-知识库.md`、`P13-响应.md`（均 created 2026-10-12）、`docs/design/03_solution/decisions/ADR-024-*.md`、`ADR-025-*.md`、`docs/design/06_validation/evidence/P06-verify.md`、`P06-execution.md §7/§8`、`current-plan.md`（§4/§5/§6 相关行）、P07/P08/P10/P11/P14/P15 的"允许修改/依赖"段
- 审计时间：2026-10-13（UTC+8）

---

## 0. 结论速览

| 方向 | 评审证据条目 | 仍成立 | 已部分解决 | 已解决 | 提示词有误/行号漂移 |
| --- | --- | --- | --- | --- | --- |
| P09 | 6 | 4（#1 #2 #3 #5）+#6 保持 | #4（P06 新增 kb-sync 适配器注册口） | — | #1 #2 #3 #4 行号全部漂移；遗漏 4 处同类分支 |
| P12 | 6 | #1 #2 #6 | #3 #4 #5 | — | #4 证据位置已迁到 chat-service；目标 5 的 `knowledgeBaseIds` 与已有 `ChatScene.baseIds` 重复 |
| P13 | 7 | #1 #2 #3 #4 #5 | #6（已有契约测试夹具） | — | #5 ChatWidget 行号错；#6 "33 个单测"过时；#7 前提（P07 DataTable）不存在 |

关键新事实（提示词写于 P06 之前，不知道）：
1. P06 已建 **远端知识库同步队列 + 适配器注册口**：`src/lib/kb-sync.ts:12-28`（`KbRemoteAdapter`/`registerKbRemoteAdapter`/`getKbRemoteAdapter`），`collect.run` 末尾调用 `processKbSyncQueue`（`src/lib/jobs/index.ts:19,33`）。P09 的 `KnowledgeBackend` 与它重叠，必须合并口径，否则出现两套 KB 注册表。
2. P06 已建 **chat-service 两渠道共用装配**：`src/lib/chat-service.ts:75-91`（`buildChatContext`），官网 `src/app/api/chat/stream/route.ts:49`、公众号 `src/lib/chat-service.ts:114`（经 `src/lib/wechat.ts:140 chatOnce`）。P12"两渠道 messages 一致"在结构上已满足。
3. P06 已支持 **场景单模型置顶**：`ChatScene.llmProviderId`（`prisma/schema.prisma:606`，迁移 p06），`llm-gateway.ts:37-52 orderProviders(preferredId)`。P12 的 `providerIds[]` 是扩展而非新建。
4. `ChatScene.baseIds String?` **早已存在**（`prisma/schema.prisma:594`，init 迁移 `migration.sql:444`，契约 `resources.ts:217`，管理表单 `crud-specs.tsx:389`"绑定知识库 ID"），但后端**无任何读取**（`grep -rn baseIds src` 只有契约与表单）——死字段。P12 计划再加 `knowledgeBaseIds` 会形成重复列。
5. P08 尚未执行：仍有 **24 个路由未走 withApi/crud**（命令见 §3），`src/lib/http-client.ts` 不存在。P09 前置"P08 http-client、withApi 已统一"与 P13 前置"全部路由已 withApi"均**未满足**。

---

## 1. 逐条核验

### 1.1 P09 拓展

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `publish-executor.ts:19` `if (job.channel === "website")`、`:66-105` website、`:120-150` wechat | **仍成立（行号漂移）** | 分支在 `src/lib/publish-executor.ts:34-38`（:19 现为 `executePublishJob` 签名）；website 实现 `publishToWebsite :79-109` + `updateOrOfflineWebsite :112-136`；wechat `publishToWechat :138-170`；P06 在执行前加了审核门 `:24-29` 与 `notifyBeforePublish :31`（属执行器公共逻辑，抽渠道时须留在核心） |
| 2 | `llm-gateway.ts:146`、`:183` `kind === "coze"` | **仍成立（行号漂移）** | `src/lib/llm-gateway.ts:156`（gatewayChat）、`:194`（gatewayChatStream）；openai 实现 `callOpenAI :79-103`、`openAIStream :212-257`；coze `callCoze :105-123`。**遗漏的同类分支**：`src/app/api/llm/providers/[id]/test/route.ts:33`（测试端点自带一份 coze/openai 调用，重复了 callOpenAI）、`src/lib/kb-adapter.ts:86`（`p.kind === "coze"`）、管理页 `src/app/manager/llm-providers/page.tsx:65,213,214` |
| 3 | `collect-engine.ts:155` `type === "rss"` + html 默认 | **仍成立（行号漂移）** | `src/lib/collect-engine.ts:163`（rss :163-168，html :169-202）；**遗漏**：`src/lib/collect-test.ts:37`（试抓也有一份 rss/html 分支）；管理表单 `crud-specs.tsx`（collect-sources 段 `type` select 选项硬编码） |
| 4 | `kb-adapter.ts:28` searchLocal、`:68` searchViaCoze、`:90` kbSearch | **已部分解决（行号漂移）** | `src/lib/kb-adapter.ts:28` searchLocal、`:84` searchViaCoze、`:106` kbSearch；P06 新增 `src/lib/kb-sync.ts:12-28` 远端适配器类型+全局注册（`push/remove`），即"检索后端无接口"中**推送侧**已有接口，检索侧仍无 |
| 5 | notify-gateway 仅 SMTP，不抽象 | **仍成立** | `src/lib/notify-gateway.ts:8`（nodemailer 唯一）、`:28-41 transport()`；另有渠道文案分支 `:190,:210-211`（`job.channel === "wechat"`），属展示文案 |
| 6 | `jobs/index.ts:11-50` 任务注册表已存在 | **仍成立（保持）** | `src/lib/jobs/index.ts:11-58`（6 个 registerJob），`scheduledJobNames :60-67` |
| 目标 | 四注册表 + `contracts/kinds.ts` | 未开始 | `src/contracts/kinds.ts`、`src/lib/{channels,llm,collect,kb}/` 均不存在；枚举仍硬编码：`resources.ts:276`（collectSource.type）、`:303`（publishJob.channel）、`:331`（llmProvider.kind） |
| 验收 grep | 3 文件无分支 | 当前命中 3 行 | `publish-executor.ts:34`、`llm-gateway.ts:156,194`、`collect-engine.ts:163`（共 4 行）。**提示词缺陷**：grep 只覆盖 3 文件，遗漏的 `collect-test.ts:37`、`llm/providers/[id]/test/route.ts:33`、`kb-adapter.ts:86`、`content-workflow.ts:42-63` 即使不改也能通过验收 |
| 冲突 | "后台下拉自动出现" vs 禁止改 `src/app/**` | **提示词有误** | 下拉/标签在 `src/components/manager/crud-specs.tsx`（collect-sources type select）、`src/app/manager/llm-providers/page.tsx:213`、`src/app/manager/publish-jobs/page.tsx:200`，均不在 P09 允许路径内（允许仅 `src/lib/**`、contracts 两文件） |
| 前置 | P08（http-client、withApi） | **未满足** | `src/lib/http-client.ts` 不存在；24 路由未 withApi（§3.3） |

### 1.2 P12 知识库

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `model Knowledge` 无库/文件实体 | **仍成立** | `prisma/schema.prisma:563-583`；`grep -n "^model KnowledgeBase\|^model KnowledgeFile"` = 0。P06 已加 `syncStatus/syncErr/syncedAt`（:574-576） |
| 2 | `kb-adapter.ts:4` 注释；`coze.ts` 仅 `/v3/chat`（:35、:106） | **仍成立** | `kb-adapter.ts:4` 原样；`src/lib/coze.ts:35,106,131-132,144-145` 全是 `/v3/chat*`；`grep -n "dataset\|document\|Agw" src/lib/coze.ts` = 0；`headers()` 在 `coze.ts:19`（可抽为共用请求工具） |
| 3 | `kb-adapter.ts:34-38` 只取 50 条；`:45-46` 空白分词 | **已部分解决** | 仍 `take: 50`（`kb-adapter.ts:34-38`）；P06 已加中文 bigram：`:43-52` 打分 + `cjkBigrams :68-75`。无按库过滤、无 BM25、无 LIKE 预筛、无命中率基线 fixture |
| 4 | `chat/stream/route.ts:66-70` 仅按 knowledgeTags；ChatScene 无 provider/参数；`llm-gateway.ts:36-41` 全局路由 | **已部分解决（证据位置失效）** | 标签过滤已移到 `src/lib/chat-service.ts:62-66 buildKbContext`（route 不再检索）；ChatScene 已有 `llmProviderId`（schema :606、契约 `resources.ts:220`），`llm-gateway.ts:37-52 orderProviders` 场景置顶。仍缺：多 provider 优先级、temperature/maxTokens/topP 覆盖（LLMProvider 自身有 :494-496）、按库过滤（`baseIds` 死字段，见 §0-4） |
| 5 | autoToKb 只写本地 | **已部分解决** | 采集→`collect-engine.ts:279-281` → `kb-sync.ts:31-52 ingestCollectItem`（`syncStatus=pending`）→ 队列 `processKbSyncQueue :58-83`；**未注册任何适配器**（`grep -rn registerKbRemoteAdapter src` 仅定义处 `kb-sync.ts:22`），队列永远 skipped；无目标库（`CollectSource` :776-801 无 `knowledgeBaseId`） |
| 6 | `manager/knowledge/page.tsx` 8 行 CrudPage、`/api/kb/test` | **仍成立** | `src/app/manager/knowledge/page.tsx` 8 行；`src/app/api/kb/test/route.ts:8-11` 只有 `query/tags`，且 **testSchema 内联在路由**（违反"contracts 唯一源"） |
| 目标 2-4 | 文件白名单/Coze 同步/本地切分 | 未开始 | `src/lib/kb/`、`src/contracts/kb.ts` 不存在；`package.json` 无 mammoth（`grep mammoth` = 0） |
| 目标 5 | ChatScene 增 `knowledgeBaseIds` | **提示词有误** | 应复用已有 `ChatScene.baseIds`（或在 p12 迁移中显式弃用/改名并说明），避免两列同义 |
| 目标 5 | kind=coze 时由 Coze 智能体回答 | 现状提示 | coze 流式路径丢弃 system 消息（`llm-gateway.ts:197`），非流式只发最后一条 user（`:107,116`）→ 场景提示词/历史对 Coze 无效；需在 P12 场景装配中显式处理（未验证 Coze bot 侧配置） |
| 目标 6 | 两渠道 messages 一致 | **已部分解决** | 已共用 `buildChatContext`（route :49；chat-service :114）；现有测试 `src/lib/__tests__/wechat-chat.test.ts`（是否断言"完全一致"：未验证） |
| 允许路径 | — | **提示词遗漏** | 实现必需但不在 P12 允许清单：`src/lib/kb-sync.ts`（注册 Coze 适配器/目标库）、`src/lib/crud-resources.ts:259-275,320-336`（chat-scenes/knowledge/collect-sources 的 JSON 数组字段与新资源 spec）、`src/app/api/chat/stream/route.ts:55`（要把 providerIds/params 传给 `gatewayChatStream`）、注册入口（`src/instrumentation.ts` 或 `src/lib/jobs/index.ts`，前者属 P11） |
| 存储 | "P14 统一迁入 storage.ts 的 kbFilesDir()" | 前提不存在 | `src/lib/storage.ts` 不存在，P14 在 P13 之后 → P12 自建 `src/lib/kb/storage.ts` 合理 |
| 迁移风险 | `Knowledge.baseId → KnowledgeBase` 外键 | 风险（未验证） | P06 刻意"不建外键以免 SQLite 整表重建"（schema :605）；P12 若声明 relation，Prisma 对 SQLite 可能生成 RedefineTables（Knowledge/CollectSource/ChatScene 整表重建）。建议沿用 P06 做法：Int? 无 relation，或 `--create-only` 审 SQL |

### 1.3 P13 响应

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `common.ts:14-21` 只含 200/400/401/403/404/500；stream 返回 502 | **仍成立（扩大）** | `src/contracts/common.ts:14-21` 与 `errorCodes :60-67` 未变；502 现有 **3 处**：`api/chat/stream/route.ts:58`、`api/collect-sources/[id]/run/route.ts:20`、`api/publish-jobs/[id]/retry/route.ts:28`；`created()` 为 code 200 + HTTP 201（`api-response.ts:16-18`，与目标"HTTP 与 code 一致"冲突，10 处调用：`grep -rn "created(" src/app/api src/lib` = 10） |
| 2 | 限频 `error(..., 400)`（:36-37） | **仍成立** | `api/chat/stream/route.ts:37-39`；`ApiHttpError.status` 仅 `400\|401\|403\|404`（`src/lib/api-handler.ts:25-27`），无法抛 409/429 |
| 3 | `api/route.ts:7` 手写 NextResponse.json | **仍成立** | `src/app/api/route.ts:7`；`grep -rn "NextResponse.json(" src/app/api \| grep -v api-response` 仅此 1 行 |
| 4 | wechat/callback:18 纯文本 500；file 23,27 纯文本 404 | **仍成立** | `api/wechat/callback/route.ts:18`（500）、`:20`（echostr）、`:22,:35`（403 文本）；`api/file/[...path]/route.ts:23,27`（404）、`:33` 流；`NON_JSON_ROUTES` 未定义 |
| 5 | SSE `meta/delta/done/error` 无 zod；`ChatWidget.tsx:41` 起手工解析 | **仍成立（行号有误）** | 服务端 `sse()` 定义 `chat/stream/route.ts:62`，事件 meta :66-68、delta :77、done :79、error :83-90 与 :92-96；**ChatWidget 解析在 `src/components/web/ChatWidget.tsx:105-128`**（:41 是 localStorage 的 JSON.parse）；非 2xx 处理 `:95-98`；`chatRequestSchema` 仍内联 `route.ts:11-15`；`src/contracts/chat.ts` 不存在 |
| 6 | 无全路由契约测试，"33 个单测" | **已部分解决 / 数字过时** | 单测文件 17 个（`find src -name "*.test.ts" \| wc -l`=17；P06-verify：210 例）；已有契约夹具 `src/lib/__tests__/api-contract/harness.ts`（临时 SQLite + 迁移 + token）、`p03-endpoints.test.ts`（28 个 it）、`with-api.test.ts`（9）；**无**自动发现：`tests/contract/` 不存在；`vitest.config.ts` include 仅 `src/**/__tests__/**/*.test.ts` |
| 7 | manager layout(AppShell)、P07 DataTable 响应式 | **前提不成立** | `src/app/manager/layout.tsx` 已是 AppShell（:13）；`DataTable` 不存在（`grep -rln DataTable src/components` = 0，P07 未执行）；视觉测试 `tests/visual/routes.ts` 有 375/768/1440 但只覆盖前台（`grep -c manager` = 0）；`tests/e2e/responsive.spec.ts` 不存在 |
| 目标1 | 错误体 `data:null, details?` | **与 P06 交付冲突** | P06 的 `validationError` 把字段错误放在 `data.fieldErrors`（`api-response.ts:61-74`，400 时 data 非 null），P06-verify 记"带字段级 fieldErrors"；P13 若改为 `details` 需兼容迁移；另 `manager-fetch.ts:73` 只取 code/message，前端当前不读 fieldErrors（管理页 fieldErrors 为本地校验） |
| 前置 | 全部路由已 withApi（P08） | **未满足** | 24 个（§3.3） |

### 1.4 ADR / P06 承接项核对

| 项 | 来源 | 现状 |
| --- | --- | --- |
| ADR-025 §1 KnowledgeBase/KnowledgeFile | ADR-025:29 | 未实现（schema 无） |
| ADR-025 §2 白名单+文件头 | :30 | 未实现（无 `src/lib/kb/filetype.ts`；`src/app/api/upload/route.ts` 是通用上传，未审其白名单——未验证） |
| ADR-025 §3 md→txt | :31 | 未实现 |
| ADR-025 §4 本地兜底切分、mammoth | :32 | 未实现；无依赖 |
| ADR-025 §5 kind=coze 由智能体回答 | :33 | 部分：coze provider 可对话（`coze.ts`），但无 dataset 绑定管理；system/history 不传（见 1.2） |
| ADR-025 §6 采集入库推 Coze(txt) | :34 | 部分：本地+队列（kb-sync），无 Coze 适配器 |
| ADR-025 §7 PAT/space_id 加密、权限提示 | :35 | 未实现（settings-registry 无 `kbCoze*`：`grep -n kbCoze src/lib/settings-registry.ts` = 0） |
| ADR-025 §8 ≤10MB | :36 | 未实现 |
| ADR-024 | 区块配置 | 与 P09/P12/P13 无直接写冲突；P13 契约测试需覆盖 P06 的 4 个区块资源（content-blocks/page-templates/template-blocks/element-configs，均为 crud 路由） |
| P06-execution §8 → P12 | "实现 Coze KbRemoteAdapter 并启动时 registerKbRemoteAdapter；检索可叠加 Coze 轨；kb.sync 独立 CronJob" | 全部未做；P12 提示词未写入这些承接（且 kb-sync.ts 不在允许路径） |
| P06-verify 非阻断 → P08 | 24 路由迁 withApi | 未做 |
| P06-verify 非阻断 → P10 | system_error 去重进程内、邮件脱敏 | 与本三方向无关 |
| P05-execution:107 → P13 | ChatWidget 停止/重试视觉 | P13 提示词未列，仍待评审 |

---

## 2. 现有适配器形态（文件:行）

### 2.1 发布渠道
- `src/lib/publish-executor.ts`：`executePublishJob :19-55`（状态机校验 :20、审核门 :24-29、提醒 :31、渠道分支 :34-38、成功写回 :39-46）；`markFailed :57-77`（指数退避、job_failed 通知）；`publishToWebsite :79-109`；`updateOrOfflineWebsite :112-136`；`publishToWechat :138-170`；`publishScan :173-188`；`retryFailedScan :191-198`
- `src/lib/wechat.ts`：`getWechatAccountSecret :25`、`getAccessToken :30`、`publishDraftToWechat :170`、`uploadThumb :202`、`addDraft :222`、`mdToWechatHtml :249`、`testAccount :269`；客服：`handleCallback :99`、`answerWechatText :135`（→ chatOnce :140）
- 渠道选择/排期：`src/lib/content-workflow.ts:42-63`（`c === "website"|"wechat"` 过滤与 contentType 映射）
- 渠道文案：`src/lib/notify-gateway.ts:189-190,210-211`
- 契约：`src/contracts/resources.ts:303`（`channel: z.enum(["website","wechat"])`）

### 2.2 LLM
- `src/lib/llm-gateway.ts`：`resolveKey :29-34`、`RouteOptions/getRoutedProviders :37-42`、`orderProviders :45-52`、`recordUsage :54-63`、`recordGatewayFailure :66-68`、`failureCount :70-77`、`callOpenAI :79-103`、`callCoze :105-123`、`gatewayChat :138-167`（分支 :156）、`gatewayChatStream :173-210`（分支 :194，coze 过滤 system :197）、`openAIStream :212-257`
- `src/lib/coze.ts`：`CozeConfig :9`、`headers :19`、`cozeChatStream :30`（`/v3/chat` :35）、`cozeChat :103`（:106 创建、:131 retrieve 轮询、:144 message/list）
- 重复实现：`src/app/api/llm/providers/[id]/test/route.ts:33-45`（自带 coze/openai 调用）
- `src/lib/llm/**`：不存在
- 契约：`resources.ts:329-350`（`kind: z.enum(["openai","coze"])` :331）

### 2.3 采集解析
- `src/lib/collect-engine.ts`：`ParsedItem :29`、`parseRule :40`、`fetchText :52`、`titleSimilarity :62`、`htmlToMarkdown :77`、`transferImage :102`、`transferImagesInMarkdown :137`、`runSource :152-263`（rss :163-168；html 列表+正文 :169-202；去重 :209-221；入库 :226-244；任务/源状态 :247-261）、`parseTags :264`、`afterItemCreated :275-308`（autoToKb :279-281；autoApprove :282-307）
- `src/lib/collect-test.ts`：`fetchTextOnce :9`、`testParseSource :26`（rss 分支 :37，cheerio :43）
- 契约：`resources.ts:274-290`（type enum :276）

### 2.4 知识库
- `src/lib/kb-adapter.ts`：`KbHit :13`、`KbSearchResult :21`、`searchLocal :28-65`、`cjkBigrams :68-75`、`formatKbContext :78-81`、`searchViaCoze :84-103`（用 Coze bot 问答当"检索证据"）、`kbSearch :106-122`
- `src/lib/kb-sync.ts`：`KbRemoteAdapter :12-18`、`registerKbRemoteAdapter :22`、`getKbRemoteAdapter :26`、`ingestCollectItem :31-52`、`pendingKbSync :54-56`、`processKbSyncQueue :58-83`
- `src/lib/chat-service.ts`：`DEFAULT_SYSTEM_PROMPT :14`、`findScene :28`、`loadHistory :35-60`、`buildKbContext :62-66`、`buildSystemPrompt :68-72`、`buildChatContext :75-91`、`recordMessage :93-105`、`chatOnce :108-126`
- 调用方：`api/chat/stream/route.ts:48-55`；`api/kb/test/route.ts:17`；`api/collect-items/[id]/route.ts:57`（审核通过 ingest）；`jobs/index.ts:19,33`
- CRUD：`src/lib/crud-resources.ts:259-275`（chat-scenes、knowledge spec）；管理：`src/app/manager/knowledge/page.tsx`、`src/app/manager/chat-scenes/page.tsx`（均 CrudPage）、`crud-specs.tsx:374-393`（chat-scenes，含死字段 baseIds :389）、`:394-`（knowledge）
- seed：`prisma/seed.ts:86`（kb:* 权限）、`:158`（菜单 knowledge）

---

## 3. 数据与契约现状

### 3.1 schema（`prisma/schema.prisma`）
- `Knowledge :563-583`：id, title, content, tags?, source(default local), externalId?, externalUrl?, priority(0), status(active), syncStatus(local), syncErr?, syncedAt?, createdAt, updatedAt；@@index([status]), @@index([syncStatus])
- `ChatScene :585-614`：id, code @unique, name, description?, greeting, systemPrompt, knowledgeTags?, **baseIds?**（JSON，死字段）, starters?, pageTitle?, pageSubtitle?, headerTip?, sidebarTitle?, processSteps?, promiseList?, contactCardTitle?, useKnowledgeBase(true), **llmProviderId Int?**（无 FK）, status, sort, wechatAccounts[], createdAt, updatedAt
- `CollectSource :776-801`：id, name, type(html), url, parser?, cron, autoTags?, enabled, autoToKb(true), autoApprove(false), lastRunAt?, lastStatus?, errMsg?, tasks, items, createdAt, updatedAt；@@index([enabled])
- 相关：`CollectItem :822-846`（knowledgeId?, kbSyncedAt?）、`LLMProvider :485-519`（kind, botId?, temperature, maxTokens, topP?, priority, isDefault, isFallback, metadata?）

### 3.2 P12 需新增（按提示词，结合现状修订）
- 新表 `KnowledgeBase`（name, code @unique, description?, cozeDatasetId?, syncStatus, syncError?, isDefault, status, sort, 时间戳）
- 新表 `KnowledgeFile`（baseId, filename, ext, mimeType, size, path, sha256, cozeDocumentId?, cozeStatus?, cozeProgress?, cozeError?, localParse, chunkCount, errMsg?, 时间戳；@@index([baseId])）
- `Knowledge` + baseId Int?、fileId Int?、chunkIndex Int?、@@index([baseId, status])
- `ChatScene` + providerIds String?、temperature Float?、maxTokens Int?、topP Float?；**知识库绑定复用已有 `baseIds`**（提示词写 `knowledgeBaseIds`，建议改口径）；与 `llmProviderId` 的关系须定义（建议：providerIds 非空优先，否则 llmProviderId，否则全局）
- `CollectSource` + knowledgeBaseId Int?
- 数据迁移：建"通用知识""采集资讯"两库并回填 Knowledge.baseId（source=collect → 采集资讯）
- Setting 新键 `kbCozeProviderId`、`kbCozeSpaceId`（Setting 是 KV 表，无需迁移；改 `src/lib/settings-registry.ts`，与 P11 同文件）

### 3.3 现存迁移（`prisma/migrations/`）
1. `20261011052216_init`（955 行）
2. `20261011105140_partner_int_id`
3. `20261011110550_course_sort`
4. `20261011111012_llm_kind_botid`
5. `20261012134621_p04_data_integrity`（130 行）
6. `20261012154723_p06_collect_kb_review`（16 行，全 ADD COLUMN/CREATE INDEX）
- 回滚：`prisma/rollback/p06.sql`；P12 需新增 `prisma/rollback/p12.sql`
- 迁移编排（current-plan §5）：p12 为第 7 位，P12 是 P04 之后唯一允许改表的方向

### 3.4 P12 迁移与 P09 KnowledgeBackend 的依赖
- **迁移不依赖 P09**：schema/迁移/seed 是纯数据层，可先于 P09 落地（只要不与其它方向并发改 schema——仅 P12 有权限）。
- **P09 接口不依赖迁移**：`KnowledgeBackend.search/pushDocument/removeDocument/getDocumentStatus` 是代码接口；但 `search` 的参数若要带 `baseIds`、`pushDocument` 若要回写 `KnowledgeFile.cozeDocumentId`，类型需引用 p12 的 Prisma 类型 → 建议接口只用纯 DTO（`{name,fileType,base64}` / `{documentId,status,progress}`），持久化留给 P12 服务层，从而两者解耦。
- **必须合并**：P06 的 `KbRemoteAdapter.push(k: Knowledge)`（kb-sync.ts:12-18，条目级）与 P09 `KnowledgeBackend.pushDocument(file)`（文件级）。建议 P09 让 `KnowledgeBackend` 含两类推送（`pushDocument` + 由其派生的条目推送：条目 Markdown→txt document），并把 `registerKbRemoteAdapter` 改为从 KB 注册表取当前后端的薄包装，保留导出名兼容 `collect-autokb.test.ts`。

### 3.5 响应契约
- 错误码：`src/contracts/common.ts:14-21`（apiResponseCodeSchema）、`:60-67`（errorCodes），均仅 200/400/401/403/404/500；信封 `apiEnvelopeSchema :24-28`（code 为 z.number，未用枚举）
- 工厂：`src/lib/api-response.ts`：`build :8`、`success :12`、`created :16`（code200/HTTP201）、`error :20`（任意 code）、`unauthorized :24`、`forbidden :28`、`notFound :32`、`serverError :36`、`localizeIssue :43`、`validationError :61-74`（data.fieldErrors）；无 conflict/tooManyRequests/badGateway/serviceUnavailable
- withApi：`src/lib/api-handler.ts:129-187`（重载 :129/:133/:137）；`ApiHttpError :24-33`（status 仅 400/401/403/404）；异常映射 :161-169（P2002/P2003→400，P2025→404，可考虑 P2002→409）；`onApiError/emitApiError :60-68`；`parseBody :81`、`parseQuery :93`、`parseId :100`
- CRUD 工厂 `src/lib/crud.ts:77/106/136/148/186` 均包 withApi
- 429：**无**（限频返回 400，`chat/stream/route.ts:38`）；502：3 处（见 1.3#1）；503：**无**（`grep -rnE ", 503\)" src` = 0）
- 非 withApi 路由 24 个（`grep -rLE "withApi|crud[A-Za-z]*\(|from \"@/lib/crud" src/app/api --include=route.ts`）：apply、articles、auth/{login,logout,me,refresh}、file/[...path]、health、llm/providers、llm/providers/[id]、llm/providers/[id]/test、manager-menus、roles、roles/[id]、根 route、settings、settings/definitions、settings/email/test、upload、user-actions、users、users/[id]、wechat/accounts、wechat/accounts/[id]、wechat/callback。（注：P06-verify 的另一种 grep 写法得到的清单与此一致为 24 个；`user-actions` 在本清单内而 P06-execution 列表未列，未逐一核对差异）
- 路由文件总数：102（`find src/app/api -name route.ts | wc -l`）；导出方法约 204（grep 计数，含 `export const/async function GET|POST|PUT|PATCH|DELETE`）
- 内联 zod（违反契约唯一源）：`api/apply/route.ts`、`api/chat/stream/route.ts:11-15`、`api/kb/test/route.ts:8-11`
- SSE：服务端 `src/app/api/chat/stream/route.ts:61-121`；客户端 `src/components/web/ChatWidget.tsx:89-131`（解析 :105-128，事件仅处理 delta/error，忽略 meta/done）
- 前端错误分类：`src/lib/manager-fetch.ts:39-75`（401 跳登录 :58-64、403 ForbiddenError :71、非 JSON :72、其它 code 通用 ApiError :73）——无 409/429/502/503 分类
- 契约测试：`src/lib/__tests__/api-contract/{harness.ts,p03-endpoints.test.ts,with-api.test.ts}`；`tests/contract/` 不存在
- 文档：`docs/design/13-响应设计.md §1` 仍写 error 码 400/500，与代码一致、与 P13 目标不一致

---

## 4. 三方向写入文件集合与重叠

### 4.1 P09（提示词 + 审计补充★）
- 新：`src/contracts/kinds.ts`；`src/lib/channels/{types,registry,website,wechat}.ts`；`src/lib/llm/{types,registry,openai,coze}.ts`；`src/lib/collect/{types,registry,html,rss}.ts`；`src/lib/kb/{types,registry,local,coze}.ts`；`src/lib/__tests__/registries.test.ts`；`docs/design/03_solution/decisions/ADR-027-适配器注册表.md`
- 改：`src/lib/publish-executor.ts`、`src/lib/llm-gateway.ts`、`src/lib/collect-engine.ts`、`src/lib/kb-adapter.ts`、`src/contracts/resources.ts`（:276/:303/:331）
- ★应补：`src/lib/collect-test.ts`（:37）、`src/lib/kb-sync.ts`（合并注册口）、`src/app/api/llm/providers/[id]/test/route.ts`（:33，属 `src/app/**`，需放行）、`src/lib/content-workflow.ts`（可选）、下拉来源 `src/components/manager/crud-specs.tsx` / `src/app/manager/{llm-providers,publish-jobs}/page.tsx`（若坚持"下拉自动出现"）

### 4.2 P12
- `prisma/schema.prisma`、`prisma/migrations/<ts>_p12_knowledge_base/`、`prisma/rollback/p12.sql`、`prisma/seed.ts`
- `src/contracts/resources.ts`、`src/contracts/kb.ts`(新)
- `src/lib/kb/{filetype,parse,chunk,local,coze,storage}.ts`、`src/lib/kb-adapter.ts`、`src/lib/coze.ts`、`src/lib/chat-service.ts`、`src/lib/llm-gateway.ts`、`src/lib/llm/**`、`src/lib/collect-engine.ts`、`src/lib/settings-registry.ts`
- ★必需但未放行：`src/lib/kb-sync.ts`、`src/lib/crud-resources.ts`、`src/app/api/chat/stream/route.ts`、注册入口（`src/instrumentation.ts` 或 `src/lib/jobs/index.ts`）
- `src/app/api/knowledge-bases/**`、`src/app/api/knowledge-files/**`、`src/app/api/kb/test/route.ts`、`src/app/api/chat-scenes/**`、`src/app/api/collect-sources/**`
- `src/app/manager/knowledge-bases/**`、`src/app/manager/knowledge/**`、`src/app/manager/chat-scenes/**`、`src/components/manager/crud-specs.tsx`
- `package.json`、`package-lock.json`、`.gitignore`
- 测试：`src/lib/__tests__/{kb-filetype,kb-coze,kb-chunk,kb-search,kb-parse,chat-service-scene}.test.ts`、`tests/e2e/knowledge.spec.ts`；证据 `docs/design/06_validation/evidence/P12*`

### 4.3 P13
- `src/contracts/common.ts`、`src/contracts/chat.ts`(新)、`src/lib/api-response.ts`、★`src/lib/api-handler.ts`（ApiHttpError 需支持 409/429，提示词未列）、`src/lib/manager-fetch.ts`
- `src/app/api/route.ts`、`src/app/api/chat/stream/route.ts`、及按需 `src/app/api/**`
- `src/components/web/ChatWidget.tsx`（仅解析）、`src/components/manager/**`（仅响应式类）
- `tests/contract/{routes.test.ts,rules.ts}`、`tests/e2e/responsive.spec.ts`、`vitest.config.ts`、`docs/design/13-响应设计.md`

### 4.4 重叠矩阵（★= 同一文件被多方向写）

| 文件 | P09 | P12 | P13 | 其他方向 |
| --- | --- | --- | --- | --- |
| `src/lib/llm-gateway.ts` | ★搬迁 openai/coze 实现 | ★`gatewayChat(messages,{providerIds,params})` | — | P15 |
| `src/lib/llm/**` | ★新建 | ★场景参数 | — | P15 |
| `src/lib/kb/coze.ts`、`kb/local.ts`、`kb/types.ts` | ★新建占位/搬迁 | ★实现/重写算法 | — | — |
| `src/lib/kb-adapter.ts` | ★改门面 | ★扩展 | — | — |
| `src/lib/kb-sync.ts` | ★(应)合并注册口 | ★(应)注册 Coze/目标库 | — | — |
| `src/lib/collect-engine.ts` | ★解析器搬出 | ★目标库+推送 | — | P14（存储调用）、P15（图片规则） |
| `src/contracts/resources.ts` | ★枚举来源 | ★kb/chatScene schema | — | P08 |
| `src/lib/chat-service.ts` | — | ★ | — | — |
| `src/app/api/chat/stream/route.ts` | — | ★(应)传 providerIds/params | ★429/SSE schema | P08（若迁 chatRequestSchema） |
| `src/app/api/kb/test/route.ts`、`knowledge-bases/**` | — | ★新建/扩展 | ★契约规则/工厂替换 | — |
| `src/app/api/llm/providers/[id]/test/route.ts` | ★(应) | — | ★(withApi/信封) | P08（withApi 迁移） |
| `src/components/manager/crud-specs.tsx` | ★(若做下拉) | ★ | ★(响应式) | P07、P08 |
| `src/lib/settings-registry.ts` | — | ★kbCoze* | — | P11 |
| `prisma/seed.ts` | — | ★ | — | P07（菜单） |
| `package.json` | — | ★mammoth | — | P07、P11、P15 |
| `vitest.config.ts` | — | — | ★include tests/contract | P07（environmentMatchGlobs） |
| `src/lib/api-handler.ts` | — | — | ★ | P08 |
| `src/lib/publish-executor.ts` | ★ | — | — | P10 |

---

## 5. 建议的最小原子任务拆分

约定：每任务 ≤2 天、单独提交、单独验收；"验收命令"中的 `npm run …` 由执行者在自己的工作树运行（本审计未运行）。通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 每任务末尾都跑，下表不重复写。

### P13 系（可最早启动的部分）

| ID | 内容 | 允许修改 | 验收命令 | 规模 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| R1 | 错误码契约冻结：`apiResponseCodeSchema`/`errorCodes` 扩到 {200,400,401,403,404,409,429,500,502,503}；工厂 `conflict/tooManyRequests/badGateway/serviceUnavailable`；`ApiHttpError` 支持 409/429/502/503；P2002→409（需评估前端）；3 处 `error(...,502)` 改 `badGateway`；`api/route.ts` 改 `success`；限频改 429；`NON_JSON_ROUTES` 常量 | `src/contracts/common.ts`、`src/lib/api-response.ts`、`src/lib/api-handler.ts`、`src/app/api/route.ts`、`src/app/api/chat/stream/route.ts`（仅 :37-39、:58）、`src/app/api/collect-sources/[id]/run/route.ts`、`src/app/api/publish-jobs/[id]/retry/route.ts`、`src/lib/__tests__/api-contract/**` | `grep -rn "NextResponse.json(" src/app/api \| grep -v api-response` 为空；`grep -rnE "error\([^)]*, *(429\|502\|503)\)" src/app/api` 为空；新增测试"第 11 次请求 HTTP 429 且 code 429"通过 | 0.5–1 天 | 需与 P08 错开（同写 api-handler/contracts） |
| R2 | SSE 契约：`src/contracts/chat.ts`（`chatRequestSchema`、`chatSseEventSchema` 判别联合）；服务端经 schema 构造事件；ChatWidget 仅解析改 `safeParse` | `src/contracts/chat.ts`、`src/contracts/index.ts`、`src/app/api/chat/stream/route.ts`（:11-15、:62-96）、`src/components/web/ChatWidget.tsx`（:105-128）、测试 | 单测：4 类事件 parse 往返；`npm run test:e2e`（apply-chat）、`npm run test:visual` 通过 | 0.5 天 | R1 后（同文件串行）；与 P12-K6 串行 |
| R3 | manager-fetch 按 code 分类（409/429/502/503 文案）+ 透传 `data.fieldErrors` 到 ApiError（为 P07 表单逐项标红） | `src/lib/manager-fetch.ts`、`src/contracts/common.ts`（toastCopy 追加）、测试 | 单测：mock fetch 各 code → 对应错误类/文案 | 0.5 天 | R1；与 P08（http-client）需二选一落点 |
| R4 | 全路由契约测试骨架：`tests/contract/routes.test.ts` 自动发现 `src/app/api/**/route.ts` 导出方法 + `rules.ts`；复用 `src/lib/__tests__/api-contract/harness.ts`；缺规则即失败；先登记现有 102 个文件 | `tests/contract/**`、`vitest.config.ts`（仅 include）、`src/lib/__tests__/api-contract/harness.ts`（仅导出复用） | `npx vitest run tests/contract`（目标：发现的方法 100% 有规则） | 1.5–2 天 | R1；P12 新端点出现后增量补规则 |
| R5 | 管理端响应式 E2E（375/768/1440，`scrollWidth<=innerWidth`）+ 必要的响应式类修复 | `tests/e2e/responsive.spec.ts`、`src/components/manager/**`（仅响应式类） | `npx playwright test tests/e2e/responsive.spec.ts` | 1 天 | **P07 之后**（DataTable 等组件定型） |
| R6 | 文档同步 `docs/design/13-响应设计.md` + 证据 | `docs/design/**` | 人工核对 | 0.25 天 | R1–R4 |

### P09 系

| ID | 内容 | 允许修改 | 验收命令 | 规模 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| X1 | `src/contracts/kinds.ts`（CHANNEL_KINDS/LLM_KINDS/COLLECT_TYPES/KB_BACKENDS + 中文 label）；`resources.ts` :276/:303/:331 改为派生 | `src/contracts/kinds.ts`、`src/contracts/resources.ts`（仅 3 行枚举）、`src/contracts/index.ts`、测试 | 单测：枚举与常量全等；`npm test` 无回归 | 0.25 天 | 与 P08（contracts 结构）错开 |
| X2 | PublishChannel 注册表：`src/lib/channels/*`，executor `getChannel(job.channel).execute(job)`，审核门/提醒/退避留在核心 | `src/lib/channels/**`、`src/lib/publish-executor.ts`、`src/lib/__tests__/registries.test.ts` | `grep -n 'channel === "' src/lib/publish-executor.ts` 为空；`publish-state-machine`、`notify-before-publish`、`content-review` 测试通过；`npm run test:e2e`（collect-publish） | 0.5 天 | X1；**与 P10 冲突**（publish-executor） |
| X3 | LLMProviderAdapter 注册表：`src/lib/llm/{types,registry,openai,coze}.ts`（`chat`/`stream`/`test`）；gateway 只留路由/熔断/统计；providers 测试端点复用 adapter.test | `src/lib/llm/**`、`src/lib/llm-gateway.ts`、`src/app/api/llm/providers/[id]/test/route.ts`、`src/lib/kb-adapter.ts`（仅 :86 改查注册表）、测试 | `grep -rn 'kind === "coze"' src/lib src/app/api` 为空；`wechat-chat`、`p06-followups` 测试通过 | 1 天 | X1；**与 P15、P08（providers 路由迁 withApi）冲突** |
| X4 | CollectParser 注册表：`src/lib/collect/{types,registry,html,rss}.ts`；engine 与 collect-test 都查注册表 | `src/lib/collect/**`、`src/lib/collect-engine.ts`（仅解析段 :163-202）、`src/lib/collect-test.ts` | `grep -rn 'type === "rss"' src/lib` 为空；`collect-autokb` 测试、e2e collect-publish 通过 | 0.5 天 | X1；**与 P14/P15（collect-engine）冲突** |
| X5 | KnowledgeBackend 接口与注册表：`src/lib/kb/{types,registry,local}.ts` + `coze.ts`（search 搬迁 searchViaCoze，push/remove/status 抛明确 NotImplemented）；`kb-adapter.ts` 变门面；`kb-sync.ts` 的 `registerKbRemoteAdapter` 改为 KB 注册表薄包装（保留导出名） | `src/lib/kb/{types,registry,local,coze}.ts`、`src/lib/kb-adapter.ts`、`src/lib/kb-sync.ts`、测试 | `collect-autokb.test.ts` 通过（队列语义不变）；registries.test 中 KB 段通过 | 0.5–1 天 | X1；阻塞 K3/K4 |
| X6 | ADR-027 + 证据（为何只抽四处、通知不抽、kb-sync 合并口径） | `docs/design/**` | 人工 | 0.25 天 | X2–X5 |

### P12 系

| ID | 内容 | 允许修改 | 验收命令 | 规模 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| K1 | 契约 + 迁移 + seed：`contracts/kb.ts`（白名单、COZE_FILE_TYPE_MAP、检索测试 DTO）、resources 新 schema；`p12_knowledge_base` 迁移（**复用 ChatScene.baseIds**，新列尽量无 FK 防整表重建）；数据迁移建两默认库并回填；`rollback/p12.sql` | `prisma/schema.prisma`、`prisma/migrations/<ts>_p12_knowledge_base/**`、`prisma/rollback/p12.sql`、`prisma/seed.ts`、`src/contracts/{kb,resources,index}.ts` | `npx prisma migrate diff --from-config-datasource --to-schema` 输出 empty；在 p06 库副本上 `migrate deploy` 后行数不变、`PRAGMA integrity_check`=ok；rollback 后 schema 与 p06 全等 | 1 天 | 不依赖 P09；与 P07（seed 菜单）错开 |
| K2 | 文件类型/解析/切分纯函数：`kb/filetype.ts`、`kb/parse.ts`（mammoth；.doc 评估或 skipped）、`kb/chunk.ts` | `src/lib/kb/{filetype,parse,chunk}.ts`、`package.json`/`package-lock.json`（仅 docx 依赖）、测试 | `npm test -- src/lib/__tests__/kb-filetype.test.ts src/lib/__tests__/kb-parse.test.ts src/lib/__tests__/kb-chunk.test.ts`；`grep -rnE "pdf-parse\|pdfjs\|tesseract" package.json src/lib/kb` 为空 | 1 天 | 无（新文件）；package.json 与 P07/P11/P15 错开 |
| K3 | Coze 知识库客户端：`kb/coze.ts` 实现 createDataset/pushDocuments(≤10/批)/getDocumentProgress/deleteDocuments，`Agw-Js-Conv: str`，错误映射（4013 等），可注入 fetch；注册为 KnowledgeBackend + 条目级 kb-sync 推送 | `src/lib/kb/coze.ts`、`src/lib/coze.ts`（仅抽 headers/请求工具）、`src/lib/kb-sync.ts`、`src/lib/settings-registry.ts`（仅 kbCoze*）、注册入口、测试 | `npm test -- src/lib/__tests__/kb-coze.test.ts`（mock：URL/Header/body、md→txt、11 文件分 2 批、权限错误映射） | 1–1.5 天 | X5；settings-registry 与 P11 错开；Coze 真实联调=UNKNOWN |
| K4 | 本地检索算法：按库过滤 + bigram/关键词/标题加权 BM25 + LIKE 预筛≤500；20 条中文 fixture 记录前后命中率 | `src/lib/kb/local.ts`、`src/lib/kb-adapter.ts`（门面签名加 baseIds）、测试 fixture | `npm test -- src/lib/__tests__/kb-search.test.ts`（Top-3 ≥85%，附基线） | 1 天 | X5、K1 |
| K5 | 库/文件 API：knowledge-bases CRUD+sync、files 上传（≤10MB，三重校验，400 中文提示）、knowledge-files GET/DELETE/reparse/progress、`kb/test` 扩 baseIds/topK（schema 移入 contracts）、`data/kb/` 落盘 | `src/app/api/knowledge-bases/**`、`src/app/api/knowledge-files/**`、`src/app/api/kb/test/route.ts`、`src/lib/kb/storage.ts`、`src/lib/crud-resources.ts`（新 spec）、`.gitignore`（data/kb/）、契约测试 | 用 `api-contract/harness.ts` 写路由测试：.pdf/.png/.jpg→400 含"不支持 PDF 和图片"；.md/.txt/.docx→200 且 chunkCount>0；删除级联+Coze mock 断言 | 1.5–2 天 | K1–K4 |
| K6 | 场景绑定：chat-service 按场景装配 providerIds/参数/baseIds；`gatewayChat/gatewayChatStream` 支持 `{providerIds, params}`；chat/stream 透传；crud-resources chat-scenes JSON 数组字段；明确 coze 路径对 system/history 的处理 | `src/lib/chat-service.ts`、`src/lib/llm-gateway.ts`、`src/lib/llm/**`、`src/app/api/chat/stream/route.ts`（仅 :55 调用参数）、`src/lib/crud-resources.ts`（chat-scenes 段）、测试 | `npm test -- src/lib/__tests__/chat-service-scene.test.ts`（[B,A]→B 优先、B 失败回落 A、再回落 fallback；官网/公众号 messages 全等） | 1 天 | X3、K1、K4；与 R1/R2 串行（chat/stream） |
| K7 | 采集目标库 + Coze 推送：CollectSource.knowledgeBaseId → ingestCollectItem 写 baseId；推送走 K3 | `src/lib/kb-sync.ts`、`src/lib/collect-engine.ts`（仅 afterItemCreated :275-281）、`src/lib/crud-resources.ts`（collect-sources 段）、测试 | `collect-autokb.test.ts` 扩展：条目带默认"采集资讯"库 id，mock Coze 收到 txt | 0.5 天 | K1、K3、X4 |
| K8 | 管理页：knowledge-bases 列表/详情（文件拖拽、进度、条目、检索测试）、chat-scenes 表单分区；e2e knowledge.spec | `src/app/manager/knowledge-bases/**`、`src/app/manager/knowledge/**`、`src/app/manager/chat-scenes/**`、`src/components/manager/crud-specs.tsx`、`prisma/seed.ts`（菜单）、`tests/e2e/knowledge.spec.ts` | `npm run test:e2e`（含 knowledge.spec）、`npm run test:visual` | 2 天 | **P07 之后**（组件）；K5、K6 |

### 5.1 推荐顺序（满足 §5 迁移链与文件串行）
X1 → (X2 ∥ X4 ∥ X5) → X3 → X6 ；K1 ∥ K2（可与 X 系并行）→ K3、K4 → K5 → K6（与 R2 串行）→ K7 → K8 ；R1 → R2 → R3 → R4（P12 端点落地后补规则）→ R5（P07 后）→ R6。

### 5.2 与其他方向的并行性

| 任务 | 可与 P07/P08（管理端组件改造）并行？ | 可与 P10/P11/P14/P15 并行？ |
| --- | --- | --- |
| X1 | 否于 P08（P08 允许改 `src/contracts/**` 结构）；可与 P07 并行 | 是（P10/P11/P14/P15 均禁止改 contracts） |
| X2 | 是 | **否于 P10**（publish-executor.ts）；与 P11/P14/P15 可并行 |
| X3 | 否于 P08（providers 三路由迁 withApi）；可与 P07 并行 | **否于 P15**（llm-gateway、llm/**）；与 P10/P11/P14 可并行 |
| X4 | 是 | **否于 P14/P15**（collect-engine）；与 P10/P11 可并行 |
| X5 | 是（P08 若不碰 kb-adapter/kb-sync；需确认 P08 实际清单——未验证） | 是 |
| K1 | 否于 P07（seed.ts 菜单）——可约定 P07 先提交 seed 或 K1 不动菜单段；P08 禁止 prisma，可并行 | 是（四者均禁止 prisma） |
| K2 | 新文件可并行；package.json 与 P07 错开 | package.json 与 P11/P15 错开，其余可并行 |
| K3 | 是 | 否于 P11（settings-registry、instrumentation）；其余可并行 |
| K4 | 是 | 是 |
| K5 | 否于 P08（若 P08 改 crud-resources 派生）；P07 无冲突 | 与 P14 的 upload/file 路由不同文件，可并行（storage 约定见 §1.2） |
| K6 | 否于 P08（chat/stream 内联 schema 可能被移动） | 否于 P15（llm-gateway） |
| K7 | 是 | 否于 P14/P15（collect-engine） |
| K8 | **否**（必须在 P07 之后，同写 manager 页/crud-specs） | 是 |
| R1 | **否于 P08**（api-handler、contracts、api/** 包装） | 是 |
| R2 | ChatWidget 属前台，P07/P08 均禁止碰 → 可并行（chat/stream 与 P08 协调） | 是 |
| R3 | 否于 P08（http-client 落点） | 是 |
| R4 | 新目录可并行；vitest.config.ts 与 P07 错开 | 是 |
| R5 | **否**（P07 之后） | 是 |

一句话：与"管理端组件改造"可安全并行的是 **X2、X4、X5、K2、K3、K4、K7、R2、R4**；与"性能/配置/存储/资源"可安全并行的是 **X1、X5、K1、K2(除 package.json)、K4、K5、R1–R6**；X2⟂P10、X3/K6⟂P15、X4/K7⟂P14/P15、K3⟂P11 必须串行。

---

## 6. 需要主线程裁决/修正提示词的事项
1. P09 增加遗漏分支（collect-test.ts:37、providers test route:33、kb-adapter.ts:86）并扩大验收 grep；"后台下拉自动出现"要么删掉，要么放行 crud-specs/两个管理页。
2. P09 `KnowledgeBackend` 与 P06 `KbRemoteAdapter`（kb-sync.ts）合并口径写入 ADR-027。
3. P12 目标 5 改为复用 `ChatScene.baseIds`；定义 `providerIds` 与已有 `llmProviderId` 的优先关系；允许路径补 `kb-sync.ts`、`crud-resources.ts`、`chat/stream/route.ts`、注册入口；外键策略沿用 P06（无 FK）或明确接受整表重建。
4. P13 目标"错误体 data:null + details"与 P06 已交付的 `data.fieldErrors` 冲突，需裁决（保留 data.fieldErrors 或双写过渡）；`created()` 的 code200/HTTP201 是否改为"一致"；允许路径补 `src/lib/api-handler.ts`；评审 #5 行号改为 `ChatWidget.tsx:105-128`，#6 改为"17 个测试文件/210 例 + 已有 api-contract 夹具"。
5. P09/P13 的前置（P08 withApi 全量、http-client）尚未满足：24 个路由清单见 §3.5。

## 7. 未验证项
- 所有测试/构建/E2E 结果（禁止运行）；P06-verify 中的 "17 文件 210 例" 为引用。
- Prisma 7 对 SQLite 加 relation 列是否触发 RedefineTables（建议 `--create-only` 审 SQL）。
- `src/app/api/upload/route.ts` 现有白名单是否已允许 PDF（未打开）。
- `wechat-chat.test.ts` 是否已断言两渠道 messages 全等（未打开）。
- P08 实际会改动的文件清单（只读了其"允许修改"段）。
- Coze 接口形态以 ADR-025 记录为准，未在线核对 docs.coze.cn。
