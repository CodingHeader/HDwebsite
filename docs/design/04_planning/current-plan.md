---
id: PLAN-CURRENT
type: plan
title: 当前轮计划——全量重构 P0~P15（事实基线 / 需求复核 / 15 方向评审）
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-12
related: [PARITY-MATRIX, EVD-P0-BASELINE, PLAN-MASTER, REQ-F-013, REQ-F-014, REQ-F-015, ADR-024, ADR-025]
---

# 当前轮计划：main → upgrade 全量审阅·优化·重构（P0~P15）

> 治理标准：`docs/design/规划总指令-任务分配与完整规划.md`（623 行，下称"规划总指令"）。本文件按其 §10 的 16 节输出。
> 本轮输入（用户原意）：学习 main，审阅—优化—重构全部内容到 upgrade，不计代价；main 上的每个功能都必须在 upgrade 存在，main 缺的按需求在 upgrade 扩展；**用户端（web）UI 风格不得改变**；管理端（manager）UI 顶级设计、极度友好。
> 执行顺序（用户指定）：P01 需求 → P02 前端 → P03 后端 → P04 数据 → P05 交互 → P06 逻辑 → P07 组件 → P08 复用 → P09 拓展 → P10 性能 → P11 配置 → P12 知识库 → P13 响应 → P14 存储 → P15 资源。每个方向一份可执行提示词：`04_planning/review-prompts/P01-需求.md … P15-资源.md`。
> 历史轮次记录（2026-10-10 ~ 10-11）完整保留于文末附录 A。

### 2026-10-12 用户裁决（P01 落盘；有约束力，优先于本文件其他段落中的旧表述）

| # | 裁决 | 落点 | 关闭/影响 |
| --- | --- | --- | --- |
| D1 | 公开站点（web）沿用 main 原有的**红色横幅轮播**风格，外观不变 | REQ-F-014；P02 visual 门禁 | K2 定稿 |
| D2 | "main 上每个功能都要在 upgrade 存在"再次确认；**首页区块配置 + ElementConfig 恢复**，取代 ADR-012 | REQ-F-013；ADR-024；parity C9/C10 → missing（P04/P06/P07） | K1、U-B2 关闭 |
| D3 | 知识库通过 **Coze** 集成；文件类型仅 **Word（.docx/.doc）+ Markdown + TXT**，**不要 PDF、不要图片** | ADR-025；REQ-F-007 更新；P12 重写 | K4、U-B3 关闭 |
| D4 | 微信公众号与 SMTP 凭证不提供 | 完整实现 + mock 测试，真实联调标 UNKNOWN（M-9/M-12 公众号部分、M-13 真实发信） | U-B1、U-B4 关闭（取方案 B） |
| D5 | 管理端顶级设计、极度友好 | REQ-F-015 | — |

---

## 1. 规划快照

```yaml
规划日期: 2026-10-12
git_branch: upgrade（跟踪 origin/upgrade）
git_commit: 5b72fb73d8bb87ff44ab7c932b4ae265d4d09709
对照基准: origin/main@94dbbbb（旧站，826 文件）；main 首提交 c6ff40b（含 B 仓业务域历史）
工作区是否干净: true（P0 前后 git status 为空）
需求文档清单: docs/design/02_requirements/**（REQ-F-001~012、REQ-NF-001~004、REQ-C-001~003、inbox 1、product-requirements、backlog；均在 8af8bfb/8ea4155/5b72fb7 期间最后修改，2026-10-10~12）
  + 本轮新增: 02_requirements/parity-matrix.md
代码文件数: upgrade 已跟踪 742（src 195，TS/TSX 194 个共 10,929 行〔P0 原写 11,016，P0-verify 以 `git ls-files src | grep -E '\.(ts|tsx)$' | xargs wc -l` 复算勘误〕；uploads 413 个≈32MB）
测试命令: npm run lint｜npm run typecheck｜npm test｜npm run build（npm run check = lint+typecheck+build）
运行环境: node v22.23.3（engines 要求 >=24，EBADENGINE 警告）/ npm 10.9.9 / Prisma Client 7.10.0
基线结果: lint 0 error/25 warning｜typecheck 0 error｜vitest 6 文件 33/33 通过｜build 通过（单次测量 92s；P0-verify 复跑编译阶段 119s，构建耗时随环境波动约 90~120s，仅作参考）——明细见 06_validation/evidence/P0-baseline.md
```

## 2. 事实基线

### 2.1 已确认事实（有代码/运行证据）

1. 技术栈（package.json）：Next 16.2.1 / React 19.2.4 / Prisma 7（libsql 适配器，SQLite）/ Tailwind v4 / zod 4 / zustand 5 / vitest 3；`@base-ui/react`、`@radix-ui/react-dialog`、`@radix-ui/react-label` 已安装但 **src 零引用**；无 `src/components/ui/`、无 `lib/utils.ts`（cn）；无 TipTap。
2. 路由（build 输出）：前台 15（/、about、apply、articles、articles/[id]、campus、contact、courses、courses/[id]、gallery、learning、partners、party、services/[slug] + not-found）+ API 87（route.ts 87 个）+ manager 34（page.tsx 34 个）+ robots/sitemap。（P0 原写 API 89 + manager 35，P0-verify 以 build 输出与 `find` 复算勘误。）
3. 数据：schema 42 模型；迁移 4 个（20261011052216_init → partner_int_id → course_sort → llm_kind_botid）；seed 幂等，默认 admin/admin123。
4. 契约唯一源：`src/contracts/*.ts`（zod：common/auth/article/setting/user-action/resources）；统一响应包 `src/lib/api-response.ts`；通用 CRUD 工厂 `src/lib/crud.ts` + 规格表 `src/lib/crud-resources.ts`；管理端列/表单规格另在 `src/components/manager/crud-specs.tsx`（583 行，**第二源**）。
5. 调度：`src/instrumentation.ts` 启动进程内调度，`src/lib/jobs/index.ts:11-50` 注册 backup / collect.run / publish.scan / notify.scan / retry.failed / llm.balance-check。
6. LLM 路由：`src/lib/llm-gateway.ts:36-41` default → priority 升序 → fallback；Coze 适配 `src/lib/coze.ts`。
7. 管理端 UI：`src/app/manager/layout.tsx`（121 行手写侧栏，`import * as Lucide` :9）；24 个管理页为 8 行 `CrudPage` 包装；CrudPage 使用 `window.confirm`（CrudPage.tsx:146、210），crud-specs 使用 `alert()`（crud-specs.tsx:27）。
8. 运行冒烟：首页热 TTFB≈28ms；后台 `/manager` JS gzip 393,828B；standalone 启动不读 .env.local（F1）、每次启动都重建（F2）、public/ 缺失致 /images/logo.png 404（F3）、/manager/logs 404（F4）。

### 2.2 仅来自文档、未在代码中验证

- 微信发文/客服、SMTP 发信、Coze 知识库的真实联调效果（无凭证；EVD-VERIFY 记录为前一轮人工验证，本轮未复现）。
- `validation-plan.md` 中 M2~M4 验收项的"已通过"结论（本轮未重跑浏览器 E2E）。
- 生产部署链路（宝塔 80 反代 → 6789）。

### 2.3 文档与代码不一致清单（以代码为准）

| # | 文档说法 | 代码事实 | 处置方向 |
| --- | --- | --- | --- |
| I1 | master-plan §3 M-1：A 仓前台路由/后台页面/API "全部重建且行为对齐" | chat-history / logs 的 API 与页面缺失；前台 16 个页面视觉与 main 不同（parity-matrix A1~A16） | P01（已在 master-plan 加更正块，2026-10-12）/P02/P03 |
| I2 | README §2 技术栈含 "TipTap / shadcn" | upgrade 无 TipTap、无 components/ui | P07 |
| I3 | master-plan §1 称 hdwebsite_0429（B 仓）= c6ff40b | GitHub `main` HEAD = 94dbbbb 为 A 仓口径（32 模型、无 Major）；c6ff40b 仅为 main 首提交 | P01（已更正，2026-10-12） |
| I4 | 菜单 seed 与路由使用 `kb:list/llm:list/collect:list/notify:list/wechat:list/publish:list/content:list`（seed.ts:112-122；api/kb/test/route.ts:15 等） | `permissionCatalog` 仅定义这些模块的 `edit`（contracts/auth.ts:73-79）→ 角色无法被授予 list 权限，非 SuperAdmin 看不到 AI/通知菜单 | P03/P04 |
| I5 | seed 菜单登记 `/manager/logs`（seed.ts:126） | 页面不存在（404） | P03 |
| I6 | REQ-F-006"采集默认入知识库" | 仅在审核通过时写 Knowledge（api/collect-items/[id]/route.ts:47） | P06/P12 |
| I7 | ADR-017 审核权 SuperAdmin 独享 | `content-items` PUT 由通用 CRUD 处理，`content:edit` 即可把 status 改为 approved/published（crud-resources.ts:244-255；contracts/resources.ts:241）——**由代码推断，未运行验证** | P06 |
| I8 | SOL-005：通知规则可配置 | `api/notify-rules` 存在，但无管理页、无菜单 | P07 |
| I9 | `.env.example`：复制为 .env.local 即可 | standalone 生产启动不加载 .env.local（P0-baseline F1） | P11 |
| I10 | master-plan §11 构建 ≈40s | 本机实测 92s（环境不同，仅记录） | P10 |
| I11 | 注释称"预留/后续切片注册"（next.config.ts:28；jobs/index.ts:3-6） | 已实现 | P08（清理注释） |
| I12 | product-requirements §4"前台 13 类页面" | main 前台 15 路由 + news 2 个重定向页 | P01（已更正，2026-10-12） |
| I13 | REQ-F-011 五类事件含"错误" | `system_error` 只在通知自身失败时派生（notify-gateway.ts:136-137），API/调度异常未接入 | P06 |
| I14 | 14-存储设计 §4/§S1：每日备份 dev.db + uploads、上传迁独立 uploads 目录 | standalone 运行时 `process.chdir(.next/standalone)`（server.js:6），`UPLOAD_ROOT`/`backups` 基于 cwd（upload/route.ts:25、jobs/backup.ts:45）→ 写入构建目录，重建即清空（P0 实测首启备份在重建后消失） | P14 |

### 2.4 读取失败或无法访问

- `origin/feature/project-optimization`（57868af）：范围外，未审阅。
- main `website_error/.token.txt`：凭据类文件，按安全规则不读取。
- 浏览器视觉对比与真实第三方联调：P0 不执行（见 P0-baseline §5）。

## 3. 需求基线复核

### 3.1 复述与拆解

**核心问题**：弘道教育官网（学历提升招生）需要在**不改变访客所见风格**的前提下，把旧站（main）的全部功能迁入重建仓（upgrade），并把官网与公众号的内容生产（采集→知识库→发布→提醒）与 AI 客服（多模型+知识库）统一到一个顶级易用的管理后台。

- **访客（用户端）**：浏览首页/院校/专业/资讯/校区/证书，在线报名，AI 咨询（官网浮窗 + 报名页 + 公众号）。
- **管理端**：SuperAdmin（唯一审核权，ADR-017）/ Editor / Viewer；管理内容、采集、知识库、模型、发布、公众号、通知、系统。
- **系统边界**：单机 Next.js + SQLite + 本地文件；外部依赖 = 微信公众平台 API、SMTP、LLM 供应商（OpenAI 兼容 / Coze）、被采集站点。无 Redis/MQ/独立 worker（REQ-C-003）。
- **关键词**：对等（parity）、风格冻结、顶级后台、统一风格、标准组件、完整 CRUD、全动态数据、交互可用、自动采集、默认入库、自动发布、多模型优先级/默认/兜底、多收件人邮件提醒。

### 3.2 MUST / SHOULD / COULD / MUST NOT

**MUST（每条可验证）**

| ID | 需求 | 可验证表述 |
| --- | --- | --- |
| M-1 | main 功能全量对等（REQ-F-013） | `parity-matrix.md` 中 missing=0、partial=0、dropped-by-ADR=0（U-B2 已裁决恢复：C9/C10 须达 present，ADR-024） |
| M-2 | 用户端 UI 风格不变——main 原有红色横幅轮播风格（REQ-F-014，D1） | 同一 seed 数据下，upgrade 15 个前台路由在 1440/768/375 三个宽度的 Playwright 截图与 main 对应路由像素差 ≤ 1%（`maxDiffPixelRatio: 0.01`），且 DOM 主要区块（data-testid）一致 |
| M-3 | 管理端顶级设计（REQ-F-015） | /manager 全部页面只用 `src/components/ui/**` 与 `src/components/manager/**` 共享组件；`grep -rn "window.confirm\|alert(" src/app/manager src/components/manager` 为 0；axe 扫描 serious/critical = 0；有 375px 可用布局 |
| M-4 | 完整 CRUD | 每个可写资源（crud-resources 中有 createSchema 者 + 特殊页资源）均有 list/get/create/update/delete 契约测试，且未登录 401、无权限 403 用例通过 |
| M-5 | 全动态数据 | 前台与后台展示数据全部来自 DB/Setting；`grep` 硬编码电话/品牌文案（如 wechat.ts:118 `400-001-5729`，域名在 :119）为 0 |
| M-6 | 交互可用 | Playwright E2E：登录→新建/编辑/删除→采集试抓→审核→排期发布→通知记录 全链路通过 |
| M-7 | 可配置自动采集 | 采集源 CRUD + cron 可改 + 试抓/立即执行；`collect.run` 按 cron 运行并留 CollectTask 记录 |
| M-8 | 采集默认入知识库 | 新采集条目在源开关 `autoToKb=true`（默认）时，入库后即在知识库可检索（不必等待发布） |
| M-9 | 自动发布官网新闻与公众号文章 | PublishJob 到点执行：website 写 Article(published)；wechat 走草稿→发布接口（mock 适配器测试通过；无凭证，真实联调 UNKNOWN，D4） |
| M-10 | 知识库管理（库/文件/条目/检索测试；Coze 集成，ADR-025） | 管理端可增删改查知识库（映射 Coze dataset）、上传 Word(.docx/.doc)/Markdown/TXT 文件同步到 Coze 并生成本地兜底条目、上传 PDF 或图片被拒（400）、按库检索测试（Coze 真实联调 UNKNOWN，mock 契约测试） |
| M-11 | 多模型 + 知识库 + 提示词 + 参数 | 每个对话场景可绑定：模型优先级列表（缺省走全局 default→priority→fallback）、知识库集合、系统提示词、温度/maxTokens/topP |
| M-12 | 官网与公众号 AI 客服 | 两渠道使用同一场景配置（提示词+知识库+模型路由），公众号回复不含硬编码文案 |
| M-13 | 多收件人邮件提醒 | 发布前（news/info/wechat）、LLM 余额低、错误（API 500 / 任务失败 / 采集失败）三类事件均按规则发给多名收件人并留 NotifyRecord（无 SMTP 凭证：jsonTransport 测试，真实发信 UNKNOWN，D4） |
| M-14 | 敏感凭据加密 | apiKey/appSecret/SMTP 密码加密落库、接口脱敏；`git grep` 无明文密钥 |

**SHOULD**：性能不劣于 P0 基线（§11）；SEO 三件套保持；后台响应式；备份可恢复；文档与代码一致。
**COULD**：向量检索（ADR-016 二期）；余额 API 自动查询（视供应商支持）；Docker 部署件恢复后的镜像发布。
**MUST NOT**：改变前台视觉风格；引入 Redis/MQ/无头浏览器/独立 worker；提交 .env/密钥/数据库/运行时上传文件；群发接口；未经独立验证即推送；并行改 contracts 或同一迁移。

### 3.3 冲突清单

| # | 冲突 | 处置 |
| --- | --- | --- |
| K1 | "main 每个功能都要在" vs ADR-012 裁剪 block-registry/ContentBlock/PageTemplate/TemplateBlock/ElementConfig | **已裁决（2026-10-12，D2）**：恢复，ADR-024 取代 ADR-012 |
| K2 | "前台风格不变" vs upgrade 现有前台（已重写为蓝色简化版） | 以用户本轮硬约束为准：P02 以 main 视觉（红色横幅轮播，D1）为唯一标准恢复；与 ADR 无冲突（ADR-001 仅换数据源/路由，视觉不变） |
| K3 | "余额低提醒" vs ADR-005 人工填报余额 | NON_BLOCKING：保持人工填报 + 阈值提醒；供应商支持余额 API 时可选自动查询（COULD） |
| K4 | REQ-F-007"库/文件管理" vs ADR-020/023 外部知识库（Coze）优先 | **已裁决（2026-10-12，D3）**：Coze 集成（库↔dataset、文件↔document）+ 本地兜底；Word/Markdown/TXT，拒 PDF/图片（ADR-025） |
| K5 | "自动发布" vs ADR-017 人工审核 + ADR-008 发布前仅通知 | NON_BLOCKING 假设 A-3：审核门保留；"自动"= 审核通过后按排期自动执行；采集源可选 `autoApprove`（默认 false） |
| K6 | engines node>=24 vs 当前环境 node 22 | NON_BLOCKING：CI/验证仍用 node 22 跑通即可，生产按 24；P11 记录 |

### 3.4 未知登记册

**BLOCKING（需人裁决）——2026-10-12 全部已裁决，当前无未决 BLOCKING 项**

| ID | 未知 | 裁决（2026-10-12） | 落点 | 残留 UNKNOWN |
| --- | --- | --- | --- | --- |
| U-B1 | 微信公众号真实凭证（AppID/AppSecret/IP 白名单/服务器 Token） | 不提供 → 原方案 B：完整实现 + mock 适配器契约测试 | P06/P09 | M-9/M-12 的公众号真实联调 = UNKNOWN |
| U-B2 | ADR-012 裁剪的"首页区块配置运行时 + ElementConfig"是否仍算必须对等的 main 功能 | **恢复**（原方案 A，且恢复 main 原表结构：PageTemplate/ContentBlock/TemplateBlock/ElementConfig + Navigation.templateId），ADR-024 取代 ADR-012 | P02（锚点）/P04（迁移+seed）/P06（注册表+API+首页组合）/P07（管理页） | 无 |
| U-B3 | 知识库形态与文件格式 | **Coze 集成**（原方案 B 口径：库↔Coze dataset、文件↔Coze document，本地兜底条目保留）；文件类型仅 Word(.docx/.doc)、Markdown(.md/.markdown)、TXT；**拒绝 PDF 与图片**（ADR-025） | P12（主）/P06/P09/P14 | Coze dataset 真实联调 = UNKNOWN（本仓无凭证）；Coze 单文件上限待核实 |
| U-B4 | SMTP 真实凭证 | 不提供 → 原方案 B：nodemailer jsonTransport/stream 测试 + NotifyRecord 断言 | P06 | 真实发信 = UNKNOWN |

<details><summary>P0 原始条件方案（历史，保留备查）</summary>

| ID | 条件方案 A | 条件方案 B | 共同部分 |
| --- | --- | --- | --- |
| U-B1 | 有凭证：真实草稿+发布+客服消息联调留证 | 无凭证：mock 适配器契约测试 + 沙箱号（若有） | 适配器接口、mock、场景化回复逻辑 |
| U-B2 | 恢复：首页区块可开关/排序（以 Setting 分组 + 区块注册表实现，不复活 4 张表，除非用户要求） | 维持裁剪：parity 标记为"用户确认放弃" | 首页按 main 原样渲染（P02） |
| U-B3 | 本地优先：新增 KnowledgeBase/KnowledgeFile，支持 md/txt/html，Coze 为可选同步 | 外部优先：仅管理 Coze 数据集映射 + 本地兜底条目 | 知识库/条目管理页、场景绑定、检索测试 |
| U-B4 | 有凭证：真实发信留证 | 无凭证：jsonTransport 测试 + NotifyRecord 断言 | 规则/模板/收件人/事件接线 |

</details>

**NON_BLOCKING（带假设推进，任务卡中显式标注）**

| ID | 未知 | 假设（依据） |
| --- | --- | --- |
| A-1 | 视觉对比的参照环境 | 用 main@94dbbbb 自带 `prisma/dev.db`（main 已提交）启动 main，与 upgrade 导入同等数据后截图对比（main 仓可本地 npm ci 运行） |
| A-2 | 截图差异阈值 | `maxDiffPixelRatio 0.01`、动画禁用、字体本地化；依据 M-2 需机器可校验 |
| A-3 | "自动发布"语义 | 见 K5 |
| A-4 | 管理端品牌色 | 沿用 main 品牌红（globals.css `--color-brand-600 oklch(0.505 0.213 27.5)`）作为强调色，中性灰为主（依据：统一风格） |
| A-5 | 新增依赖 | 允许：`@playwright/test`（main 曾用）、`@tiptap/*`（main 曾用，恢复富文本）、`@axe-core/playwright`（a11y 验收）；2026-10-12 补充：docx 解析库 1 个（ADR-025，P12 说明体积与安全影响）；其余新依赖需在任务卡中说明理由 |
| A-6 | node 版本 | 见 K6 |
| A-7 | 低余额阈值缺省 | 沿用 Setting `llmBalanceThreshold`（registry 现值），后台可改 |

### 3.5 隐含要求与前置条件

- 隐含：上线前改默认管理员密码；JWT_SECRET/ENCRYPTION_KEY 生产必须注入；采集需遵守 robots 与限频（collectRateLimitMs 已有）；所有前台改动不得破坏 SEO（sitemap/robots/metadata）。
- 前置：P02 视觉对比需要 main 可运行 + Playwright 浏览器可安装（若沙箱无法下载浏览器 → 任务卡升级条件）。
- 歧义："知识库模型管理"可指"知识库实体管理"或"嵌入模型管理" → 解释为知识库实体（2026-10-12 起 = Coze dataset 映射，ADR-025）；嵌入模型属 ADR-016 二期（COULD）。
- 边界条件：SQLite 并发写（调度 + 请求）、公众号 5s 被动回复限制、SSE 断流、采集站点 JS 渲染（cce.scu.edu.cn）、上传超 20MB；知识库上传 PDF/图片必须被拒、Markdown 以 txt 上传 Coze、Coze 每次 ≤10 文件（ADR-025）。
- 模块依赖：采集→知识库→发布→通知；场景→模型网关→知识库；公众号→场景。

## 4. 契约冻结包（六份；唯一源 = `src/contracts/**` zod）

现状与本轮要求如下。**任何方向修改契约必须在该方向任务卡中显式列出，且同一时间只允许一个方向修改 `src/contracts/**`（本程序串行执行，天然满足）。**

| # | 契约 | 现状（代码） | 本轮缺口 → 负责方向 |
| --- | --- | --- | --- |
| ① API | 信封 `{code,data,message}`（contracts/common.ts + lib/api-response.ts）；分页 `{list,pagination:{page,limit,total,totalPages}}`；资源请求 Schema 在 contracts/resources.ts | 新增 logs/chat-history/media PATCH+batch/article status 契约（P03）；blocks 契约 content-blocks/page-templates/template-blocks/element-configs（P06，ADR-024）；知识库/文件 Coze 契约与文件类型白名单（P12，ADR-025）；管理端列/表单规格从契约派生（P08）；SSE 事件格式入契约（P13） |
| ② Errors | code ∈ {200,400,401,403,404,500}（+502 AI 上游，实测存在）；zod 首条中文 | 冻结错误码枚举含 409（重复）/422?（不新增，统一 400）/429（限频，现返回 400，chat/stream/route.ts:37）/502；前端统一 toast 展示（P13 + P05） |
| ③ Identity | Int 用户 ID；SuperAdmin/Editor/Viewer；JWT claims `{uid,username,roleId,isSuper,permissions[]}`；权限点 `module:action` | 补齐 catalog 缺失的 `*:list`（I4，P03）；review:edit 仅 SuperAdmin 在 content-items 状态迁移中强制（I7，P06）；前台零写权限（仅 apply/chat/user-actions 公开写） |
| ④ Resources | `/uploads/:path*` → `/api/file/:path*`；类型白名单 + 20MB；缩略图 thumb/small/medium | 运行时上传移出 git（P14）；public 静态资源原样恢复（P02）；资源引用完整性检查脚本（P15） |
| ⑤ Events | CronJob 任务名 6 个；NotifyEvent 7 个（notify-gateway.ts:14-21） | 新增事件仅允许：`api_error`（或复用 system_error，P06 决定并写入 contracts）；事件名枚举移入 contracts（P06） |
| ⑥ UX States | 空/加载/错误/无权限/成功五态（master-plan §4⑥） | 管理端五态组件化（EmptyState/Skeleton/ErrorState/Forbidden/Toast，P07），全部页面接入（P05）；前台五态保持 main 现状（不改风格） |

契约自检（§4.4）：前端可凭 contracts 写调用层 ✅（manager-fetch + zod 类型）；后端可凭 contracts 实现 ✅；数据端可凭 contracts 设计表 ⚠️（P12 新实体按 ADR-025 由 P12 先补契约；ADR-024 恢复模型以 main schema 为准）；错误码覆盖已知失败 ⚠️（429 现映射为 400，P13 修正）；越权路径已禁止 ⚠️（I4/I7 待 P03/P06 修复）。**⚠️ 项为已登记缺口，由对应方向在改代码前先补契约。**

## 5. 数据模型基线（含迁移版本号编排）

- 现基线：42 模型，迁移 4 个（见 §1）。无软删除（审计靠 OperationLog）；JSON-in-String；枚举为字符串；高频过滤列有 @@index。
- **迁移串行编排（本程序内仅以下方向可新增迁移，每方向至多 1 个，名称按执行顺序时间戳递增）**：

| 顺序 | 方向 | 迁移名（建议） | 内容（提议，进入方向后按契约最终确定） |
| --- | --- | --- | --- |
| 5 | P04 数据 | `p04_data_integrity` | AIChatHistory `@@index([ipAddress, createdAt])`（限频查询，chat/stream/route.ts:33）；OperationLog `@@index([module, createdAt])`；其他按 P04 查询路径审计结果；**ADR-024 恢复**：`PageTemplate`、`ContentBlock`、`TemplateBlock`、`ElementConfig` 四表（字段按 main schema）+ `Navigation.templateId Int?`（仅加法，不改既有列） |
| 6 | P06 逻辑 | `p06_collect_kb_review` | CollectSource `autoToKb Boolean @default(true)`、`autoApprove Boolean @default(false)`；CollectItem 入库时间戳 |
| 7 | P12 知识库 | `p12_knowledge_base` | ADR-025（Coze 集成）：`KnowledgeBase`（含 `cozeDatasetId`/同步状态）、`KnowledgeFile`（含 `ext`∈docx/doc/md/txt、`cozeDocumentId`/`cozeStatus`/进度/`localParse`）、`Knowledge.baseId/fileId/chunkIndex`；`ChatScene` 绑定 `knowledgeBaseIds`、`providerIds`(优先级 JSON)、`temperature/maxTokens/topP` 覆盖值；`CollectSource.knowledgeBaseId` |
| — | 其余方向 | 禁止新增迁移 | 需改表 → 先提交 ADR，由下一个有迁移权的方向合并 |

- 存量数据迁移：`scripts/migrate-news-to-article.mjs`、`scripts/migrate-setting-keys.mjs` 在 P04 以 main 自带 `prisma/dev.db` 的副本做 dry-run 并留证（不改 main）。
- 数据生命周期：运行时上传/备份/数据库不入 git（P14）。

## 6. 垂直切片清单（含排序与理由）

用户指定按"方向"串行推进。为满足规划总指令"垂直切片"要求，每个方向内部的改动必须以**端到端可演示行为**为单位交付（UI+API+DB 同刀），方向只是评审视角而非技术分层。

| 刀 | 方向 | 可演示行为（结束时比上一刀多出的） | 排序理由 |
| --- | --- | --- | --- |
| P01 | 需求 | 需求基线与对等清单定稿、AGENTS.md 规则就位（文档刀，无代码） | 冻结范围，后续所有验收引用 |
| P02 | 前端 | 访客看到与 main 一致的前台（15 路由截图对比通过）+ 新后台外壳（AppShell/登录/主题） | 风格冻结是最高风险约束，越早锁定越好；后台外壳解锁 P05/P07 |
| P03 | 后端 | 操作日志、对话日志可在后台查看；媒体可改名/批量；文章可一键上下线；权限点可授予 | 补齐 main 缺失 API（M-1） |
| P04 | 数据 | 权限/菜单/seed 一致；限频与日志查询走索引；存量迁移 dry-run 报告；首页区块/模板/交互点 4 表恢复并种入 main 原数据（ADR-024） | 为 P06/P12 迁移铺路 |
| P05 | 交互 | 全后台五态 + toast/确认对话框；报名页 AI 咨询交互与 main 一致；E2E 主路径通过 | 依赖 P02 外壳 |
| P06 | 逻辑 | 审核门强制、采集默认入库、错误邮件、公众号客服按场景回答；区块注册表 + blocks API，首页按区块配置渲染（默认复现 main） | 依赖 P03 契约与 P04 数据 |
| P07 | 组件 | 全部管理页迁移到设计系统组件（DataTable/表单字段/TipTap/通知规则页）；新增首页区块配置/页面模板/交互点配置管理页 | 依赖 P02 令牌、P05 状态规范、P06 blocks API |
| P08 | 复用 | 管理端规格单源派生自契约，删除重复定义 | 依赖 P07 组件稳定 |
| P09 | 拓展 | 渠道/模型/采集解析/通知 适配器注册表（仅对已有 ≥2 实现处） | 依赖 P06/P08 |
| P10 | 性能 | 后台 JS、启动重建、首页缓存等指标较 §11 基线下降 | 规划总指令：有基线才能优化 |
| P11 | 配置 | 生产启动读 env、设置键与重定向对等、Docker 件恢复、根目录 CLAUDE.md | — |
| P12 | 知识库 | Coze 知识库集成（库↔dataset、文件↔document，Word/MD/TXT，拒 PDF/图片）+ 本地兜底 + 场景绑定库/模型/参数，官网与公众号共用 | 依赖 P06 入库逻辑；ADR-025 |
| P13 | 响应 | 全部路由信封/错误码/SSE 事件符合契约（契约测试） | 收口 |
| P14 | 存储 | uploads 移出 git、备份保留策略、孤儿文件清理 | — |
| P15 | 资源 | 资源引用完整性、配额/限频生效、闲置依赖清理 | 收口 |

可并行：本程序**全部串行**（编排要求每方向独立验证后再进入下一方向）。并行判定（§7.1）因此不适用；若将来并行，按 §9 所有权矩阵执行机械判定。

## 7. 原子任务卡全集

15 份方向提示词即本轮的任务卡（每份含规划总指令 §6.2 全部字段：归属/目标/输入/输出/Execution Steps/验收标准/验证命令/证据路径/允许修改/禁止修改/依赖与阻塞/建议档位/升级条件/预估规模，另加"证据（现状缺口）""回滚""前台风格保持"）：

| 卡 | 文件 | 一句话目标 |
| --- | --- | --- |
| P01 | review-prompts/P01-需求.md | 定稿需求基线、对等清单与追溯链，纠正文档口径，落 AGENTS.md |
| P02 | review-prompts/P02-前端.md | 前台按 main 原样恢复（截图对比通过）+ 管理端设计系统令牌与 AppShell |
| P03 | review-prompts/P03-后端.md | 补齐 main 缺失 API（logs/chat-history/media/文章状态）并修复权限目录 |
| P04 | review-prompts/P04-数据.md | 数据一致性：权限/菜单/seed、索引、存量迁移 dry-run、迁移 p04 |
| P05 | review-prompts/P05-交互.md | 全后台五态与反馈组件化接入、报名页 AI 咨询交互对等、E2E 主路径 |
| P06 | review-prompts/P06-逻辑.md | 审核门、采集默认入库、错误提醒、公众号场景化客服、发布状态机测试 |
| P07 | review-prompts/P07-组件.md | 顶级管理端组件库与全部管理页迁移，恢复富文本，补通知规则页与区块/模板/交互点配置页 |
| P08 | review-prompts/P08-复用.md | 管理端规格从 zod 契约单源派生，消除重复 DTO/工具 |
| P09 | review-prompts/P09-拓展.md | 为已有多实现的渠道/模型/解析/通知抽注册表接口 |
| P10 | review-prompts/P10-性能.md | 以 P0 基线为准降低后台包体、启动重建与前台缓存开销 |
| P11 | review-prompts/P11-配置.md | 生产 env 加载、设置键与重定向对等、Docker 与启动脚本修复 |
| P12 | review-prompts/P12-知识库.md | Coze 知识库集成（Word/MD/TXT，拒 PDF/图片）与场景绑定库+模型+提示词+参数，两渠道共用 |
| P13 | review-prompts/P13-响应.md | 响应/错误码/SSE 契约全覆盖契约测试，后台响应式核验 |
| P14 | review-prompts/P14-存储.md | 运行时文件移出 git、备份与孤儿清理、存储路径统一 |
| P15 | review-prompts/P15-资源.md | 资源引用完整性、LLM 配额限频生效、闲置依赖与杂项清理 |

## 8. 依赖 DAG

```
P0 ─> P01 ─> P02 ─> P03 ─> P04 ─> P05 ─> P06 ─> P07 ─> P08 ─> P09 ─> P10 ─> P11 ─> P12 ─> P13 ─> P14 ─> P15 ─> Final(全量 check + push + 打包)
硬依赖（除顺序外的实质依赖）：
  P02(AppShell/令牌) → P05(五态接入)、P07(组件库)
  P03(契约: logs/chat-history/权限目录) → P04(seed/菜单一致)、P06
  P04(迁移 p04) → P06(迁移 p06) → P12(迁移 p12)        ← 迁移串行链
  P02(data-block 锚点) → P04(区块 4 表 + seed) → P06(block-registry + API + 首页组合) → P07(区块/模板/交互点管理页)   ← ADR-024 链
  P06(入库逻辑) → P12(知识库实体)
  P07(组件) → P08(单源派生)
  §11 基线 → P10
关键路径：P01→P02→P05→P06→P07→P08→P12→P13（P02 前台恢复工作量最大；P12 按 ADR-025 Coze 集成）
可并行组：无（编排要求串行 + 每阶段独立验证）
环检测：无环（线性链 + 前向硬依赖）
```

## 9. 所有权矩阵（方向 × 路径；同一时刻仅一个方向持有写权限）

| 路径 | 写入方向 | 说明 |
| --- | --- | --- |
| `docs/design/**` | 全部（仅追加本方向证据/ADR；P01 可改需求文档） | 禁止改他方向证据 |
| `AGENTS.md`（新建） | P01 | — |
| `src/app/(web)/**`、`src/components/web/**`、`public/**` | P02（主）；P05 仅 apply/ChatWidget 交互；P06 仅 `src/app/(web)/page.tsx` 的区块取舍/排序组合层（ADR-024）；P10 仅缓存指令 | 风格冻结：P02 之后改动必须保持截图对比通过 |
| `src/app/globals.css` | P02 | 后续方向禁止改 web 令牌；管理端令牌限 `[data-theme="manager"]` 作用域 |
| `src/app/manager/layout.tsx`、`src/components/manager/shell/**` | P02 | — |
| `src/components/ui/**`、`src/components/manager/**`（除 shell） | P07（主）；P05 状态组件；P08 规格派生 | — |
| `src/app/manager/**`（页面） | P03（新增 logs/chat-history 页）、P05、P07、P12 | 串行无重叠 |
| `src/contracts/**` | P03、P06、P08、P12、P13（各自卡内列明） | 串行 |
| `src/app/api/**`、`src/lib/**`（业务） | P03、P06、P08、P09、P10、P11、P12、P13、P14、P15（各卡"允许修改"精确到文件） | 串行 |
| `prisma/schema.prisma`、`prisma/migrations/**` | 仅 P04、P06、P12 | §5 编排 |
| `prisma/seed.ts` | P04（主，含 ADR-024 默认区块）、P06（NotifyRule/Setting）、P07（菜单）、P12 | — |
| `scripts/**`、`next.config.ts`、`package.json`、`.gitignore`、Docker 件、根目录 `CLAUDE.md` | P11（主）；P02 加 playwright；P07 加 tiptap；P12 加 docx 解析依赖；P14 改 .gitignore；P15 删闲置依赖 | — |
| `tests/e2e/**`、`playwright.config.ts`、`src/**/__tests__/**` | 创建该测试的方向 | — |

重叠检查：同一路径的多个写入方向在时间上严格串行（§8），无同时写入 → 无冲突。

## 10. 档位分配与成本预算表

默认档 = opus（规划总指令 §8.2）。

| 方向 | 任务数 | haiku | sonnect | opus | fable | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | 1 | 1 | 0 | 1 | 0 | 需求定稿属范围裁决（opus），索引维护 haiku |
| P02 | 1 | 0 | 1 | 1 | 0 | 大量移植（sonnect）+ 设计系统决策（opus） |
| P03 | 1 | 0 | 1 | 1 | 0 | 契约/权限审（opus） |
| P04 | 1 | 0 | 1 | 1 | 0 | 迁移审（opus） |
| P05 | 1 | 0 | 1 | 0 | 0 | 交互实现 |
| P06 | 1 | 0 | 1 | 1 | 0 | 审核门/安全（opus） |
| P07 | 1 | 0 | 1 | 1 | 0 | 设计系统仲裁 |
| P08 | 1 | 0 | 1 | 0 | 0 | — |
| P09 | 1 | 0 | 0 | 1 | 0 | 架构接口（opus） |
| P10 | 1 | 0 | 1 | 0 | 0 | — |
| P11 | 1 | 0 | 1 | 0 | 0 | — |
| P12 | 1 | 0 | 1 | 1 | 0 | 新实体+契约+Coze 适配（opus）；ADR-025 与 ADR-020/023 一致，无需 fable |
| P13 | 1 | 0 | 1 | 0 | 0 | — |
| P14 | 1 | 0 | 1 | 0 | 0 | — |
| P15 | 1 | 1 | 1 | 0 | 0 | 清理类 haiku |

券制度：opus 每方向 ≤3 次；fable 每方向 ≤1 次（仅改需求/冻结契约）；超出需人批准。熔断：同一方向连续 2 次独立验证 FAIL → 停止改代码，重写任务书/升级档位/标 blocked 并上报。

## 11. 基线指标（含首次测量值，2026-10-12，本机沙箱生产模式）

| 用户可感操作 | 指标 | 首次测量 | 与可感耗时的关系 |
| --- | --- | --- | --- |
| 访客打开首页 | `/` TTFB（冷/热） | 177ms / 28ms | 首字节直接决定白屏起点 |
| 访客打开首页 | 首页 JS gzip 合计 | 191,180 B | 弱网下载与解析时间 |
| 管理员进入后台 | `/manager` JS gzip 合计 | 393,828 B | 后台首屏可交互时间 |
| 管理员看列表 | `/api/articles?page=1` TTFB（冷/热） | 22ms / 9–13ms | 列表首屏数据 |
| 运维重启服务 | `npm start` 到 Ready | ≈90s+（每次重建，F2） | 发布/故障恢复停机时长 |
| 构建 | `npm run build` | 92s（单次；P0-verify 复跑编译 119s，波动 ≈90~120s） | 仅参考，不作优化目标 |

纪律：P10 只能针对上表有基线的指标立项；P02 恢复 main 前台后须重测首页两项（风格恢复可能改变包体，作为新基线，不视为回退）。

## 12. 风险清单 / 未决问题 / 待裁决清单

**风险**

| ID | 风险 | 触发信号 | 缓解 |
| --- | --- | --- | --- |
| R-P1 | 前台恢复后视觉仍有偏差 | 截图 diff >1% | 直接移植 main 组件与 globals.css，数据适配层隔离；字体/动画在测试中固定 |
| R-P2 | 管理端令牌污染前台 | 前台截图 diff 回升 | 管理端令牌仅在 `[data-theme="manager"]` 作用域；P02 之后每方向都跑前台截图 |
| R-P3 | 沙箱无法安装 Playwright 浏览器 | `npx playwright install` 失败 | 升级条件：改用系统 chromium 路径或在可联网环境执行，验证记 UNKNOWN 不记 PASS |
| R-P4 | 迁移顺序被打乱 | 非 P04/P06/P12 出现迁移 | 守卫：验证命令检查 `git diff --name-only` 中 migrations 路径归属 |
| R-P5 | 无凭证导致公众号/邮件/Coze 知识库仅 mock 验证 | 用户确认不提供（D4）；Coze 本仓无 dataset 凭证 | 契约测试 + 显式 UNKNOWN |
| R-P6 | uploads 移出 git 造成现有图片丢失 | 前台/后台图片 404 | P14 先导出到运行时目录并写迁移说明，再 `git rm --cached` |
| R-P7 | SQLite 写并发（调度+请求） | SQLITE_BUSY | 短事务；P04 审 busy_timeout |
| R-P8 | 恢复的首页区块配置默认值与 main 不一致或被误改（ADR-024） | visual diff 回升 | 默认复现 main + visual 门禁 + 管理页"恢复默认" |
| R-P9 | Coze 限制：md 不被接受（按 txt）、单文件上限未知、PAT 约 30 天有效、需 createDocument 权限（ADR-025） | Coze 非 0 code / document status=9 | 单模块封装 + 权限提示 + 本地兜底 |

**未决问题（NON_BLOCKING）**：A-1~A-7（§3.4）。
**待裁决（BLOCKING）**：无（2026-10-12 用户已裁决 U-B1~U-B4，见 §3.4 与文首"用户裁决"表）。残留 UNKNOWN：微信/SMTP/Coze 真实联调。

## 13. 落盘清单（P0 写入）

| 路径 | 用途 |
| --- | --- |
| `docs/design/04_planning/current-plan.md` | 本文件：16 节当前计划（历史轮次保留于附录 A） |
| `docs/design/04_planning/review-prompts/P01-需求.md` … `P15-资源.md` | 15 份方向评审与可执行提示词（任务卡） |
| `docs/design/06_validation/evidence/P0-baseline.md` | 事实基线命令与输出摘要、基线指标首次测量 |
| `docs/design/02_requirements/parity-matrix.md` | main→upgrade 功能对等矩阵（57 行 + 新增需求 11 项） |
| P01 追加（2026-10-12） | REQ-F-013/014/015、ADR-024（取代 ADR-012）、ADR-025（Coze 知识库 + 文件类型）、根目录 `AGENTS.md`、product-requirements §1/§4/§6.1、backlog 本轮待办、assumptions A-1~A-7、risks R-P1~R-P9、master-plan 取代指引；P02~P15 提示词按裁决更新；证据 `06_validation/evidence/P01-execution.md` |

适配说明：规划总指令 §11 落盘根为 `docs/`，本项目文档根为 `docs/design/`（README §0 既定），故路径整体加 `design/` 前缀；`review-prompts/`、`parity-matrix.md`、`P0-baseline.md` 为编排要求的额外产物。P0 未修改任何业务代码、测试代码或配置。

## 14. 自检结果（对照规划总指令 §12）

| 项 | 结果 | 说明 |
| --- | --- | --- |
| 每条 MUST 可改写为可验证的话 | ✅ | §3.2 表"可验证表述"列 |
| 冲突全部列出，未静默决定 | ✅ | §3.3 K1~K6；K1/K4 进入 BLOCKING |
| BLOCKING 给出条件方案 | ✅ | §3.4 U-B1~U-B4 含 A/B/共同部分/变量 |
| 未伪造需求或方案 | ✅ | 每项附代码或文档证据 |
| 六份契约齐全、机器可校验 | ⚠️ | 唯一源 zod 已存在；§4 列出 5 处缺口由 P03/P06/P08/P12/P13 先补契约后编码 |
| 唯一源、无多源并存 | ⚠️ | crud-specs.tsx 为第二源（已登记，P08 消除） |
| 三方可凭契约开工 | ⚠️ | P12 新实体由 P12 按 ADR-025 先补契约（U-B3 已裁决） |
| 错误码覆盖失败路径 | ⚠️ | 429→400 映射待 P13 |
| 管理端越权路径禁止 | ⚠️ | I4/I7 待 P03/P06 |
| 垂直切片、可独立演示/验收 | ✅ | §6，每刀含可演示行为 |
| 第一刀为步行骨架 | ✅（已存在） | 步行骨架已在 M1 落地（master-plan §16）；本程序 P01 为文档刀、P02 为首个代码刀 |
| 任务卡字段齐全、有验证命令、有允许/禁止路径、可追溯 | ✅ | 15 份提示词统一结构 |
| DAG 无环、关键路径已标 | ✅ | §8 |
| 并行结论有机械依据 | ✅（不适用） | 全串行 |
| 所有权矩阵无重叠 | ✅ | §9 时间串行 |
| 档位与预算 | ✅ | §10 |
| 基线指标有首次测量值 | ✅ | §11 |
| 风险/未决/待裁决分开 | ✅ | §12 |
| 未修改业务代码 | ✅ | P0 仅写 docs/design/** |
| 无绝对结论、无"最佳实践"论证 | ✅ | — |
| 未验证项已标注 | ✅ | §2.2、I7 标"推断" |

⚠️ 项为**已登记、已分派**的契约缺口，不是遗漏；规划总指令要求"契约不完备不得进入下一步"——本程序以"每个方向改代码前先补本方向契约"满足该要求，并在每份提示词的 Execution Steps 第一步写明。

## 15. 本次规划的前提与局限

- 用户指定"按 15 个方向串行"，与规划总指令"按垂直切片、可并行"存在形式差异：本计划把方向作为评审视角、把每方向内的交付约束为垂直行为，并放弃并行（以独立验证换取低冲突）。
- 所有基线指标在沙箱单机测得，只用于同环境前后对比。
- 未运行浏览器、未联调第三方；I7 等由代码阅读推断。
- main 的视觉以 main 代码为准（截图在 P02 首步生成），P0 未产出参照截图。
- `talk.md`、`new-features.md`、`16-新增设计.md` 等历史文档未逐行复核，仅取其与代码冲突处。

## 16. 建议的第一刀与启动顺序

1. ~~用户裁决 U-B2、U-B3，并告知 U-B1/U-B4 凭证计划~~ —— 2026-10-12 已全部裁决（文首"用户裁决"表）。
2. 执行 P01（文档刀）→ 独立验证 PASS。
3. 执行 P02：先跑 main 生成参照截图 → 移植前台 → 截图对比通过 → 再做管理端 AppShell/令牌。这是首个代码刀，也是风险最高的一刀。
4. 之后按 P03…P15 顺序，每方向：执行提示词 → 提交 → 独立验证（只看 diff + 运行结果，输出 PASS/FAIL/UNKNOWN）→ 下一方向。
5. Final：全量 lint/typecheck/test/build + 前台截图对比 + E2E → 推送 upgrade → 打包。

---

## 附录 A：历史轮次记录（2026-10-10 ~ 10-11 原 current-plan 全文保留）


### 本轮（已完成）：文档体系全量补充与优化

| 事项 | 状态 |
| --- | --- |
| 根级 01~16 提取文档增"文档体系关联"桥接 | done |
| REQ-F×11 补用户故事与优先级 | done |
| ADR×8 补备选方案 | done |
| SOL×6 补 API/页面/技术选型/风险与数据模型字段表；architecture 增模块-目录映射 | done |
| 治理登记册（术语/干系人/风险/假设/依赖）字段扩充 | done |
| 产品域增强（画像/旅程/指标测量方案）+ 需求可追溯性矩阵 | done |
| milestones 进入/退出标准；validation 用例记录格式与证据目录规范 | done |
| TN-009~014、LL-007、changelog、README 编号对照、talk.md Q4/A4 | done |

### 上轮（已完成）：文档体系落地（55 件，见 talk.md Q3/A3）

### 下一轮：M1 启动（新仓初始化 + S1 基础基座，ADR-011 口径）

先按 05_execution/task-template.md 建任务卡（Q7 轮定：先建卡再开工，不逐卡确认），随后实施：

1. TASK：新仓初始化（脚手架 / env 规范 / CI，ADR-011）
2. TASK：调度基座（CronJob 表 + 循环 + 锁，instrumentation.ts 启动）
3. TASK：Setting 键体系统一 + 加密 + 存量迁移脚本（ADR-009）
4. TASK：Markdown 管线（contentType + MarkdownRenderer + sanitize 统一，REQ-F-004 / REQ-NF-002）
5. TASK：UserAction 最小埋点接通（表单提交 + 关键页浏览，ASM-008，Q7 轮定）
6. TASK：News→Article 数据迁移（ADR-001，dry-run + 回滚）
7. VAL：M1 验收（validation-plan §M1 + 自动 UI 走查留证，Q7 轮定）

### 待用户输入清单

- 微信凭证（appid/secret/白名单 IP）→ M4 联调前
- SMTP 凭证（host/端口/授权码）→ M3 邮件验收前
- 采集目标源清单（首批院校/部门 URL）→ M3 试运行前
- success-metrics 目标值确认 → M1 验收时（埋点走向已定：UserAction 最小接通，Q7 轮）

---

### 更新（2026-10-10 23:15）：提问轮收敛，决策全落定

14 问全部回答，新增 ADR-009~020（详见 03_solution/decisions/）。关键变化：
1. **重构形态 = 平行新仓重写**（ADR-011）→ **M1 重定义：新仓初始化（脚手架/env 规范/CI）+ S1 基础基座（调度/加密/Markdown 管线/Setting 键迁移脚本）**；新增"部署切换方案"任务归 M4。
2. **知识库转向外部平台**（ADR-020）→ M2 缩减为 KBAdapter + 对接 + 双轨兜底。
3. 其余落定：品牌弘道（010）、闲置资产裁剪（012）、服务号（013）、Modelscope 起步（014）、HTML 采集优先（015）、向量二期（016）、SuperAdmin 独享审核（017）、AI 客服双入口（018）、SQLite 保持（019）。
4. 并发写入源已确认全部关闭（Q13），docs/get 后续单写入方。

**待用户输入清单（更新）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL 清单（M3 试运行）、**外部知识库选型与凭证**（M2 对接前，新增）、success-metrics 指标确认（ASM-008）。

**下一轮**：开工 M1（新仓初始化 + 基础基座）。

### 更新（2026-10-11）：Q7 轮（8 问大白话卡片）收敛

全部按推荐项选定（验收证据方式选加自动 UI 走查）：

1. 推断内容可写入文档，但须标注（推断/依据）——画像、触发信号、证伪影响等按此执行。
2. ASM-008 落定：UserAction 最小接通（表单提交 + 关键页浏览），S1-埋点任务范围明确。
3. success-metrics 目标值 M1 验收时确认（保持 draft 至彼时）。
4. M1 开工方式：先建任务卡（05_execution/tasks/）再实施，不逐卡确认。
5. git 存档：本轮完成后 docs/get 单次提交。
6. 采集源清单：暂无，M3 前提供（维持 DEP-004 登记）。
7. 剩余增补一次干完统一汇报（本轮已按此执行完毕）。
8. M1 起验收加自动 UI 走查留证（validation-plan 通过标准已增补）。

同步收口：risks 增触发信号列、assumptions 增证伪影响列（ASM-002/006/008 更新）、glossary 增平行新仓/KBAdapter/SSE 等术语、stakeholders 增核心诉求列、product-definition 增画像/旅程、product-requirements 增 §6 可追溯性矩阵、TN-009~014、LL-007/008、README §0 编号对照、document-index/project-map 导航一致性、changelog 第七轮、talk.md Q7/A7。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

**下一轮**：开工 M1（先建任务卡，再新仓初始化 + 基础基座）。

### 更新（2026-10-11）：Q9 轮（3 问卡片）收敛

1. REQ-F-004（Markdown 发布）保留：用户贴文清单缺少该条，确认仍算数（M1 照旧）。
2. BG1~BG5 基础目标纳入验收门：validation-plan 通用项新增 G5，每个里程碑验收逐条核验，任一不达标不通过。
3. talk.md 记录规则维持：Q/A 逐字 + 卡片记决策总表（用户三遍强调后确认现状合规）。

同步：README §0 计数修正（55+12 ADR=67）、TN-015（新仓 Next.js 版本 breaking changes，开工前必读 node_modules/next/dist/docs/）、document-index/project-map talk 描述更新至 Q1~Q9、changelog 第八轮、talk.md Q8/A8 与 Q9/A9。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

**下一轮**：开工 M1（先建任务卡，再新仓初始化 + S1 基础基座，ADR-011 口径）。

### 更新（2026-10-11）：Q10 轮（10 项决策）收敛

1. 采集频率：默认每天 1 次、凌晨执行（默认 04:00 避开 03:00 备份错峰，推断参数），管理端可配置可更改。
2. 邮箱模板：可配置（NotifyTemplate 模型 + 邮件模板管理页 + 规则绑定 templateId，未绑定走默认）。
3. 审核流程：单级审核（SuperAdmin 一审终审，ADR-017 补充）。
4. 内容模型：新建 ContentItem 中枢；Article 保留为官网渠道存储。
5. 采集图片：默认转存本地（反转原"默认不转存"口径；失败降级留原链）。
6. 后台 CRUD：统一 CrudPage（维持）；前台数据：Server Component 直查（维持）。
7. SchemaForm 字段：基础 + 高级；错误处理：全局错误边界 + 统一响应包/toast 组合。
8. 部署切换（M4）：灰度发布（ADR-021 新建；validation-plan 增 M4-7 演练验收）。
9. 14 问未答 4 项处置（维持现状，可下轮修订）：解析规则=每源可配 CSS 选择器（SOL-004 现状）；知识库选型=维持 ADR-020 暂不选定（M2 前定）；余额查询=维持 ADR-005 人工填报；公众号→官网同步=维持一稿多发（BD1/REQ-F-001）。

同步：ADR-021 新建；SOL-004/005、REQ-F-001/002/011、milestones、validation-plan（M4-7）、product-requirements、product-definition §5、new-features §15、README/document-index/project-map 导航、changelog 第九轮、talk.md Q10/A10。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

### 更新（2026-10-11）：执行轮 1——M1 落地（步行骨架 + S1 基座）

按既有 Q7 轮流程开工 M1，本轮由自动化执行会话完成（卡在验证后补录，见 talk.md E1/E2）：

1. **新仓初始化**：hdwebsite_1011 独立仓（Next 16.2.1/React 19.2.4/Prisma 7.7+libsql/SQLite/Tailwind v4/zod 4/vitest），Windows 不产 standalone（与 B 仓同口径），start-next.mjs 沿用。
2. **契约冻结落地**：src/contracts（zod 单一源，六份契约见 master-plan §4）；统一响应包 + manager-fetch 解包。
3. **数据模型基线**：42 模型一次成型（含 B 仓补录 Major/EnrollmentOffering，REQ-F-012/ADR-022；裁剪 6 废弃模型），迁移 20261011052216_init。
4. **S1 基座**：auth/RBAC/requireAuth（review:edit 独享）、AES 字段加密、Setting Registry（60 键 16 组，修复 settings 写接口越权缺口）、调度基座（CronJob+锁+backup）、Markdown 管线（双模渲染+入库钩子+净化单点）、SEO 基线、UserAction 最小埋点。
5. **迁移脚本**：News→Article（dry-run 对旧库验证：5 News/25 Article）+ Setting 键迁移（9 键映射）。
6. **验证**：vitest 30/30；npm run check（lint+typecheck+build）全绿；启动冒烟（health/登录/CRUD/401 拦截/埋点/sitemap）通过。
7. **规划包**：master-plan.md（16 节）落盘；M1 任务卡 11 张（done）。

**流程偏差登记**：本轮任务卡为验证后补录（同轮实现），后续切片恢复先卡后码。

**下一轮**：R0 基线重建（前台 13 页 + 后台 25 页 + CrudPage + upload/file + B 域管理页）与 M2（S2 KBAdapter → S3 LLM 网关）按 master-plan §8 并行推进；开工前先建卡。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。
