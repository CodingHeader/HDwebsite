# D-02 执行记录：start-next 构建判定精确化 + env 加载

分支 `lane/d-ops`（自 w1-base-ccr-1，D-01 之后）。执行：本会话（P3/Ops 角色）。

## 改动（全部在 allow 内，3 文件）

- `scripts/start-next-utils.mjs`：抽纯函数 `needsRebuild({buildIdExists, buildIdMtimeMs, latestWatchedMtimeMs})`（标量输入可单测）；`shouldRunBuild` 改调纯函数。
- `scripts/start-next.mjs`：
  - 监视面精确化：`prisma` 整目录 + `scripts` 移出 → `prisma/schema.prisma` + `prisma/migrations`（数据库写入 dev.db/备份不再触发整站重建；构建产物不含 scripts 运行时）
  - 启动前 `@next/env` loadEnvConfig（优先级 .env.production.local > .env.local > .env.production > .env）——npm start 读得到 .env.local（与 next dev 对齐）；CJS 模块经默认导出解构
- `src/lib/__tests__/lane-d/start-next-utils.test.ts`（新，5 用例）：构建缺失重建、监视面新于构建重建、**数据库写入不触发（核心语义）**、源码旧于构建不重建（幂等启动）、migrations 新增触发。

## 实测证据（Windows 本机）

| 项 | 结果 |
|---|---|
| touch prisma/dev.db 后 npm start | **无重建（日志 0 次 next build）** ✅、**Ready 998ms（≈1s）** ✅ 远优于 ≤10s 目标（d02-start.log；首次实测的 14.6s 系分支切换 mtime 副作用触发重建的路径，非 dev.db——重建后复测即达标） |
| 仅有 .env.local 时登录可用 | D-02 验收实测：loadEnvConfig 加载后 POST /api/auth/login 200（.env.local 含 JWT_SECRET）✅ |
| D-02 单测 | 5/5 PASS |
| 通用门禁 | 见 gate-d02.log |

## 过程中定位的根因（登记）

1. `@next/env` 为 CJS 模块——ESM 命名导入不可用，经默认导出解构（start-next.mjs 修复）。
2. 首次实测重建触发系**分支切换 mtime 副作用**（checkout 更新 src mtime → src 比 BUILD_ID 新），非 dev.db；D-02 核心语义（数据库写入不触发）由纯函数单测 + 重建后复测双证。
