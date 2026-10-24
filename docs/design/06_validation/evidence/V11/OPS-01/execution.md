# V11-OPS-01 执行证据：备份恢复演练

## 5W1H（简版）

- **What**：真实执行一次 备份→恢复→校验 闭环演练，并把可复跑的演练脚本与实测结果固化进恢复手册（D-14/D-15 既有）。
- **Why**：V1.1 审计 §运维.1——备份/恢复机制存在（D-10/D-14）但从未演练过，恢复可用性未经证实。
- **Who/When**：P1 lane 执行代理，2026-10-23。
- **Where**：新增 `scripts/drill-backup-restore.mjs`（演练脚本）；`docs/design/07_release/部署与恢复手册.md` 新增 §5.4；本证据目录。
- **How**：见手册 §5.4 四步流程（真实迁移建库+种子 → VACUUM INTO + 真实 tar.ts 备份 → 真实 restore.mjs dry-run/--apply → 行数矩阵/integrity/sha256/应用栈读取四重校验）。

## 现状盘点（审计声明 vs 代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| 备份机制存在但未演练 | `src/lib/jobs/backup.ts`（VACUUM INTO + 手写 ustar tar.gz，保留 14 份）与 `scripts/restore.mjs`（dry-run/--apply/--force、路径重映射）代码完整；`docs/design/06_validation/evidence/V7/D-15/` 只有执行记录，无 restore 实测闭环 | **属实**（本次补演练） |
| 恢复手册 D-15 既有 | `docs/design/07_release/部署与恢复手册.md` §4/§5 已覆盖备份/还原步骤，但无演练步骤与实测输出 | 属实（本次补 §5.4） |
| 备份/还原有单测 | `lane-d/backup.test.ts`、`backup-vacuum.test.ts`、`restore.test.ts`、`w0-shared.test.ts` 共 26 用例 | 属实（演练前重跑全绿） |

## 改动文件

- `scripts/drill-backup-restore.mjs`（新增）：可复跑演练脚本，exit 0 = 闭环通过；沙箱在 `os.tmpdir()`，不触碰项目数据；备份侧直接加载真实 `src/lib/jobs/tar.ts`（node 24 类型剥离），还原侧直接调用真实 `scripts/restore.mjs`。
- `docs/design/07_release/部署与恢复手册.md`：新增 §5.4「备份恢复演练（V11-OPS-01，可复跑脚本）」，含步骤、验收口径与 2026-10-23 实测输出。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 恢复后应用可启动并读取数据（证据） | **PASS** | 演练第 5d 步：以与 `prisma/seed.ts` 相同的应用栈装配（`PrismaClient` + `PrismaLibSql` 适配器）打开恢复库，`setting.count()=2`、`role.count()=2` 读取成功；恢复库 `PRAGMA integrity_check=ok`、48 张用户表行数矩阵与源库逐表相等、uploads/kb 文件 sha256 全等。生产模式整站启动由 V11-PERF-01 独立验证（`next start` 可启动），两者合并构成"应用可启动并读取数据" |
| 手册含可复现步骤 | **PASS** | 手册 §5.4：命令（`node scripts/drill-backup-restore.mjs`）+ 脚本内部流程 + 实测输出 + 生产环境补充抽查口径 |
| 演练命令入证据 | **PASS** | 本文件"命令输出摘录" |
| npm test（backup 相关） | **PASS** | backup/backup-vacuum/restore/w0-shared 共 26 用例全绿 |

## 命令输出摘录

```
node scripts/drill-backup-restore.mjs          → EXIT=0
[drill] ✓ 源库就绪（7 个迁移已应用，种子 Role×2 + Setting×2）
[drill] ✓ 备份完成：backups/20261024/drill.tar.gz（14587 字节；db=1 + uploads=5 + kb=2 项）
[drill] ✓ dry-run 校验通过：[restore] 条目 8 项：db=drill.db uploads=5 kb=2
[drill] ✓ --apply 还原完成：[restore] 还原完成。请按部署手册迁移/启动服务。
[drill] ✓ 行数矩阵一致（48 张表；非空：Role=2, Setting=2）
[drill] ✓ integrity_check=ok；抽查 siteName='演练站点'、Role=2 行
[drill] ✓ uploads 一致（2 个文件 sha256 全等）
[drill] ✓ kb 一致（1 个文件 sha256 全等）
[drill] ✓ 应用栈（PrismaClient+PrismaLibSql）读取恢复库成功：Setting=2、Role=2
[drill] 演练闭环全部通过（备份→还原→校验→应用栈读取）。沙箱将清理。

npx vitest run lane-d/backup.test.ts lane-d/backup-vacuum.test.ts lane-d/restore.test.ts w0-shared.test.ts
 Test Files  4 passed (4)
      Tests  26 passed (26)
```

## 已知说明

- 演练沙箱清理在 Windows 上可能因句柄延迟释放而 WARN（脚本重试 5 次后放弃并提示手动删除），不影响 exit 0 与演练结论；脚本启动时会顺带清理历史残留沙箱。
- 本机为 Windows + node v24.12.0；生产（Ubuntu/node 24）可原样复跑同脚本，手册 §5.4 已注明生产演练的补充抽查口径。
- 真实生产数据的整库恢复演练（含 PM2 重启、反代切换）需生产环境与停机窗口，本卡为本地闭环演练，生产侧标记 UNKNOWN（凭据/环境缺失，沿用全项目口径）。
