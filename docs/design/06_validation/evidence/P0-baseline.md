---
id: EVD-P0-BASELINE
type: evidence
title: P0 事实基线——命令与输出摘要
status: final
owner: P0 规划轮
created: 2026-10-12
updated: 2026-10-12
related: [PLAN-CURRENT, PARITY-MATRIX]
---

# P0 事实基线（可复现证据）

> 规则：本文件只记录**实际执行过**的命令与输出摘要。未执行的项写明"未执行"及原因。时间均为 2026-10-12（UTC+08:00）。

## 1. 快照

```yaml
snapshot:
  规划日期: 2026-10-12
  git_branch: upgrade（跟踪 origin/upgrade，up to date）
  git_commit: 5b72fb73d8bb87ff44ab7c932b4ae265d4d09709（2026-10-12 09:28:25 +0800，"docs: 收录任务分配与完整规划指令"）
  对照分支: origin/main = 94dbbbb42afecffac0b9081b5342ba79c1fe47db（2026-10-10 09:52:12 +0800）
  其他远端分支: origin/feature/project-optimization = 57868af（P0 范围外，未审阅）
  工作区是否干净: true（P0 执行前后 `git status --short` 均为空；.env.local / prisma/dev.db / backups / *.tsbuildinfo / next-env.d.ts 均被 .gitignore 覆盖）
  文件数:
    upgrade 已跟踪文件: 742（src 195｜docs 111｜prisma 7｜scripts 4｜uploads 413 ≈ 32MB｜根文件 12）
    upgrade src TS/TSX: 194 个，合计 11,016 行〔勘误 2026-10-12（P0-verify #2，P01 应用）：`git ls-files src | grep -E '\.(ts|tsx)$' | xargs wc -l` = 10,929 行〕
    main 已跟踪文件: 826（src 182｜public 150｜其余为截图、日志、website_error/ 副本等）
  运行环境: node v22.23.3 / npm 10.9.9（package.json engines 要求 node>=24 → npm ci 报 EBADENGINE 警告，未阻断）
  测试命令: npm run lint｜npm run typecheck｜npm test（vitest run）｜npm run build｜npm run check（= lint+typecheck+build）
```

## 2. 基线命令与结果

| # | 命令 | 结果 | 耗时 | 摘要 |
| --- | --- | --- | --- | --- |
| 1 | `npm ci --no-audit --no-fund` | ✅ exit 0 | ~60s | added 769 packages；警告：EBADENGINE（node 22 vs >=24）、whatwg-encoding deprecated |
| 2 | `npx prisma generate` | ✅ exit 0 | <1s | Prisma Client **v7.10.0**（lockfile 解析值；package.json 声明 ^7.7.0） |
| 3 | `npm run lint`（eslint） | ✅ exit 0 | 首次 >60s（被 60s 超时截断一次），带缓存重跑 10s | **0 errors / 25 warnings**（未用变量 ×N、无效 eslint-disable ×3：collect-engine.ts:19、crud-resources.ts:34、wechat.ts:17；settings/page.tsx:8、wechat-accounts/page.tsx:34、SchemaForm.tsx:9、crud.ts:14、jobs/backup.ts:33、llm-gateway.ts:96 等） |
| 4 | `npm run typecheck`（tsc --noEmit） | ✅ exit 0 | 24s | 0 errors |
| 5 | `npm test`（vitest run） | ✅ exit 0 | 14s | **6 files / 33 tests passed / 0 failed**（markdown 10、settings-registry 6、scheduler-cron 6、auth-permission 4、crypto 4、slug 3）；无组件测试、无 API 集成测试、无 E2E |
| 6 | `npm run build`（next build，Turbopack） | ✅ exit 0 | 92s〔单次测量；P0-verify 复跑编译阶段 119s，波动 ≈90~120s〕 | 37 个静态生成页；路由：前台 15 + API 89 + manager 35〔勘误 2026-10-12（P0-verify #1）：实测 API 87（route.ts 87 个）+ manager 34（page.tsx 34 个）〕 + robots/sitemap；1 条 Turbopack 警告（experimental `cssChunking` 不被识别：`⨯ cssChunking`） |
| 7 | `npx prisma migrate deploy` | ✅ | — | 4 个迁移全部应用（20261011052216_init / partner_int_id / course_sort / llm_kind_botid） |
| 8 | `npx prisma db seed` | ✅ | — | 管理员 admin/admin123、菜单、5 个采集源（提示 cce.scu.edu.cn 为 JS 渲染站） |
| 9 | `PORT=6789 node scripts/start-next.mjs`（= npm start） | ⚠️ 见下 | 启动前**每次重建**约 90s | 见 §3 发现 F1/F2 |

本地环境：`.env.local` 由 `.env.example` 复制，仅替换 `JWT_SECRET` 为本地随机串（未提交、已被 .gitignore 覆盖）；数据库 `file:./prisma/dev.db`（默认）。

## 3. 冒烟与运行时发现

| # | 发现 | 证据 | 影响方向 |
| --- | --- | --- | --- |
| F1 | **standalone 生产启动不读取 `.env.local`**：仅设 .env.local 时 `/api/auth/login` 返回 `{"code":500,"message":"登录失败"}`，日志 `FATAL: JWT_SECRET 缺失或长度不足 32 字符`；以进程环境变量注入 JWT_SECRET 后登录 200 | /tmp/start.log；scripts/start-next.mjs:45-48、98（只透传 process.env） | 配置 P11 |
| F2 | **npm start 每次都触发重建**：`watchedBuildEntries` 含 `prisma`（start-next.mjs:21-25），运行时写 `prisma/dev.db` 即使 BUILD_ID "过期" | 两次启动均打印 `Creating an optimized production build` | 配置 P11 / 性能 P10 |
| F3 | **public/ 目录不存在**：`[start-next] Source not found, skipping copy: …/public`；`GET /images/logo.png → 404`，而 Setting 默认 `siteLogo=/images/logo.png`（settings-registry.ts:35） | curl 结果 | 资源 P15 / 前端 P02 |
| F4 | `/manager/logs`、`/api/logs`、`/api/chat-history` 均 404，但 seed 菜单登记了 `/manager/logs`（prisma/seed.ts:126） | curl 结果 | 需求 P01 / 后端 P03 |
| F5 | `/api/chat/stream` 在无供应商时返回 502 `尚未配置可用的 AI 模型供应商`（信封格式正确） | curl 结果 | 逻辑 P06（行为符合预期） |
| F6 | 启动即执行 backup 任务：`[backup] 已备份 dev.db → backups/20261012/`；该目录实际位于 `.next/standalone/backups/`，第二次启动重建后已不存在 | /tmp/start.log；`ls .next/standalone` 前后对比 | 存储 P14 |
| F7 | standalone `server.js:6` 执行 `process.chdir(__dirname)`，而 `UPLOAD_ROOT=path.resolve(process.cwd(),"uploads")`（upload/route.ts:25）→ 生产上传写入 `.next/standalone/uploads`；构建时 32MB 的已跟踪 uploads 也被复制进 standalone（`du -sh .next/standalone/uploads` = 32M） | 同左 | 存储 P14 |

## 4. 基线指标首次测量（本机沙箱，生产 standalone，seed 数据，热缓存取第 2~3 次）

| 操作 | 指标 | 首次（冷） | 热（第 2/3 次） |
| --- | --- | --- | --- |
| 打开首页 `/` | TTFB | 177ms | 28ms / 28ms |
| 文章列表页 `/articles` | TTFB | 70ms | 16ms / 14ms |
| 公开列表 API `/api/articles?page=1` | TTFB | 22ms | 13ms / 9ms |
| 后台仪表盘 API `/api/manager/dashboard`（已登录） | TTFB | 28ms | 16ms |
| 首页 JS（全部 `<script src>` gzip 合计） | 字节 | 191,180 B | — |
| 后台 `/manager` JS（gzip 合计） | 字节 | **393,828 B**（疑因 `import * as Lucide`，manager/layout.tsx:9） | — |
| 首页 HTML | 字节 | 21,098 B | — |
| 构建时长 | 秒 | 92s（单次；复跑 119s，波动区间 ≈90~120s，P0-verify #5） | — |

限制：沙箱单机、seed 数据量小、无网络节流；数值仅作"同环境对比"的基线，不代表生产。

## 5. 读取失败或未执行

- 未执行浏览器渲染/截图对比（P0 不改代码，视觉对比放入 P02 验收，用 Playwright 截图 diff）。
- 未执行微信/SMTP/Coze 真实联调（无凭证，见 current-plan §3.4 BLOCKING）。
- `origin/feature/project-optimization` 未审阅（范围外，已登记）。
- main 上 `website_error/.token.txt` 为凭据类文件，按安全规则不读取。

## 6. 复现脚本

```bash
cd HDwebsite && git checkout upgrade && git rev-parse HEAD   # 期望 5b72fb7…
npm ci
cp .env.example .env.local && sed -i 's/^JWT_SECRET=.*/JWT_SECRET=<32+位本地随机串>/' .env.local
npx prisma generate && npx prisma migrate deploy && npx prisma db seed
npm run lint && npm run typecheck && npm test && npm run build
JWT_SECRET=<同上> PORT=6789 node scripts/start-next.mjs &
curl -s -o /dev/null -w "%{http_code} %{time_starttransfer}\n" http://127.0.0.1:6789/
```
