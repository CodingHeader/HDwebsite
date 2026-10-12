---
id: EVD-P0-VERIFY
type: evidence
title: P0 独立校验报告（对 7ab10bf）
status: final
owner: 独立校验者（未参与 P0 编写）
created: 2026-10-12
updated: 2026-10-12
related: [PLAN-CURRENT, PARITY-MATRIX, EVD-P0-BASELINE]
---

# P0 独立校验报告

- 被校验提交：`7ab10bf`（docs(P0)），父提交 `5b72fb7`；分支 `upgrade`；对照 `origin/main@94dbbbb`。
- 方法：仅依据 `git show` diff、仓库代码（file:line）、`git show origin/main:<path>` 与本机重跑命令。未推送，未改动除本文件外的任何文件。
- 治理标准：`docs/design/规划总指令-任务分配与完整规划.md` §10（16 节）、§12（自检）。

## 总结论：**PASS**（6 项检查无 FAIL；有若干非阻断勘误，见文末）

| # | 检查 | 结论 | 一行证据 |
| --- | --- | --- | --- |
| 1 | 7ab10bf 只改 docs/design/** | PASS | `git show --stat 7ab10bf`：18 个文件全部位于 `docs/design/`（current-plan、parity-matrix、P0-baseline、P01~P15），无 src/prisma/scripts/配置改动 |
| 2 | current-plan 16 节齐全 + ≥10 处抽查 | PASS（附 6 处数值/行号勘误） | §1~§16 标题全部存在（current-plan.md:21~372）；抽查 20 项，核心论断 20/20 成立，其中 6 处数字/行号有小偏差 |
| 3 | parity-matrix 抽查 ≥12 行 | PASS | 抽查 16 行全部成立；红/蓝、public/ 缺失、logs/chat-history 缺失、redirects 29 vs 2 均确认；状态计数 16/9/21/9/2=57 复算一致 |
| 4 | 重跑基线 | PASS | lint 0 error/25 warning；typecheck 0 error；vitest 6 文件 33/33；build exit 0（37 静态页、cssChunking 警告同）——与 P0-baseline 一致；构建耗时与路由计数有差异（见勘误） |
| 5 | P01~P15 提示词 | PASS | 15 份按序存在，均含目标/证据(评审表)/输出/允许·禁止修改/自动化验收/验证命令/回滚；全部 missing/partial 已分派；用户 9 类功能均有归属；无一份要求偏离 main 前台风格 |
| 6 | 未知登记册 BLOCKING 含 A/B | PASS | current-plan.md:128~139：U-B1~U-B4 均有方案 A/B、共同部分、需裁决变量 |

---

## 检查 1：提交范围 — PASS

`git show --stat 7ab10bf | cat` → 18 files changed, 2415(+)/12(-)，路径均为 `docs/design/02_requirements/parity-matrix.md`、`docs/design/04_planning/current-plan.md`、`docs/design/04_planning/review-prompts/P01..P15-*.md`、`docs/design/06_validation/evidence/P0-baseline.md`。无业务代码、测试、配置变更。

备注（非 FAIL）：规划总指令 §11 白名单为 `docs/04_planning/current-plan.md` 等，未列 `02_requirements/parity-matrix.md`、`06_validation/evidence/`、`review-prompts/`。current-plan §13（:325~334）已显式说明"文档根为 docs/design/、额外产物为编排要求"，属已披露的适配。

## 检查 2：current-plan 16 节与事实抽查 — PASS

16 节标题：`grep -n '^## ' current-plan.md` → 1 规划快照(:21) … 16 建议的第一刀(:372)，另含 3.1~3.5 子节，齐全。

| # | 论断（current-plan） | 实际证据 | 真/假 |
| --- | --- | --- | --- |
| 1 | Next 16.2.1 / React 19.2.4 / zod 4 / zustand 5 / vitest 3 | package.json:42,45,55,56,70 | 真 |
| 2 | @base-ui、@radix-ui 已装但 src 零引用；无 components/ui、lib/utils.ts | package.json:26,31-32；`grep -rl '@base-ui\|@radix-ui' src` = 0；ls 两者均不存在 | 真 |
| 3 | schema 42 模型；4 个迁移 | `grep -c '^model ' prisma/schema.prisma` = 42；prisma/migrations 下 4 目录 | 真 |
| 4 | jobs/index.ts 注册 6 个任务 | src/lib/jobs/index.ts:11,14,29,35,41,47（backup/collect.run/publish.scan/notify.scan/retry.failed/llm.balance-check） | 真 |
| 5 | LLM 路由 default→priority→fallback | src/lib/llm-gateway.ts:36-41 | 真 |
| 6 | manager/layout.tsx 121 行，`import * as Lucide` :9 | wc=121；:9 命中 | 真 |
| 7 | CrudPage window.confirm :146、:210；crud-specs alert :27；crud-specs 583 行 | 三处行号逐一命中；wc=583 | 真 |
| 8 | 24 个管理页为 8 行 CrudPage 包装 | 统计：CrudPage 页面 24 个 8 行 + 1 个 41 行 | 真 |
| 9 | I4：catalog 仅 edit，seed/路由用 *:list | contracts/auth.ts:72-79 仅 `["edit"]`；seed.ts:112-122 用 content/kb/llm/collect/publish/wechat/notify:list；api/kb/test/route.ts:15 `kb:list` | 真 |
| 10 | I5：seed 登记 /manager/logs（seed.ts:126），页面不存在 | seed.ts:126 命中；src/app/manager 下无 logs | 真 |
| 11 | I6：仅审核通过时写 Knowledge（collect-items/[id]/route.ts:47） | :45-47 审核事务内 `tx.knowledge.create` | 真 |
| 12 | I7：content-items 走通用 CRUD，status 可设 approved/published | crud-resources.ts:244-255；contracts/resources.ts:241 status enum 含 approved/published | 真（代码推断，文档已标"未运行验证"） |
| 13 | I11：next.config.ts:28、jobs/index.ts:3-6 注释过时 | 两处注释命中 | 真 |
| 14 | I13：system_error 仅通知失败派生（notify-gateway.ts:136-137） | :136-137 命中 | 真 |
| 15 | I14：server.js:6 chdir；upload/route.ts:25、backup.ts:45 基于 cwd | .next/standalone/server.js:6；upload/route.ts:25；jobs/backup.ts:45 | 真 |
| 16 | M-5：wechat 硬编码 `400-001-5729` 在 wechat.ts:121 | 实际在 **wechat.ts:118**（域名在 :119） | 内容真，**行号偏 3** |
| 17 | NotifyEvent 7 个（notify-gateway.ts:14-21） | :14-21 列出 7 个 | 真 |
| 18 | 429 现返回 400（chat/stream/route.ts:37） | :36-37 `error("提问太频繁…", 400)` | 真 |
| 19 | 路由：API 89 + manager 35 | 本次 build 输出与 `find`：**API 87**（route.ts 87 个）、**manager 34**（page.tsx 34 个）；前台 15 一致 | **数字有误** |
| 20 | src TS/TSX 194 个共 11,016 行；已跟踪 742 文件 | 194 个 ✓，但 `wc -l` 合计 **10,929** 行；742 ✓（742 + 本提交新增 17 = 当前 759） | 行数**小偏差** |

结论：核心事实全部成立；#16、#19、#20 为数值/行号勘误，不影响任何方向的结论与分派。

## 检查 3：parity-matrix 抽查 — PASS

| 行 | 抽查 | 结果 |
| --- | --- | --- |
| A1 | main `(web)/page.tsx` 272 行，导入 11 个区块组件（TopBanner…CampusSection）；upgrade 201 行、含 `from-blue-700` | 确认 |
| A2 | upgrade SiteChrome.tsx 68 行，:10 `level: 1` | 确认 |
| A3 | main globals.css 215 行，`--primary: #da251d`（红）、brand-500/600 oklch hue 27.3/27.5；upgrade 87 行，`--primary: #1d4ed8`（蓝，globals.css:7） | **确认：main 红、upgrade 蓝** |
| A4 | FloatingContact main 121 / upgrade 43 | 确认 |
| A17 | upgrade next.config.ts:38-39 两条 /news 重定向 | 确认 |
| A18 | main next.config.ts `redirects()` 内 **29** 条 source（文档"约 30 条"）；upgrade **2** 条 | **确认** |
| A19 | main 跟踪 `public/**` **150** 个；upgrade 无 `public/`；Setting `siteLogo=/images/logo.png`（settings-registry.ts:35） | **确认** |
| A22 | main 68 键 / upgrade 60 键；advantage1、bannerOverlayColor、siteLogoIcon、statsLabel、homeCards 在 main 存在、upgrade 缺 | 确认 |
| B3 | main `api/articles/[id]` 有 PATCH(:312)；upgrade 仅 GET/PUT/DELETE | 确认 |
| B7 | upgrade `api/media/[id]/route.ts:7-8` 仅 GET/DELETE | 确认 |
| B11/B12 | main 有 `src/app/api/chat-history/route.ts`、`[id]/route.ts`、`src/app/api/logs/route.ts`；upgrade `src/app/api` 下均无 | **确认** |
| C4/C5 | main 有 `manager/chat-history/page.tsx`、`manager/logs/page.tsx`；upgrade 无 | **确认** |
| C6 | upgrade SchemaForm.tsx:100-105 richtext = textarea | 确认 |
| C9 | main `src/lib/block-registry.ts` 存在 | 确认 |
| D1 | main schema 32 模型 / upgrade 42 | 确认 |
| E1/E2 | main 根目录有 Dockerfile、Dockerfile.dev、docker-compose.yml、AGENTS.md、CLAUDE.md；upgrade 无 | 确认 |
| F9 | upgrade wechat.ts 客服仅 `gatewayChat([{role:"user",…}])`，不带场景提示词/知识库 | 确认 |

汇总复算：A22+B17+C11+D4+E3 = 57 行；present 16 / replaced 9 / partial 21 / missing 9 / dropped 2，与文件一致。
小勘误：A1/P02 称 main `components/web` "25 组件"，`git ls-tree` 实为 **26** 个文件（P02 输出清单列了 26 个名字，执行上无影响）。

## 检查 4：基线重跑 — PASS

node_modules 已存在（未执行 npm ci）。

| 命令 | 本次结果 | P0-baseline 声明 | 一致 |
| --- | --- | --- | --- |
| `npm run lint` | exit 0，`25 problems (0 errors, 25 warnings)` | 0 error / 25 warning | ✓ |
| `npm run typecheck` | exit 0 | 0 error | ✓ |
| `npm test` | `Test Files 6 passed (6)`、`Tests 33 passed (33)` | 6 文件 33/33 | ✓ |
| `npm run build` | exit 0；`✓ Compiled successfully in 119s`；`Generating static pages (37/37)`；`⨯ cssChunking` 警告 | 通过、37 静态页、cssChunking 警告、92s | ✓（耗时随环境，路由计数见勘误） |

运行时冒烟（F1~F7、TTFB、JS gzip）本次**未重跑**（非本任务要求项）；F3/F4 的静态前提（无 public/、无 logs/chat-history 路由/页面、seed 登记 /manager/logs）已在检查 2/3 中由代码确认。

## 检查 5：P01~P15 提示词 — PASS

- 顺序与方向：P01 需求、P02 前端、P03 后端、P04 数据、P05 交互、P06 逻辑、P07 组件、P08 复用、P09 拓展、P10 性能、P11 配置、P12 知识库、P13 响应、P14 存储、P15 资源——15 个全部存在且按序。
- 结构：每份均含 归属 / 评审（文件:行证据表）/ 目标 / 输入 / 输出（精确文件）/ Execution Steps / 验收标准（标注"（自动）"的可执行检查）/ 验证命令（bash 块）/ 证据路径 / 允许修改 / 禁止修改 / 回滚 / 前台风格保持 / 依赖与阻塞 / 档位 / 升级条件 / 规模 / 通用约束。15 份"回滚"节均非空。
- missing/partial 分派（grep 各 prompt）：A1~A16→P02（A6→P05）；A18→P11（P01 登记）；A19→P02/P15；A22→P11；B3/B7/B8/B11/B12→P03；C4/C5→P03/P07；C6→P07；E1/E3→P11；E2→P01（AGENTS.md）；C9/C10→P01（U-B2，ADR-024 proposed）；F1 内容中枢→P05/P07；F5→P06（autoToKb 默认 true）/P12；F6/F7→P12；F9→P06（chat-service + wechatFallbackReply）/P12；F11→P06（system_error/before_publish）/P07（notify-rules 页）；D4→P04。**未分派项：无。**
  - 说明：B6（campus-images 路径契约变化，状态 replaced）矩阵标 P03，但 P03 未提及；因属 replaced 非 missing/partial，不计入。
- 用户功能覆盖：站点+公众号统一管理（P05/P07 content-hub、P06）；可配置自动采集（P06、P07、P09 解析注册表）；自动发布官网/公众号（P06 状态机与发布前提醒、P09 渠道注册表；真实联调受 U-B1）；采集默认入库（P06）；知识库管理（P12）；多 LLM 优先级/默认/兜底（P12 场景 providerIds + 全局 fallback 测试，P09）；AI 客服官网+公众号（P06/P12 共用 chat-service）；多收件人邮件（发布前/低余额/错误：P06，U-B4）；完整 CRUD + 动态数据（P03/P07/P08/P11、M-4/M-5）；顶级管理端（P02 设计系统+AppShell、P07 组件库、P13 响应式）；前台风格不变（P02 截图 ≤1% 门禁）。全部覆盖。
- 风格约束：15 份"前台风格保持"节均要求维持 main 风格并以 `npm run test:visual` 为门禁；P02 明确"组件 JSX/className 与 main 逐字一致"、管理端令牌限 `[data-theme="manager"]`；P11 设置键默认值"取 main 原值"。**无一份要求改变前台风格。**
- 小勘误：P06 评审表引用 `wechat.ts:121/:122`，实际为 :118/:119。

## 检查 6：未知登记册 — PASS

current-plan.md §3.4（:128~139）BLOCKING：U-B1 微信凭证、U-B2 ADR-012 裁剪项是否恢复、U-B3 知识库形态/文件格式、U-B4 SMTP 凭证——每项均有"条件方案 A / 条件方案 B / 共同部分 / 需裁决变量"。NON_BLOCKING A-1~A-7 带假设与依据单列。冲突 K1→U-B2、K4→U-B3 已关联；§12 待裁决与风险/未决分开列出。

---

## 非阻断勘误（建议在 P01 顺手修正，不构成 FAIL）

1. current-plan §1/§2.1-2、P0-baseline §2 #6：路由计数 "API 89 + manager 35" → 实测 **API 87（route.ts 87）+ manager 34（page.tsx 34）**。
2. current-plan §1、P0-baseline §1："TS/TSX 194 个共 11,016 行" → `git ls-files src | grep -E '\.(ts|tsx)$' | xargs wc -l` = **10,929**。
3. current-plan §3.2 M-5、P06 评审 #5：`wechat.ts:121`（电话）/`:122`（域名）→ **:118 / :119**。
4. parity-matrix A1、P02 评审 #3："main components/web 25 组件" → **26** 个文件。
5. 构建耗时 92s 为单次测量；本机复跑编译阶段 119s，建议基线注明波动区间。
6. B6（campus-images 路径契约变化）矩阵归属 P03，但 P03 未写对应条目；建议 P03 增加一句"保持扁平路径或补兼容嵌套路由"的决定。

## 复现命令

```bash
cd HDwebsite && git show --stat 7ab10bf | cat
grep -n '^## ' docs/design/04_planning/current-plan.md
git show origin/main:src/app/globals.css | grep -n -- '--primary'; grep -n -- '--primary' src/app/globals.css
git ls-tree -r --name-only origin/main | grep -c '^public/'; ls public
git ls-tree -r --name-only origin/main | grep -E 'api/(chat-history|logs)|manager/(chat-history|logs)'
git show origin/main:next.config.ts | awk '/redirects\(\)/,/^  },/' | grep -c 'source:'
find src/app/api -name route.ts | wc -l; find src/app/manager -name page.tsx | wc -l
npm run lint; npm run typecheck; npm test; npm run build
```
