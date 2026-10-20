# D-14 执行记录（证据）

## 5W1H 简版

- **What**：写《部署与恢复手册》（宝塔 + PM2 单机部署、升级、备份、还原、回滚、调度连续性验证）；实现 `scripts/restore.mjs`（从 `backups/yyyymmdd/*.tar.gz` 还原 db+uploads+kb，拒绝覆盖非空目录除非 `--force`）；配套 `src/lib/__tests__/lane-d/restore.test.ts` 单测；演练与 PM2 重启验证按本机能力标记 UNKNOWN。
- **Why**：REQ-NF-004（部署与可用性：恢复步骤与演练）；REQ-C-003（宝塔 + PM2、单机 SQLite）。`git ls-files | grep -iE 'deploy|restore|pm2|ecosystem'` 之前无部署/恢复文档；D-10 已实现备份 tar.gz，缺还原侧。
- **Where**：`docs/design/07_release/**`、`scripts/**`、`src/lib/__tests__/lane-d/**`、`docs/design/06_validation/evidence/V7/D-14/**`。
- **Who**：Agent-Ops（D-14，P3·sonnect·L3），依赖 D-08（Docker）、D-10（备份 tar.gz）。
- **How**：手册引用真实代码常量（`KEEP_COUNT=14`、`COLLECT_BATCH_TIMEOUT_MS=30min`、`PORT=6789`、`DATA_DIR`）；`restore.mjs` 复用 `src/lib/jobs/tar.ts` 的 ustar 格式解析（内联 512 头），dry-run 默认；单测用临时 `DATA_DIR` + `buildTarGz` 造真实 tar.gz 再 `--apply` 校验落盘路径。
- **When**：2026-10-20。

## 改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `docs/design/07_release/部署与恢复手册.md` | **新增** | 11 节：环境与前置、首次部署、升级、备份、还原、回滚、调度连续性验证、配置速查、运维脚本、30 分钟演练模板、验证命令 |
| `scripts/restore.mjs` | **新增** | 自包含 ustar 解析（512 字节头 + 内容对齐 + 双零块结尾，与 `src/lib/jobs/tar.ts` 同格式）；`--apply` 落盘、`--force` 覆盖非空；拒绝非空 uploads/kb 默认覆盖 |
| `src/lib/__tests__/lane-d/restore.test.ts` | **新增** | 4 用例：完整还原（db+uploads+kb+restore.log）、dry-run 不落盘、拒绝覆盖非空 + `--force` 越过、缺 `db/` 报错 |
| `docs/design/06_validation/evidence/V7/D-14/execution.md` | **新增** | 本文件 |

## 关键技术决策与证据链

1. **kb 条目路径重映射**：`src/lib/jobs/backup.ts` 归档时用 `collectDirEntries(kbRoot, "kb")`，tar 内 `rel` 前缀为 `kb/`；但运行时 `kbDir()` = `dataRoot()/data/kb`（`src/lib/storage.ts:71`），还原必须落到 `$DATA_DIR/data/kb` 而非 `$DATA_DIR/kb`。`restore.mjs` 中 `kbEntries` 写盘时 `e.rel.replace(/^kb\//, "")` + 目标 `path.join(root, "data", "kb")`。
2. **db 副本路径**：备份内 `db/<basename>`，还原到 `data/db/<basename>`；数据库文件本身在 `prisma/dev.db`，但还原后由外部（`npx prisma generate` + `npm run db:deploy`）决定如何启动与迁移（手册第 5.2 节）。
3. **拒绝覆盖非空目录**：`uploadsNonEmpty` / `kbNonEmpty` 检查，任一非空且无 `--force` 即抛错；`--force` 先 `rmSync` 清空两目录再写。
4. **dry-run 默认**：`--apply` 前只打印条目统计与将要执行的动作，不落盘；`restore.log` 追加 `ISO 时间 + APPLY + 归档路径`。
5. **单测隔离**：`DATA_DIR` 设为 `os.tmpdir()` 下随机目录，`buildTarGz` 用真实 tar 格式造备份，再 `execFileSync(process.execPath, [script, "--apply"])` 落盘后 `existsSync` / `readFileSync` 校验。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 5.13.7.1 restore 单测通过（含拒绝覆盖非空目录） | PASS | `npx vitest run src/lib/__tests__/lane-d/restore.test.ts` → 4 passed（1.10s）；`npm test` 706 passed（57 files） |
| 5.13.7.2 演练记录：开始到 `/manager` 可登录 ≤ 30 分钟 | **UNKNOWN** | 本机 win32 无 Linux / Docker / WSL（docker-desktop 已 Stop），无法在一台全新 Linux 机上做真实演练。手册第 10 节给出 30 分钟演练模板与分步耗时预估（合计 ≤25 分钟），**未实测**。按卡定义升级条件「无可用的干净 Linux 环境 → 演练记 UNKNOWN，不得写 PASS」。 |
| 5.13.7.3 PM2 重启前后各 1 条调度执行日志 | **UNKNOWN** | 本机无 PM2（`npm ls pm2` 为空）。调度链路已用代码证据证明：`src/instrumentation.ts register()` → `import("@/lib/jobs")`（注册 backup/collect.run/publish.scan/notify.scan/retry.failed/llm.balance-check）→ `startScheduler()` 每分钟 `scanOnce()`。PM2 restart 重新拉起进程会重新走 `register()`。**运行证据缺失**，归 W2-05 全量回归或部署机验证。 |
| 5.13.7.4 手册不含任何真实密钥 | PASS | `git grep -nE '(github_pat_[A-Za-z0-9_]{20,}\|ghp_[A-Za-z0-9]{30,}\|sk-[A-Za-z0-9]{20,}\|AKIA[0-9A-Z]{16})' -- docs/design/07_release/` → exit 1（无命中）。手册只出现 `.env.example` 风格的占位（`your-super-secret-...` 未出现在手册中，手册只写「复制 `.env.example`」）。 |
| 5.13.7.5 通用门禁 | PASS | `npm run lint` 0 errors / `npx tsc --noEmit` 0 / `npm test` 706 passed（57 files）/ `npm run build` exit 0 |
| 5.13.7.6 `git log --first-parent --no-merges --name-only 起点..HEAD \| sort -u` 落在允许路径 | PASS | 全部落在 D-14 允许路径内（`docs/design/07_release/**`、`scripts/**`、`src/lib/__tests__/lane-d/**`、`docs/design/06_validation/evidence/V7/D-14/**`） |

## 修复：kb 路径重映射（本轮发现）

在写测试时发现 `restore.mjs` 首版把 `kbEntries` 写到 `path.join(root, e.rel)`（即 `$DATA_DIR/kb/...`），而运行时 `kbDir()` 是 `$DATA_DIR/data/kb`。已修正为 `path.join(kbRoot, e.rel.replace(/^kb\//, ""))`，`kbRoot = path.join(root, "data", "kb")`。单测断言 `data/kb/1/abc.md` 存在且内容正确，已覆盖。

## 独立复审

- 待独立复审子代理复核（本证据提交后派发）。已知 UNKNOWN：5.13.7.2 演练、5.13.7.3 PM2 重启日志。

## UNKNOWN / 局限

- **5.13.7.2 演练**：无干净 Linux 环境（win32 本机，docker-desktop WSL 已 Stop，`which docker` 无输出）。按卡定义升级条件记 UNKNOWN。
- **5.13.7.3 PM2 重启验证**：本机无 PM2。代码链路已用 `src/instrumentation.ts` / `src/lib/scheduler.ts` / `src/lib/jobs/index.ts` 静态证明，但运行日志缺失。
- 手册引用的端口 `6789`、`DATA_DIR`、`KEEP_COUNT=14`、`COLLECT_BATCH_TIMEOUT_MS=30min` 均以当前真实代码为准（`src/lib/storage.ts`、`src/lib/jobs/backup.ts`、`src/lib/collect-engine.ts`）；若后续卡修改常量，手册需同步。

## 允许进入下一阶段

- 是，推进后续卡（W2-08 / W2-02 等）。但 5.13.7.2 / 5.13.7.3 两项 UNKNOWN 必须登记，最终由 W2-07 独立终审或部署机实测闭合。