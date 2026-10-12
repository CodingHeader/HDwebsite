---
id: EVD-P02-EXEC
type: evidence
phase: P02
prompt: docs/design/04_planning/review-prompts/P02-前端.md
date: 2026-10-12
status: done（自动验收全 PASS；人工项已用 Playwright 交互截图佐证）
---

# P02 执行证据：前台按 main 原样恢复 + 管理端设计令牌与 AppShell

> 说明：本方向由两个执行者接力完成（前一执行者超时，代码已写完但未提交；本执行者完成最后一轮视觉回归、通用验证、人工项验证、证据与提交）。

## 1. 分析（5W1H 简版）

- **Why**：用户裁决（2026-10-12）前台必须保持 main 的红色横幅轮播风格、main 的每个功能都要存在；upgrade 前台被替换为蓝色简化版（14 页行数仅为 main 的 8%~40%、无 public/）。管理端需要"顶级、友好"的外壳。
- **What**：public/ 150 个文件原样恢复；26 个 main web 组件逐字移植（JSX/className 不变），数据经 `src/components/web/data/*` 适配层从 upgrade 模型提供；15 个前台路由按 main 结构恢复；globals.css 恢复 main 令牌并新增 `[data-theme="manager"]` 作用域令牌；管理端 AppShell（可折叠分组侧栏、面包屑、Ctrl/⌘+K 命令面板、用户菜单含密度切换、<lg 抽屉）；登录页重做；Playwright 视觉回归套件 + main 参照截图入库；main→upgrade 内容导入脚本。
- **Who/Where**：仅前台与管理端外壳；后台各业务页面（P05/P07）未动。
- **When/How**：先起 main（:6790，main 自带 dev.db 的副本）生成参照截图，再用 `import-main-content.mjs` 让 upgrade 库与 main 同数据，逐像素比对直至 ≤1%。
- **自我质疑 / 双方立论**：
  - "适配层 vs 改组件"：改组件读 upgrade 模型更直接，但会破坏"JSX/className 逐字一致"的硬门禁且使后续 diff 难审；适配层多一层映射但可被单测、可被 P06 区块配置复用 → 选适配层。
  - "设置默认值冻结 main 值 vs 走 upgrade settings-registry 默认"：后者是长期正确的单一来源，但其默认值与 main 前台文案不同，会直接让截图失败 → 本方向冻结 main 默认值（`setting-defaults.ts`），记为偏差，P11 统一。
  - "/apply AI 对话沿用 main 的接口 vs 改 upgrade 契约"：main 接口在 upgrade 不存在，且禁止改 `src/app/api/**` → 前端改走 upgrade 已有的 `/api/chat/stream`（SSE），视觉不变。

## 2. 变更文件

| 区域 | 文件 |
| --- | --- |
| 静态资源 | `public/**`（150 个，与 `origin/main` 的 git blob 哈希逐一相同，4.1 MB） |
| 令牌/根布局 | `src/app/globals.css`（main 令牌 + `--primary: #da251d` + 文件末尾 `[data-theme="manager"]` 令牌与 `.text-muted` 兼容）、`src/app/layout.tsx`（Geist 字体、`lang="zh-CN"`） |
| web 组件 | `src/components/web/` 26 个 main 组件（TopBar…FloatingContact）+ 保留 ChatWidget/MarkdownRenderer/UserActionTracker；删除 `SiteChrome.tsx`；`ApplyForm.tsx` 从 `(web)/apply/` 移到 `components/web/`（与 main 位置一致） |
| 数据适配层 | `src/components/web/data/{home,navigation,nav-defaults,settings,setting-defaults,useSettings,service-guide-icons}.ts` |
| 前台页面 | `src/app/(web)/**` 15 路由（含 `news/`、`about/[...slug]`、`partners/[...slug]` 重定向页、`apply/ApplyClient.tsx`、`(web)/not-found.tsx`）；首页为"区块数组 → 依次渲染"，12 个 `data-block` 锚点 |
| 管理端 | `src/components/manager/shell/{AppShell,Sidebar,Topbar,Breadcrumbs,CommandPalette,UserMenu,MenuIcon,PageHeader,types,usePref}`、`src/app/manager/layout.tsx`、`src/app/manager/login/page.tsx` |
| 基座 | `src/lib/utils.ts`（cn）、`src/components/ui/{button,input,label,textarea,select,switch,checkbox,dialog,tabs,table,scroll-area}.tsx` |
| 数据导入 | `scripts/import-main-content.mjs`（默认 dry-run，`--apply` 写入，幂等；News→Article channel=news；Setting 旧点分 key 映射；ChatScene 按 code upsert） |
| 测试 | `playwright.config.ts`、`tests/visual/{routes.ts,web.spec.ts}`、`tests/visual/reference/*.png`（45 张，共 13 MB，最大 0.95 MB） |
| 依赖 | `package.json`/`package-lock.json`：仅加 `@playwright/test` 与 `test:visual`、`visual:reference` 两个 script |

## 3. 验收标准

| # | 标准 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `npm run test:visual` 15 路由 × 3 宽度 ≤1% | **PASS** | 46 passed / EXIT 0；最大差异 home-375 0.236%；见 `P02/visual-diff.md`、`P02/test-visual.log` |
| 2 | 首页 Banner 轮播 + data-block ≥11 + 区块顺序断言 | **PASS** | grep 合计 12；spec 中"区块顺序与 main 一致"用例通过 |
| 3 | `grep -n -- '--primary: #da251d' src/app/globals.css` | **PASS** | `70:  --primary: #da251d;` |
| 4 | `test -d public/images && curl -sf :6789/images/logo.png` | **PASS** | 生产构建启动后 `logo-ok` |
| 5 | `grep -rn "import \* as Lucide" src` 为空 | **PASS** | `no-wildcard-lucide` |
| 6 | manager layout 含 `data-theme="manager"`；(web) 无 data-theme | **PASS** | `layout.tsx:68`；(web) grep 为空 |
| 7 | 通用验证 lint/typecheck/test/build | **PASS** | lint 0 error（26 warning，均为既有/非本方向文件或 main 原样 `<img>`）；tsc EXIT 0；vitest 6 文件 33 用例通过；`next build` EXIT 0 |
| 8 | （人工）375px 管理端抽屉导航可打开并进入页面 | **PASS**（Playwright 交互佐证） | 登录 admin → 侧栏默认隐藏 → 点"打开导航菜单"出现 dialog（32 个链接）→ 点"文章管理"跳到 `/manager/articles` 且抽屉关闭 → `aria-current` 存在 → Ctrl+K 打开命令面板 → `scrollWidth=375` 无横向溢出。截图：`P02/manager-login-375.png`、`manager-375-closed.png`、`manager-375-drawer-open.png`、`manager-375-after-nav.png` |
| 9 | /manager 404 仍有效（删除根 `src/app/not-found.tsx` 后） | **PASS** | `/manager/does-not-exist` → 404（Next 默认 404 页，`<title>404: This page could not be found.</title>`）；`/no-such-page` → 404（前台 `(web)/not-found.tsx`，与 main 截图一致）；`/manager`、`/manager/login` → 200 |

复现：
```bash
export PLAYWRIGHT_BROWSERS_PATH=<浏览器目录>
# main 参照（:6790，使用 main 自带 prisma/dev.db 的副本）
VISUAL_BASE_URL=http://127.0.0.1:6790 npm run visual:reference
# upgrade（:6789）
node scripts/import-main-content.mjs --source ../hdw-main/prisma/dev.db --apply
npm run build && PORT=6789 node scripts/start-next.mjs &
VISUAL_BASE_URL=http://127.0.0.1:6789 npm run test:visual
```

## 4. 偏差（Deviations）

1. **`getWebSettings` 冻结 main 默认值**：`src/components/web/data/setting-defaults.ts` 存放 main 前台文案/联系方式默认值，库中无值时使用；未走 `src/lib/settings-registry` 默认（禁止改 `src/lib/**`，且其默认值会改变前台外观）。→ P11 统一默认值来源。
2. **ApplyClient → `/api/chat/stream`**：main 的 /apply AI 咨询接口在 upgrade 不存在，前端改用 upgrade 的 SSE 契约（meta/delta/done/error），会话由服务端落库；视觉不变。报名表单走 `/api/apply`（`/api/students` 是后台鉴权 CRUD）。
3. **前台页面 `export const dynamic = "force-dynamic"`**（10 个页面）：数据全部来自库，避免构建期把数据冻结进静态页、构建期无库时失败。
4. **catch-all 重定向页**：main 用 `next.config` redirects 把 `/about/*`、`/partners/*` 子菜单收敛；P02 不可改 next.config，改为 `(web)/about/[...slug]/page.tsx`、`(web)/partners/[...slug]/page.tsx` 调用 `redirect()`。实测：因 `(web)/loading.tsx` 触发流式渲染，响应为 `HTTP 200` + `<meta http-equiv="refresh" content="1;url=/about">` + 客户端 `NEXT_REDIRECT;replace;/about;307`，浏览器能正常跳转，但不是 main 的服务端 3xx（对 SEO 爬虫不等价）。→ 跟进：允许改 `next.config` 的方向（或 P03 导航树）恢复服务端 redirects。
5. **`.text-muted` 作用域兼容**：存量后台页用 `text-muted` 表示次要文字，与 main shadcn `--color-muted`（浅灰背景色）冲突；只在 `[data-theme="manager"] .text-muted` 回指 `--mgr-muted-fg`，前台不受影响。P07 迁移后删除。
6. **越界（路径）**：删除 `src/app/not-found.tsx`（不在"允许修改"清单），改为 `src/app/(web)/not-found.tsx`。原因：根 not-found 会包住前台 404，使其与 main 截图不同。影响：`/manager/*` 未匹配路由现显示 Next 默认 404（状态码仍为 404）。
7. **shell 额外文件**：`PageHeader.tsx`、`types.ts`、`usePref.ts`（提示词列 7 个文件；PageHeader 是设计系统"页面骨架"要求，usePref 持久化密度/折叠偏好）。
8. **375 视口截图宽 667px**：main 自身在 375 下有横向溢出，按"外观不变"原样保留，未修复。

## 5. UNKNOWN

- 微信/SMTP 不涉及本方向。
- `/apply` AI 回复的真实 LLM 联调：本地无 LLM 凭证，截图中对话区为静态初始态；流式接口仅做了前端接线，真实回复记 UNKNOWN。
- 人工视觉审美评审（设计系统"顶级"程度）未由人完成，仅有截图。

## 6. 后续（Follow-ups）

- **P03**：导航树（多级 Navigation 的后台管理与前台 `navigation.ts` 适配对齐；当前缺省时回退 `nav-defaults.ts`）；顺带把 `/about/*`、`/partners/*` 收敛恢复为 `next.config` 服务端 redirects（见偏差 4）。
- **P06**：首页区块配置接线（ADR-024）：`(web)/page.tsx` 的区块数组改由 BlockConfig/ElementConfig 驱动，`data-block` code 已就绪。
- **P07**：`src/components/ui/**` 按管理端浅色令牌重新着色/补全组件；后台业务页（如 `/manager/articles` 表格）在 375 下未做响应式（窄屏表格逐字换行，见 `manager-375-after-nav.png`）；移除 `.text-muted` 兼容；可加 `src/app/manager/not-found.tsx` 让后台 404 使用设计系统外壳。
- **P11**：设置默认值单一来源（合并 `setting-defaults.ts` 与 settings-registry）。
- 每个后续方向结束时重跑 `npm run test:visual`。
