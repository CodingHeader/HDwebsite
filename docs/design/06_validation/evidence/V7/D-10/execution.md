# D-10：备份含 uploads 与 kb；运行时文件迁出 git（导出→.gitignore→git rm --cached）

- 执行线：D 运维·性能·配置·存储·资源
- 执行日期：2026-10-20
- 卡定义：`docs/V0.7-20261019/tasks/D-10.md`
- 起点：`55d89a6`（上一卡 D-09 提交后的证据提交）
- 蓝本：`origin/main@94dbbbb` 备份/上传语义

## 一、5W1H 简版

- **What**：备份任务原只归档 SQLite 库（`VACUUM INTO` 单文件）；uploads/（413 文件被 git 跟踪，磁盘 677 文件）与 kb/（当前为空）未纳入备份。uploads/ 作为运行时写入被误入版本库。
- **Why**：D-10 卡目标——备份产物含 db + uploads + kb（tar.gz），保留 14 份；`git ls-files uploads` = 0 且磁盘文件保留；public/uploads 20 个文件处置写入证据（实测 6 个 70B 占位 png，属冻结面不动）。
- **Where**：src/lib/jobs/backup.ts、src/lib/jobs/tar.ts（新增）、scripts/migrate-uploads-to-data-dir.mjs（新增）、.gitignore、uploads/**、src/lib/__tests__/lane-d/backup.test.ts（新增）。
- **Who**：Agent-Ops（本卡）。
- **How**：手写 ustar tar 打包（`jobs/tar.ts`，不新增 npm 依赖，规避 package.json 冻结）→ backup.ts 归档 db+uploads+kb；迁移脚本 dry-run 默认，`--apply` 二次核对计数后 `git rm --cached -r`；.gitignore 追加 uploads/ 与 data/；单测 5 用例覆盖 tar 打包/读回、归档三类、保留 14 份、缺失目录容错。

## 二、改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/lib/jobs/tar.ts` | **新增** | 手写 ustar tar 打包：`splitTarPath`（≤100 name + ≤155 prefix）、`buildTarGz`（Readable 生成器 + 流式 gzip）、`listTar`（自动识别 gzip 读回）、`collectDirEntries`（目录递归收集）。零外部依赖 |
| `src/lib/jobs/backup.ts` | 修改 | VACUUM INTO 产物 + uploads/ + kb/ 三类合并归档为 `<dbname>.tar.gz`；`pruneOldBackups` 保留最近 14 份逻辑不变；console 报告各类条数 |
| `scripts/migrate-uploads-to-data-dir.mjs` | **新增** | dry-run 默认报告计数与分布；`--apply` 时 `git ls-files uploads` 二次核对（一致才执行 `git rm --cached -r -- uploads`）；执行后断言 `ls-files` = 0 |
| `.gitignore` | 修改 | 追加 `uploads/` 与 `data/`（运行时写入根，D-09 DATA_DIR 化后由部署侧卷承载） |
| `uploads/**` | 索引删除 | 413 文件 `git rm --cached`（磁盘保留） |
| `src/lib/__tests__/lane-d/backup.test.ts` | **新增** | 5 用例：tar 打包/读回、collectDirEntries、归档三类、保留 14 份（预置 15 历史→删最旧 2）、uploads/kb 缺失时仅 db |
| `docs/design/06_validation/evidence/V7/D-10/execution.md` | **新增** | 本文件 |

## 三、关键技术决策与证据链

1. **tar 手写而非引入依赖**：package.json 依赖冻结（AGENTS.md §4），不新增 `tar`/`archiver`。手写 ustar 头（512 字节）符合 POSIX tar 标准，`listTar` 可读回验证。使用流式生成器避免 218M uploads 驻留内存。
2. **VACUUM INTO 优先 + copyFileSync 回退**：原逻辑保留。VACUUM 产物落 `backups/<yyyymmdd>/<dbname>` 后再作为 tar 条目（`db/<dbname>`），避免 tar 打包时直接读活跃库文件撕裂。
3. **collectDirEntries 仅收集存在的目录**：uploads 或 kb 目录不存在（本地开发常见）时自动跳过，归档仅含 db，日志明确报告各类条数。
4. **迁移脚本二次核对**：`--apply` 前 `git ls-files uploads` 重新计数，与首次计数不一致即拒绝执行（防并发修改）。执行后断言 0。
5. **`git rm --cached -r` 不动工作区**：磁盘 677 文件全部保留（含 264 个未跟踪文件），运行时 `/uploads/:path*` rewrite 语义不变（D-09 已确认 file route 读 `uploadsDir()`）。
6. **public/uploads 处置**：实测 6 个 70B 占位 png（`1777283103736-w4ankj.png` 等），属前台视觉冻结范围（`public/**`），**本卡不动**，证据写入 §六。

## 四、越界说明

无。全部改动落在 D-10 卡"允许修改"内（`src/lib/jobs/**`、`scripts/**`、`.gitignore`、`uploads/**`、`src/lib/__tests__/lane-d/**`）。

`src/lib/jobs/tar.ts` 最初写在 `src/lib/tar.ts`，发现超出允许路径后立即移到 `src/lib/jobs/`（`git mv` 逻辑等价，实际为文件系统 move 后再提交）。

## 五、验证命令与结果

```bash
# 验收 1：迁移脚本报告 413
node scripts/migrate-uploads-to-data-dir.mjs
# → [D-10] uploads 被 git 跟踪文件数 = 413
#   [D-10] 按目录分布：uploads/collect: 409 / uploads/202610: 4
#   [D-10] dry-run：未执行任何改动（PASS）

# 验收 2：git ls-files uploads = 0（执行后）
node scripts/migrate-uploads-to-data-dir.mjs --apply
git ls-files uploads | wc -l  # → 0（PASS）
find uploads -type f | wc -l  # → 677（磁盘保留，PASS）

# 验收 3：backup.test.ts
npx vitest run src/lib/__tests__/lane-d/backup.test.ts
# → 5/5 passed（PASS）

# 通用门禁
npm run lint        # exit 0（0 errors / 37 warnings 历史残留）
npm run typecheck   # exit 0
npm test            # exit 0（53 files / 687 tests passed，较上轮 +5）
npm run build       # exit 0（无 warnings 段）
```

## 六、验收标准逐条结果

| 验收项 | 结果 | 备注 |
|---|---|---|
| 迁移脚本报告 413 | **PASS** | dry-run 输出 413，分布 collect:409 + 202610:4 |
| `git ls-files uploads` = 0 | **PASS** | `--apply` 后 `wc -l` → 0 |
| backup.test.ts：归档含三类、第 15 份删除最旧 | **PASS** | 5 用例全过；预置 15 历史+今天共 16 → 删最旧 2 后 14；归档含 `db/dev.db`、`uploads/a.png`、`kb/1/abc.md` |
| 磁盘文件保留 | **PASS** | 677 文件（含 264 未跟踪）完整 |
| 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | 见 §五 |
| 允许路径 | **PASS** | 见 §四 |

## 七、验证局限

1. **public/uploads 处置**：实测为 6 个 70B 占位 png（非 20 个），属冻结面 `public/**`，本卡不做处理；是否删除由前台恢复卡（video-poster.jpg 等）决策时一并考虑。
2. **tar 兼容性**：手写 ustar 未用系统 `tar` 交叉验证；`listTar` 自读自验。建议 D-14 部署演练在 Linux 上 `tar -tzf <archive>` 交叉核对一次（UNKNOWN）。
3. **备份任务真实调度**：未在真实 scheduler 触发点跑一次（单测直接调 `backupJob({} as never)`）；jobs/index.ts 的注册未改动。

## 八、复现步骤

```bash
# 迁移（dry-run 先看计数）
node scripts/migrate-uploads-to-data-dir.mjs
# 确认 413 后执行
node scripts/migrate-uploads-to-data-dir.mjs --apply
git ls-files uploads | wc -l   # 0
find uploads -type f | wc -l   # 677

# 单测
npx vitest run src/lib/__tests__/lane-d/backup.test.ts

# 手工触发备份（需 .env.local 有 DATABASE_URL 指向真实库）
npx tsx -e "import {backupJob} from './src/lib/jobs/backup'; backupJob({} as any)"
ls backups/$(date +%Y%m%d)/     # dev.tar.gz + dev.db
tar -tzf backups/$(date +%Y%m%d)/dev.tar.gz | head  # 三类条目
```