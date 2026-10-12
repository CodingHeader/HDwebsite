---
id: PARITY-MATRIX
type: requirement
title: main → upgrade 功能对等矩阵
status: active
owner: P0 规划轮
created: 2026-10-12
updated: 2026-10-12
related: [PLAN-CURRENT, EVD-P0-BASELINE, REQ-F-012, REQ-F-013, ADR-001, ADR-012, ADR-024, ADR-025]
---

# main → upgrade 功能对等矩阵（Parity Matrix）

- 对照基准：`origin/main@94dbbbb`（旧站）↔ `upgrade@5b72fb7`（重建中）。
- 补充参照：main 首个提交 `c6ff40b`（含 B 仓业务域：Major/EnrollmentOffering/media/batch 等，被 94dbbbb 覆盖）。
- 方法：`git ls-tree` 路由/页面/组件/模型清单逐项比对 + 关键文件行数与实现阅读 + 运行时 curl（见 06_validation/evidence/P0-baseline.md）。
- 状态口径：**present**＝功能与行为在 upgrade 可用；**replaced**＝经 ADR 以新实现替代，功能覆盖；**partial**＝存在但功能缺项或**前台视觉风格与 main 不一致**（用户硬约束：前台风格不得改变）；**missing**＝upgrade 无实现；**dropped-by-ADR**＝经 ADR 裁剪，需用户复核是否仍算"main 功能"。
- 归属方向：P01~P15（见 04_planning/review-prompts/）。
- 2026-10-12（P01）更新：用户裁决 U-B2 = 恢复（ADR-024 取代 ADR-012）→ C9/C10 由 dropped-by-ADR 改为 missing 并分派方向；U-B3 = Coze 集成 + Word/Markdown/TXT（ADR-025）→ F6/F7 口径更新；A1 组件数勘误 25→26；E2 增 P11（CLAUDE.md）。

## 汇总

| 状态 | 数量 |
| --- | --- |
| present | 16（其中 B5 合并 15 个资源族、C1 合并 22 个同名管理页、D1 合并 26 个模型） |
| replaced | 9 |
| partial | 21 |
| missing | 11（含 C9/C10，2026-10-12 由 dropped-by-ADR 转入） |
| dropped-by-ADR | 0（ADR-024 已裁决恢复） |
| **合计（行）** | **57** |

另：F 节 11 项用户新增需求单列（present 5｜partial 6），不计入上表。

## A. 前台页面与视觉（用户端，风格必须与 main 一致）

| # | 功能 | main 证据 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- | --- |
| A1 | 首页 11 区块（TopBanner/Banner 轮播/FourCards/TopEntranceSection/StatsBanner/PartnerUniversities/CourseSectionNew/CompanyIntro/NewsCenter/CertificateGallery/CampusSection） | `src/app/(web)/page.tsx`（272 行）+ `src/components/web/*`（26 个组件文件，共 2,861 行；P0 原写 25，P0-verify 勘误） | `src/app/(web)/page.tsx`（201 行内联区块，蓝色渐变 `from-blue-700`，无轮播） | partial（数据在、视觉不同） | P02 |
| A2 | 站点框架 TopBar/Header/Navbar（多级下拉）/Footer | `components/web/TopBar.tsx`、`Header.tsx`、`Navbar.tsx`(243)、`Navigation.tsx`(271)、`Footer.tsx`(138)；`(web)/layout.tsx` 73 行 | `components/web/SiteChrome.tsx` 68 行，仅 `level: 1` 导航（SiteChrome.tsx:10） | partial | P02 |
| A3 | 全局设计令牌（品牌红 oklch hue≈27、Geist 字体、sidebar/chart 变量） | `src/app/globals.css` 215 行 | `globals.css` 87 行，`--primary:#1d4ed8`（蓝） | partial | P02 |
| A4 | 悬浮联系 FloatingContact | 121 行 | 43 行 | partial | P02 |
| A5 | 关于我们 /about | 150 行 | 23 行 | partial | P02 |
| A6 | 在线报名 /apply：AI 咨询页（ApplyClient 499 行，场景驱动 + 会话持久化 + 报名表） | `(web)/apply/ApplyClient.tsx`、`components/web/ApplyForm.tsx` | `(web)/apply/page.tsx` + `ApplyForm.tsx`（表单 + 流程步骤），AI 仅全局 ChatWidget | partial | P02/P05 |
| A7 | 文章列表 /articles：分类筛选 + 分页 + 热门侧栏 | 302 行，`params.category`（page.tsx:16-26） | 62 行，仅 `page` 参数 | partial | P02 |
| A8 | 文章详情：浏览数 + 相关文章 + 热门 | 306 行（related :61、hot :239） | 51 行，仅浏览数 | partial | P02 |
| A9 | 课程列表/详情 /courses、/courses/[id] | 139 / 143 行 | 36 / 41 行 | partial | P02 |
| A10 | 校区 /campus | 123 行 | 36 行 | partial | P02 |
| A11 | 联系我们 /contact | 146 行 | 32 行 | partial | P02 |
| A12 | 证书风采 /gallery | 165 行 | 37 行 | partial | P02 |
| A13 | 学习中心 /learning | 114 行 | 21 行 | partial | P02 |
| A14 | 合作院校 /partners | 117 行 | 31 行 | partial | P02 |
| A15 | 党建 /party | 100 行 | 12 行 | partial | P02 |
| A16 | 服务指南 /services/[slug] | 146 行 | 25 行（已净化） | partial | P02 |
| A17 | /news、/news/[id] → /articles | `(web)/news/*` 重定向页 | next.config.ts:39-40 redirects | replaced（ADR-001） | — |
| A18 | 二级菜单重定向（/about/:slug+、/courses/self-study 等 11 条、/partners/:slug+、/news/<10 个 slug>、旧 banner 图） | main `next.config.ts` redirects（约 30 条） | upgrade 仅 2 条 | missing | P11 |
| A19 | 静态资源 public/（favicon×7、logo×4、campus×10、gallery×8、seed svg 等 150 个） | `public/**` | 无 public/；`/images/logo.png → 404`（P0-baseline F3） | missing | P02（原样恢复）/P15（治理） |
| A20 | error / loading / not-found | `(web)/error.tsx`、`loading.tsx`、`not-found.tsx` | 同名存在 + `app/not-found.tsx` | present | — |
| A21 | 动态元数据（站点标题/描述取 Setting） | `(web)/layout.tsx` generateMetadata | `app/layout.tsx` generateMetadata | present | — |
| A22 | 站点设置键（68 键） | `src/lib/settings-registry.ts` | 60 键；缺 advantage1~4、bannerOverlayColor、bannerShowTitle/Subtitle/Btn、bannerTextAlign/VerticalAlign、cardZikao/Chengkao/KaifangSubtitle、siteLogoIcon、statsLabel、homeCards | partial | P11 |

## B. 公开/管理 API

| # | 功能 | main 证据 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- | --- |
| B1 | 认证 login/logout/me/refresh | `api/auth/*` | 同名 4 路由 | present | — |
| B2 | 文章 CRUD | `api/articles`、`[id]` GET/PUT/DELETE | 同名 | present | — |
| B3 | 文章状态 PATCH（publish/archive，需 article:publish） | `api/articles/[id]` PATCH（:312） | 无 PATCH | partial | P03 |
| B4 | 新闻 CRUD | `api/news*` | 并入 articles(channel) | replaced（ADR-001） | — |
| B5 | 轮播/分类/课程/画廊/首页卡片/热门专业/导航/合作院校/服务指南/学员/标签/用户/校区/知识/场景 CRUD（15 族） | `api/<资源>` | 同名（crudGet/crudCreate… 工厂） | present | — |
| B6 | 校区图片嵌套 `campus/[id]/images[/imageId]` | main 嵌套路由 | 扁平 `/api/campus-images[/id]` | replaced（路径契约变化；P03 决定保持扁平或补嵌套兼容路由，见 P03 评审 #7） | P03 |
| B7 | 媒体：列表 GET、上传 POST、改名/分类 PATCH、删除 | `api/media` GET/POST、`[id]` PATCH/DELETE | `api/media` GET、`[id]` GET/DELETE；上传走 `/api/upload` | partial（缺 PATCH） | P03 |
| B8 | 媒体批量 `media/batch` | `c6ff40b:src/app/api/media/batch/route.ts`（B 仓历史） | 无 | missing | P03 |
| B9 | AI 配置 `ai-config` CRUD | `api/ai-config*` | `/api/llm/providers*`（+test/balance） | replaced（SOL-003） | — |
| B10 | AI 对话 `chat/completion` | 非流式 | `/api/chat/stream` SSE | replaced | — |
| B11 | 对话记录 `chat-history`（POST 持久化、GET 列表、GET/DELETE 单条） | `api/chat-history*` | 无路由（模型 AIChatHistory 存在，chat/stream 内写入） | missing | P03 |
| B12 | 操作日志 `logs` GET | `api/logs` | 无路由（OperationLog 由 lib/log.ts 写入） | missing | P03 |
| B13 | 角色 | GET | GET/POST + `[id]` | present（扩展） | — |
| B14 | 设置 settings | GET/POST | GET/PUT + definitions + email/test | present（方法变化） | P03 |
| B15 | 埋点 user-actions | GET | GET/POST | present | — |
| B16 | 上传 upload / 文件 file/[...path] | 存在 | 存在（类型白名单+20MB+sharp 缩略图；路径穿越防护） | present | — |
| B17 | 后台菜单 / 仪表盘 / 根探活 | 存在 | 存在（+health） | present | — |

## C. 管理端页面

| # | 功能 | main 证据 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- | --- |
| C1 | 22 个同名管理页（articles/banners/campus/categories/chat-scenes/courses/gallery/home-cards/hot-majors/knowledge/media/navigations/partners/roles/service-guides/students/tags/user-actions/users/settings/dashboard/login） | `src/app/manager/*` | 同名存在（多数为 8 行 CrudPage 包装） | present（功能）；UI 待升级 | P02/P07 |
| C2 | AI 配置页 | `manager/ai-config` | `manager/llm-providers`（201 行） | replaced | — |
| C3 | 新闻管理页 | `manager/news` | 并入 articles | replaced | — |
| C4 | 对话日志页 | `manager/chat-history` | 无 | missing | P03/P07 |
| C5 | 操作日志页 | `manager/logs` | 无；seed 菜单 `/manager/logs` 指向 404（seed.ts:126） | missing | P03/P07 |
| C6 | 富文本编辑器（TipTap：RichTextField/RichTextEditor） | `components/manager/RichTextField.tsx`、`fields/RichTextEditor.tsx`；package.json `@tiptap/*` | SchemaForm `richtext` = 纯 textarea（SchemaForm.tsx:100-105） | partial | P07 |
| C7 | 图片字段/上传器 ImageField/ImageUploader | 存在 | SchemaForm 内置 image 上传 | present | — |
| C8 | 分页组件 Pagination | 存在 | CrudPage 内置上一页/下一页 | present | — |
| C9 | 首页区块配置（block-registry + ContentBlock/PageTemplate/TemplateBlock + Navigation.templateId） | `src/lib/block-registry.ts`(192)；schema 3 模型；seed.ts:451-485（4 模板 + 4 区块，dev.db 同） | 无（ADR-012 裁剪） | missing（ADR-024 裁决恢复，原 dropped-by-ADR） | P04（模型/迁移/seed）/P06（注册表/API/首页组合）/P07（管理页） |
| C10 | 交互点配置 ElementConfig（含 navigationId 关联） | schema 模型（src 零引用；dev.db 0 行） | 无（ADR-012 裁剪） | missing（ADR-024 裁决恢复，原 dropped-by-ADR） | P04（模型/迁移）/P06（API）/P07（管理页） |
| C11 | 招生计划/专业管理（B 仓） | `c6ff40b` manager/enrollment-offerings、api/majors | `manager/majors`、`manager/enrollment-offerings` + API | present | — |

## D. 数据模型

| # | 功能 | main 证据 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- | --- |
| D1 | 26 个共有模型（Role/User/Navigation/Category/Course/Article/Tag/ArticleTag/Student/Banner/Setting/Partner/Campus/CampusImage/Gallery/HomeCard/ServiceGuide/HotMajor/Media/AIChatHistory/Knowledge/ChatScene/UserAction/ViewStats/OperationLog/ManagerMenu） | main schema 32 模型 | upgrade schema 42 模型 | present | — |
| D2 | News | 模型 | 并入 Article.channel | replaced（ADR-001） | — |
| D3 | AIConfig | 模型 | LLMProvider | replaced | — |
| D4 | ViewStats 模型 | 模型存在，main src 零引用（`git grep viewStats origin/main -- src` 为空） | 模型存在，src 零引用 | present（两侧均未使用；P04 决定接线或登记闲置） | P04 |

## E. 工程/部署

| # | 功能 | main 证据 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- | --- |
| E1 | Dockerfile / docker-compose / .dockerignore | main 根目录 | 无 | missing | P11 |
| E2 | 代理规则文件 AGENTS.md / CLAUDE.md | main 根目录（CLAUDE.md 内容为 `@AGENTS.md`） | 无（P01 新建 AGENTS.md） | missing（治理文档；AGENTS.md 由 P01 补，CLAUDE.md 由 P11 补后转 present） | P01/P11 |
| E3 | standalone 启动脚本 start-next.mjs | 存在 | 存在（但 F1/F2 缺陷） | partial | P11 |

## F. 用户新增基础设计（main 无，upgrade 扩展）

| # | 需求 | upgrade 证据 | 状态 | 方向 |
| --- | --- | --- | --- | --- |
| F1 | 官网 + 公众号统一管理 | `manager/wechat-accounts`、`content-hub`(41 行)、`publish-jobs`；`lib/wechat.ts` | partial（内容中枢页极简） | P05/P06 |
| F2 | 可配置自动采集院校/部门政策新闻 | `collect-sources`/`collect-tasks`/`collect-items` + `lib/collect-engine.ts` + cron `collect.run`（jobs/index.ts:14） | present | P06 |
| F3 | 自动更新/发布官网新闻 | `lib/publish-executor.ts:19`（website 渠道写 Article） | present | — |
| F4 | 自动发布公众号文章 | `lib/wechat.ts:151 publishDraftToWechat` | present（未经真实凭证联调） | P06 |
| F5 | 采集默认入知识库 | 仅在审核通过时写 Knowledge（`api/collect-items/[id]/route.ts:47`） | partial | P12 |
| F6 | 知识库管理（库模型管理/文件管理/其他）——2026-10-12：Coze 集成，Word(.docx/.doc)/Markdown/TXT，拒 PDF/图片（ADR-025） | 仅 Knowledge 单表 CRUD + `/api/kb/test`；无"库"实体、无文件上传、无 Coze dataset 同步 | partial | P12 |
| F7 | 多 LLM 配置 + 知识库/提示词/参数 | LLMProvider（温度/maxTokens/topP）+ ChatScene(systemPrompt/knowledgeTags)；场景不能绑定模型 | partial | P12/P06 |
| F8 | 官网 AI 客服 | `components/web/ChatWidget.tsx` + `/api/chat/stream` | present | — |
| F9 | 公众号 AI 客服 | `lib/wechat.ts:111-125` 只调 gatewayChat，不带场景提示词/知识库/历史，电话硬编码 | partial | P06/P12 |
| F10 | 多模型对话优先级 + 默认 + 兜底 | `lib/llm-gateway.ts:36-41` | present | — |
| F11 | 多收件人邮件提醒：发布前 / 低余额 / 错误 | notify-gateway：before_publish_*、llm_balance_low（人工余额）、job_failed/collect_failed；通用异常未接入；无 notify-rules 管理页 | partial | P06/P07 |

## 缺失/部分清单（供各方向 prompt 引用）

**missing（11）**：A18 二级菜单重定向、A19 public 资源、B8 media/batch、B11 chat-history API、B12 logs API、C4 对话日志页、C5 操作日志页、C9 首页区块配置、C10 ElementConfig、E1 Docker 部署件、E2 AGENTS.md/CLAUDE.md。

**partial（21）**：A1~A16 前台 16 项（风格/功能缩水，A6 报名 AI 咨询页、A7/A8 文章筛选与相关）、A22 设置键、B3 文章状态 PATCH、B7 媒体 PATCH、C6 富文本、E3 启动脚本——以及新增需求 F1/F5/F6/F7/F9/F11（新增需求不计入 57 行对等汇总，单列）。

> 注：partial 计数 = A1~A16(16) + A22 + B3 + B7 + C6 + E3 = 21。

**dropped-by-ADR（0）**：原 C9 首页区块配置运行时、C10 ElementConfig 两项——2026-10-12 用户裁决 U-B2 = 恢复（ADR-024 取代 ADR-012），已转入 missing 并分派 P04/P06/P07。
