# C-ops 审计：P10 性能 / P11 配置 / P14 存储 / P15 资源 —— 提示词 vs 当前代码

- 仓库：`/workspace/work/hd/repo`，分支 `upgrade`，HEAD `bb2c0e5`（docs(P06): 独立校验报告）。审计时间 2026-10-13。
- 方式：只读（cat/grep/find/git show/git ls-files/du/wc）。未运行 build/test/start；**当前工作区无 `.next/`**，凡依赖构建产物的结论标"未验证"。
- 提示词写于 2026-10-12（基线提交 5b72fb7）。之后已完成 P01~P06（`git log`），P07/P08/P09/P12/P13 未执行。
- 关键事实：`scripts/start-next.mjs`、`scripts/start-next-utils.mjs`、`src/lib/jobs/backup.ts`、`src/app/api/upload/route.ts`、`src/app/api/file/[...path]/route.ts` 自 5b72fb7 起**零改动**（`git diff 5b72fb7 HEAD --stat` 只列出 .gitignore / next.config.ts / package.json / llm-gateway.ts）。

---

## 0. 背景文档核对

| 文档 | 内容 | 当前状态 |
| --- | --- | --- |
| current-plan §2.3 I9（current-plan.md:78） | standalone 生产启动不加载 .env.local（F1） | **仍成立**：start-next.mjs:43-49、96-104 只透传 `process.env`；仓库无任何 env 文件加载代码（grep `loadEnvConfig\|dotenv` src scripts = 0） |
| current-plan §2.3 I14（current-plan.md:83） | 上传/备份基于 cwd → 写入 `.next/standalone` | **仍成立（代码层）**：upload/route.ts:25、jobs/backup.ts:45 未变；server.js:6 chdir 因无 `.next` **未验证**（Next 16 standalone 标准行为） |
| §11 基线（current-plan.md:317-328） | `/` TTFB 177/28ms；首页 JS 191,180B；`/manager` JS 393,828B；启动≈90s；构建 92s | P02~P06 后**无任何重测记录**（grep `gzip\|TTFB\|393` 于 P02~P06 证据 = 0 命中）→ P10 必须先重测 |
| P0-baseline F1/F2/F3/F6/F7 | 见 P0-baseline.md:54-60 | F1/F2/F6/F7 代码层仍成立；F3（public 缺失）**已解决**（P02 恢复，`git ls-files public \| wc -l` = 150） |
| P06-verify 承接（P06-verify.md:90-91） | P10：system_error 10 分钟去重仅进程内、邮件含堆栈建议脱敏；P11：前台页面与 robots/sitemap 电话/域名兜底改读 BRAND_DEFAULTS/Setting | 均**仍成立**（见 §2、§3 证据） |
| 其他承接（P02-execution.md:87；P04-execution.md:124-125；P05-execution.md:106；P06-execution.md:110,113） | P11：setting-defaults.ts 与 registry 合并为单一来源；`site.copyright`/`social.*` 是否入 Registry；collect.run cron 粒度、publish/wechat 设置 UI；P10：SQLite WAL 评估、notifyEvent 聚合仅进程内、start-next 监视 prisma/ 导致重建 | 均未处理（相关文件未改） |

---

## 1. P10 性能 —— 逐条核验

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `manager/layout.tsx:9 import * as Lucide` | **已解决（P02）** | `grep -rn "import \* as" src` 无 lucide 命中；layout.tsx:9-15 只导入 react/next/store/AppShell/feedback；lucide 改为按名导入，`src/components/manager/shell/MenuIcon.tsx:2-3,45` 显式映射表并注释"禁止通配导入"。**但包体是否下降未测**（无重测数据）；`next/dynamic` 使用数 = 0（`grep -rn "next/dynamic" src \| wc -l`）。TipTap 尚未引入（P07），MediaPicker 未查到动态拆分 |
| 2 | `start-next.mjs:21-25` 监视含 `prisma` | **仍成立** | start-next.mjs:21-30 `watchedBuildEntries = ["src","public","prisma","scripts","package.json","package-lock.json","next.config.ts","tsconfig.json"]`；start-next-utils.mjs:4-24 递归取最大 mtime → `prisma/dev.db`、`prisma/e2e.db` 任一写入即触发 :41-49 `next build`。另：`scripts` 整目录、`public` 也被监视。**提示词要求的"排除 backups/、uploads/"无意义**——这两者本就不在监视列表 |
| 3 | `(web)/page.tsx:7 force-dynamic`；首页 9 并行查询 `:10-21` | **仍成立（行号漂移）** | 现为 `(web)/page.tsx:19`；且 `(web)/layout.tsx:13` 也是 force-dynamic（整组强制动态）。force-dynamic 页：about/apply/campus/contact/learning/page/partners/party/services/[slug] + layout + `src/app/sitemap.ts`（共 11 处）；`revalidate`/`revalidateTag`/`unstable_cache`/`"use cache"` 全仓 0 处。数据获取已移到 `src/components/web/data/home.ts:95-123`：**3 批串行、每批 3 个**（hotMajor/article/banner → partner/campus/gallery → serviceGuide/getWebSettings/homeCard），外加 `page.tsx:121 resolveHomeBlocks()`（block-registry.ts:148，pageTemplate+include）、layout.tsx:16/34 `getSettings()`+`getNavItems()`、home.ts:135-142 每个 gallery 项一次 `fs.stat`（public 存在性检查） |
| 4 | `chat/stream/route.ts:33-35` 限频 count（P04 已加索引）未单测 | **仍成立** | route.ts:17 `RATE_LIMIT_PER_MINUTE = 10`、:34 `prisma.aIChatHistory.count`；schema.prisma:560 `@@index([ipAddress, createdAt])` 已在；`src/**/__tests__`、`tests/e2e` 中 grep `chat/stream\|429\|RATE_LIMIT` = 0 |
| 5 | 前台 `<img loading="lazy">` 不在本方向改 | 提示词自述不改，无需核验 | — |

目标/验收核验：
- `scripts/measure-baseline.mjs`：不存在（`ls scripts` 共 6 个：import-main-content / migrate-news-to-article / migrate-setting-keys / start-next-utils / start-next / verify-seed-consistency）。
- `src/lib/__tests__/start-next-utils.test.ts`：不存在。
- **提示词路径冲突（提示词有误）**：
  - 首页数据函数 `getHomeData` 位于 `src/components/web/data/home.ts`，而 P10「禁止修改」含 `src/components/web/**` → 按现提示词无法给首页数据加缓存。
  - 首页区块配置读取在 `src/lib/block-registry.ts`（ADR-024 要求"随首页数据一并缓存"），但该文件不在 P10「允许修改」。
  - `(web)/layout.tsx:13` 的 force-dynamic 必须一并处理，否则子页 revalidate 无效（提示词只提 page）。
  - 写后失效点不止 crud.ts（:106/:148/:186）、publish-executor.ts、settings PUT（settings/route.ts:42）：还有手写路由 `api/media/batch`、`api/llm/providers/*`、P06 新增的 block 资源（crud-resources.ts 的 page-templates 等走 crud 工厂，可覆盖）、`api/collect-items/[id]/review` 等。
- 承接项未纳入 P10 提示词：SQLite WAL 评估（P04-execution.md:124）、notifyEvent/system_error 去重仅进程内（P06-execution.md:113、P06-verify.md:90）。

---

## 2. P11 配置 —— 逐条核验

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `start-next.mjs:45-48、:98` 仅透传 process.env → 登录 500 | **仍成立（行号准确）** | :45-48 build 子进程 env、:98-103 运行子进程 env，均 `...process.env`；无 env 文件加载。`node_modules/@next/env/dist/index.js` 存在（next 16.2.1），可用 `loadEnvConfig` |
| 2 | 无集中 env 校验；JWT_SECRET 首用时 FATAL；ENCRYPTION_KEY/APP_ORIGIN/CRON_SECRET 无校验 | **仍成立（细节修正）** | `src/lib/env.ts` 不存在；JWT 校验在 `src/lib/jwt.ts:9-14`（非"auth 路由内"）；`src/lib/crypto.ts:10-15` 惰性校验 ENCRYPTION_KEY??JWT_SECRET≥32；`src/instrumentation.ts:5-10` 只启调度器无校验。**`CRON_SECRET` 在 src/scripts 中 0 引用**（仅 .env.example:20）→ 是死键或功能缺失，需 P11 裁定。process.env 实际使用键：APP_DOMAIN(4)、APP_ORIGIN(3)、DATABASE_URL(13)、ENCRYPTION_KEY(1)、JWT_SECRET(2)、WECHAT_MP_VERIFY_TOKEN(2)、NODE_ENV、NEXT_RUNTIME、TMPDIR/TEMP（测试） |
| 3 | upgrade `next.config.ts:36-42` 仅 2 条 redirects | **已解决（P03）** | next.config.ts:35-76 现 **29 条 redirects**（`grep -c "source:"` = 31，含 1 rewrite + 1 header）；与 `origin/main:next.config.ts` 的 source/destination 对逐行 diff = **完全一致** |
| 4 | registry 60 键 vs main 68 键，缺 16 键 | **仍成立（计数有偏差）** | 解析 `def("key"...)`：upgrade 65 键；main（`key:` 字段，去掉 10 个分组名）58 键。缺失 16 键与提示词清单一致：advantage1~4、bannerOverlayColor、bannerShowBtn/Subtitle/Title、bannerTextAlign/VerticalAlign、cardChengkao/Kaifang/ZikaoSubtitle、homeCards、siteLogoIcon、statsLabel。upgrade 独有 23 键（email*/collect*/publish*/wechat*/llm*/notify*/siteUrl/statsText）。其中 15 键的 main 默认已冻结在 `src/components/web/data/setting-defaults.ts`（P02），`homeCards` 不在。**双源问题**：settings-registry.ts vs setting-defaults.ts（P02-execution.md:87 承接） |
| 5 | main 有 Dockerfile/Dockerfile.dev/docker-compose.yml/.dockerignore，upgrade 无 | **仍成立** | `ls Dockerfile* docker-compose* .dockerignore CLAUDE.md` 均不存在；`git ls-tree origin/main` 有这 4 件 + CLAUDE.md。main compose 只挂 `./prisma`、健康检查打 `/`；upgrade 已有 `src/app/api/health/route.ts` |
| 6 | `next.config.ts:9-12 experimental.cssChunking` | **仍成立** | next.config.ts:9-12（`optimizeCss:false, cssChunking:false`）；main 同样有（origin/main next.config.ts:8）。构建警告本次未复跑 → **未验证** |
| 7 | engines `node >=24`；Windows 不产 standalone | **仍成立** | package.json:5-7；next.config.ts:3,7 |

附加：
- `.env.example`（23 行）现有键：JWT_SECRET、ENCRYPTION_KEY、DATABASE_URL、PORT、APP_DOMAIN、APP_ORIGIN、CRON_SECRET、WECHAT_MP_VERIFY_TOKEN。缺 `HOSTNAME`（start-next.mjs:18 使用）、未来 `DATA_DIR`（P14）。`.env.example:1` 仍写"复制为 .env.local"，与 F1 矛盾。
- `scripts/migrate-setting-keys.mjs:13-31` KEY_MAP 现 **17 条**（提示词写 9 键，已被 P04 扩充，提示词数字过期）。
- `.gitignore:28` 已为 `/logs/`（P04 df7dd9a 修复，P03 承接项已解决）。
- 硬编码电话/域名兜底（`grep -rn "400-001-5729\|hd1994" src`，按文件计数，共 13 处/11 文件）：

| 文件:行 | 次数 | 归属 |
| --- | --- | --- |
| `src/app/(web)/about/page.tsx:19` | 1 | 前台页（P11 禁改） |
| `src/app/(web)/campus/page.tsx:29` | 1 | 同上 |
| `src/app/(web)/contact/page.tsx:26` | 1 | 同上 |
| `src/app/(web)/courses/[id]/page.tsx:54` | 1 | 同上 |
| `src/app/robots.ts:3` | 1 | 不在 P11 允许清单 |
| `src/app/sitemap.ts:6` | 1 | 同上 |
| `src/components/web/Footer.tsx:57` | 1 | 前台组件（禁改） |
| `src/components/web/data/home.ts:228` | 1 | 前台数据层（禁改） |
| `src/components/web/data/setting-defaults.ts:54` | 1 | 前台冻结默认值 |
| `src/config/brand.ts:6-8` | 3 | 唯一合法常量出处（P06） |
| `src/lib/__tests__/wechat-chat.test.ts:78` | 1 | 测试守卫（拆开写，非硬编码） |

  另 `next.config.ts:17` remotePatterns 含 `www.hd1994.com`、`.env.example:16-17` 注释示例（可接受）。**结论：P06 承接要求的前台兜底统一，与 P11 提示词「禁止修改：前台组件与页面」直接冲突**，需改提示词放行"仅替换兜底字面量为 BRAND_DEFAULTS 引用、不改 JSX/className"。
- P11 提示词未覆盖的承接：`site.copyright`/`social.*` 入 Registry 与否（P04-execution.md:125）；collect.run cron 粒度与 publishAuto*/wechatFallbackReply/siteUrl 的设置 UI 分组（P06-execution.md:110）。

---

## 3. P14 存储 —— 逐条核验

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | `git ls-files uploads \| wc -l` = 413（≈32MB） | **仍成立** | 413；`du -sh uploads` = 32M；分布 `uploads/collect/202610/*` 409、`uploads/202610/11/*` 4；磁盘 `find uploads -type f` = 413（无未跟踪新增） |
| 2 | server.js:6 chdir；upload/route.ts:25 UPLOAD_ROOT；backup.ts:45 | **仍成立（代码层）**；chdir 与"32MB 复制进 standalone"**未验证**（无 .next） | upload/route.ts:25 `export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads")`；backup.ts:45 `path.resolve(process.cwd(), "backups")`；backup.ts:16 相对 DATABASE_URL 也基于 cwd（start-next 传绝对路径时无碍） |
| 3 | backup.ts:2-4 只备份 dev.db | **仍成立** | backup.ts:4 注释"uploads 随实现补充"；:33-62 只 VACUUM INTO 库文件；KEEP_COUNT=14（:11） |
| 4 | `media/[id]/route.ts:8 crudDelete` 只删行；src/lib 无 unlink | **仍成立，且范围扩大** | 现为 `media/[id]/route.ts:13`；P03 新增 `api/media/batch/route.ts:31-32` `deleteMany` 同样不删文件；全仓 `unlink` 0 处；`src/lib/crud.ts` 只有 `beforeCreate/beforeUpdate` 钩子（:41,:43），**无 afterDelete 钩子** → 需改 crud.ts（不在 P14 允许清单） |
| 5 | collect-engine.ts:107 采集图片无 Media 记录 | **提示词有误** | collect-engine.ts:124-129 `prisma.media.create({... category: "collect" ...})`，git blame 显示 8af8bfb（2026-10-11）就已存在，基线 5b72fb7 中也在（:118）。真实缺口：`.catch(() => undefined)` 吞错可能出现"有文件无 Media"；且路径写入 UPLOAD_ROOT（:115-122）仍基于 cwd |
| 6 | start-next.mjs:16,19 DB 基于项目根，与上传/备份不一致 | **仍成立（措辞修正）** | start-next.mjs:16 `path.resolve(process.cwd(),"prisma","dev.db")`——是**启动者 cwd**（npm start 时即项目根），:19 转绝对 file URL 传给子进程；上传/备份用的是子进程 chdir 后的 cwd |

路径来源汇总（问题 1）：
- `src/app/api/upload/route.ts:25` 定义 `UPLOAD_ROOT`（cwd/uploads）并被导出。
- `src/app/api/file/[...path]/route.ts:7` 从 upload 路由导入 `UPLOAD_ROOT`；:22-26 穿越防护（拒 `..`、`\`、点开头、`startsWith(UPLOAD_ROOT+sep)`）。
- `src/lib/collect-engine.ts:19` 同样从 `@/app/api/upload/route` 导入 `UPLOAD_ROOT`（lib 反向依赖 app 路由文件），:113-122 写 `collect/yyyymm/`。
- `src/lib/jobs/backup.ts:45` backups = cwd/backups；脚本侧 `scripts/import-main-content.mjs:284`、`scripts/migrate-news-to-article.mjs:102` 也写 cwd/backups。
- 前台 `localImageExists`：`src/components/web/data/home.ts:16`、`src/app/(web)/gallery/page.tsx:24` 基于 `process.cwd()/public`（standalone 下依赖 start-next 把 public 复制进 standalone，start-next.mjs:80-87 每次启动 rm+cp 4.1M public）。
- **新发现**：`public/uploads/202604/**` 已跟踪 20 个文件（5 原图+15 缩略图，22K）。`/uploads/:path*` rewrite（next.config.ts:29-33，默认 afterFiles）意味着同一 URL 前缀有两个来源：public/uploads 优先、再落到 `/api/file`——**未运行验证**。P14 的迁移脚本/孤儿扫描必须覆盖这一来源，P15 check-assets 同样。
- `git ls-files uploads | wc -l` = 413；`du -sh uploads public` = 32M / 4.1M；`.gitignore`（42 行）覆盖 `.env*`、`prisma/dev.db*`、`prisma/e2e.db*`、`backups/`、`/logs/`、`tmp/`、`.next/`，**未覆盖 `uploads/`、`data/`**。
- `.tmp-pa.html` 未被忽略，已跟踪。
- 提示词中「`scripts/start-next.mjs`：不再同步 uploads 到 standalone」**有误**：start-next.mjs 只同步 `.next/static` 与 `public`（:85-86），从未同步 uploads；P0 观察到的 standalone/uploads 32M 来自 Next 文件追踪（`path.resolve(process.cwd(),"uploads")` 触发），应以 `outputFileTracingExcludes` 解决（需构建验证，**未验证**）。
- 知识库文件目录（目标 5，ADR-025）：P12 未执行，`kbFilesDir` 无调用方，可延后。

---

## 4. P15 资源 —— 逐条核验

| # | 提示词证据 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | settings-registry.ts:35,39,41 默认资源；无引用校验 | **仍成立且更严重** | 现行号 :36 `/images/logo.png`（存在）、:40 `/images/placeholder.svg`（**缺失**）、:41 `/favicon.ico`（**缺失**）、:49 `/images/banner-bg.jpg`（**缺失**）；三者在 origin/main 中也不存在。`src/lib/settings.ts:17,34` 用 `getDefaultValues()` 合并到 `getSettings()`，前台多走 setting-defaults.ts（:12 用 logo_card.png、:14/17 为空），故视觉未破，但 check-assets 首跑预计报 3 项（**推断，未运行**）。修复点是 registry 默认值（P11 所有）而非 public（P15 禁改） |
| 2 | dailyQuota/rateLimit 仅保存，网关不拦截 | **仍成立** | schema.prisma:507-508；contracts/resources.ts:342-343；`api/llm/providers/route.ts:66-67`、`[id]/route.ts:62-63` 仅写入；`src/lib/llm-gateway.ts` 中 grep dailyQuota/rateLimit = 0。网关现有：`recordUsage` :54-63（LLMUsage 按 date+providerId 计 calls/tokens/failures）、熔断 `failureCount` :70-77 + :148-152（当日失败≥3 跳过）。注意 :55/:71 日期用 `toISOString()`（UTC，北京时间 08:00 换日），配额"跨日重置"须定口径。全部失败时 gatewayChat 返回 ok:false（:169），SSE 路由映射为 **502**（chat/stream/route.ts:58），提示词目标 503 需与 P13 契约一致。`src/lib/llm/` 目录不存在（P09 未执行） |
| 3 | `.tmp-pa.html` 根目录 | **仍成立** | 已跟踪，16,239B，`git log -1` = 8ea4155；内容为 Next 渲染 HTML |
| 4 | 依赖：@radix-ui/*（P07 移除）、@types/nodemailer 在 dependencies、ts-node | **部分成立** | @types/nodemailer 仍在 dependencies（package.json:35）；@radix-ui/react-dialog 仍被 6 文件使用（含 `components/manager/*`、`shell/AppShell.tsx:11`、`CommandPalette.tsx:9`）、@radix-ui/react-label 1 文件（ui/label.tsx:4）——P07 未执行，**现不可删**；ts-node **已在 devDependencies**（package.json:71）且被 package.json scripts/prisma.config.ts:8 使用 → 此项提示词已无问题 |
| 5 | public 含 images/seed/** 与重复 logo | **仍成立（仅登记）** | `git ls-files public` = 150（images 120、uploads 20、favicon 系 7、site.webmanifest、seo/.gitkeep、videos/.gitkeep）；`public/images/seed` 33 文件（banner/campus/gallery/major/partner）；logo.png/logo_card.png/logo_xgnedu.png/logo-icon-only.png 均在 |
| 6 | 采集图片无大小/格式上限 | **提示词有误（部分）** | collect-engine.ts:107 仅接受 `image/*`、:109 `>10MB` 拒绝、:110-112 jpeg/png/webp/gif 白名单——基线 5b72fb7 已有（:102）。真实缺口：上限 10MB 与上传 20MB（upload/route.ts:24）、提示词目标 5MB 三者不一致；先 `arrayBuffer()` 全量读入再判大小（:108-109，可被超大响应占内存）；白名单常量两处重复（upload/route.ts:16-23 含 mp4/pdf，collect :110） |

依赖逐个核验（问题 4）：对 dependencies 每个包 grep `from '<pkg>'|require|import()|@import` 于 src，及 scripts/prisma/tests/配置文件：

| 包 | src 引用文件数 | 其他位置 | 结论 |
| --- | --- | --- | --- |
| `@types/nodemailer` | 0 | 0 | 类型包，应移 devDependencies |
| `prisma` | 0 | 6（prisma.config.ts、scripts 等） | CLI；生产需 `migrate deploy`，可留 dependencies（判断项） |
| `react-dom` | 0 | 0 | Next 的 peer 依赖，必须保留 |
| `react-hook-form`、`@hookform/resolvers` | 1（仅 `src/components/web/ApplyForm.tsx:4-5`） | 0 | **ApplyForm 无任何导入方**（`grep -rl ApplyForm src tests` 仅自身；main 中同样是死组件）→ 实际零活引用；但 ApplyForm 在前台禁改区，删包需同时删死组件 → 需提示词放行 |
| `@radix-ui/react-dialog` | 6 | — | 在用 |
| `@radix-ui/react-label` | 1（ui/label.tsx） | — | 在用（ui/label 被 2 文件导入） |
| 其余（@base-ui/react 6、@libsql/client 3、@prisma/* 、bcryptjs、cheerio 2、cva 3、clsx、cron-parser、fast-xml-parser、jsonwebtoken、lucide-react 62、next、nodemailer 2、react、react-markdown/remark-gfm/rehype-highlight（MarkdownRenderer，被 2 前台页使用）、rss-parser 2、sharp 2、tailwind-merge、tw-animate-css（globals.css:2）、zod 15、zustand） | ≥1 | — | 在用 |

附：`src/components/ui/` 中 dialog/scroll-area/select/switch/table 被导入次数为 0/0/0/0/0（table.tsx 仅被 checkbox 关联 grep 命中自身），属死组件，归 P07。

根目录已跟踪文件（问题 4，`git ls-files | grep -v /`，14 个）：`.env.example`、`.gitattributes`、`.gitignore`、`.tmp-pa.html`、`AGENTS.md`、`eslint.config.mjs`、`next.config.ts`、`package-lock.json`、`package.json`、`playwright.config.ts`、`postcss.config.mjs`、`prisma.config.ts`、`tsconfig.json`、`vitest.config.ts`。杂项仅 `.tmp-pa.html`；另注意根 `playwright.config.ts`（视觉）与 `tests/e2e/playwright.config.ts`（E2E）两份配置并存（有意设计，check-root 白名单需收录）。顶层目录：docs 185（含中文名 87）、prisma 10、public 150、scripts 6、src 308、tests 56、uploads 413；总跟踪 1142。

---

## 5. 四方向写入路径集合与重叠

| 路径 | P10 | P11 | P14 | P15 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `scripts/start-next.mjs` | ✔ 监视列表 | ✔ env 加载 | ✔（提示词：uploads 同步，实际无此代码，可删除该项） | | **三方重叠** |
| `scripts/start-next-utils.mjs` | ✔ | （允许 start-next*） | | | |
| `scripts/measure-baseline.mjs`（新） | ✔ | | | | |
| `next.config.ts` | | ✔ cssChunking | ✔ outputFileTracingExcludes | | **重叠** |
| `src/lib/env.ts`（新） | | ✔ 创建 | ✔ 加 DATA_DIR | | **重叠**（P14 依赖 P11） |
| `src/instrumentation.ts` | | ✔ | | | |
| `.env.example` | | ✔ | ✔ | | **重叠** |
| `.gitignore` | | | ✔ | | P11 若加 Docker 不需改 |
| `package.json`/`package-lock.json` | | ✔ engines/脚本 | | ✔ 依赖+check 脚本 | **重叠** |
| `src/lib/settings-registry.ts` | | ✔ 补键 | | （P15 需修 3 个缺失资源默认值，不在其允许清单） | 潜在重叠 |
| `scripts/migrate-setting-keys.mjs` | | ✔ | | | |
| `Dockerfile`/`docker-compose.yml`/`.dockerignore`/`CLAUDE.md` | | ✔ | （compose 卷依赖 DATA_DIR） | （check-root 白名单） | 设计耦合 |
| `src/lib/collect-engine.ts` | | | ✔ storage 调用 | ✔ 图片规则 | **重叠** |
| `src/lib/storage.ts`（新） | | | ✔ 创建 | ✔ 白名单常量 | **重叠** |
| `src/lib/llm-gateway.ts`、`src/lib/llm/**` | | | | ✔ | P09 可能先重构 |
| `src/lib/jobs/backup.ts` | | | ✔ | | |
| `src/app/api/upload/**`、`src/app/api/file/**` | | | ✔ | | |
| `src/lib/crud-resources.ts` | | | ✔ media 钩子 | | |
| `src/lib/crud.ts` | ✔ 写后失效 | | （需 afterDelete 钩子，**未列入允许**） | | **隐性重叠** |
| `src/app/api/media/[id]`、`media/batch` | | | （需改，**未列入允许**） | | |
| `src/lib/publish-executor.ts`、`src/app/api/settings/route.ts` | ✔ | | | | |
| `src/app/(web)/**`（仅 dynamic/revalidate） | ✔ | | | | 含 layout.tsx:13 |
| `src/components/web/data/home.ts`、`src/lib/block-registry.ts` | （需改，**被禁止/未列入**） | （电话兜底，被禁止） | | | 提示词需放行 |
| `src/app/robots.ts`、`sitemap.ts` | sitemap force-dynamic | 域名兜底（未列入） | | | |
| `scripts/migrate-uploads-to-data-dir.mjs`、`scan-orphan-uploads.mjs`（新） | | | ✔ | | |
| `scripts/check-assets.mjs`、`check-root.mjs`（新） | | | | ✔ | |
| `uploads/**`（git rm --cached） | | | ✔ | | |
| `.tmp-pa.html`（删除） | | | | ✔ | |
| `src/lib/__tests__/*` 新测试 | start-next-utils | env/settings-parity/redirects | storage/backup | llm-limits | 不同文件，无冲突 |

结论：按 current-plan §8 串行（P10→P11；P13→P14→P15）可避免同时写；但上表"未列入允许/被禁止"的 6 处会让执行者越界或无法达成验收，需在提示词修正（见 §6 前置任务 T0）。

---

## 6. 建议的最小原子任务拆分（每任务 ≤2 天、可独立验收）

> 验收命令中凡需 build/start 的，由执行轮在主线程跑；本审计未执行。

| ID | 任务 | 允许修改 | 验收命令 |
| --- | --- | --- | --- |
| T0 | 修正四份提示词（行号漂移、已解决项、错误项、放行范围：home.ts/block-registry.ts 仅缓存包装；前台兜底仅改为 BRAND_DEFAULTS 引用；crud.ts afterDelete 钩子；media/batch；robots/sitemap；P11 补 CRON_SECRET 裁定） | `docs/design/04_planning/review-prompts/P1{0,1,4,5}-*.md` | `grep -n "import \* as Lucide\|仅 2 条\|无 Media 记录" docs/design/04_planning/review-prompts/P1*.md` 无命中 |
| T1（P10a） | `scripts/measure-baseline.mjs` + 重测 before.json | `scripts/measure-baseline.mjs`、`docs/design/06_validation/evidence/P10/` | `node scripts/measure-baseline.mjs --out .../P10/before.json && node -e 'const b=require("./docs/design/06_validation/evidence/P10/before.json");process.exit(["managerJsGzip","startToReadyMs","homeTtfbColdMs"].every(k=>k in b)?0:1)'` |
| T2（P10b） | 启动不重建：监视 `prisma/schema.prisma`+`prisma/migrations`，不监视 dev.db/e2e.db/scripts 中运行时产物；单测 | `scripts/start-next.mjs`、`scripts/start-next-utils.mjs`、`src/lib/__tests__/start-next-utils.test.ts` | `npm test -- src/lib/__tests__/start-next-utils.test.ts`；`touch prisma/dev.db && node scripts/start-next.mjs` 日志无 `Running next build`，Ready ≤10s |
| T3（P10c） | 前台缓存：`(web)/layout.tsx` 与各页 force-dynamic → revalidate/标签缓存；getHomeData+resolveHomeBlocks 包 `unstable_cache`；crud 工厂/publish-executor/settings PUT/block 资源写后 `revalidateTag`；E2E"5 秒可见" | `src/app/(web)/**`（仅导出）、`src/components/web/data/home.ts`（仅缓存包装，需 T0 放行）、`src/lib/block-registry.ts`、`src/lib/crud.ts`、`src/lib/publish-executor.ts`、`src/app/api/settings/route.ts`、`tests/e2e/**` | `grep -rn force-dynamic "src/app/(web)"` 仅剩列明理由的页；`npm run test:e2e && npm run test:visual` |
| T4（P10d） | 后台包体：定位 /manager 大 chunk，动态导入（若 T1 显示已 ≤0.6×则只出证据关闭） | `src/app/manager/**`、`src/components/manager/**`（仅 import 方式） | `node scripts/measure-baseline.mjs --out .../P10/after.json` 后对比脚本 exit 0 |
| T5（P11a） | `src/lib/env.ts` zod 校验 + instrumentation 启动校验 + start-next 用 `@next/env loadEnvConfig` + `.env.example` 对齐 | `src/lib/env.ts`、`src/instrumentation.ts`、`scripts/start-next.mjs`、`.env.example`、`src/lib/__tests__/env.test.ts` | `npm test -- src/lib/__tests__/env.test.ts`；仅 `.env.local` 时 `curl -X POST /api/auth/login` = 200；`env -u JWT_SECRET` 且无 env 文件时进程非 0 并打印键名 |
| T6（P11b） | 设置键对等 16 键 + 默认值单一来源（registry ← setting-defaults 合并）+ 3 个缺失资源默认值改为存在文件 + KEY_MAP 补；settings-parity fixture | `src/lib/settings-registry.ts`、`src/components/web/data/setting-defaults.ts`（需放行）、`scripts/migrate-setting-keys.mjs`、`src/lib/__tests__/settings-parity.test.ts` | `npm test -- src/lib/__tests__/settings-parity.test.ts`；`npm run test:visual` |
| T7（P11c） | 前台电话/域名兜底统一读 BRAND_DEFAULTS（仅替换字面量） | `src/app/(web)/{about,campus,contact,courses/[id]}/page.tsx`、`src/components/web/Footer.tsx`、`src/components/web/data/home.ts`、`src/app/robots.ts`、`src/app/sitemap.ts`（均需放行） | `grep -rn "400-001-5729\|hd1994" src --exclude-dir=__tests__ \| grep -v "src/config/brand.ts\|setting-defaults.ts"` = 0；`npm run test:visual` |
| T8（P11d） | redirects 回归测试（已对等，只补测试）+ 移除 cssChunking | `next.config.ts`、`src/lib/__tests__/redirects.test.ts` | `npm test -- src/lib/__tests__/redirects.test.ts`；`npm run build 2>&1 \| grep -c cssChunking` = 0 |
| T9（P11e） | Docker 件 + CLAUDE.md（compose 卷：DATA_DIR 或 uploads/backups/prisma-db；健康检查 /api/health） | `Dockerfile`、`docker-compose.yml`、`.dockerignore`、`CLAUDE.md` | `command -v docker && docker build -t hdwebsite:p11 . \|\| echo UNKNOWN`；`test -f CLAUDE.md` |
| T10（P14a） | `src/lib/storage.ts`（DATA_DIR，与 cwd 无关，穿越防护）+ upload/file/collect-engine/backup 改用；env.ts 加 DATA_DIR | `src/lib/storage.ts`、`src/lib/env.ts`、`.env.example`、`src/app/api/upload/**`、`src/app/api/file/**`、`src/lib/collect-engine.ts`（仅路径）、`src/lib/jobs/backup.ts`（仅路径）、`src/lib/__tests__/storage.test.ts` | `npm test -- src/lib/__tests__/storage.test.ts`（含 chdir 用例）；`grep -rn 'process.cwd(), "uploads"\|process.cwd(), "backups"' src` = 0 |
| T11（P14b） | 备份含 uploads（tar.gz 或目录副本）+ 保留 14 份测试 | `src/lib/jobs/backup.ts`、`src/lib/__tests__/backup.test.ts` | `npm test -- src/lib/__tests__/backup.test.ts` |
| T12（P14c） | 数据迁出 git：迁移脚本（含 `./uploads` 与 `.next/standalone/uploads`，并登记 public/uploads 20 文件的处置）→ `.gitignore` 加 `uploads/`、`data/` → `git rm -r --cached uploads` → tracing 排除 | `scripts/migrate-uploads-to-data-dir.mjs`、`.gitignore`、`next.config.ts`（仅 outputFileTracingExcludes）、`uploads/**`（仅 --cached） | `node scripts/migrate-uploads-to-data-dir.mjs` 报告 413；`test "$(git ls-files uploads \| wc -l)" -eq 0`；`npm run build && test ! -d .next/standalone/uploads` |
| T13（P14d） | 删除媒体清理文件（单删+批删，含 3 个缩略图变体）+ 孤儿扫描脚本 | `src/lib/crud.ts`（加 afterDelete 钩子，需放行）、`src/lib/crud-resources.ts`（media 钩子）、`src/app/api/media/batch/route.ts`（需放行）、`src/lib/storage.ts`、`scripts/scan-orphan-uploads.mjs`、测试 | `npm test -- src/lib/__tests__/storage.test.ts`；`node scripts/scan-orphan-uploads.mjs; echo $?` = 0 |
| T14（P15a） | LLM 配额/限频：`src/lib/llm/limits.ts`（当日 LLMUsage.calls ≥ dailyQuota 跳过；进程内每分钟滑窗 rateLimit；日界定口径写明）+ 全部超限 503（与 P13 契约对齐） | `src/lib/llm/limits.ts`、`src/lib/llm-gateway.ts`、`src/app/api/chat/stream/route.ts`（仅状态码映射，需放行）、`src/lib/__tests__/llm-limits.test.ts` | `npm test -- src/lib/__tests__/llm-limits.test.ts`；`grep -n "dailyQuota\|rateLimit" src/lib/llm-gateway.ts src/lib/llm/limits.ts` ≥2 |
| T15（P15b） | 采集图片规则：流式读取并在超限时中止、上限与上传对齐、白名单常量单一来源（storage.ts） | `src/lib/collect-engine.ts`（仅图片规则）、`src/lib/storage.ts`（仅常量）、`src/app/api/upload/route.ts`（改引用常量，需放行）、测试 | `grep -c "image/jpeg" src/lib/collect-engine.ts src/app/api/upload/route.ts` 均 0（只在 storage.ts） |
| T16（P15c） | `check-assets.mjs`（源码+Setting 默认+DB 内容，含 public/uploads 来源）+ `check-root.mjs` + 删 `.tmp-pa.html` + `npm run check` 接入 | `scripts/check-assets.mjs`、`scripts/check-root.mjs`、`.tmp-pa.html`、`package.json`（scripts） | `node scripts/check-assets.mjs && node scripts/check-root.mjs && test ! -e .tmp-pa.html` |
| T17（P15d） | 依赖归类：`@types/nodemailer` → devDependencies；react-hook-form/@hookform/resolvers 随死组件 ApplyForm 一并移除（需放行前台删除）；@radix-ui 待 P07 后再评估 | `package.json`、`package-lock.json`、`src/components/web/ApplyForm.tsx`（删除，需放行） | `node -e 'const p=require("./package.json");process.exit(p.dependencies["@types/nodemailer"]?1:0)'`；`npm run typecheck && npm run build` |
| T18（P15e） | parity-matrix 收口统计 + 资源清单文档 | `docs/design/**` | 提示词 P15 中 python 统计脚本 assert 通过 |

建议顺序：T0 → T1 → T2 → T3/T4 → T5 → T6/T7/T8/T9 → (P12/P13) → T10 → T11/T12/T13 → T14/T15/T16/T17 → T18。T2 与 T5 都改 start-next.mjs，必须串行；T10/T15 都改 collect-engine.ts 与 storage.ts，必须串行。

---

## 7. 未验证项清单

- standalone `server.js:6 process.chdir(__dirname)`、`.next/standalone/uploads` 32M、`cssChunking` 构建警告：当前无 `.next/`，未复核（依据 P0-baseline F7、#6）。
- `/manager` JS gzip 在 P02 去除 Lucide 通配导入后的实际值：无重测数据。
- public/uploads 与 `/uploads` rewrite 的优先级：基于 Next 默认 afterFiles 推断，未运行。
- settings-registry 3 个缺失资源默认值是否在任何前台路径被实际渲染：推断前台主要走 setting-defaults.ts，未运行。
- main 设置键总数：按 `key:` 字段正则解析得 58（提示词称 68），解析口径可能遗漏非 `key:` 写法的条目。
