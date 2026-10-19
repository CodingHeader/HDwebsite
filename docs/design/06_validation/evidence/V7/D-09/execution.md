# D-09：storage.ts DATA_DIR 化；upload/file/collect-engine/backup 改用；standalone 不再携带 uploads

- 执行线：D 运维·性能·配置·存储·资源
- 执行日期：2026-10-19
- 卡定义：`docs/V0.7-20261019/tasks/D-09.md`
- 起点：`023ab68`（上一卡 D-08 提交）
- 蓝本：`origin/main@94dbbbb` 的 storage 路径语义（W0-03 冻结签名）

## 一、5W1H 简版

- **What**：storage.ts 原本只注释占位（各根硬编码 `process.cwd()`）；upload/route.ts 自行定义 `UPLOAD_ROOT`；collect-engine.ts 反向 import `@/app/api/upload/route`；backup.ts 硬编码 `path.resolve(process.cwd(), "backups")`；构建后 standalone 携带 218M uploads（I14 实测）。
- **Why**：D-09 卡目标——所有上传/备份/知识库路径与 cwd 解耦；`outputFileTracingExcludes` 排除运行时写入目录；collect-engine 不再反向 import 路由。
- **Where**：src/lib/storage.ts、src/app/api/upload/route.ts、src/app/api/file/[...path]/route.ts、src/lib/collect-engine.ts、src/lib/jobs/backup.ts、next.config.ts、src/lib/kb/ingest.ts、src/lib/__tests__/lane-d/storage.test.ts。
- **Who**：Agent-Ops（本卡）。
- **How**：storage.ts 实现 DATA_DIR 化（私有 dataRoot() 解析）；各调用点统一改调 storage 函数；next.config.ts 加 `outputFileTracingExcludes`；Turbopack 过度追踪用 `/* turbopackIgnore: true */` 注释收敛。
- **What if**：不修 Turbopack 过度追踪，standalone 永远携带整个项目根（11991 文件/218M uploads），`outputFileTracingExcludes` 无法生效。

## 二、改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/lib/storage.ts` | 修改 | 新增私有 `dataRoot()` 读 `DATA_DIR`（未设置回退 `process.cwd()`）；`dataDir/uploadsDir/backupsDir` 均经 `dataRoot()` 解析；`kbDir()` 仍 `dataDir()+"/kb"`；`resolveInside` 不变 |
| `src/app/api/upload/route.ts` | 修改 | 删除本地 `UPLOAD_ROOT` 常量，改 import `uploadsDir()`；`makeThumbnails` 与 `POST` 内 3 处引用替换 |
| `src/app/api/file/[...path]/route.ts` | 修改 | import 从 `@/app/api/upload/route` 改为 `@/lib/storage` 的 `uploadsDir()`；路径校验逻辑不变 |
| `src/lib/collect-engine.ts` | 修改 | 删除 `import { UPLOAD_ROOT } from "@/app/api/upload/route"`；`transferImage` 内 3 处 `UPLOAD_ROOT` → `uploadsDir()`（提前缓存到 `uploadRoot` 变量） |
| `src/lib/jobs/backup.ts` | 修改 | import `backupsDir()`；`backupRoot = backupsDir()`；`targetDir` 加 `turbopackIgnore`；`resolveDbPath` 的 `path.resolve(process.cwd(), raw)` 加 `turbopackIgnore` |
| `next.config.ts` | 修改 | 新增 `outputFileTracingExcludes: { "*": ["uploads/**/*", "backups/**/*", "data/**/*"] }` |
| `src/lib/kb/ingest.ts` | 修改（**越界**） | `path.join(kbDir(), ...)` 两处加 `/* turbopackIgnore: true */`（见 §四） |
| `src/lib/__tests__/lane-d/storage.test.ts` | 新增 | 7 用例：未设 DATA_DIR 回退 cwd、设置后落 DATA_DIR 之下、相对路径解析、变更后重新解析、chdir 后不变、resolveInside 合法/非法 |
| `docs/design/06_validation/evidence/V7/D-09/execution.md` | 新增 | 本文件 |

## 三、关键技术决策与证据链

1. **DATA_DIR 语义**：`dataRoot()` 读 `process.env.DATA_DIR`，`path.resolve()` 归一化绝对路径；未设置回退 `process.cwd()`，与 `env.ts:105 dataDir()` 的默认 `./data` 语义一致，但 storage 的 `dataDir()` 返回 `DATA_DIR/data`（数据子目录），保持与 W0 测试 `w0-shared.test.ts:150` 兼容。
2. **uploads 根**：`uploadsDir()` 落 `DATA_DIR/uploads`；`UPLOAD_ROOT` 常量删除后，`file/[...path]/route.ts` 的 `startsWith(uploadRoot + path.sep)` 防穿越校验保持语义不变（根随 DATA_DIR 移动）。
3. **collect-engine 解耦**：删除反向 import 路由后，`src/lib` 生产代码 `@/app/` 引用为 0（验收 B 通过）。
4. **Turbopack 过度追踪（本卡最核心发现）**：Next 16 默认 Turbopack 构建（build log `▲ Next.js 16.2.1 (Turbopack)`）。Turbopack 对 `path.join(kbDir(), ...)`（函数返回值，非静态）无法静态分析，把整个项目根 `[project]/` 11991 文件纳入 trace，直接导致 standalone 携带 `uploads/`(218M)、`backups/`、`docs/`(1007 文件)、`AGENTS.md` 等。
5. **修复顺序（逐层收敛 warning）**：
   - `kb/ingest.ts:74,76` 加 `turbopackIgnore` → 消除 `matches 11991 files` 警告；
   - `backup.ts` 的 `backupsDir()`/`path.join` 加 `turbopackIgnore` → 消除 `Encountered unexpected file` 警告；
   - `backup.ts:17` 的 `path.resolve(process.cwd(), raw)` 加 `turbopackIgnore` → warning 完全归零（build log 无 `warnings:` 段）。
6. **`outputFileTracingExcludes` 生效**：Next 源码（`collect-build-traces.js` apply-include-excludes）用 `picomatch(path.join(dir, exclude), {dot,contains})` 匹配 `path.join(pageDir, file)`；`"*"` 键匹配所有 route（已验证 `picomatch("*")` 匹配 `api/knowledge-bases`）。但 `instrumentation.js.nft.json` 的 files 在 copyTracedFiles 阶段**不经** excludes 过滤，仅当 Turbopack 未过度追踪时才不会进入（所以必须先修 turbopackIgnore 才是根治）。
7. **standalone 结果**：干净重建后仅含 `node_modules/package.json/public/server.js/src`；`uploads/backups/data/docs/scripts/tests/AGENTS.md/CLAUDE.md/Dockerfile/docker-compose.yml` 全部排除（逐项 `test -e` 验证）。`.env` 存在属 Next 内建行为（`writeStandaloneDirectory` 复制 `.env`/`.env.production`），Docker 构建时 `.dockerignore` 已排除 `.env` 不会带入镜像。

## 四、越界说明（AGENTS.md §4）

`src/lib/kb/ingest.ts` 不在 D-09 卡"允许修改"路径内（属 C 线 C-03 知识库）。**本卡修改它是必要且唯一**的：Turbopack 过度追踪整个项目根，根因正是 `kb/ingest.ts` 的 `path.join(kbDir(), String(baseId))` 与 `path.join(kbDir(), storagePath)`；不修该处，`outputFileTracingExcludes` 永远无法生效，standalone 永远携带 218M uploads（D-09 核心目标之一）。修改范围仅 2 处加 `/* turbopackIgnore: true */` 注释，不改任何运行时逻辑（`kbDir()` 返回值不受影响）。

## 五、验证命令与结果

```bash
# 验收 1：生产代码无 process.cwd()+uploads/backups
grep -rn 'cwd()' src --include="*.ts" | grep -E '"uploads"|"backups"' | grep -v __tests__
# → 空（PASS；剩余命中均为测试断言验证默认行为）

# 验收 2：src/lib 无 @/app/ 生产引用
grep -rn "@/app/" src/lib --include="*.ts" | grep -v __tests__
# → 空（PASS）

# 验收 3：standalone 不含 uploads
npm run build && test ! -d .next/standalone/uploads
# → PASS（win32 下 isWindows 关闭 standalone，需临时强制验证；详见 §七）

# 验收 4：storage.test.ts
npx vitest run src/lib/__tests__/lane-d/storage.test.ts
# → 7/7 passed

# 通用门禁
npm run lint        # exit 0（0 errors / 37 warnings 历史残留）
npm run typecheck   # exit 0
npm test            # exit 0（52 files / 682 tests passed，较上轮 +7）
npm run build       # exit 0（无 warnings 段）
```

## 六、验收标准逐条结果

| 验收项 | 结果 | 备注 |
|---|---|---|
| `grep -rn 'process.cwd(), "uploads"\|process.cwd(), "backups"' src` 为空 | **PASS** | 生产代码已无；测试断言保留（验证默认行为必须写） |
| `grep -rn "@/app/" src/lib` 为空 | **PASS** | 生产代码仅剩 `collect-engine` 已解耦；测试文件 import 路由属测试必要，不计 |
| `npm run build && test ! -d .next/standalone/uploads` | **PASS** | 临时强制 `isWindows=false` 重建验证：standalone 仅 5 项，uploads/backups/data 全部排除；已还原 |
| `storage.test.ts` 通过 | **PASS** | 7/7（含 chdir 用例与穿越用例） |
| 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | 见 §五 |
| `git log --first-parent` 文件全部落在允许路径 | **有条件 PASS** | 见 §四越界说明（kb/ingest.ts 已登记理由） |

## 七、验证局限

1. **win32 默认不产出 standalone**：`next.config.ts` 的 `isWindows` 分支在 win32 下关闭 standalone，本机 `npm run build` 无法直接验证验收 3。为验证，临时把 `isWindows` 强制为 `false` 重建，验证 standalone 排除生效后**立即还原**为 `process.platform === "win32"`。验证过程真实可复现，但**最终交付的 next.config.ts 保持原样**（win32 分支保留）。
2. **Turbopack warning 归零**：验证期间 build log 无 `warnings:` 段。但 `isWindows=false` 的验证是临时状态，交付代码还原后需在 Linux/Docker 环境再确认一次。
3. **kb/ingest.ts 越界**：仅加注释不改逻辑，运行时 `kbDir()` 仍按 DATA_DIR 解析。

## 八、复现步骤

```bash
# Linux 环境（standalone 生效）
npm run build
ls .next/standalone/   # 应仅 node_modules/package.json/public/server.js/src
test ! -d .next/standalone/uploads && echo PASS

# 单测
npx vitest run src/lib/__tests__/lane-d/storage.test.ts

# 运行时验证（DATA_DIR 生效）
DATA_DIR=/opt/hdw/data PORT=6789 node .next/standalone/server.js
# 上传文件 → 落 /opt/hdw/data/uploads/，/uploads/xxx 直读正常
```