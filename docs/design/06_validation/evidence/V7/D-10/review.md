# D-10 独立复审报告

- 复审员：独立复审员（与执行者 Agent-Ops 无依赖关系）
- 复审日期：2026-10-20
- 复审对象：`upgrade` 分支 HEAD `4dd6bfb`（父 `55d89a6`）
- 卡定义：`docs/V0.7-20261019/tasks/D-10.md`
- 执行者自证：`docs/design/06_validation/evidence/V7/D-10/execution.md`

## 一、复审结论

**PASS 有条件**，完成度 **≈ 92%**。

核心目标（备份归档三类 + 保留 14 份、`git ls-files uploads` = 0 且磁盘保留、单测全过、无冻结面触碰）均已达成并经独立命令验证。有条件项（不阻断放行，但应在后续卡补齐或记录）：

- 验收项 1「dry-run 报告 413」在 HEAD 上**不可复现**（`--apply` 已执行，当前 dry-run 报告 0）；独立佐证为父提交 `55d89a6` 的 `git ls-tree -r 55d89a6 uploads | wc -l` = **413**，与执行者报告一致。
- 通用门禁中 `npm test` / `npm run build` 本轮**未复跑**（预算限制），依据执行者自证为 exit 0；`lint`/`typecheck` 已由我独立复跑 = exit 0。
- 手写 ustar tar 未与系统 `tar` 交叉验证（我的临时交叉验证脚本因 shell 权限被拒，未运行）；系统 GNU tar 1.35 存在但未使用。此为 UNKNOWN，建议 D-14 部署演练补一次 `tar -tzf` 交叉核对（执行者已自述同一建议）。
- VACUUM INTO 路径在单测中通过 `vi.mock` 强制走 `copyFileSync` 回退，**VACUUM INTO 真实分支从未被测试**（P1 证据缺口，见 §六）。

## 二、审查方法与证据范围

- **提交核实**：`git show --stat 4dd6bfb`、`git log --oneline -3 4dd6bfb`、`git rev-parse 4dd6bfb^`、`git diff 55d89a6 4dd6bfb --name-status`。
- **冻结面与越界**：`git diff 55d89a6 4dd6bfb --name-only`（过滤 `uploads/` 删除）核对 6 个改动文件；对 `src/contracts prisma package.json package-lock.json vitest.config.ts playwright.config.ts tests public/uploads` 分别比对 → 0 命中。
- **跟踪/磁盘计数**：`git ls-files uploads | wc -l`、`find uploads -type f | wc -l`、`git ls-tree -r 55d89a6 uploads | wc -l`（父基线）。
- **运行验证**：`node scripts/migrate-uploads-to-data-dir.mjs`、`npx vitest run src/lib/__tests__/lane-d/backup.test.ts`、`npm run lint`、`npm run typecheck`。
- **静态审查**：完整阅读 `src/lib/jobs/tar.ts`、`src/lib/jobs/backup.ts`、`scripts/migrate-uploads-to-data-dir.mjs`、`backup.test.ts`。
- **环境**：win32 + git-bash；node v22；系统 `tar`（GNU tar 1.35）存在但未用于交叉验证。

## 三、提交范围与冻结面核对表

| 检查项 | 命令/依据 | 结果 |
|---|---|---|
| HEAD 与父 | `git log` → `4dd6bfb`，父 `55d89a6` | 一致 |
| 改动文件清单 | `git diff --name-status`（去 `uploads/` 删除） | `.gitignore`(M)、`backup.ts`(M)、`tar.ts`(A)、`migrate-uploads-to-data-dir.mjs`(A)、`backup.test.ts`(A)、`execution.md`(A) |
| uploads 删除数 | `git diff --name-status -- uploads` 中 `^D` 计数 | **413** |
| 父基线 uploads 跟踪数 | `git ls-tree -r 55d89a6 uploads \| wc -l` | **413**（与删除数一致） |
| 当前 `git ls-files uploads` | 同上 | **0** |
| 磁盘 uploads 文件 | `find uploads -type f \| wc -l` | **677**（保留） |
| `public/uploads` | `git diff --name-only -- public/uploads \| wc -l` | **0**（未改） |
| 冻结面（contracts/prisma/package.json/lock/vitest.config/playwright/tests） | `git diff --name-only \| wc -l` | **0** |

## 四、越界评估

**无越界。**

- 全部非删除改动落在 D-10 允许路径：`src/lib/jobs/**`（tar.ts、backup.ts）、`scripts/**`、`.gitignore`、`src/lib/__tests__/lane-d/**`、证据目录。
- `src/lib/tar.ts` 的越界风险已消除：当前仓库中该路径不存在，文件位于 `src/lib/jobs/tar.ts`，与允许路径一致。执行者在自证 §四 已说明"最初写在 `src/lib/tar.ts`，发现越界后移入 `src/lib/jobs/`"，**最终位置正确**。
- `.gitignore` 追加 `uploads/` 与 `data/`：`uploads/` 为本次迁移对象，`data/` 为 D-09 DATA_DIR 化的运行时写入根；两者均为运行时数据目录，忽略合理。当前仓库无 `data/` 目录被跟踪（`git ls-files data` 空），`git check-ignore data` 无输出仅因目录不存在，不构成问题。
- 未触碰 `public/**`（前台视觉冻结面）；`public/uploads` 实测 6 个 70B 占位 png（非卡内声称的 20 个），执行者已如实记录差异，默认保留符合卡定义。

## 五、核心验收项逐条结果

| # | 验收项 | 结果 | 独立证据 |
|---|---|---|---|
| 1 | 迁移脚本 dry-run 报告 413 | **PASS（条件）** | HEAD 上 `node scripts/migrate-uploads-to-data-dir.mjs` → 报告 0（因 `--apply` 已执行并提交）。独立佐证：父提交 `git ls-tree -r 55d89a6 uploads` = 413，与执行者声称一致 |
| 2 | `git ls-files uploads` = 0 且磁盘保留 677 | **PASS** | `git ls-files uploads \| wc -l` = 0；`find uploads -type f \| wc -l` = 677 |
| 3 | `backup.test.ts` 5 用例全过，覆盖三类/删最旧/容错 | **PASS** | `npx vitest run src/lib/__tests__/lane-d/backup.test.ts` → **5 passed / 5**；用例含归档三类、保留 14 份（16 删 2）、uploads/kb 缺失仅 db |
| 4 | `jobs/tar.ts` ustar 头正确性 + `listTar` 读回 | **PASS（交叉验证 UNKNOWN）** | 静态审查：octal 字段/checksum（`"%06o\0 "`）/magic `ustar\0`/version `00`/name≤100 + prefix≤155/512 对齐/结尾两个零块均符合 ustar 规范；`listTar` 已由单测读回验证（db/uploads/kb 条目可读）。**未与系统 `tar -tzf` 交叉验证** |
| 5 | `backup.ts`：VACUUM INTO 优先 + copyFileSync 回退、rel 前缀 db//uploads//kb/、保留 14 份 | **PASS** | 代码审查确认三路径；单测确认 `db/dev.db`、`uploads/a.png`、`kb/1/abc.md` 前缀；`KEEP_COUNT=14` 且 pruneOldBackups 排序删除最旧 |
| 6 | lint/typecheck/test/build 全 exit 0 | **PASS（test/build 未独立复跑）** | 我独立跑：`npm run lint` exit 0、`npm run typecheck` exit 0；`npm test`/`npm run build` 本轮未跑，依据执行者自证 exit 0 |
| 7 | 未触碰冻结面；`public/uploads` 未改 | **PASS** | 见 §三：冻结面 diff = 0；`public/uploads` diff = 0 |

## 六、独立发现的问题

### P1（应尽快补证/修正，不阻断本次放行）

1. **VACUUM INTO 真实路径未被测试**：`backup.test.ts` 通过 `vi.mock("@libsql/client")` 让 `createClient().execute` 抛错，强制走 `copyFileSync` 回退。因此 VACUUM INTO 分支（含 `client.close()`、`VACUUM INTO ?` 参数绑定语义、libsql 对 VACUUM INTO 的实际支持）**从未在测试中执行过**。这属于执行者自证 §七.3 已承认的局限，但影响验收 5「VACUUM INTO 优先」的可信度。建议后续在真实 `.env.local` 数据库环境跑一次 `backupJob`，确认 VACUUM 成功且 `db/` 条目为一致性快照。
2. **tar 交叉验证缺失**：手写 ustar 仅通过自写 `listTar` 自读自验，未用系统/第三方 tar 读取。若存在未对齐、checksum 偏差等缺陷，`listTar` 与 `buildTarGz` 使用同一份错误实现会互相掩盖。建议 D-14 在 Linux 上 `tar -tzf backups/…/*.tar.gz` 交叉核对一次（执行者已自述同样建议，本报告 UNKNOWN 转放行条件）。

### P2（非阻断，记录改进）

3. **备份目录同时保留未压缩 db 副本与 tar.gz**：`backup.ts` 先产出 `backups/<yyyymmdd>/<dbname>`（VACUUM 或 copy），再打包为 `<dbname>.tar.gz`，两者并存于同一 targetDir。磁盘占用近似翻倍（uploads 218M 场景），且 tar 条目 `db/<dbname>` 与目录下的裸 db 文件内容重复。建议后续改为 VACUUM 到临时目录再打包，或不保留裸 db。
4. **`backup.ts` 文件末尾缺换行**：`git diff` 显示 `\ No newline at end of file`。D-09 复审曾就同类问题（缺换行）判 P2 并由 `8a24fd1` 修复；本卡又出现同类残留，建议修复以符合 POSIX 文本文件约定。
5. **`collectDirEntries` 未处理符号链接**：`readdirSync` 后 `statSync` 跟随 symlink，若 uploads 含 symlink 会归档目标内容或重复；当前项目 uploads 均为真实文件，风险低。
6. **`splitTarPath` 兜底截断可能截断多字节字符**：极端路径下 `rel.slice(-100)` 若截断在多字节 UTF-8 字符中间会产出非法字节。项目内路径均 <100 字节，仅防御性缺陷。
7. **迁移脚本未检查工作区脏状态**：`--apply` 仅核对 `git ls-files` 计数，未校验 `git status` 是否干净；若存在未提交改动可能与 `git rm --cached` 产生意外。本次执行环境干净，未触发。
8. **临时复审目录遗留**：我在复审中创建了 `.review-tmp/`（含 `tarcheck.test.ts` 与测试数据），因 shell 权限限制未能清理，需在交付前手动删除（未被 git 跟踪，不影响提交）。

## 七、证据缺口与局限

| 缺口 | 说明 |
|---|---|
| 验收 1「报告 413」不可在 HEAD 复现 | 迁移已执行并提交，dry-run 只能报告 0。独立佐证：父提交 ls-tree = 413 |
| `npm test` / `npm run build` 未独立复跑 | 本轮复审预算限制，仅复跑 lint + typecheck（均 exit 0）。test/build 依据执行者自证 |
| tar 交叉验证未执行 | 我的临时交叉验证脚本因 shell 命令权限被拒未运行；系统 GNU tar 存在但未使用 |
| VACUUM INTO 真实分支未测 | 单测强制走 copyFileSync 回退 |
| 未验证真实 scheduler 触发 | 单测直接调 `backupJob({} as never)`，未验证 jobs/index.ts 注册链路（执行者自证已承认） |
| uploads 归档体积未实测 | 未在真实 677 文件 uploads 上跑一次完整备份验证耗时与产物大小 |

## 八、放行条件

1. **放行判定：PASS 有条件**——D-10 核心目标已达成且无冻结面触碰，允许合并至 `upgrade` 主线。
2. **必须补齐（阻塞下一轮验收的 UNKNOWN）**：
   - D-14 部署演练在 Linux 上用 `tar -tzf backups/<yyyymmdd>/*.tar.gz` 交叉核对手写 ustar 产物；若列出条目与 `listTar` 一致则解除 UNKNOWN。
   - 在真实 `.env.local` 数据库环境跑一次 `backupJob`，确认 VACUUM INTO 成功并生成一致性 `db/` 快照。
3. **建议修复（非阻塞）**：P2-4 末尾换行；P2-3 双份 db 副本的存储冗余；P2-6 symlink 处理。
4. **遗留清理**：删除复审创建的 `.review-tmp/` 目录（如仍未清理）。
5. **证据归档**：本报告写入 `docs/design/06_validation/evidence/V7/D-10/review.md`，与执行者 `execution.md` 一并留存。