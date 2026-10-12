---
id: EVD-P04-EXEC
type: evidence
phase: P04
prompt: docs/design/04_planning/review-prompts/P04-数据.md
date: 2026-10-12
status: done（见 §4 验收表）
---

# P04 执行证据：数据一致性、索引、ADR-024 数据层恢复、存量迁移对账

附带 P03 follow-ups：chat-history 菜单、新权限授予 seed 角色、`.gitignore` `logs/` → `/logs/`。

## 1. 分析（5W1H 简版）

- **Why**：用户裁决（ADR-024 取代 ADR-012）要求 main 的首页区块配置/页面模板/交互点配置数据层存在；P03 新增权限点与页面后，seed 的角色/菜单与目录不同步（I4）；限频与日志查询未走最优索引；RISK-007（SQLite 写并发）未落地；存量迁移脚本从未对 main@94dbbbb 原库留证。
- **What**：唯一迁移 `20261012134621_p04_data_integrity`（4 表 + 1 可空列 + 索引）；seed（权限目录断言、角色并集补齐、chat-history 菜单、5 模板 + 15 内容块 + 首页 12 区块）；`src/lib/prisma.ts` busy_timeout；`scripts/verify-seed-consistency.mjs`；两个迁移脚本的 dry-run 发现缺陷修复；ADR-026。
- **Who/Where**：仅数据层与脚本；未触碰前台、`src/app/**`、`src/contracts/**`。
- **How**：先在库副本上验证迁移（行数前后对比 + Navigation 全行哈希 + `prisma migrate diff` 空），再应用本地 dev.db（已备份 `/workspace/work/p04-devdb-backup.db`）。

**自我质疑 / 双方立论**

- *Navigation 增列：接受 Prisma 生成的 RedefineTables vs 手写 `ALTER TABLE ADD COLUMN`*。RedefineTables 会"建新表 → INSERT…SELECT → DROP 旧表 → RENAME"，列表齐全时不丢数据，但整表重建期间关闭外键、重建索引，且 Navigation 自引用（parentId）与后续 ElementConfig 外键都受影响；SQLite 原生支持 `ADD COLUMN … REFERENCES … DEFAULT NULL`。**选手写 ADD COLUMN**：迁移后 `prisma migrate diff --from-config-datasource --to-schema` 输出 "This is an empty migration"，证明与 schema 无漂移；无 DROP/INSERT/DELETE 语句。
- *seed 角色 `update: {}`（不碰既有角色）vs 并集补齐*：前者导致已部署库永远拿不到 P03 新权限（`article:publish`、`log:delete` 等），菜单对非超管不可见；后者会把后台手工移除的默认权限补回。**选并集补齐**（保留手工新增、补入默认，排序比较相同则不写 → 幂等）；代价已在 seed 注释与本证据登记，P07 角色编辑页如需"永久移除默认权限"再引入标记。
- *授予范围*：Editor（内容编辑）得 `article:publish` 与内容生产链 `content/collect/publish/kb` 的 list/create/edit(/delete)；**不**得系统级 `setting:*`、`log:delete`、`llm`、`wechat`、`notify`（最小权限）。Viewer（只读）得全部菜单的 `:list`，使每个菜单可见；`llm:list`/`wechat:list` 接口已脱敏密钥（`maskSecret`，`src/app/api/llm/providers/route.ts:27`、`src/app/api/wechat/accounts/route.ts:25`）。`log:delete`、`setting:create/delete` 仅 SuperAdmin（`*`）持有。
- *seed import 目录 vs 同构常量*：seed 以 ts-node(ESM) 运行，`import '../src/contracts/auth'` 报 ERR_MODULE_NOT_FOUND，加 `.ts` 扩展名又触发 TS5097。prompt 允许"导入或同构常量 + 断言" → **运行时解析 `src/contracts/auth.ts` 的 permissionCatalog 字面量**（仍以契约为唯一源），角色/菜单任一权限不在目录即 seed 失败。
- *busy_timeout 的真实作用面*（读 `@prisma/adapter-libsql` 源码 + 实测）：同一 PrismaClient 内全部 IO 与事务由适配器 `Mutex` 串行化（事务持父锁到 commit）→ 进程内不会 SQLITE_BUSY；libsql 本地调用为同步原生调用，busy 等待会阻塞本线程事件循环，因此"同进程两个客户端"测试会自锁（初版测试即因此 5s 超时，已改）。锁竞争只来自**另一进程**（seed/migrate/迁移脚本/sqlite3 CLI/多实例），busy_timeout=5000ms 正为此兜底。通过 `PrismaLibSql({ url, timeout })`（@libsql/client `Config.timeout`，等价 `PRAGMA busy_timeout`，对 transaction() 新连接同样生效）设置，`PRAGMA busy_timeout` 读回 5000。
- *collect-items 审核队列索引*：EXPLAIN 前后均 `USING INDEX CollectItem_status_idx`（`status=? ORDER BY id DESC`，rowid 隐含于索引）→ 无查询证据支持新索引，**不加**。
- *WAL 模式*：可进一步降低读写互斥，但会改变库文件形态（-wal/-shm）、影响备份任务与 `git show` 复制库的流程，非本方向必需 → 不做，登记 P10。

## 2. 变更文件

| 区域 | 文件 | 说明 |
| --- | --- | --- |
| schema | `prisma/schema.prisma` | +PageTemplate/ContentBlock/TemplateBlock/ElementConfig（main 原样）；Navigation +templateId/template/elements；AIChatHistory `@@index([ipAddress, createdAt])`；OperationLog `@@index([module, createdAt])`（其余为 `prisma format` 对齐空白） |
| 迁移 | `prisma/migrations/20261012134621_p04_data_integrity/migration.sql` | CREATE TABLE ×4、`ALTER TABLE "Navigation" ADD COLUMN "templateId"`（手写替换 RedefineTables）、CREATE INDEX ×18 |
| seed | `prisma/seed.ts` | DATABASE_URL 可覆盖；permissionCatalog 运行时断言；`upsertRole` 并集补齐；chat-history 菜单；`seedTemplatesAndBlocks()`；前台导航/分类标签/示例文章/服务指南仅空表种入（视觉门禁发现，见 §5） |
| 库访问 | `src/lib/prisma.ts` | `SQLITE_BUSY_TIMEOUT_MS=5000`、`createPrismaClient()` |
| 测试 | `src/lib/__tests__/sqlite-busy-timeout.test.ts` | 4 例：PRAGMA 读回、进程内 20 写+调度锁+事务、跨进程持锁 400ms 下 20 写+调度锁+事务、timeout=0 对照组 SQLITE_BUSY |
| 脚本 | `scripts/verify-seed-consistency.mjs`（新） | 菜单 path↔页面、菜单权限∈目录、角色权限⊆目录、parentId 有效 |
| 脚本修复 | `scripts/migrate-setting-keys.mjs`、`scripts/migrate-news-to-article.mjs` | 见 §3.4（dry-run 发现的缺陷） |
| 配置 | `.gitignore` | `logs/` → `/logs/`（**越界说明**：不在 P04 允许路径，orchestrator 指派的 P03 follow-up） |
| 决策 | `docs/design/03_solution/decisions/ADR-026-ViewStats处置.md` | 保留但闲置，接入登记 P06 |
| 证据 | `docs/design/06_validation/evidence/P04/*` | explain-before/after、migrate-copy-test、seed-idempotency(.sh/-devdb.txt)、verify-seed-consistency.txt、stock-migration-dryrun.txt、model-diff(.py/.txt) |

## 3. 关键证据摘要

### 3.1 EXPLAIN QUERY PLAN（`P04/explain-before.txt` → `P04/explain-after.txt`）

| 查询（文件:行） | 前 | 后 |
| --- | --- | --- |
| 限频计数 `src/app/api/chat/stream/route.ts:33-35` | `USING INDEX AIChatHistory_createdAt_idx (createdAt>?)` | `USING INDEX AIChatHistory_ipAddress_createdAt_idx (ipAddress=? AND createdAt>?)` |
| 日志列表/计数 `src/app/api/logs/route.ts:30-37`（module+时间） | `USING INDEX OperationLog_module_idx (module=?)` | `USING INDEX OperationLog_module_createdAt_idx (module=? AND createdAt>?)`；count 为 COVERING INDEX |
| 采集审核队列 `src/app/api/collect-items/route.ts:18-24` | `USING INDEX CollectItem_status_idx (status=?)` | 同左（无需新索引） |

注：基线并非全表扫描，但单列索引需回表过滤；复合索引使两个热路径均为等值 + 范围命中。日志列表 `ORDER BY id DESC` 在带时间范围筛选时出现 `USE TEMP B-TREE FOR ORDER BY`（结果集已被索引收窄，分页 20 条，可接受）。

### 3.2 迁移在 dev.db 副本上的验证（`P04/migrate-copy-test.txt`）
- 行数：全部既有表前后一致，仅新增 4 张空表（ContentBlock/ElementConfig/PageTemplate/TemplateBlock = 0）。
- Navigation 9 行全列 md5 前后相同 `3cf4c9e6…`；`pragma integrity_check` = ok；`prisma migrate diff`（库 → schema）= empty migration。
- SQL 逐行审查：仅 `CREATE TABLE`（4 个恢复表）、`ALTER TABLE "Navigation" ADD COLUMN "templateId" INTEGER REFERENCES "PageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE`、`CREATE [UNIQUE] INDEX`；无 DROP / DELETE / INSERT / RedefineTables。

### 3.3 seed 幂等与一致性
- `bash docs/design/06_validation/evidence/P04/seed-idempotency.sh prisma/dev.db` → `SEED IDEMPOTENT: OK`（两次 seed 后 45 张表计数 + Role 权限 / 菜单 / TemplateBlock 内容哈希不变；ManagerMenu 40、Role 3、Setting 35、CollectSource 5、PageTemplate 5、ContentBlock 15、TemplateBlock 12）。`npx prisma db seed` 在副本上亦正常执行。
- `node scripts/verify-seed-consistency.mjs` → `catalog=96 menus=40 (with path 34) roles=3`，`OK`，exit 0。
- `sqlite3 prisma/dev.db "select code from PageTemplate; select code from ContentBlock;"` → 模板 `article course-list home list partner-grid`；内容块含 main 4 个 `home-banner news-list sidebar-hot course-recommend` + 首页 11 个 `home-*`。
- 首页 TemplateBlock：home 模板 12 行，sort 10…120，顺序 = `src/app/(web)/page.tsx` HOME_BLOCK_ORDER（= main 首页实际顺序），ContentBlock.status 默认 active；ElementConfig 0 行（main dev.db 亦 0 行）。

### 3.4 存量迁移对账（`P04/stock-migration-dryrun.txt`；源 = `git show origin/main:prisma/dev.db`，md5 `57ee81e3…`，dry-run 前后 md5 不变）

| 项 | 计数 / 结果 | 处置 |
| --- | --- | --- |
| News（main） | 5 | |
| `migrate-news-to-article.mjs` dry-run | `schemaReady=false`（main 的 Article 无 channel/contentType 列）、`idConflicts=[1..5]`、`wouldInsert=0` | **该脚本只能用于已是 upgrade schema 的库**；对 main 原库 `--apply` 实测报 `no such column: channel`。main 存量的实际路径是 P02 的 `scripts/import-main-content.mjs` |
| `import-main-content.mjs` 副本 apply | main News 5 → upgrade Article(id=100000+News.id, channel=news) 5；main Article 25 → 25；标题逐条 diff 为空 | 0 差异 ✓ |
| Setting（main） | 42 键 | |
| `migrate-setting-keys.mjs` 可映射 | 11 个旧点分键：8 个扁平键已存在且值相同；3 个新建（`site.logo→siteLogo`、`site.icp→icp`、`contact.worktime→workHours`）；冲突 0 | 副本 `--apply`：42 − 11 + 3 = 34 ✓ |
| 不可映射（点分）键 | `site.subtitle`（值 = footerSlogan，重复）、`site.copyright`、`social.wechat/weibo/douyin` | Registry 无对应键：保留原行不删（脚本只报告），前台未读取；**P11（配置）决定**是否入 Registry（版权/社交账号） |
| "无映射"中的扁平键（siteName 等 26 个） | 已是 Registry 扁平键 | 无需迁移（脚本把它们列为无映射，仅是报告口径） |

**脚本缺陷修复**（prompt 允许"修复 dry-run 发现的 bug，须在证据中说明"）：
1. `migrate-setting-keys.mjs --apply` 的 INSERT 缺 `createdAt/updatedAt` → main 库上 `NOT NULL constraint failed: Setting.updatedAt`；已补 `CURRENT_TIMESTAMP`。
2. 同脚本在扁平键已存在时静默删除旧键，若值不同即丢值；现 dry-run/apply 均比较并在报告中列出冲突（以扁平值为准，与 import-main-content 口径一致）。
3. KEY_MAP 补 `site.icp→icp`、`contact.worktime→workHours`（Registry 已有键，原映射遗漏）。
4. `migrate-news-to-article.mjs` dry-run 新增 schema 就绪检查、id 冲突清单与 `wouldInsert`。写入逻辑未改。

### 3.5 四模型字段对比（`python3 docs/design/06_validation/evidence/P04/model-diff.py`，`P04/model-diff.txt`）
PageTemplate / ContentBlock / TemplateBlock / ElementConfig 去注释规范化后与 main **完全一致**；Navigation 的 `templateId / template / elements` 三行一致；exit 0。

## 4. 验收标准

| # | 标准 | 结果 | 依据 |
| --- | --- | --- | --- |
| 1 | `node scripts/verify-seed-consistency.mjs` exit 0 | PASS | §3.3 |
| 2 | seed 二次执行后 ManagerMenu/Role/Setting/CollectSource 计数不变（脚本断言） | PASS | `seed-idempotency.sh` → SEED IDEMPOTENT: OK |
| 3 | 新迁移 SQL 只含加法（无 DROP COLUMN / DELETE FROM） | PASS | §3.2。注：prompt 命令 `git diff HEAD~1 -- prisma/migrations` 假定迁移为最后一次提交；本方向分子项提交，迁移在 `603f858`，请用 `git diff 348c8d0..HEAD -- prisma/migrations`（或 `git show 603f858`）核对；grep `drop column|delete from` 无匹配 |
| 4 | PageTemplate ≥5、ContentBlock ≥4、main 4 code 存在；字段 diff 为空 | PASS | §3.3、§3.5 |
| 5 | 并发写测试通过（vitest） | PASS | `sqlite-busy-timeout.test.ts` 4/4，连续 3 次稳定 |
| 6 | EXPLAIN 3 个查询均 `USING INDEX` | PASS | §3.1 |
| 7 | （人工）存量 dry-run 计数可对账、不可映射键有处置 | PASS（待人工复核） | §3.4 |
| 通用 | lint / typecheck / test / build / test:visual | 见 §5 | |

## 5. 通用验证

- `npm run lint`：0 errors / 26 warnings（P03 后既有告警，P04 新文件 0 告警）。
- `npm run typecheck`：exit 0。
- `npm test`：9 files / 72 tests passed（含新增 4 例）。
- `npm run build`：exit 0（`P04/build-summary.txt`）。
- `npm run test:visual`（`PLAYWRIGHT_BROWSERS_PATH=/workspace/work/.pw-browsers`，upgrade :6789 对 main 参照图）：**46 passed**（`P04/visual.txt`）。
  - 过程记录：沙箱重启后 Chromium 缺系统库（libatk），执行 `sudo npx playwright install-deps chromium` 后恢复。
  - 首轮 29 失败、修正后 7 失败均为**数据**而非代码：在已导入 main 内容的 dev.db 上跑 seed，原 seed 按 slug upsert 追加了 5 条前台导航（768/375 横向溢出 866px）与示例文章 3 / 分类 5 / 标签 3 / 服务指南 2。main 本身对参照图 15/15 通过（`P04/main-vs-ref-768.txt`），确认非环境问题。
  - 修复（`prisma/seed.ts`）：前台导航、分类/标签、示例文章、服务指南**仅在空表时种入**；dev.db 用 `import-main-content.mjs --apply` 恢复 main 内容（自动备份 backups/），再连续 seed 两次 → 内容表计数零变化、幂等 OK，视觉 46/46。
  - 空库验证（`P04/seed-idempotency-freshdb.txt`）：migrate deploy + seed ×2 → Navigation 9、Article 3、ManagerMenu 40、PageTemplate 5、ContentBlock 15、TemplateBlock 12，幂等 OK。

## 6. UNKNOWN

- 生产环境多实例/多进程写入下的 SQLITE_BUSY 实际频率：本地仅以子进程持锁 400ms 模拟；5s 上限内的长事务（如备份任务）若超过 5s 仍会失败 → P10 评估 WAL。
- 角色"并集补齐"对已上线库中被管理员刻意移除的默认权限会补回：无线上库可验证，按设计记录。

## 7. 后续方向待办

- **P06**：首页渲染改为读取 home 模板的 TemplateBlock（sort）+ ContentBlock.status（启用/停用）；`ViewStats` 接入（ADR-026）；`import-main-content.mjs` 的 KEY_MAP 同步补 `site.icp→icp`、`contact.worktime→workHours`；`migrate-news-to-article.mjs --apply` 的 status 恒为 published、id 不保留（注释称保留）两处口径与 import-main-content 不一致，决定是否下线该脚本。
- **P07**：notify-rules 页面建成时在 seed 登记菜单（`group-notify`，`notify:list`）；页面模板/内容块/交互点配置的后台 CRUD 页（ADR-024）与菜单；角色编辑页"移除默认权限"语义。
- **P10**：SQLite WAL 评估（与备份任务、`git show` 复制库流程一并）。
- **P11**：`site.copyright`、`social.*` 是否进入 Settings Registry。
