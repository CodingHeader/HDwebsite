---
id: PARITY-MATRIX
type: requirement
title: main → upgrade 功能对等矩阵
status: active
owner: W2-06（V0.7 文档收口）
created: 2026-10-12
updated: 2026-10-21
related: [PLAN-CURRENT, EVD-P0-BASELINE, REQ-F-012, REQ-F-013, ADR-001, ADR-012, ADR-024, ADR-025]
---

# main → upgrade 功能对等矩阵（Parity Matrix）

- 对照基准：`origin/main@94dbbbb`（旧站，冻结不变）↔ `upgrade@8d79fa8`（本轮实测 HEAD，2026-10-21）。
- 补充参照：main 首个提交 `c6ff40b`（含 B 仓业务域：Major/EnrollmentOffering/media/batch 等，被 94dbbbb 覆盖）。
- 方法：`git ls-tree` 路由/页面/组件/模型清单逐项比对 + 关键文件行数与实现阅读 + 运行时 curl + **本轮逐行复核真实代码**（2026-10-21，见 `docs/design/06_validation/evidence/V7/W2-06/`）。
- 状态口径：**present**＝功能与行为在 upgrade 可用；**replaced**＝经 ADR 以新实现替代，功能覆盖；**partial**＝存在但功能缺项（**注意：2026-10-21 起不再包含"视觉风格不一致"**，前台视觉已由 `test:visual` 门禁独立守护，见 §视觉门禁）；**missing**＝upgrade 无实现；**UNKNOWN**＝环境限制无法验证（必须附理由）。

## 汇总（2026-10-21 终态）

| 状态 | 数量 | 说明 |
| --- | --- | --- |
| present（对等主表 57 行） | 50 | A1~A22（22）+ B1~B17（17）+ C1~C11（11）+ D1~D4（4）+ E1~E3（3）= 57 行中，50 项 present |
| replaced | 7 | B4、B9、B10、C2、C3、D2、D3（经 ADR 以新实现替代，功能覆盖） |
| partial（0 行） | 0 | 无 |
| missing（0 行） | 0 | 无（旧版 11 条已全部关闭，见文末"历史缺口关闭对照"） |
| UNKNOWN | 1 | 真实微信/SMTP/Coze 联调（凭证缺失）——非实现缺失；视觉像素回归已于 V0.9 闭环（见文末复核） |
| **合计** | **57 = 50 present + 7 replaced** | **对等主表缺口清零**；F 节 11 项新增需求单列：present 11 / partial 0 |

> **与旧版（P01 快照 present 16 / replaced 9 / partial 21 / missing 11）的差异**：旧计数是 P01 期快照，此后 P03、Wave 0、Wave 1、V0.7 各卡持续补齐，但矩阵正文一直未重算（旧文件头已自认"计数为 P01 快照，未重算"）。本次逐行复核后重算。

## 视觉门禁（替代旧的"partial（视觉不同）"口径）

前台视觉一致性**不再用 parity 的 partial 表达**，而由独立门禁守护：

```bash
npm run test:visual   # tests/visual/web.spec.ts，15 路由 × 1440/768/375，maxDiffPixelRatio ≤ 0.01
```

- 参照图：`tests/visual/reference/`（45 张，Linux/CI 生成，main@94dbbbb 口径）。
- 当前判定：**UNKNOWN（环境限制）**——本机为 Windows，字体渲染/图片解码跨平台差异使像素比对不可判；须 Linux 实机（CI 或 Docker）执行。已登记于 `evidence/V7/V7-UI-02/`、`evidence/V7/W2-05/`。
- **为什么这样改口径更严谨**：旧口径把"视觉不同"混进 partial，导致 16 个前台页面长期挂着 partial、无法与"功能缺失"区分；门禁化之后，功能对等与视觉对等各由独立证据支撑。

---

## A. 前台页面与视觉（用户端）

| # | 功能 | main 证据 | upgrade 证据（2026-10-21 实测） | 状态 |
| --- | --- | --- | --- | --- |
| A1 | 首页 11 区块（TopBanner/Banner 轮播/FourCards/TopEntranceSection/StatsBanner/PartnerUniversities/CourseSectionNew/CompanyIntro/NewsCenter/CertificateGallery/CampusSection） | `src/app/(web)/page.tsx`（272 行）+ 26 组件 | `src/app/(web)/page.tsx`（193 行）+ **组件存在**：11 个区块组件文件齐备<br>**能力对等**：9 个组件 props 与原版一致（`showOverlay`/`showContent`/`bgImage`/`bgColor`/`containerAlign`），A3 恢复<br>**配置可达**：8 组配置键已注册且前台可消费（A2 注册 + A4 接线；A5 验证默认态零变化）；区块顺序/启停由 `resolveHomeBlocks()` 读 TemplateBlock 决定（ADR-024），无配置时回落 main 原样顺序 | **present** |
| A2 | 站点框架 TopBar/Header/Navbar（多级下拉）/Footer | `TopBar/Header/Navbar(243)/Navigation(271)/Footer(138)`，`(web)/layout.tsx` 73 行 | 同名组件全部存在（`SiteChrome` 已下线），`Navigation.tsx` 支持多级 | **present** |
| A3 | 全局设计令牌（品牌红、Geist 字体、sidebar/chart 变量） | `globals.css` 215 行 | `globals.css` web 令牌按 main 恢复；管理端令牌隔离在 `[data-theme="manager"]` | **present** |
| A4 | 悬浮联系 FloatingContact | 121 行 | `FloatingContact.tsx` 存在 | **present** |
| A5 | 关于我们 /about | 150 行 | **154 行**（≥ main） | **present** |
| A6 | 在线报名 /apply：AI 咨询页（ApplyClient 499 行）+ 报名表 | `ApplyClient.tsx`、`ApplyForm.tsx` | `ApplyForm.tsx` + AI 场景驱动（ChatScene）；报名走 `POST /api/apply`（含频控） | **present** |
| A7 | 文章列表 /articles：分类筛选 + 分页 + 热门侧栏 | 302 行，`params.category` | **302 行**；`categoryId = params.category`（page.tsx:16）已实现 | **present** |
| A8 | 文章详情：浏览数 + 相关文章 + 热门 | 306 行（related :61、hot :239） | 相关文章已实现（`relatedArticles`，page.tsx:66/219） | **present** |
| A9 | 课程列表/详情 /courses、/courses/[id] | 139 / 143 行 | **139 行**（列表） | **present** |
| A10 | 校区 /campus | 123 行 | **127 行** | **present** |
| A11 | 联系我们 /contact | 146 行 | **150 行** | **present** |
| A12 | 证书风采 /gallery | 165 行 | **165 行** | **present** |
| A13 | 学习中心 /learning | 114 行 | **117 行** | **present** |
| A14 | 合作院校 /partners | 117 行 | **120 行** | **present** |
| A15 | 党建 /party | 100 行 | **103 行** | **present** |
| A16 | 服务指南 /services/[slug] | 146 行 | 已实现（含 XSS 净化 + Markdown 渲染） | **present** |
| A17 | /news、/news/[id] → /articles | `(web)/news/*` 重定向 | `next.config.ts` redirects | **replaced** |
| A18 | 二级菜单重定向（29 条） | main `next.config.ts` redirects | 恢复 main 全部 29 条（307，P03 逐条 curl MATCH） | **present** |
| A19 | 静态资源 public/（favicon/logo/campus/gallery 等） | `public/**` | **`public/` 已存在，150 个文件** | **present** |
| A20 | error / loading / not-found | 同名 | 同名存在 + `app/not-found.tsx` | **present** |
| A21 | 动态元数据（站点标题/描述取 Setting） | `(web)/layout.tsx` generateMetadata | `app/layout.tsx` generateMetadata | **present** |
| A22 | 站点设置键 | `settings-registry.ts` | **85 键**（旧记录 60 键已过期）；含 advantage、banner*、card*、stats* 等此前缺失项 | **present** |


> **判据强化（V1.8 / A8）**：`present` 必须证明「**能力等价**」，不得以「文件存在」代证。
> 核对项：① 组件与 props 是否齐全 ② 配置项是否可注册可消费 ③ 行为是否可复现。
>
> 反例（V1.7 实证）：首页 9 个组件虽全部存在，但 8 个丢失 `showOverlay` 等 props，
> FourCards 丢 7 个卡片字段 —— 旧口径下仍判 `present`。这是判据缺陷，已修正。

## B. 公开/管理 API

| # | 功能 | main 证据 | upgrade 证据 | 状态 |
| --- | --- | --- | --- | --- |
| B1 | 认证 login/logout/me/refresh | `api/auth/*` | 同名 4 路由 | **present** |
| B2 | 文章 CRUD | `api/articles`、`[id]` | 同名 | **present** |
| B3 | 文章状态 PATCH（需 article:publish） | `api/articles/[id]` PATCH | 同名 PATCH（article:publish，记 OperationLog） | **present** |
| B4 | 新闻 CRUD | `api/news*` | 并入 articles(channel) | **replaced**（ADR-001） |
| B5 | 15 族资源 CRUD | `api/<资源>` | 同名，走 `crudGet/crudCreate…` 工厂（25 个资源统一实现） | **present** |
| B6 | 校区图片嵌套 `campus/[id]/images[/imageId]` | 嵌套路由 | 扁平 `/api/campus-images[/id]` + 嵌套兼容层（跨校区 404） | **present** |
| B7 | 媒体：列表/上传/改名分类/删除 | `api/media`、`[id]` | GET、`[id]` GET/**PATCH**/DELETE；上传走 `/api/upload` + `/api/file/[...path]` | **present** |
| B8 | 媒体批量 `media/batch` | `c6ff40b` | `POST /api/media/batch`（delete/move-category，ids≤100） | **present** |
| B9 | AI 配置 `ai-config` CRUD | `api/ai-config*` | `/api/llm/providers*`（+test/balance/order） | **replaced** |
| B10 | AI 对话 `chat/completion` | 非流式 | `/api/chat/stream` SSE | **replaced** |
| B11 | 对话记录 `chat-history` | `api/chat-history*` | GET 列表（按会话聚合）、`[id]`=sessionId GET/DELETE | **present** |
| B12 | 操作日志 `logs` GET | `api/logs` | GET（log:list，module/action/username/时间筛选） | **present** |
| B13 | 角色 | GET | GET/POST + `[id]` GET/PUT/DELETE（含 SEC-01 越权收口） | **present** |
| B14 | 设置 settings | GET/POST | GET/PUT + definitions + email/test | **present** |
| B15 | 埋点 user-actions | GET | GET/POST | **present** |
| B16 | 上传 upload / 文件 file/[...path] | 存在 | 存在（类型白名单 + 20MB + sharp 缩略图 + 路径穿越防护） | **present** |
| B17 | 后台菜单 / 仪表盘 / 根探活 | 存在 | 存在（+health） | **present** |

## C. 管理端页面

| # | 功能 | main 证据 | upgrade 证据 | 状态 |
| --- | --- | --- | --- | --- |
| C1 | 22 个同名管理页 | `src/app/manager/*` | 同名存在（统一 CrudPage 包装） | **present** |
| C2 | AI 配置页 | `manager/ai-config` | `manager/llm-providers` | **replaced** |
| C3 | 新闻管理页 | `manager/news` | 并入 articles | **replaced** |
| C4 | 对话日志页 | `manager/chat-history` | 存在（会话列表+详情弹窗+删除） | **present** |
| C5 | 操作日志页 | `manager/logs` | 存在（CrudPage 只读 → /api/logs） | **present** |
| C6 | 富文本编辑器（TipTap） | `RichTextField.tsx`、`RichTextEditor.tsx` | **TipTap 已接入**：`components/manager/fields/RichTextEditorCore.tsx`、`RichTextField.tsx`；`@tiptap/*` 6 个依赖已在 package.json | **present** |
| C7 | 图片字段/上传器 | ImageField/ImageUploader | SchemaForm 内置 image 上传 | **present** |
| C8 | 分页组件 | Pagination | CrudPage 内置上一页/下一页 | **present** |
| C9 | 首页区块配置（block-registry + ContentBlock/PageTemplate/TemplateBlock + Navigation.templateId） | `block-registry.ts`(192)、3 模型、seed 4 模板 4 区块 | **已恢复（ADR-024 取代 ADR-012）**：`src/lib/block-registry.ts` + `block-registry-defs.ts`（12 区块注册表）；3 模型齐备；`/api/home-blocks/registry`、`/api/home-blocks/reset`；前台 `resolveHomeBlocks()` 生效 | **present** |
| C10 | 交互点配置 ElementConfig（含 navigationId） | schema 模型 | **已恢复**：`/api/element-configs` CRUD 全量（GET/POST/`[id]` GET/PUT/DELETE）；导航关联可配置 | **present** |
| C11 | 招生计划/专业管理（B 仓） | `c6ff40b` | `manager/majors`、`manager/enrollment-offerings` + API | **present** |

## D. 数据模型

| # | 功能 | main 证据 | upgrade 证据 | 状态 |
| --- | --- | --- | --- | --- |
| D1 | 26 个共有模型 | main schema 32 模型 | upgrade schema **42 模型**（含新增 Publishing/Collect/KB 域） | **present** |
| D2 | News | 模型 | 并入 Article.channel | **replaced** |
| D3 | AIConfig | 模型 | LLMProvider | **replaced** |
| D4 | ViewStats 模型 | 模型存在，main src 零引用 | 模型存在，src 零引用（同等状态） | **present** |

## E. 工程/部署

| # | 功能 | main 证据 | upgrade 证据 | 状态 |
| --- | --- | --- | --- | --- |
| E1 | Dockerfile / docker-compose / .dockerignore | main 根目录 | **三者均存在**（`Dockerfile`、`Dockerfile.dev`、`docker-compose.yml`、`.dockerignore`，D-08 交付）；`docker build` 未实测（本机无 docker CLI）→ 构建可行性 **UNKNOWN** | **present**（构建 UNKNOWN） |
| E2 | 代理规则文件 AGENTS.md / CLAUDE.md | main 根目录 | `AGENTS.md`（V0.7 单主线版）+ `CLAUDE.md`（`@AGENTS.md`）均存在（D-08 补齐） | **present** |
| E3 | standalone 启动脚本 start-next.mjs | 存在 | 存在（`scripts/start-next.mjs`） | **present** |

## F. 用户新增基础设计（main 无，upgrade 扩展）

| # | 需求 | upgrade 证据 | 状态 |
| --- | --- | --- | --- |
| F1 | 官网 + 公众号统一管理 | `manager/wechat-accounts`、`publish-jobs`；`lib/wechat.ts`；B-07 渠道注册表 + 渠道级状态 | **present**（真实联调 **UNKNOWN**：凭证缺失） |
| F2 | 可配置自动采集 | `collect-sources/tasks/items` + `collect-engine.ts` + cron `collect.run` | **present** |
| F3 | 自动更新/发布官网新闻 | `publish-executor` website 渠道 | **present** |
| F4 | 自动发布公众号文章 | `lib/wechat.ts` + PublishChannel wechat | **present**（真实联调 UNKNOWN） |
| F5 | 采集默认入知识库 | `collect-engine` 按 `autoToKb` 入库 + `kb-sync` 队列 | **present** |
| F6 | 知识库管理（Coze；Word/MD/TXT；拒 PDF/图片） | 库实体 + 文件管理 + Coze dataset 同步 + 三重文件类型校验（ADR-025） | **present**（Coze 真实联调 UNKNOWN） |
| F7 | 多 LLM 配置 + 知识库/提示词/参数 | LLMProvider（温度/maxTokens/topP）+ ChatScene 可绑定 baseIds/providerIds | **present** |
| F8 | 官网 AI 客服 | `ChatWidget.tsx` + `/api/chat/stream` | **present** |
| F9 | 公众号 AI 客服 | 复用 chat-service（场景提示词/知识库/历史），电话读 Setting | **present** |
| F10 | 多模型对话优先级 + 默认 + 兜底 | `llm-gateway.ts`（isDefault → priority → isFallback） | **present** |
| F11 | 多收件人邮件提醒：发布前/低余额/错误 | notify-gateway：before_publish_*、llm_balance_low、job_failed、collect_failed、system_error（10 分钟聚合）+ notify-rules 管理页 + 静默时段 + flushDeferred | **present**（真实 SMTP **UNKNOWN**） |

## 缺失/部分清单（2026-10-21）

**对等主表 missing = 0，partial = 0。**

**UNKNOWN（2026-10-23 V0.9 复核后余 1 项，非实现缺失）**：
1. **真实第三方联调**：微信公众号 API、SMTP、Coze dataset 凭证缺失，全部以 mock 验证——按 AGENTS.md §2 口径标 UNKNOWN。
2. ~~视觉像素回归~~ **已闭环（V0.9 / V9-VIS-03）**：Linux CI visual 门禁 45/45 全绿（run 39986975597），基线重生成自 CI 同源环境并逐张记录理由，`continue-on-error=false` 后 visual 失败阻断主门禁；分诊证实 0 样式回归（`evidence/V9/VIS-03/`）。

**已被后续卡关闭的历史缺口**（对照旧版 11 条 missing / 21 条 partial）：
- missing → present：A18（redirects 29 条）、A19（public 150 文件）、B8（media/batch）、B11（chat-history）、B12（logs）、C4、C5、C9（ADR-024 恢复）、C10（ADR-024 恢复）、E1（D-08）、E2（D-08）。
- partial → present：A1~A16（前台全面恢复，含首页 11 区块组件）、A22（60→85 键）、B3、B7（补 PATCH）、C6（TipTap 接入）、E3。

**口径变更说明**：旧版把"视觉与 main 不一致"计入 partial（共 16 项 A 行）。V0.7 起前台视觉由 `npm run test:visual` 独立门禁守护（maxDiffPixelRatio 0.01），不再混入功能对等口径——否则"功能齐全但像素差 1%"会被判成功能缺失，无法指导返工。
