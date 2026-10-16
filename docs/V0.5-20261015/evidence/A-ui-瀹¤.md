# A-ui：P07（组件）/ P08（复用）提示词对照当前代码的只读审计

- 仓库：`/workspace/work/hd/repo`，分支 `upgrade`，HEAD `bb2c0e5`（docs(P06): 独立校验报告），共 49 个提交
- 审计时间：2026-10-13；方式：只用 cat/grep/find/git log/git show/wc 和 Python 正则脚本（脚本在仓库外：`/workspace/work/hd/audit/scratch/drift.py`、`enumdrift.py`，输出 `drift.json`）。**仓库内未改任何文件，未跑 build/test/lint/e2e**，所以下文凡涉及"运行通过"的都标 **未验证**。
- 对照的提示词：`docs/design/04_planning/review-prompts/P07-组件.md`（132 行）、`P08-复用.md`（118 行），均写于 2026-10-12。
- 承接来源：`docs/design/06_validation/evidence/P05-verify.md:38-41`、`P06-verify.md:87-94`，另外补读了 `P02-execution.md:86`、`P03-execution.md:104`、`P03-verify.md:34`、`P04-execution.md:123`、`P05-execution.md:105`、`P06-execution.md:107-113`（这些也有明确转给 P07/P08 的事项）。

---

## 0. 结论速览（先读这一节）

1. **P07 的 7 条评审项**：2 条仍成立（#5 通知规则页、#7 区块配置页）；3 条已部分解决（#1 表格、#2 表单、#4 特殊页）；1 条已解决（#3 模态）；1 条提示词有误（#6 radix "已装未用"：现在 7 个文件在用）。
2. **P07 有 4 个硬阻塞，必须先修订提示词**：
   - (a) `src/components/ui/{button,input,textarea,label}.tsx` 被**前台** 7 个文件引用，且与 `origin/main` 一字不差（`git diff --stat origin/main -- src/components/ui` 为空）。P07 若按"重着色/补齐"去改这几个文件，会直接改到前台外观，与"前台不变"的硬门禁冲突。
   - (b) `src/lib/block-registry.ts:10` 引入了 prisma，客户端页面不能 import；目前也没有任何 API 把注册表的 `fields`/默认值暴露出来，也没有"恢复默认"端点。而 P07 禁止改 `src/app/api/**`，允许路径里也没有 `src/lib/**`，所以 home-blocks 页做不出来。
   - (c) `notifyRuleUpdateSchema`（`src/contracts/resources.ts:259-263`）没有 `quietHours` 字段，P07 又禁止改 contracts/api，"静默时段"可以展示但保存不了。
   - (d) 后端已返回 `data.fieldErrors`（`src/lib/api-response.ts:59-73`），但 `src/lib/manager-fetch.ts:73` 只抛 `message`、把 fieldErrors 丢掉了。要做字段级标红就得改 src/lib，同样不在 P07 允许路径内。
3. **P08 的 7 条评审项**：仍成立 4 条（#4、#5、#6、#7）、已部分解决 1 条（#3）、提示词有误 2 条（#1 的"三处定义"、#2 的 hidden 漂移）。真实漂移另有其他字段，见 §3。另外 P08 的 withApi 计数口径和验收命令都需要修正，见 §2。
4. **P07 和 P08 会同时写的文件**：`crud-specs.tsx`、`CrudPage.tsx`、`src/contracts/resources.ts`（P07 需要 quietHours）、`src/lib/manager-fetch.ts`、`src/lib/block-registry.ts`、`src/app/api/**`（registry/notify）、`tests/e2e/**`。`seed.ts` 与 `package.json` 只有 P07 写，P08 明确禁止。详见 §4。

---

## 1. P07 逐条核验

### 1.1 评审表（P07-组件.md:20-28）

| # | 提示词原证据/缺口 | 状态 | 当前证据 |
|---|---|---|---|
| 1 | `CrudPage.tsx:159-246` 原生 table/input/button；分页全量按钮（:244）；无排序/列筛选/批量/列显隐/每页条数 | **已部分解决** | 文件已从约 280 行变为 383 行（`wc -l`）。仍然存在原生 `<table>`（`CrudPage.tsx:227`）和原生 `<button>`（:217、:253、:271、:276、:286），样式来自 `tableCls`/`btnCls`/`linkCls` 字符串（:16、:18）。每页条数写死为 `const PAGE_SIZE = 10`（:53），没有排序、列筛选、行选择/批量、列显隐、密度、URL 同步（全文件 grep `sort\|selected\|density` 无相关实现）。**已解决的部分**：分页改成了窗口 + 省略号（`Pagination.tsx:13-23` 的 `windowPages`），不再"按钮爆量"；搜索框有 300ms 防抖（`SearchInput.tsx:4,27`）。 |
| 2 | `SchemaForm.tsx:11-13` 10 种字段；richtext/markdown 都是 textarea（:100-105）；无预览/媒体库/关联搜索/日期时间/分区/字段级错误 | **已部分解决** | 字段类型仍是 10 种（`SchemaForm.tsx:13-15`）；richtext/markdown 仍共用 `<textarea>`（:146-155，placeholder 写着"HTML 内容（保存时统一净化）"）。依赖里没有 TipTap（`grep -c '"node_modules/@tiptap' package-lock.json` = 0；而 `git show origin/main:package.json` 第 49-56 行有 `@tiptap/* ^3.22.4`）。没有分区/折叠、Markdown 预览、媒体库、远程关联搜索、datetime（只有 `type=date`，:185 附近）。**已解决的部分**：字段级必填错误和 a11y 已具备（`aria-invalid`/`aria-describedby`/`role="alert"`，:97-113），但只来自前端 `validateRequired`（:32-42），服务端的 `fieldErrors` 没有接进来（见 0.2-d）。关联下拉目前做法是 `?limit=100` 一次性拉取后转成 select（`CrudPage.tsx:71-86,187-193`）。 |
| 3 | `CrudPage.tsx:248-280` 手写 `fixed inset-0` 模态，无焦点陷阱/Esc/未保存提示 | **已解决** | CrudPage 已改用 `FormDialog`（`CrudPage.tsx:309-334`）；`FormDialog.tsx:4-6,10` 基于 Radix Dialog，带焦点陷阱、Esc、dirty 二次确认（:42-55）。`grep -rn "fixed inset-0" src/app/manager` 无命中（未逐页截图核验，计为 0）。 |
| 4 | 特殊页各自手写 UI：articles(267)/publish-jobs(171)/llm-providers(201)/collect-items(159)/wechat-accounts(145)/media(133)/settings(97)/content-hub(41)/仪表盘(58) | **已部分解决** | 行数都涨了：articles 332、publish-jobs 262、llm-providers 280、collect-items 200、wechat-accounts 244、media 232、settings 174、content-hub 42、仪表盘 81。另有两页提示词漏列：chat-history 227、login 177。P05 之后这些页已经统一使用 PageHeader/FormDialog/SchemaForm/TableState/StatusBadge/Pagination（见 §A.1 的 import 清单），"五态"已统一；但表格本身仍是各页手写 `<table>` 加 `tableCls`（6 处 `<table`）。 |
| 5 | `api/notify-rules` 存在、无管理页（I8） | **仍成立** | `src/app/api/notify-rules/route.ts:8`（GET，withApi）和 `[id]/route.ts:9`（PATCH）都在；`src/app/manager/notify-rules/` 不存在；`prisma/seed.ts:172` 注释写明"notify-rules 由 P07 建页时登记"，菜单里没有它（`seed.ts:164-166` 只有 recipients/templates/records）。**新增缺口**：`notifyRuleUpdateSchema`（`resources.ts:259-263`）只有 enabled/templateId/recipientGroups，没有 `quietHours`（schema.prisma:876 有该列，注释是"预留"）。 |
| 6 | 已装未用 `@radix-ui/react-dialog`/`react-label`；`@base-ui/react` 仅 P02 外壳使用 | **提示词有误** | 现在 radix **在用**：`grep -rn "@radix-ui" src` 命中 7 个文件，分别是 `manager/DetailDialog.tsx:5`、`FormDialog.tsx:10`、`feedback/ConfirmDialog.tsx:13`、`shell/AppShell.tsx:11`、`shell/CommandPalette.tsx:9`、`ui/dialog.tsx:4`、`ui/label.tsx:4`；`package.json:34-35` 中两条依赖仍在。`@base-ui/react` 实际用在 `ui/button.tsx`、`ui/checkbox.tsx`、`ui/scroll-area.tsx`、`ui/tabs.tsx`（这些来自 main）和 `feedback/Toaster.tsx`，**外壳（shell/）一处都没用**，外壳用的是 radix。因此"移除 radix"不是删依赖那么简单：要迁移 7 个文件，其中 `ui/label.tsx` 被前台 `ApplyForm.tsx` 使用，属于前台风险。 |
| 7 | P06 的 blocks 四资源 API 与 block-registry 已在；无管理页、无菜单 | **仍成立（且有阻塞）** | 4 个 API 目录都在（`src/app/api/{content-blocks,page-templates,template-blocks,element-configs}/{route.ts,[id]/route.ts}`，走 crud 工厂，权限 `block`，见 `crud-resources.ts:397-440`）；权限点 `block:list/block:edit` 已在 seed（`seed.ts:88,103`）；**没有**对应的 manager 页面和菜单（`grep "home-blocks\|page-templates\|element-configs" prisma/seed.ts` 只命中权限、没有命中菜单）。阻塞见 0.2-b：`block-registry.ts:10` 引入 prisma，客户端拿不到 `BLOCK_REGISTRY` 的 fields/默认值，也没有 reset 端点（在 api 目录和 block-registry 中 grep `reset\|restore\|恢复默认` 为空）。 |

### 1.2 目标与验收标准（P07-组件.md:30-75）

| 验收项 | 状态 | 当前证据 |
|---|---|---|
| `grep -rnE "<table\|<input \|<select\|<button " src/app/manager` 为空 | **仍成立（未达成）** | 当前命中 **37**：`<table` 6、`<input ` 1、`<select` 2、`<button ` 28。按文件：articles 5、chat-history 5、collect-items 5、llm-providers 7、media 4、publish-jobs 5、settings 1、wechat-accounts 5。**这个正则有漏洞**：`<button` 换行写法、`<textarea` 都匹配不到。改用更严的 `grep -rnE "<(table\|input\|select\|button\|textarea)(\s\|>\|$)" src/app/manager` 计数为 **46**，比前者多出 login 1、media 3、collect-items 2、articles 1、settings 1、wechat 1。建议把验收命令换成后者。组件层（不在验收范围）也有原生控件：CrudPage 4、FormDialog 2、Pagination 2、SchemaForm 3、ConfirmDialog 1。 |
| `grep -rn "@radix-ui" package.json src` 为空；`@tiptap/react` 命中 | **仍成立（未达成）** | radix 共 2+7 处（见 #6）；tiptap 在 package.json 和 lockfile 中都是 0。 |
| e2e 含 admin-components；a11y serious/critical=0 | **仍成立（未达成）** | `tests/e2e/` 只有 apply-chat、auth、collect-publish、crud-article 四个 spec，共 8 个 test（`grep -c "test("`：1/3/1/3）；`tests/a11y/` 不存在；lockfile 中没有 `@axe-core/playwright`（计数 0），也没有 `jsdom`（计数 0）。提示词说"jsdom 已在 lockfile 内则直接用"，**实际不在**，需要新增依赖（还要 `@testing-library/react`），但这超出了 P07 对 package.json 的白名单（"仅上述依赖变更"）。 |
| `/manager/notify-rules` 200 且可编辑 | 仍成立（未达成） | 见 #5。 |
| home-blocks/page-templates/element-configs 200 + 禁用区块 E2E + 恢复默认 | 仍成立（未达成，有阻塞） | 见 #7。 |
| `npm run test:visual` 通过 | 未验证 | 按约束未运行。P06-verify 记录为 46/46。 |
| 组件清单（P07:34-41） | 部分已存在 | 已有：`PageHeader`（`shell/PageHeader.tsx`，23 行）、`ConfirmDialog`（253 行，Radix，Esc/焦点陷阱，`feedback/ConfirmDialog.tsx:9`，另有 `promptDialog`/`alertDialog`）、`StatusBadge`（19 行，但按 tone 映射而不是按状态名映射，`StatusBadge.tsx:2-10`）、`DetailDialog`（48 行）、`FormDialog`（130 行）、`Pagination`（69 行，没有每页条数选择）、`SearchInput`、`FilterTabs`、五态组件（`feedback/*`）。缺：DataTable、ResourceForm（sections）、RichTextField/MarkdownField/ImageField+MediaPicker/RelationSelect/JsonField/SecretField、StatCard、DetailDrawer(Sheet)、DropdownMenu/Tooltip/Popover/Combobox/Badge/Avatar/Card/Skeleton/Kbd 等基础件。 |
| 输出"24 个规格页 + 11 个特殊页" | **提示词有误（计数）** | 实际有 36 个 page.tsx：25 个纯规格页 + `content-hub`（规格加 rowActions 包装）+ 10 个特殊页（articles、chat-history、collect-items、llm-providers、login、media、仪表盘 page.tsx、publish-jobs、settings、wechat-accounts）。见 §A.1。 |
| "jsdom：vitest environment: jsdom 仅限该目录" | 需修订 | `vitest.config.ts` 的 `include: ["src/**/__tests__/**/*.test.ts"]` 不包含 `.tsx`，组件测试 `*.test.tsx` 不会被收集，需要同时改 include。vitest 3 中 `environmentMatchGlobs` 已标记弃用（建议改用 `projects` 或文件头 `@vitest-environment jsdom` 注释，未验证）。 |
| `globals.css` 管理端令牌"只能追加" | 需修订 | P05 承接项要求删除 `.text-muted` 兼容规则（`globals.css:370-372`）；当前 manager 中旧 `text-muted` 用法为 **0**（`grep -rn "text-muted" src/app/manager src/components/manager \| grep -v "text-muted-fg\|mgr-muted"` = 0），可以删。但"删除"不在 P07 的"只能追加"授权内，需要提示词明确放行。 |

### 1.3 承接项并入 P07（来自各 verify/execution）

| 来源 | 承接项 | 当前状态与证据 |
|---|---|---|
| P05-verify:39 | /manager/articles 在 375 宽下表格横向溢出、操作列被截、状态逐字竖排；错误/空态列宽不一致 | **仍成立**（未截图复核，代码层面：`tableCls.wrap` 仅 `overflow-x-auto`，`Pagination.tsx:63`；无移动端卡片视图）。与 P02-execution:86 是同一项，和 P13 有交叉，建议 DataTable 内处理"窄屏列优先级/卡片模式"。 |
| P05-verify:40 | ChatWidget 重试重复追加用户消息 | **已解决**（P06 偏差 D2，`P06-execution.md:101`：`ChatWidget.tsx` 的 send() 已去重）。不再转 P07。 |
| P05-verify:41 | crud-article.spec 应断言保存后持久化 | **未验证/仍成立**：`tests/e2e/crud-article.spec.ts` 有 3 个 test，没有逐行核验是否新增了 GET 复核；建议并入 P07 的 e2e 任务。 |
| P05-execution:105 | `feedback/styles.ts` 的 btnCls/inputCls 升级为 Button/Input/Select 组件；TableState+tableCls 抽成 DataTable；删 `.text-muted`；角色权限编辑仍是文本 tags 字段 | **仍成立**：btnCls/inputCls/linkCls/cardCls 在 18 个文件中共 85 处引用；角色权限仍是 `{ key: "permissions", type: "tags" }`（`crud-specs.tsx:538`）。 |
| P06-execution:109 | 内容中枢表单状态下拉仍列出"已通过/已发布" | **仍成立**：`crud-specs.tsx:432-437` 的 options 含 approved/published；契约只允许 draft/pending_review/offline（`resources.ts:244-248`，`events.ts:52` 的 `CONTENT_EDITABLE_STATUSES`）。 |
| P06-execution:109 | 采集源表单加 autoToKb/autoApprove（后者仅超管可见）、cron 留空=仅手动 | **仍成立**：`crud-specs.tsx:478-504` 的 fields 没有 autoToKb/autoApprove（契约 `resources.ts:288-289` 有）；cron 字段 placeholder 是 "0 4 * * *"，没有"留空=仅手动"的提示（契约注释在 `resources.ts:279`）。 |
| P06-execution:109 | AI 场景表单加"专属模型" | **仍成立**：chat-scenes 表单比契约少 `description/llmProviderId/starters/status`（drift.py 输出）。 |
| P06-execution:109 / P05-execution follow-up | 校验错误使用 `data.fieldErrors` 逐项标红 | **仍成立**：见 0.2-d，`manager-fetch.ts:73`。 |
| P06-execution:109 | 发布任务列表直接用返回的 `title` | **已部分解决**：已优先使用 `j.item?.title`（`publish-jobs/page.tsx:56`），但仍保留 `/api/content-items?limit=100` 回填查询（:55）；新建表单的选项也用 limit=100（:84），超过 100 条会缺项。 |
| P06-verify:92 | autoApprove 改动也只限超管（表单一并处理） | **仍成立**：后端只拦截"开启"（`crud-resources.ts:84-88`；beforeUpdate 中 `data.autoApprove !== existing.autoApprove` 时调用 assert，但 assert 只拒绝 `=== true`）；前端没有该字段。 |
| P03-execution:104 / P03-verify:34 | logs 加模块/动作/时间筛选；chat-history 换设计系统；文章列表接 PATCH 一键上下线；媒体库接改名/批量 | **仍成立**：CrudPage 没有筛选能力（logs 是纯规格页，`logs/page.tsx` 9 行）；articles 页里 `grep PATCH` 为 0（API 已有 `articles/[id]/route.ts:178`）；media 页批量删除是循环调用单条 DELETE（`media/page.tsx:74`），没有用 `/api/media/batch`；也没有改名（API 已有 `media/[id]/route.ts:16` PATCH）。 |
| P02-execution:86 | `src/components/ui/**` 按管理端令牌重新着色；加 `manager/not-found.tsx` | **重新着色这条有误/危险**：ui 中的 button/input/textarea/label 被前台使用（§A.4），重新着色会改到前台。not-found 仍不存在（`ls src/app/manager/not-found.tsx` 报不存在）。 |
| P04-execution:123 | notify-rules 菜单（group-notify，notify:list）；ADR-024 三页菜单；角色编辑"移除默认权限"语义 | 仍成立（同 #5/#7）；"移除默认权限"需要 seed 标记，P07 的 seed 授权只限菜单，**需提示词放行或挪到别的方向**。 |
| 新发现 | 现有 E2E 依赖的选择器 | `tests/e2e` 依赖 testid：`crud-create`、`form-dialog`、`form-submit`(6)、`confirm-dialog`、`confirm-ok`、`toast-success`、`empty-state`、`error-state`、`error-retry`、`forbidden`、`publish-create`、`llm-create`、`article-create`、`collect-test-result`；还用 `row.getByRole("button",{name:"试抓"/"立即执行"/"测试"})` 定位行操作（`collect-publish.spec.ts:51`、`apply-chat.spec.ts:32`）。如果 DataTable 把行操作收进 DropdownMenu，**这些 E2E 会断**，需要保留直出按钮或同步修改 spec。 |

---

## 2. P08 逐条核验

### 2.1 评审表（P08-复用.md:19-28）

| # | 提示词原证据/缺口 | 状态 | 当前证据 |
|---|---|---|---|
| 1 | crud-specs 583 行手写、crud-resources 337 行、contracts/resources 344 行，同一资源三处定义 | **已部分解决 / 表述有误** | 行数：crud-specs **601**、crud-resources **440**、contracts/resources **455**，另有 contracts/blocks 80（`wc -l`）。自述仍在 `crud-specs.tsx:3-5`。**但 crud-resources 并不重复字段列表**：它直接引用契约 schema（`createSchema: xxxCreateSchema`，`crud-resources.ts:9-38` import、:100…:435），只额外维护 `searchFields`/`filters`/`include`/`orderBy`，这些是行为配置，不是字段定义。真正的重复只有两源：**crud-specs 的列/字段/选项** 与 **契约 schema 的键和枚举**。详见 §3。 |
| 2 | `crud-specs.tsx:10-18` 状态 active/draft/archived；契约 `:9` 含 hidden → 两源漂移 | **提示词有误（例子已失效），但漂移本身存在** | `resources.ts:8-11` 的 `sortStatus.status`（含 hidden）是**死代码**：全文件只用了 `sortStatus.sort`（`grep "sortStatus.status\|...sortStatus"` 无命中），各资源都内联写自己的 `z.enum([...])`（共 17 处 `status: z.enum`）。`crud-specs.tsx:11-20` 的 `statusField` 也只在 :601 导出，没有被使用（`grep -rn statusField src` 只命中定义和导出）。**真实漂移**（脚本 `enumdrift.py`/`drift.py`）：① 枚举：content-items.status，表单 5 个值（含 approved/published，`crud-specs.tsx:432-437`），契约 3 个值（`resources.ts:246-248`）；② 字段缺失（契约有、表单无）：partners/campus/banners/hot-majors 缺 `status`；home-cards 缺 `hoverGradient/shadow/status`；service-guides 缺 `link`；navigations 缺 `categoryId/contentType/icon/target`；chat-scenes 缺 `description/llmProviderId/starters/status`；knowledge 缺 `externalUrl/source`；content-items 缺 `source`；collect-sources 缺 `autoToKb/autoApprove`。共 11 个资源有字段缺口。其余 13 个可比对的 select 枚举一致。 |
| 3 | `crud-resources.ts:36-50` jsonifyArray + 零散 JSON.parse（src/lib+src/app 13 处） | **已部分解决（计数变化）** | `jsonifyArray` 现在在 `crud-resources.ts:45-65`，P06 新增了 `jsonifyFields`（:68-80）。JSON.parse 在 src/lib+src/app（不含测试）共 **17** 处，分类如下：DB 的 JSON-in-String 12 处（auth.ts:48、block-registry.ts:131、collect-engine.ts:42/267、collect-test.ts:32、crud-resources.ts:53、notify-gateway.ts:73/81、wechat.ts:48、roles/[id]/route.ts:21/56、roles/route.ts:82）；SSE/流协议 4 处（coze.ts:70/90、llm-gateway.ts:246、ApplyClient.tsx:252）；localStorage 1 处（ApplyClient.tsx:40）。另外组件层 `CrudPage.tsx:107` 也有。**json-field.ts 只应收敛那 12 处**，流协议和前台 ApplyClient 不在范围内（前台禁改）。 |
| 4 | `AbortSignal.timeout` 在 src/lib 15 处（collect-engine/wechat/coze/llm-gateway/notify） | **仍成立（来源有误）** | 计数确实是 15：wechat 6、coze 4、llm-gateway 2、collect-engine 2、collect-test 1。**notify-gateway 中没有**（它用的是 nodemailer）。另外 `src/app/api/llm/providers/[id]/test/route.ts:53` 也有 1 处，P08 的验收 grep 只查 src/lib，会漏掉它。 |
| 5 | `settings.ts:16` getSettings（公开、cache）与 `:33` getAllSettings 并存 | **仍成立（且更混乱了）** | 行号不变（`settings.ts:16`、`:33`）。P06 在 3 个文件里写了 `import { getAllSettings as getSettings }`（`llm-gateway.ts:9`、`collect-engine.ts:18`、`collect-test.ts:6`），同名不同义。getSettings 的直接调用方：前台 9 个文件，加上 `api/settings`、`api/wechat/callback`、`components/web/data/settings.ts`；getAllSettings 的调用方有 10 个文件。 |
| 6 | 仍有路由手写 requireAuth+safeParse+try/catch（20 个文件含 request.json()） | **仍成立（计数需修正）** | 见 §2.3。真正手写（既无 withApi 也无 crud 工厂）的有 **24** 个 route.ts，另有 **2 个混合文件**中存在手写 handler（`articles/[id]/route.ts` 的 GET/PUT/DELETE，`user-actions/route.ts` 的 POST）。含 `request.json()` 且不含 withApi 的有 14 个文件。 |
| 7 | `next.config.ts:28`、`jobs/index.ts:3-6` 过期注释 | **仍成立** | `next.config.ts:28` 写着"…后生效；当前为预留"（rewrites 实际已生效）；`src/lib/jobs/index.ts:4` 写着"后续切片注册：collect.run(S4)…"，但同文件 :14 起已经注册了 collect.run。 |

### 2.2 目标与验收（P08-复用.md:30-64）

| 验收项 | 状态 | 证据 |
|---|---|---|
| 漂移检测测试 0 差异 | 未达成 | 不存在 `src/contracts/derive.ts` 和 `__tests__/derive.test.ts`（`ls src/contracts`：article/auth/blocks/common/events/index/resources/setting/user-action）；当前漂移见 §2.1-#2。 |
| `wc -l crud-specs.tsx` ≤ 200 | 未达成 | 601。 |
| `grep -rn "AbortSignal.timeout" src/lib \| grep -v http-client.ts` 为空 | 未达成 | 15（src/lib）+1（src/app/api，验收命令覆盖不到）。 |
| `grep -rln "request.json()" src/app/api \| xargs grep -L withApi` 为空 | 未达成；**命令有缺陷** | 当前 14。缺陷有两点：① 混合文件（含一个 withApi 即被排除）会漏掉 `articles/[id]` 的 GET/PUT/DELETE；② 不读 body 的路由（auth/me、auth/logout、health、manager-menus、settings/definitions、file 等）不被检查。建议改为 §2.3 的命令，再加一条"混合文件 handler 级"检查（例如 `grep -l "export async function" $(grep -rl "withApi\|crudList" src/app/api --include=route.ts)`，当前命中 3 个文件：articles/[id]、navigations（GET 为 withApi 委托，合规）、user-actions）。 |
| "旧名 getSettings re-export 保证前台不变" | 可行 | 前台 9 个文件只 import `getSettings`，re-export 后不用改。 |
| ESLint no-restricted-imports | 未开始 | `eslint.config.mjs` 共 18 行，只有 next 预设和 ignore。 |
| P08 禁止改 `package.json`、`prisma/**` | 一致 | P08 不需要新依赖；json-field 不改表。 |
| "P06/P07 新增的 blocks 资源纳入派生" | 依赖 P07 | crud-specs 中目前没有 blocks 资源（P07 尚未建页）。 |

### 2.3 未走 withApi 的 route.ts 清单

**按任务给定的命令** `grep -rL "withApi\|crud(" src/app/api --include=route.ts` 得到 **79** 个，**这个口径不对**：crud 工厂路由写的是 `crudList(spec)`，不包含字面量 `crud(`，结果把 55 个工厂路由也算进去了（工厂内部本身就套了 withApi，见 `src/lib/crud.ts:3,77-78,106-107,136-137,148-149,186-187`）。route.ts 总数 102，其中使用 crud 工厂的 57 个。

**修正命令** `grep -rL "withApi\|crudList\|crudCreate\|crudGet\|crudUpdate\|crudDelete" src/app/api --include=route.ts` 得到 **24** 个，与 P06-verify:49 一致：

| 路由 | 行数 | 导出方法 | 性质/建议 |
|---|---|---|---|
| apply/route.ts | 71 | POST | 公开表单；可以迁 withApi（auth:"none"），要保留限流/文案 |
| articles/route.ts | 166 | GET,POST | 前台列表 + 后台创建；需逐个评估公开 GET |
| auth/login/route.ts | 72 | POST | 认证；信封可统一，注意 cookie 设置 |
| auth/logout/route.ts | 21 | POST | 同上 |
| auth/me/route.ts | 11 | GET | 同上 |
| auth/refresh/route.ts | 16 | POST | 同上 |
| file/[...path]/route.ts | 40 | GET | **文件流，列为例外** |
| health/route.ts | 19 | GET | 探活，建议例外或 auth:"none" |
| llm/providers/[id]/route.ts | 99 | GET,PUT,DELETE | 后台 CRUD（密钥脱敏） |
| llm/providers/[id]/test/route.ts | 72 | POST | 外呼（含 AbortSignal.timeout:53） |
| llm/providers/route.ts | 81 | GET,POST | 后台 CRUD |
| manager-menus/route.ts | 76 | GET | 后台 |
| roles/[id]/route.ts | 89 | GET,PUT,DELETE | 后台（JSON.parse 2 处） |
| roles/route.ts | 87 | GET,POST | 后台（JSON.parse 1 处） |
| route.ts（api 根） | 8 | GET | 说明页，建议例外 |
| settings/definitions/route.ts | 33 | GET | 后台 |
| settings/email/test/route.ts | 46 | POST | 外呼 SMTP |
| settings/route.ts | 80 | GET,PUT | 后台 |
| upload/route.ts | 100 | POST | **multipart 上传**，可用 withApi 但不能 parseBody |
| users/[id]/route.ts | 91 | GET,PUT,DELETE | 后台 |
| users/route.ts | 75 | GET,POST | 后台 |
| wechat/accounts/[id]/route.ts | 87 | GET,PUT,DELETE | 后台 |
| wechat/accounts/route.ts | 68 | GET,POST | 后台 |
| wechat/callback/route.ts | 45 | GET,POST | **微信 XML 协议，列为例外**（需要自定义响应）；另有 `settings` 变量读取后未使用（P06-verify:93） |

另有混合文件中的手写 handler：`articles/[id]/route.ts:21 GET / :50 PUT / :145 DELETE`（:178 的 PATCH 已用 withApi）、`user-actions/route.ts:14 POST`（公开埋点）。

`grep -rln "request.json()" src/app/api | xargs grep -L withApi` = 14：apply、articles、auth/login、llm/providers/[id]、llm/providers/[id]/test、llm/providers、roles/[id]、roles、settings、user-actions、users/[id]、users、wechat/accounts/[id]、wechat/accounts。

---

## 3. crud-specs.tsx / crud-resources.ts / contracts 的字段重复程度

整体情况（`drift.py` 输出，见 `/workspace/work/hd/audit/scratch/drift.json`）：crud-specs 有 26 个资源块；其中 20 个能对上契约 createSchema，**字段键重合 156 个，契约多出 25 个，表单多出 0 个**。users/roles 用的是手写路由和 auth 契约，不在 crud-resources 中；logs/user-actions/notify-records/collect-tasks 是只读页，没有 fields。crud-resources 不重复字段定义，只重复"字段名引用"（searchFields/filters）。

**示例 1：courses（键完全一致，但标签/控件/枚举三处各写一遍）**
- 契约 `src/contracts/resources.ts:34-46`：11 个键，`status: z.enum(["active","draft","archived"])`（:45）
- 表单 `src/components/manager/crud-specs.tsx:107-134`：columns 6 个 + fields 11 个，键与契约 11/11 重合；status 的 options 内联重写了一遍（:128-130）；`categoryId/majorId` 是"分类 ID"文本框（:120-121），没有用 relations
- 后端 `src/lib/crud-resources.ts:121-131`：引用 `courseCreateSchema`，另写 `searchFields: ["title","description"]`、`filters: {categoryId, majorId, status}`、`include: {category, major}`
- 重复程度：字段键 100% 重复（2 份），status 枚举 2 份，字段名在 searchFields/filters 中又出现 5 次。

**示例 2：collect-sources（表单落后于契约，即 P06 承接项）**
- 契约 `resources.ts:274-290`：9 个键，含 `autoToKb`（:288）、`autoApprove`（:289）、`cron` 允许空串（:280-284）
- 表单 `crud-specs.tsx:478-504`：7 个字段，**缺 autoToKb/autoApprove**；type 的 options 与契约枚举一致（html/rss）
- 后端 `crud-resources.ts:320-336`：引用 schema + `searchFields: ["name","url"]`、`filters: {type, enabled}` + autoApprove 超管钩子（:328-335）
- 重复程度：7/9 键重复，2 键漂移（UI 无法设置）。

**示例 3：content-items（枚举漂移）**
- 契约 `resources.ts:236-249`：8 个键；`status` 只允许 `draft/pending_review/offline`（:246-248）；`source` 枚举 manual/collect（:243）
- 表单 `crud-specs.tsx:415-444`：7 个字段（缺 source）；status 的 options 5 个值，含 `approved`/`published`（:432-437），提交这两个值会被后端 400 拒绝（`crud-resources.ts:283-291` 的 beforeUpdate）
- 后端 `crud-resources.ts:276-300`：`updateSchema: contentItemCreateSchema.extend({ status: contentItemStatusSchema }).partial()`（:281），`searchFields ['title','content']`，`filters {status, source}`
- 重复程度：7/8 键重复，status 枚举三处（契约 create、events.ts 的全集、表单）且表单与契约不一致。

结论：P08 的派生目标成立，但重点应放在 **契约 → crud-specs**（标签、控件、枚举 options、列）上；crud-resources 只需改为从契约派生 `searchFields`/`filters` 的默认值（可选），不必大改。

---

## 4. P07 / P08 实际需要写入的文件集合与交集

### 4.1 P07 实际写入集合
- `src/components/ui/**`：**只能新增文件**（建议新增 manager 专用基础件，如 `ui/dropdown-menu.tsx`、`ui/popover.tsx`、`ui/tooltip.tsx`、`ui/sheet.tsx`、`ui/combobox.tsx`、`ui/badge.tsx` 等，或者干脆放到 `src/components/manager/ui/**`）。**禁止改** `ui/button.tsx`、`ui/input.tsx`、`ui/textarea.tsx`、`ui/label.tsx`（前台在用）；`ui/dialog.tsx` 无人引用，可以改或删。
- `src/components/manager/**`：`CrudPage.tsx`（重写）、`SchemaForm.tsx`（或由新的 `ResourceForm.tsx` 替代）、`crud-specs.tsx`（承接项：content-items 状态、collect-sources autoToKb/autoApprove、chat-scenes llmProviderId、各资源缺失的 status、roles 权限勾选、logs 筛选）、新增 `DataTable.tsx`、`ResourceForm.tsx`、`fields/{RichTextField,MarkdownField,ImageField,MediaPicker,TagsField,RelationSelect,JsonField,SecretField,DateTimeField}.tsx`、`StatCard.tsx`、`DetailDrawer.tsx`；修改 `FormDialog.tsx`、`DetailDialog.tsx`、`feedback/ConfirmDialog.tsx`、`shell/AppShell.tsx`、`shell/CommandPalette.tsx`（radix 迁移）、`Pagination.tsx`、`StatusBadge.tsx`、`feedback/styles.ts`
- `src/app/manager/**`：上述 10 个特殊页 + content-hub；新增 `notify-rules/page.tsx`、`home-blocks/page.tsx`、`page-templates/page.tsx`、`element-configs/page.tsx`、`not-found.tsx`（可选）；25 个规格页随 CrudPage 自动迁移，文件本身不一定改
- `prisma/seed.ts`（菜单 4 条，`children` 数组 :143-173）
- `package.json`、`package-lock.json`（加 tiptap 8 个包，删 radix 2 个；**还需要** `jsdom`、`@testing-library/react`、`@axe-core/playwright`，超出白名单）
- `vitest.config.ts`（include 加 `.tsx` 和环境配置）
- `tests/e2e/**`（新增 admin-components.spec.ts，可能还要改现有 spec 的选择器）、`tests/a11y/**`（新增，加 playwright 配置）
- **需提示词放行的越界项**：`src/lib/manager-fetch.ts`（透传 fieldErrors）；`src/lib/block-registry.ts` 拆出客户端安全的注册表模块（例如 `src/config/block-registry-defs.ts`）或新增 `src/app/api/content-blocks/registry/route.ts`；`src/contracts/resources.ts` 的 `notifyRuleUpdateSchema.quietHours`（以及 `api/notify-rules/[id]` 写入）；`src/app/globals.css` 删除 `.text-muted` 兼容（:370-372）

### 4.2 P08 实际写入集合
- `src/contracts/resources.ts`（resourceMeta、statusEnum、删死代码 `sortStatus.status`）、`src/contracts/blocks.ts`（meta）、新增 `src/contracts/derive.ts`、`src/contracts/__tests__/derive.test.ts`（以及 drift.test.ts）
- `src/components/manager/crud-specs.tsx`（降到 ≤200 行）、`src/components/manager/CrudPage.tsx`（适配派生）。实际很可能还要动 `SchemaForm.tsx` 的 `FieldSpec` 类型，但**不在 P08 允许路径内**，需放行或由 P07 先把类型定稳
- `src/lib/crud-resources.ts`、新增 `src/lib/json-field.ts`、`src/lib/http-client.ts`；`src/lib/settings.ts`；替换调用的文件：`src/lib/{collect-engine,collect-test,coze,llm-gateway,wechat,notify-gateway,auth,block-registry}.ts`
- `src/app/api/**`：24 个手写路由 + `articles/[id]`、`user-actions` 两个混合文件；`roles/*`（JSON.parse）；`llm/providers/[id]/test`（AbortSignal）
- `eslint.config.mjs`（仅新增规则）、`next.config.ts`（仅注释 :28）、**`src/lib/jobs/index.ts`（注释 :3-6，属于 src/lib，允许）**
- 测试目录（`src/**/__tests__`、`tests/e2e/**`）

### 4.3 交集（两方向会写同一文件）

| 文件 | P07 | P08 | 冲突性质与建议 |
|---|---|---|---|
| `src/components/manager/crud-specs.tsx` | 承接项修字段/枚举，加新资源 | 整体改为派生 | **高**：建议 P07 只修承接项和新增 blocks/notify 规格，派生留给 P08；或者让 P08 的"漂移测试"先落地（不改 crud-specs），给 P07 当护栏 |
| `src/components/manager/CrudPage.tsx` | 重写为 DataTable+ResourceForm | 适配派生 | **高**：P07 必须先冻结 `CrudPageSpec`/`FieldSpec` 接口，P08 只能改 spec 来源 |
| `src/components/manager/SchemaForm.tsx`（FieldSpec 类型） | 扩展字段类型/sections | 派生需要映射到 widget | 中：P08 允许路径未列入，需放行或约定类型放到 contracts |
| `src/contracts/resources.ts` | 需要 quietHours（越界） | 加 meta 结构 | 中：建议 quietHours 由 P08 或一个独立小任务先合入 |
| `src/lib/manager-fetch.ts` | fieldErrors 透传（越界） | src/lib/** 允许 | 低：建议拆成独立前置任务 |
| `src/lib/block-registry.ts` | 需要客户端可读的注册表（越界） | json-field 替换 :131 | 中：先拆 defs 模块，再做 P08 替换 |
| `src/app/api/**` | registry/notify-rules quietHours（越界） | withApi 迁移 | 中：P07 需要的 2 个端点改动建议放到前置任务 |
| `tests/e2e/**` | 新增 spec、改选择器 | 回归 | 低：顺序执行即可 |
| `prisma/seed.ts` | 写（菜单） | **禁止** | 无冲突 |
| `package.json` / lock | 写 | **禁止** | 无冲突（但 P07 的白名单要扩充 jsdom/@testing-library/react/@axe-core/playwright） |
| `vitest.config.ts` | 写 | 不写（derive.test.ts 是 .ts，现有 include 已覆盖） | 无冲突 |

---

## 5. 建议的最小原子任务拆分

通用验收（每个任务最后都要跑，本次未运行）：`npm run lint && npm run typecheck && npm test && npm run build`；凡涉及 manager 页面或前台共享件的，加跑 `npm run test:visual` 和 `npm run test:e2e`。

### 前置任务（解除 P07 阻塞，建议归入 P07 前的"P07-0"，或由编排者修订提示词放行）

| ID | 内容 | 允许修改 | 验收命令 | 规模 |
|---|---|---|---|---|
| T0-a | `managerFetch` 抛出带 `fieldErrors` 的 `ApiError`（新增 `fields` 属性），CrudPage/特殊页合并到 `errors` | `src/lib/manager-fetch.ts`、`src/components/manager/CrudPage.tsx`、`src/app/manager/{articles,llm-providers,publish-jobs,wechat-accounts}/page.tsx` | `grep -n "fieldErrors" src/lib/manager-fetch.ts` 命中；e2e：提交非法 slug 后对应字段 `aria-invalid=true` | 0.5 天 |
| T0-b | 把 `BLOCK_REGISTRY` 的纯数据拆到客户端安全模块（不 import prisma），`block-registry.ts` re-export；需要的话加 `GET /api/content-blocks/registry` | `src/config/block-defs.ts`（新）、`src/lib/block-registry.ts`、（可选）`src/app/api/content-blocks/registry/route.ts` | `grep -n "prisma" src/config/block-defs.ts` 为空；`npm test -- src/lib/__tests__/block-registry.test.ts`；`npm run test:visual` | 0.5 天 |
| T0-c | `notifyRuleUpdateSchema` 加 `quietHours`（JSON 字符串或对象，按 json-in-string 约定），PATCH 写入 | `src/contracts/resources.ts`、`src/app/api/notify-rules/[id]/route.ts`、测试 | 单测：PATCH quietHours 后 GET 回读一致 | 0.25 天 |

### P07（组件）

| ID | 内容 | 允许修改 | 验收命令 | 规模 |
|---|---|---|---|---|
| T07-1 | 承接项小修：content-items 状态只留可编辑三态 + "审核"行操作调 `/review`；collect-sources 加 autoToKb/autoApprove（仅超管可见）和 cron 留空提示；chat-scenes 加 llmProviderId（relations）/description/starters/status；补各资源缺失的 status；publish-jobs 去掉 limit=100 回填 | `src/components/manager/crud-specs.tsx`、`src/app/manager/{content-hub,publish-jobs}/page.tsx` | `python3 /workspace/work/hd/audit/scratch/drift.py` 中 onlyContract 只剩有意省略的字段（需在证据中列明）；e2e collect-publish 通过 | 1 天 |
| T07-2 | manager 基础件（新增文件，不动前台在用的 4 个 ui 文件）：Button/IconButton/Input/Textarea/Select/Combobox/Checkbox/Switch/Radio/DateTime/FormField/Sheet/DropdownMenu/Tooltip/Popover/Badge/Card/Skeleton/Kbd，基于 base-ui；`feedback/styles.ts` 的类名并入 | `src/components/manager/ui/**`（或 `src/components/ui/` 下新文件）、`src/components/manager/feedback/styles.ts` | `git diff --stat origin/main -- src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/label.tsx` 为空；`npm run test:visual` | 2 天 |
| T07-3 | DataTable：排序、筛选 chips、列显隐、密度、行选择 + 批量栏、每页 10/20/50/100、URL 同步、五态、窄屏策略（承接 P05-verify:39）；行操作保留直出按钮（兼容 e2e 的 getByRole） | `src/components/manager/DataTable.tsx`（新）、`Pagination.tsx`、`feedback/TableState.tsx` | 组件单测（jsdom）；e2e：排序/筛选/批量删除 | 2 天 |
| T07-4 | ResourceForm + 字段件（sections/折叠、Ctrl+S、JsonField、SecretField、RelationSelect 远程搜索、TagsField、ImageField + MediaPicker、DateTimeField） | `src/components/manager/ResourceForm.tsx`、`src/components/manager/fields/**`、`SchemaForm.tsx`（保留为兼容层） | 单测：JsonField 非法 JSON 报错；e2e：表单校验错误 | 2 天 |
| T07-5 | TipTap RichTextField + MarkdownField（预览用 MarkdownRenderer 的管理端版本，不改前台文件）；提交前 `sanitizeRichContent`（`src/lib/markdown.ts:59`） | `package.json`/lock（tiptap 8 包）、`src/components/manager/fields/{RichTextField,MarkdownField}.tsx` | `grep -n "@tiptap/react" package.json` 命中；e2e：富文本保存后前台显示净化内容；`npm run build` | 1.5 天 |
| T07-6 | CrudPage 重写为 PageHeader + DataTable + ResourceForm，`CrudPageSpec`/`RowAction` 向后兼容，保留所有 data-testid；25 个规格页无需改文件 | `src/components/manager/CrudPage.tsx` | `npm run test:e2e`（8 个 test 全过）；`grep -c "<table\|<button " src/components/manager/CrudPage.tsx` = 0 | 1 天 |
| T07-7 | 特殊页迁移 A：articles（含 PATCH 上下线）、publish-jobs、collect-items、content-hub | 对应 4 个 `page.tsx` | 用 §1.2 的严格正则在这 4 页计数为 0；e2e crud-article / collect-publish 通过 | 2 天 |
| T07-8 | 特殊页迁移 B：llm-providers、wechat-accounts、media（改名 + 用 `/api/media/batch`）、chat-history、settings、仪表盘、login（login 不能用前台共享的 ui/Input，要改用 manager 基础件），logs 筛选（规格加 filters） | 对应 `page.tsx`、`crud-specs.tsx`（仅 logs filters） | 严格正则对 `src/app/manager` 整体计数 = 0；e2e auth/apply-chat 通过 | 2 天 |
| T07-9 | notify-rules 页 + 菜单（依赖 T0-c） | `src/app/manager/notify-rules/page.tsx`、`prisma/seed.ts`（children 加 1 条） | e2e：`/manager/notify-rules` 200，切换 enabled 后保存回读一致；`npx prisma db seed` 两次幂等（未验证脚本名） | 0.75 天 |
| T07-10 | ADR-024 三页：home-blocks（排序/启用/按注册表字段生成表单/恢复默认）、page-templates、element-configs（JsonField）+ 3 条菜单（依赖 T0-b） | `src/app/manager/{home-blocks,page-templates,element-configs}/page.tsx`、`prisma/seed.ts` | e2e：禁用 1 个区块后前台不再渲染该 `data-block`，恢复默认后 `npm run test:visual` 通过 | 2 天 |
| T07-11 | 移除 radix：FormDialog/DetailDialog/ConfirmDialog/AppShell/CommandPalette 改用 base-ui Dialog；`ui/dialog.tsx` 删除或改写；`ui/label.tsx` 改为原生 label，class 保持不变（前台在用） | 上述 7 个文件、`package.json`/lock | `grep -rn "@radix-ui" package.json src` 为空；`npm run test:visual`（前台 ApplyForm 不变）；e2e 全过 | 1 天 |
| T07-12 | a11y 与测试基建：jsdom、@testing-library/react、@axe-core/playwright；`tests/a11y/manager.spec.ts`（10 个页面）；`tests/e2e/admin-components.spec.ts`；补 crud-article 持久化断言（P05-verify:41） | `package.json`/lock、`vitest.config.ts`、`tests/a11y/**`、`tests/e2e/**` | `npx playwright test tests/a11y` serious/critical = 0；`npm run test:e2e` | 1 天 |

### P08（复用）

| ID | 内容 | 允许修改 | 验收命令 | 规模 |
|---|---|---|---|---|
| T08-1 | 漂移检测测试（先失败，记录 §2.1-#2 的 11 个资源缺口和 content-items 枚举漂移）；可以早于 P07 落地，给 P07 当护栏 | `src/contracts/__tests__/drift.test.ts` | `npm test -- src/contracts/__tests__/drift.test.ts`（T07-1 后转绿或只剩白名单） | 0.5 天 |
| T08-2 | `resourceMeta` 结构 + `derive.ts`，试点 categories/articles/collect-sources；删除死代码 `sortStatus.status`，导出 `statusEnum` 常量 | `src/contracts/{resources,derive}.ts`、`src/contracts/__tests__/derive.test.ts` | `npm test -- src/contracts/__tests__/derive.test.ts` | 1 天 |
| T08-3 | 全量推广（含 blocks.ts），crud-specs 降到 ≤200 行（依赖 T07-6/T07-10 冻结接口） | `src/contracts/**`、`src/components/manager/crud-specs.tsx`、`CrudPage.tsx`（仅适配） | `test $(wc -l < src/components/manager/crud-specs.tsx) -le 200`；`npm run test:e2e` | 1.5 天 |
| T08-4 | `json-field.ts`（encode/decode，幂等），替换 §2.1-#3 中的 12 处 DB JSON-in-String 和 `crud-resources` 的 jsonifyArray/jsonifyFields；流协议的 4 处不动 | `src/lib/json-field.ts`、`src/lib/{auth,block-registry,collect-engine,collect-test,crud-resources,notify-gateway,wechat}.ts`、`src/app/api/roles/**` | `grep -rn "JSON.parse" src/lib src/app/api \| grep -v __tests__ \| grep -v "json-field\|coze.ts\|llm-gateway.ts"` 为空 | 1 天 |
| T08-5 | `http-client.ts`（timeout/retries/UA/logTag），替换 src/lib 的 15 处 + `api/llm/providers/[id]/test:53` | `src/lib/http-client.ts`、`src/lib/{wechat,coze,llm-gateway,collect-engine,collect-test}.ts`、该 route | `grep -rn "AbortSignal.timeout" src \| grep -v http-client.ts` 为空（比原命令多覆盖 src/app） | 1 天 |
| T08-6 | settings：`getPublicSettings`/`getAllSettings`，`getSettings` @deprecated re-export；去掉 3 处 `getAllSettings as getSettings` 别名；顺带删 `wechat/callback` 中未用的 settings 变量（P06-verify:93） | `src/lib/settings.ts`、`src/lib/{llm-gateway,collect-engine,collect-test}.ts`、`src/app/api/{settings,wechat/callback}/route.ts` | `grep -rn "as getSettings" src` 为空；`npm run test:visual`（前台不改文件） | 0.5 天 |
| T08-7 | withApi 迁移 A（后台 15 个）：llm/providers×3、manager-menus、roles×2、settings×3、users×2、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE | 上述 route.ts | 修正命令（§2.3）在后台路由上为空；`npm test`；e2e auth/crud-article | 1.5 天 |
| T08-8 | withApi 迁移 B（公开/协议类）：apply、articles 列表、auth×4、upload、user-actions POST；例外清单：file、health、api 根、wechat/callback（写入证据） | 上述 route.ts | `grep -rL "withApi\|crudList\|crudCreate\|crudGet\|crudUpdate\|crudDelete" src/app/api --include=route.ts` 只剩例外 4 个；e2e apply-chat/auth | 1 天 |
| T08-9 | 清理过期注释 + ESLint `no-restricted-imports` | `next.config.ts`（:28）、`src/lib/jobs/index.ts`（:3-6）、`eslint.config.mjs` | `grep -n "当前为预留\|后续切片注册" next.config.ts src/lib/jobs/index.ts` 为空；`npm run lint` | 0.25 天 |

建议顺序：T0-a/b/c → T08-1（护栏）→ T07-1 → T07-2 → T07-3/T07-4（可并行）→ T07-5 → T07-6 → T07-7/8 → T07-9/10 → T07-11 → T07-12 → T08-2…T08-9（T08-4/5/6/7/8/9 与 P07 无文件交集，可在 P07 期间并行，但要先确认 `src/lib/manager-fetch.ts`、`block-registry.ts` 的改动已合入）。

---

## 附录 A：清单

### A.1 /manager 下全部 page.tsx（36 个，`find src/app/manager -name page.tsx`；另有 `layout.tsx` 76 行）

| 路径（src/app/manager/…） | 行数 | 类型 |
|---|---|---|
| articles/page.tsx | 332 | 特殊页（自定义表格 + FormDialog + SchemaForm） |
| banners/page.tsx | 8 | CrudPage 规格页 `crudPageSpecs["banners"]` |
| campus/page.tsx | 8 | 规格页 campus |
| categories/page.tsx | 8 | 规格页 categories |
| chat-history/page.tsx | 227 | 特殊页（DetailDialog） |
| chat-scenes/page.tsx | 8 | 规格页 chat-scenes |
| collect-items/page.tsx | 200 | 特殊页（FilterTabs + FormDialog） |
| collect-sources/page.tsx | 8 | 规格页 collect-sources |
| collect-tasks/page.tsx | 8 | 规格页 collect-tasks（**无菜单**） |
| content-hub/page.tsx | 42 | CrudPage 包装（`crudPageSpecs["content-items"]` + rowActions） |
| courses/page.tsx | 8 | 规格页 courses |
| enrollment-offerings/page.tsx | 8 | 规格页 |
| gallery/page.tsx | 8 | 规格页 |
| home-cards/page.tsx | 8 | 规格页 |
| hot-majors/page.tsx | 8 | 规格页 |
| knowledge/page.tsx | 8 | 规格页 |
| llm-providers/page.tsx | 280 | 特殊页 |
| login/page.tsx | 177 | 特殊页（用前台共享的 `ui/Button`、`ui/Input`、`ui/Label`，另有 1 个原生 `<button`，:136） |
| logs/page.tsx | 9 | 规格页 logs（只读） |
| majors/page.tsx | 8 | 规格页 |
| media/page.tsx | 232 | 特殊页（网格 + 批量删除） |
| navigations/page.tsx | 8 | 规格页 |
| notify-recipients/page.tsx | 8 | 规格页 |
| notify-records/page.tsx | 8 | 规格页（只读） |
| notify-templates/page.tsx | 8 | 规格页 |
| page.tsx（仪表盘） | 81 | 特殊页 |
| partners/page.tsx | 8 | 规格页 |
| publish-jobs/page.tsx | 262 | 特殊页 |
| roles/page.tsx | 8 | 规格页 |
| service-guides/page.tsx | 8 | 规格页 |
| settings/page.tsx | 174 | 特殊页（SchemaForm 分组） |
| students/page.tsx | 8 | 规格页 |
| tags/page.tsx | 8 | 规格页 |
| user-actions/page.tsx | 8 | 规格页（只读） |
| users/page.tsx | 8 | 规格页 |
| wechat-accounts/page.tsx | 244 | 特殊页 |

合计：25 个纯规格页 + 1 个包装页（content-hub）+ 10 个特殊页。没有菜单的页面：collect-tasks（login 不需要菜单）。

### A.2 计数

- `grep -rnE "<table|<input |<select|<button " src/app/manager`：**37**（table 6 / input 1 / select 2 / button 28）；严格正则 `<(table|input|select|button|textarea)(\s|>|$)`：**46**
- `window.confirm|alert|prompt` 在 src 中：**0**；裸调用 `alert(` 1 处，在**前台** `src/components/web/ApplyForm.tsx:70`（不在 P07 范围）；src/app/manager 中 0
- `@radix-ui`：package.json 2 处（:34-35）+ src 7 个文件（见 §1.1-#6）；node_modules 中有 react-dialog/react-label 及其传递依赖
- `@base-ui/react`：package.json:29；使用者为 ui/button、checkbox、scroll-area、tabs、feedback/Toaster

### A.3 src/components/ui 现有组件（11 个，与 origin/main 完全一致）
button 60、checkbox 29、dialog 139（radix）、input 24、label 26（radix）、scroll-area 55、select 105、switch 34、table 117、tabs 84、textarea 23（行数）。

### A.4 ui 组件被引用情况（不含 ui 目录内部）
button 7 个文件（**前台**：`(web)/apply/ApplyClient.tsx`、`(web)/courses/[id]/page.tsx`、`(web)/page.tsx`、`web/ApplyForm.tsx`、`web/CourseSectionNew.tsx`、`web/PartnerUniversities.tsx`；后台：`manager/login`）；input 3；textarea 1；label 2；其余 7 个（checkbox/switch/scroll-area/tabs/select/table/dialog）为 0 引用。ui 中仍有深色主题残留类，例如 `button.tsx` 的 outline 变体 `border-white/[0.15] … text-gray-300`。

### A.5 src/components/manager 现有组件（行数）
根目录：CrudPage 383、crud-specs 601、SchemaForm 263、FormDialog 130、SearchInput 81、Pagination 69、DetailDialog 48、FilterTabs 44、StatusBadge 19。
feedback/：ConfirmDialog 253、useManagerQuery 61、Toaster 51、ErrorState 49、TableState 45、PageSkeleton 39、styles 33、toast 33、Forbidden 28、EmptyState 27、TableSkeleton 23、index 12。
shell/：Sidebar 200、AppShell 128、UserMenu 125、CommandPalette 120、MenuIcon 93、Topbar 76、Breadcrumbs 44、types 39、usePref 31、PageHeader 23。

## 附录 B：未验证事项
- 所有 npm 脚本（lint/typecheck/test/build/test:e2e/test:visual）均未运行；运行结果以 P06-verify 为准（视觉 46/46、e2e 8/8）。
- 375 宽溢出只在代码层确认，没有截图复核。
- `SessionUser` 是否带 `role.isSuper`，供前端"仅超管可见 autoApprove"使用：未核验。
- crud-article.spec 是否已补"保存后持久化"断言：未逐行核验。
- vitest 3 中 `environmentMatchGlobs` 的弃用状态：凭知识判断，未在本仓库查证。
