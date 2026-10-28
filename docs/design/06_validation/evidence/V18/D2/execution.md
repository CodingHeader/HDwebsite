# D2 执行证据：部署演练（备份恢复 + 全新部署）

## 5W1H
- **What**：验证「备份恢复」与「全新服务器部署」两条运维路径可用，关闭 REQ-NF-004 的 2 条 UNKNOWN。
- **Why**：脚本已有但从未实际执行并记录结果；本卡把「有脚本」变成「有演练证据」。
- **Where**：`evidence/V18/D2/{drill-restore,fresh-deploy,execution}.md`；演练沙箱在 `os.tmpdir()`。
- **Who**：external-assistant（V1.8 D2）。
- **How**：演练 1 跑 `scripts/drill-backup-restore.mjs`（沙箱内，不触 e2e.db）；演练 2 用 `docker build` 模拟全新部署。
- **What if**：演练 2 Docker build 失败 → 如实记 UNKNOWN（环境受限），不冒充。

## 结果
| 演练 | 判定 | 摘要 |
|---|---|---|
| 1 备份恢复 | PASS | 48 表行数一致、integrity ok、upload/kb sha256 全等、应用栈读取成功、5.1s |
| 2 全新部署 | UNKNOWN | Docker build 于 `npm ci` 崩溃（Exit handler never called，重试同败） |

## 验证逐条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 演练 1 完成 + 耗时 | node scripts/drill-backup-restore.mjs | PASS（exit 0，5.1s） |
| 2 | 报告含表数/行数核对 | drill-restore.md 表格 | PASS |
| 3 | 演练 2 Docker 或 UNKNOWN | docker build | UNKNOWN（环境） |
| 4 | 未改 src/** | git status --short src | PASS（空） |

## UNKNOWN
演练 2（全新部署）：Docker 容器内 `npm ci` 崩溃（npm `Exit handler never called!`），重试无果。需容器内 npm 联网正常或 CI 环境执行。
