# 备份恢复演练记录（V11-OPS-01）

| 项 | 值 |
|---|---|
| 脚本 | scripts/drill-backup-restore.mjs |
| 命令 | `node scripts/drill-backup-restore.mjs` |
| 结果 | PASS（exit 0） |
| 耗时 | 5.1s |
| 迁移 | 7 个已应用 |
| 种子 | Role×2 + Setting×2 |
| 备份产物 | backups/20261028/drill.tar.gz（14587 字节；db=1 + uploads=5 + kb=2） |
| 还原校验 | dry-run + --apply 均通过；48 张表行数矩阵一致 |
| 完整性 | PRAGMA integrity_check=ok；抽查 siteName='演练站点'、Role=2 行 |
| 文件校验 | uploads 2 文件 + kb 1 文件 sha256 全等 |
| 应用栈读取 | PrismaClient+PrismaLibSql 读恢复库：Setting=2、Role=2 |
| 沙箱 | os.tmpdir() 独立目录，未触碰 prisma/e2e.db 与项目数据 |

**结论**：备份→还原→校验→应用栈读取闭环全部通过，关闭 REQ-NF-004「备份恢复演练 1 次未执行」UNKNOWN。
