---
id: P04-verify
type: validation
phase: P04 数据
range: 348c8d0..3cf6b39
verifier: 独立校验（未参与执行）
date: 2026-10-12
verdict: PASS
---

# P04 独立校验报告

结论：**PASS**（无 FAIL；2 条非阻断观察项见文末）。
只依据 diff 与本人实际运行的命令；未采信 P04-execution.md。工作文件在 `/workspace/work/.visual/p04v/`（不入库）。
校验前已备份 `prisma/dev.db`（sha256 5148a859…），所有在线检查结束后已恢复，sha 一致；`git status` 干净。

## 1. 改动路径
`git -c core.quotepath=off diff --name-only 348c8d0..3cf6b39` 共 24 个文件。

| 路径 | 是否允许 | 说明 |
| --- | --- | --- |
| prisma/schema.prisma、prisma/migrations/20261012134621_p04_data_integrity/、prisma/seed.ts、src/lib/prisma.ts、scripts/verify-seed-consistency.mjs、src/lib/__tests__/sqlite-busy-timeout.test.ts、docs/design/** | 允许 | — |
| scripts/migrate-setting-keys.mjs、scripts/migrate-news-to-article.mjs | 有条件允许 | 只修 dry-run 发现的 bug，已在证据中说明（见 §3 #9/#10） |
| .gitignore | 越出允许范围，**理由成立** | 编排文件中 P03 的后续事项要求改；只把 `logs/` 改成 `/logs/`（1 行）。`git check-ignore` 显示：`logs/x.log` 仍被忽略，`src/app/manager/logs/page.tsx` 不再被忽略 |
| src/app/**、src/components/**、src/contracts/**、public/**、已有迁移、.env*、dev.db | 未改动 | 是 |

## 2. 验收标准

| # | 标准 | 结果 | 证据 |
| --- | --- | --- | --- |
| A1 | `node scripts/verify-seed-consistency.mjs` exit 0 | PASS | 已在 dev.db、populated 副本、fresh 库上分别运行：`catalog=96 menus=40 (with path 34) roles=3 … OK`，exit 0 |
| A2 | seed 二次执行后计数不变 | PASS | populated 副本（P04 前真实库 + 迁移）：第 1 次与第 2 次之间全部表计数一致，Role.permissions 一致，ManagerMenu 一致；fresh 库同样一致；真实 dev.db 上 seed 前后计数一致 |
| A3 | 迁移只做加法 | PASS | 逐行读了 migration.sql（130 行）：只有 4 条 `CREATE TABLE`（PageTemplate/ContentBlock/TemplateBlock/ElementConfig）、1 条 `ALTER TABLE "Navigation" ADD COLUMN "templateId" INTEGER REFERENCES "PageTemplate"… ON DELETE SET NULL`（:76），其余全是 `CREATE [UNIQUE] INDEX`。没有 DROP、DELETE、INSERT，也没有 RedefineTables / 整表重建（原本生成的 Redefine 已手工改成 ADD COLUMN，:73-76 有注释说明） |
| A4 | PageTemplate ≥5、ContentBlock ≥4、main 的 4 个 code 都在；四个模型的字段与 main 一致 | PASS | seed 后 PageTemplate 有 article/course-list/home/list/partner-grid（5 个）；ContentBlock 15 个，含 home-banner/news-list/sidebar-hot/course-recommend。用自写脚本对比 `hdw-main@94dbbbb:prisma/schema.prisma`（去掉注释、规范空白后），4 个模型块**完全相同**。main seed.ts:454-485 的模板/区块数据逐字段一致 |
| A5 | 并发写测试（vitest）通过 | PASS | `sqlite-busy-timeout.test.ts` 4/4 |
| A6 | EXPLAIN 中 3 个查询都用到索引 | PASS | 实测 post 库：限频查询 `SEARCH AIChatHistory USING INDEX AIChatHistory_ipAddress_createdAt_idx (ipAddress=? AND createdAt>?)`；日志 module+日期查询 `USING INDEX OperationLog_module_createdAt_idx`；采集队列 `USING INDEX CollectItem_status_idx`。（P04 前的库也不是全表扫描，用的是 createdAt/module 单列索引，新复合索引提高了选择性） |
| A7 | 存量迁移 dry-run 可对账；不可映射的键都有处置 | PASS | 在 `git show 94dbbbb:prisma/dev.db` 的副本上运行：news 脚本报告 News=5、schemaReady=false（缺 channel/contentType）、idConflicts 1-5、wouldInsert=0，指向 import-main-content.mjs；setting 脚本可映射 11 个键（新建 siteLogo/workHours/icp，其余扁平值相同），点分键残留 site.subtitle/site.copyright/social.*，已在 P04-execution.md:78 处置（交 P11）。main 库原件 sha 校验未变 |

## 3. 专项检查

| # | 检查 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 迁移在 P04 前库的副本上应用 | PASS | 用 `p04-devdb-backup.db`（只含 4 个旧迁移）的副本，分别经 sqlite3 `.read` 和 `prisma migrate deploy` 应用。原有表行数**全部不变**，只多出 4 张空表；`PRAGMA integrity_check`=ok，`foreign_key_check` 为空 |
| 2 | Navigation 数据哈希 | PASS | 去掉新增的 NULL 列后，pre/post 的 `select * from Navigation` sha256 相同（e86324b6…） |
| 3 | `prisma migrate diff` | PASS | `--from-migrations → --to-schema` 和「部署后库 → schema」两次都输出 `-- This is an empty migration.` |
| 4 | seed 不往已有数据的库里加示例内容 | PASS | 对 populated 副本 seed：只新增 ContentBlock 15、PageTemplate 5、TemplateBlock 12、ManagerMenu +1（chat-history）；Article/Category/Tag/Navigation/ServiceGuide 计数不变，Navigation 哈希不变 |
| 5 | 首页区块配置 | PASS | home 模板下 TemplateBlock 有 12 条，sort 10..120，全部 active，顺序与 `src/app/(web)/page.tsx:26` 的 HOME_BLOCK_ORDER 和 data-block 锚点一致 |
| 6 | 新权限授予是否合理、有无越权 | PASS | Editor 新增 article:publish 和 content/collect/publish/kb 内容链权限（不含 publish:delete）；未授予 setting/user/role/log:delete/llm/wechat/notify/review。Viewer 只新增 `*:list`（navigation/partner/gallery/campus/content/collect/publish/kb/notify/llm/wechat）。核对过：llm/wechat 的 GET 接口对 apiKey/appSecret 做了脱敏（`api/llm/providers/route.ts:27`、`api/wechat/accounts/route.ts:25`），balance/test 接口需要 llm:edit。`'*'` 只给 isSuper（verify 脚本有断言）。seed 用运行时断言保证角色和菜单权限都在 permissionCatalog 内 |
| 7 | busy_timeout 测试是否有意义 | PASS | 直接断言 `PRAGMA busy_timeout`=5000；跨进程场景：子进程持写锁 400ms，本进程并发 20 写 + 调度锁 + 事务全部成功；对照组 timeout=0 时立即 SQLITE_BUSY，能区分两种情况。`@libsql/core` 的 Config.timeout 是官方的 busy timeout 选项（api.d.ts:54-63），adapter 会透传 |
| 8 | 运行时 prisma.ts | PASS | `createPrismaClient` 给 PrismaLibSql 传入 `timeout: 5000`；导出的单例行为不变 |
| 9 | migrate-setting-keys 的修复 | PASS | 在 main 库副本上 `--apply`：新版成功，新建的键 createdAt/updatedAt 非空；同样操作下旧版（348c8d0）报 `SQLITE_CONSTRAINT: NOT NULL constraint failed: Setting.updatedAt`，说明 bug 真实存在且已修好。扁平键冲突时以扁平值为准，并打印旧值（之前是静默丢弃） |
| 10 | migrate-news-to-article 的修复 | PASS | 只在 dry-run 报告里增加 schemaReady / idConflicts / wouldInsert，没改写入逻辑 |
| 11 | .gitignore | PASS | 只改了 `logs/` → `/logs/` 这一行 |
| 12 | 约束性决策 | PASS | 前台文件零改动，test:visual 46/46（红色横幅轮播保持）；main 的功能没有减少（反而恢复了 4 个模型）；没碰知识库文件类型；diff 里没有密钥（grep key/secret/token/password 无命中），没有 .env/dev.db/backups |
| 13 | ADR-026 | PASS | ViewStats 保留但闲置，接入工作登记给 P06，依据写清楚了 |

## 4. 通用验证（本人重跑）
| 命令 | 结果 |
| --- | --- |
| `npm run lint` | exit 0，26 条 warning、0 error（P04 改动的文件都不在其中） |
| `npm run typecheck` | exit 0 |
| `npm test` | 9 个文件 / 72 个测试全部通过 |
| `npm run build` | exit 0，生成 39 个静态页（Turbopack 的 NFT 警告之前就有，P03 构建日志里也有） |
| `npm run test:visual`（真实 dev.db 先 seed，up :6789 对比 main :6790） | **46 passed**，EXIT 0 |
| `git status`（测试后、恢复 dev.db 后） | 干净 |

## 5. 非阻断观察项（不影响 PASS）
1. main 的 `Navigation` 上有 `@@index([templateId])`，upgrade 没带上（提示词只要求加列和关联，所以不算 FAIL）。如果 P06 实现「按导航取模板」的查询，应在 P06 的迁移里补这个索引。
2. 已知取舍：Role 的 seed 是「并集补齐」，后台手动删掉的默认权限，重跑 seed 会被加回来（编排文件已登记为 P07 的后续事项）。另外 `OperationLog_module_idx` 现在是复合索引的前缀，属于冗余，可以留到以后清理。

## 复现
工作目录 `/workspace/work/.visual/p04v/`：`seedchain.sh`（populated/fresh 两种库各 seed 两次并做一致性校验）、`chain.sh`（dev.db seed → lint/tc/test/build → visual）、`pre.db/post.db/deploy.db`（迁移副本）、`*.cnt`（计数快照）。
