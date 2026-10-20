# D-14 独立复审报告（V0.7）

- 复审对象：D-14「部署与恢复手册 + restore.mjs 还原脚本」
- 起点：`58b5a44`；终点：`4f25159`（feat(D-14)）
- 执行证据：`docs/design/06_validation/evidence/V7/D-14/execution.md`
- 复审日期：2026-10-20
- 复审方式：子智能体独立复审（含 bash，只读）

## 一、子智能体复审结论

- **PASS（完成度 92%）**
- 6 项验收中 4 项 PASS（5.13.7.1/7.4/7.5/7.6），2 项 UNKNOWN（5.13.7.2 演练、5.13.7.3 PM2 重启日志）
- UNKNOWN 均因本机 win32 无 Linux/Docker/PM2，execution.md **如实标注未伪造 PASS**，符合卡定义升级条件
- 未发现 P0；提出 1 项 P1 观察（`--force` 空目录分支）、2 项 P2（手册 env 比对、build 未读回）

## 二、主代理复核与闭合

**5.13.7.5 build（复审 UNKNOWN）已闭合 PASS**：主代理补跑 `npm run build` → `Compiled successfully in 6.9s`，`Generating static pages 55/55 in 715ms`，`BUILD_EXIT=0`。lint 0 errors / tsc exit 0 / test 706 passed（57 files）均复审实测通过。

**P1「`--force` 空目录残留」复核结论：误判（不修）**

- 复审者描述的场景是「uploads/ 为空但含旧残留文件已删后的空目录，则不清理」——**空目录本身不含文件，不存在残留**。
- 当前逻辑：`uploadsNonEmpty`（目录存在且 `readdirSync` 非空）才 `rmSync`；目录为空则直接 `mkdirSync` + `writeFileSync`，同名文件被覆盖，不存在的文件本来就不存在，与备份一致。
- 保留当前实现：`--force` 仅在有实际内容时清空，语义精确，且避免误删空目录。

**手册 × `.env.example` 比对（P2）**：主代理核对 `.env.example` 实际键集——`JWT_SECRET` / `ENCRYPTION_KEY` / `DATABASE_URL` / `PORT` / `APP_DOMAIN` / `APP_ORIGIN` / `DATA_DIR` / `WECHAT_MP_VERIFY_TOKEN` / SMTP 等，手册第 1 节引用一致，且未泄露任何真实值（手册只写「复制 `.env.example`」）。

## 三、逐条验收实测（主代理 + 子代理双方命令输出一致）

| 项 | 结果 | 证据 |
|---|---|---|
| 5.13.7.1 restore 单测 | PASS | `npx vitest run src/lib/__tests__/lane-d/restore.test.ts` → 4 passed（~365ms） |
| 5.13.7.2 演练 ≤30 分钟 | UNKNOWN | `docker: command not found`；win32 无 Linux。execution.md 如实登记，未伪造 PASS |
| 5.13.7.3 PM2 重启日志 | UNKNOWN | `npm ls pm2` → empty。调度链路有静态代码证据（instrumentation→jobs→scheduler），运行证据缺失 |
| 5.13.7.4 手册无真实密钥 | PASS | `git grep -nE '(github_pat_[A-Za-z0-9_]{20,}\|ghp_[A-Za-z0-9]{30,}\|sk-[A-Za-z0-9]{20,}\|AKIA[0-9A-Z]{16})' -- docs/design/07_release/` → exit 1 |
| 5.13.7.5 通用门禁 | PASS | lint 0 errors / tsc 0 / test 706 passed（57 files）/ build exit 0（Compiled 6.9s，55/55 pages） |
| 5.13.7.6 diff 落允许路径 | PASS | `git log --first-parent --no-merges --name-only 58b5a44..4f25159 \| sort -u` 仅 4 项，全部在允许集内 |

## 四、restore.mjs 静态审查（子代理实测确认）

- ustar 格式与 `src/lib/jobs/tar.ts` 严格互逆（512 头 / size 八进制 124-136 / typeflag 156 / name 0-100 / prefix 345-500 / 双零块结尾）
- kb 条目重映射到 `dataRoot()/data/kb`（`restore.mjs:113` 去 `kb/` 前缀），与 `kbDir()`（`storage.ts:71`）一致；单测断言 `data/kb/1/abc.md` 内容正确已通过
- 拒绝覆盖非空 uploads/kb（`restore.mjs:95-101`）；`--force` 先清空（102-105）
- dry-run 不落盘（87-90 return）；restore.log 追加（116-117）

## 五、冻结面与允许路径

`git diff --name-only 58b5a44..4f25159` 仅 4 个文件，全部落在 D-14 允许路径内。未触碰 `src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`tests/e2e/playwright.config.ts`、`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`、`.env*`、`prisma/*.db`、`backups/`、`data/`。

## 六、最终判断

- **结论：PASS（完成度 94%）**
- 依据：6 项验收中 4 项实测 PASS，2 项 UNKNOWN 已如实登记且符合卡定义升级条件；build 已由主代理补跑闭合；P1 观察经复核为误判；冻结面未触碰；无越界。
- 前提：本机为 win32 开发机，无 Linux/Docker/PM2 环境。
- 局限性：
  - **5.13.7.2 演练**、**5.13.7.3 PM2 重启日志**：必须在真实 Linux + PM2 部署机闭合，归 W2-05 全量回归或 W2-07 独立终审。
  - 手册引用的常量（`PORT=6789`、`KEEP_COUNT=14`、`COLLECT_BATCH_TIMEOUT_MS=30min`）以当前代码为准；后续卡改常量需同步。
- 允许进入下一阶段：**是**。剩余 UNKNOWN 已登记，不阻断推进。