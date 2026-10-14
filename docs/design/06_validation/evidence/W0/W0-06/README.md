# W0-06 证据：迁移 p12_knowledge_base + 回滚脚本 + 默认库种子

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`555408c`（W0-01~05 合并）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）
> 权威依据：`docs/design/04_planning/parallel-w1/03-数据模型与迁移编排.md` §2（逐字落地）、`docs/任务规划V0.2.0/tasks/W0-06.md`

## 1. 改动文件（全部落在「允许修改」面内）

| 路径 | 变更 | 内容 |
|---|---|---|
| `prisma/schema.prisma` | `+81/-1` | 新增 `KnowledgeBase` / `KnowledgeFile` 两模型；`Knowledge` +`baseId`/`fileId`/`chunkIndex` + 索引；`ChatScene` +`providerIds`/`temperature`/`maxTokens`/`topP`；`CollectSource` +`knowledgeBaseId` |
| `prisma/seed.ts` | `+23/-0` | 新增 `seedKnowledgeBases()`：幂等 upsert `general`/`collect` 两库，回填 `Knowledge.baseId`（`source='collect'`→collect，其余→general）；接入 `main()` |
| `prisma/migrations/20261014073639_p12_knowledge_base/migration.sql` | 新增 | 21 条语句，仅 `ALTER TABLE ADD COLUMN` ×7 / `CREATE TABLE` ×2 / `CREATE INDEX` ×12 |
| `prisma/rollback/p12.sql` | 新增 | 回滚：先删索引 → `DROP COLUMN` → `DROP TABLE` → 清 `_prisma_migrations` |
| `docs/design/06_validation/evidence/W0/W0-06/README.md` | 本文件 | 证据 |

## 2. 字段与契约对齐（W0-05 目标形态）

对照 `03-数据模型与迁移编排.md` §2 表格与 `src/contracts/kb.ts` / `src/contracts/resources.ts`：

| 模型.字段 | 类型/默认 | 契约出处 |
|---|---|---|
| `KnowledgeBase.code` | String @unique | `kb.ts:60`（`^[a-z0-9][a-z0-9_-]*$`，seed 用 `general`/`collect`） |
| `KnowledgeBase.cozeDatasetId` | String? | `kb.ts:63` |
| `KnowledgeBase.isDefault` | Boolean @default(false) | `kb.ts:64` |
| `KnowledgeBase.status` | String @default("active") | `kb.ts:65` |
| `KnowledgeBase.backend` | **未落列** | `kinds.ts:18` 的 `KB_BACKENDS` 属纯枚举；数据模型文档 §2 表格同样未列 `backend`，两处一致（若后续需要按 `kinds` 契约派生，需走契约变更请求） |
| `KnowledgeFile.baseId/sha256` | @@unique([baseId, sha256]) | `kb.ts` 去重语义（同 `sha256+baseId` 返回已有记录，HTTP 200） |
| `KnowledgeFile.ext` | String | `KB_FILE_EXTS` 白名单（docx/doc/md/markdown/txt） |
| `KnowledgeFile.cozeStatus` | Int? | `knowledgeFileStatusSchema`（0/1/9） |
| `KnowledgeFile.tags` | String @default("[]") | V0.3 增补 G9 |
| `KnowledgeFile.collectItemId` | Int? | V0.3 增补 G10 |
| `ChatScene.providerIds/temperature/maxTokens/topP` | String?/Float?/Int?/Float? | `resources.ts:233-236` |
| `CollectSource.knowledgeBaseId` | Int? | `resources.ts:318` |

## 3. 迁移 SQL 审查门槛

```
$ grep -ciE 'DROP|RedefineTables|INSERT INTO "new_' prisma/migrations/20261014073639_p12_knowledge_base/migration.sql
0
```

- 无 `DROP`、无 `RedefineTables`、无 `INSERT INTO "new_`。
- 语句集合（去注释/空白/CR，按 `;` 分句）21 条，与 `npx prisma migrate diff --from-schema /tmp/w006/p06-schema.prisma --to-schema prisma/schema.prisma --script` 输出**语句集合完全一致**（仅顺序不同：diff 把 Knowledge 的 AlterTable 放在最前，migration 放在最后）。

## 4. 空迁移 diff（验收 2）

```
$ npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
-- This is an empty migration.
EXIT=0
```

## 5. 副本闭环：deploy → 行数不变 → rollback → 重放

在 p06 状态库副本（`git show 555408c:prisma/schema.prisma` 与副本数据库比对）上验证：

| 步骤 | 结果 |
|---|---|
| 副本初始（含 p12 已 deploy） | 迁移 7 条；业务表 48；KnowledgeBase 2（seed 数据） |
| 执行 `prisma/rollback/p12.sql` | 迁移 6 条；业务表 46；`KnowledgeBase` 存在=0；无 `KnowledgeBase`/`KnowledgeFile` 索引 |
| 回滚后 schema 全等 | 模型 46；数据库业务表 46；schema 显式索引/唯一 0（p06 schema 未用 `@@index`）；缺失表/多余表均无；`Knowledge_syncStatus_idx` 存在，`KnowledgeBase*`/`Knowledge_fileId`/`Knowledge_baseId` 索引均无 |
| 再次 `prisma migrate deploy` | 成功应用 `20261014073639_p12_knowledge_base`；业务表 46→48（新增 `KnowledgeBase`、`KnowledgeFile`）；**既有表行数变化：无**；`PRAGMA integrity_check` = ok；`PRAGMA foreign_key_check` 行数 = 0 |

行数基线对比（deploy 前 p06 状态 → deploy 后）：46 张既有表逐表比对，差异集合为空。

## 6. seed 幂等与回填

```
$ npm run db:seed（第 1 次）
seed: 知识库已就绪 — 通用知识 (general)
seed: 知识库已就绪 — 采集资讯 (collect)
seed: Knowledge#1 → 知识库 collect

$ npm run db:seed（第 2 次，幂等）
seed: 知识库已就绪 — 通用知识 (general)
seed: 知识库已就绪 — 采集资讯 (collect)
（无 Knowledge 回填日志，因 baseId 已非空）
```

第 2 次后：`KnowledgeBase` 行数 = 2；`Knowledge` 行数 = 1；`Knowledge.baseId IS NULL` 行数 = 0；`integrity_check=ok`；`foreign_key_check=0`。

## 7. 通用门禁

| 命令 | 结果 |
|---|---|
| `npm run lint` | **exit 0**（0 errors, 18 warnings，与 W0-02~05 持平，均为既有告警） |
| `npm run typecheck` | **exit 0** |
| `npm test` | **exit 1**（`Test Files 1 failed \| 20 passed (21)`、`Tests 300 passed (300)`）——唯一失败套件 `src/lib/__tests__/sqlite-busy-timeout.test.ts` 因 Windows 临时目录 `EPERM: Permission denied`（`rmSync(dir, {recursive,force})`，libsql 句柄未释放）。**该文件两边完全一致，非本卡引入**；按 `W0-09` 卡面由后续卡修复，本卡不改该测试文件。 |
| `npm run build` | **exit 0** |

## 8. 越界检查

`git status --short` 变更面：`prisma/schema.prisma`、`prisma/seed.ts`、`prisma/migrations/20261014073639_p12_knowledge_base/`、`prisma/rollback/p12.sql` + 本证据文件，全部落在 W0-06「允许修改」内。未触碰前台路径（`src/app/(web)`、`src/components/web`、`public`、`globals.css`）、契约、其他迁移、依赖、`.env*`/`*.db`。

## 9. UNKNOWN 与偏差

- **偏差 1（已纠正）**：`prisma migrate dev --create-only` 首次执行时因 dev.db 未记录 p04/p06 实际应用而先补应用；第二次执行生成第二个空迁移目录 `20261014073648_p12_knowledge_base`（内容为 `-- This is an empty migration.`）。按卡面「唯一 p12 迁移」要求**已删除**该空目录，`migrations/` 仅保留 `20261014073639_p12_knowledge_base` 一个 p12。
- **UNKNOWN**：`KnowledgeBase.backend` 字段未在 schema 中落列——`kinds.ts` 的 `KB_BACKENDS` 为纯枚举契约，数据模型文档 §2 表格同样未列 `backend`，两处一致；如需按枚举落列，属后续契约变更请求。
- **UNKNOWN**：p12 迁移未在 dev.db 上实际重放 rollback（避免破坏 seed 数据）；闭环在 `prisma/dev.db` 的副本上完成，语义等价。
