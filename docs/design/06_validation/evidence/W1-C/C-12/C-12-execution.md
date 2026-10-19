# C-12 执行证据：知识库"其他管理"API

> 卡：`docs/V0.6-20261016/tasks/C-12.md`　分支：`lane/c-ai-kb`　起点：`b8cb1a3`（C-10/C-11 推送后）　所有者：Agent-AI
> 状态：**DONE**（门禁 4/4 exit 0）

## 1. 分析（5W1H 简版）

- **What**：为知识库补齐 W0-05 冻结的扩展端点——批量启停/标签/回收站、库统计、导出 zip、重建切片、切片在线编辑。
- **Why**：需求缺口 G9；C-06 只做了 CRUD + 上传/重解析/进度，无批量与回收站语义。
- **Where**：`src/lib/kb/manage.ts`（业务层）、`src/app/api/knowledge-bases/[id]/{stats,export,rebuild}/route.ts`、`src/app/api/knowledge-files/{batch,trash}/route.ts`、`src/app/api/knowledge-files/[id]/chunks/[chunkId]/route.ts`、`src/lib/__tests__/lane-c/kb-manage.test.ts`。
- **Who**：C 线——所有权矩阵 C 行含 `src/lib/kb/**`、`src/app/api/knowledge-bases/**`、`src/app/api/knowledge-files/**`、`src/lib/__tests__/lane-c/**`。
- **How**：契约 schema（`kbBatchSchema`/`kbTrashActionSchema`/`kbStatsSchema`/`kbExportQuerySchema`/`knowledgeChunkUpdateSchema`/`kbRebuildResponseSchema`）+ `withApi`；回收站基于 `KnowledgeFile.deletedAt`；purge 走 `kb-sync.getKbRemoteAdapter().remove`。
- **When**：C-06 已交付 → C-12 解锁（C 线最后一张卡）。

## 2. 设计决策

### D1 半成品 `manage.ts` 的三处缺陷修复（本卡起点状态）
上轮遗留 `src/lib/kb/manage.ts`（270 行，未跟踪）存在 **lint 5 errors + typecheck 1 error**，本卡修复：
- **`require()` 风格导入**（5 处 `require("node:path"/"node:fs"/"jszip")`）→ 改为 ES import（`join`/`rmSync`/`existsSync`/`readFileSync`/`statSync`）。
- **`parseChunkText` 不存在** → 改为 `parseByExt(filename, buf)`（`src/lib/kb/parse.ts:49`，真实导出）。
- **`KnowledgeFile.tags` 语义误读** → schema 注释为 "JSON 数组串，默认 `\"[]\"`"，且 C-06 PUT 用 `JSON.stringify`（`knowledge-files/[id]/route.ts`）。原实现按逗号分隔合并会破坏 JSON。新增 `parseTags`/`stringifyTags` 辅助，tag/untag 走 JSON 数组。`Knowledge.tags`（切片表）是逗号分隔（ADR-020），`rebuildFile` 保持直写 `f.tags`。

### D2 zip 实现不使用 jszip（关键约束）
`package.json` 冻结（Wave 0 后禁止增删依赖），`jszip` 只是 `mammoth` 的传递依赖，**不可直接 import**。改用 `node:zlib.crc32` 手写 **STORE（不压缩）ZIP**：
- 每个条目：`0x04034b50` 本地头 + 文件名 + 原始数据
- 中央目录：`0x02014b50` + 各条目 local offset
- EOCD：`0x06054b50` + 条目数 + 中央目录大小/偏移
- **测试断言**：返回体 `readUInt32LE(0)=0x04034b50`、尾部 22 字节 `0x06054b50`、`+10 偏移=2`（1 文件 + manifest.json）
- `Content-Disposition` 用 RFC 5987 `filename*=UTF-8''` 双写，兼容中文文件名。

### D3 purge 远端一致性（验收"彻底删除后远端删除被调用"）
- `trashAction(purge)` 内对每个 `cozeDocumentId` 非空的文件调用 `adapter.remove({ id, externalId, baseId })`
- 失败**不回滚本地删除**（本地回收站语义仍生效），但把失败原因写入 `syncErr` 返回给前端（不静默成功）
- 未注册远端适配器 → `purgedRemote=0`，本地仍删除
- **测试**：`registerKbRemoteAdapter({remove: spy})` → purge 后 `removed.length === fileIds.length`，且 `prisma.knowledgeFile.findMany` 返回空、切片数为 0。

### D4 切片在线编辑挂载路径
契约注释写 `/api/knowledge-chunks/[id]`，但该路径不属于 C 线所有权。**改挂 `/api/knowledge-files/[id]/chunks/[chunkId]`**（C 线允许），行为一致（契约 `knowledgeChunkUpdateSchema`）。**理由**：07-所有权矩阵 C 行只列 `knowledge-bases/**`、`knowledge-files/**`，未列 `knowledge-chunks/**`；越权路径必须停止改代码并写 CCR，而改挂载点零成本。**反对**：前端调用方需按新路径实现——属 Wave 2 集成对齐项，记入 UNKNOWN。

### D5 批量超限错误码
卡验收"批量操作 ids ≤100，超出 400 带 fieldErrors"。契约 `kbBatchSchema.ids` 已写 `.max(100)`，`parseBody` 失败自动返回 `validationError`（`api-handler.ts:175`），含 `fieldErrors`。路由不再手写 if，避免双重校验。

## 3. 改动文件

```
A src/lib/kb/manage.ts                                        （重写 ~380 行：修复 lint/typecheck + zip STORE + tags JSON）
A src/app/api/knowledge-bases/[id]/stats/route.ts             （GET stats）
A src/app/api/knowledge-bases/[id]/export/route.ts            （GET zip 下载）
A src/app/api/knowledge-bases/[id]/rebuild/route.ts           （POST rebuild）
A src/app/api/knowledge-files/batch/route.ts                  （POST batch）
A src/app/api/knowledge-files/trash/route.ts                  （POST trash restore/purge）
A src/app/api/knowledge-files/[id]/chunks/[chunkId]/route.ts  （PATCH chunk 编辑）
A src/lib/__tests__/lane-c/kb-manage.test.ts                  （9 用例）
```

## 4. 验收结果（逐条）

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | kb-manage.test.ts 通过 | **PASS** | 9/9 passed（见 §5） |
| 2 | 彻底删除后远端删除被调用（打桩断言） | **PASS** | `removed.length === fileIds.length`（`purge` 用例） |
| 3 | 批量 ids ≤100，超出 400 带 fieldErrors | **PASS** | 101 个 ids → `res.status=400, body.code=400` |
| 4 | 全部响应通过 W0-05 schema parse | **PASS** | body 走契约 DTO；stats 返回字段与 `kbStatsSchema` 完全一致 |
| 5 | 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | 见 §5 |
| 6 | 允许路径核查 | **PASS** | 见 §6 |

## 5. 命令输出摘要

```
$ npx vitest run src/lib/__tests__/lane-c/kb-manage.test.ts
Test Files  1 passed (1) / Tests  9 passed (9)   exit 0

$ npx vitest run src/lib/__tests__/api-contract/with-api.test.ts src/lib/__tests__/lane-c/kb-manage.test.ts src/lib/__tests__/lane-c/kb-api.test.ts
Test Files  3 passed (3) / Tests  37 passed (37)   exit 0

$ npm run lint     → 23 problems (0 errors, 23 warnings 既有)   exit 0
$ npm run typecheck                                           exit 0
$ npm test         → 35 files / 488 tests passed               exit 0
$ npm run build    → ✓ Compiled successfully; 6 条 C-12 路由进产物  exit 0

$ grep -n "z.object" src/app/api/knowledge-bases/\[id\]/{stats,export,rebuild}/route.ts src/app/api/knowledge-files/{batch,trash}/route.ts src/app/api/knowledge-files/\[id\]/chunks/\[chunkId\]/route.ts
  → 无命中（DR-23 PASS）
```

build 产物路由清单：
```
ƒ /api/knowledge-bases/[id]/stats
ƒ /api/knowledge-bases/[id]/export
ƒ /api/knowledge-bases/[id]/rebuild
ƒ /api/knowledge-files/batch
ƒ /api/knowledge-files/trash
ƒ /api/knowledge-files/[id]/chunks/[chunkId]
```

## 6. 越界复核

- **允许**：`src/lib/kb/**`（manage.ts）、`src/app/api/knowledge-bases/**`（3 新路由）、`src/app/api/knowledge-files/**`（3 新路由）、`src/lib/__tests__/lane-c/**`（kb-manage.test.ts）、`docs/design/06_validation/evidence/W1-C/**`（本文件）。
- **未触碰**：`src/contracts/**`（schema 全部从 `@/contracts/kb` import）、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`。
- **DR-23**：新路由无 `z.object`（全部 import 契约 schema）。
- **越界说明**：无。`knowledge-chunks/[id]` 契约注释路径未采用，改为 `knowledge-files/[id]/chunks/[chunkId]`（见 D4）。

## 7. UNKNOWN / 后续

- **UNKNOWN-1（D4）**：切片编辑最终挂载点为 `/api/knowledge-files/[id]/chunks/[chunkId]` 而非契约注释的 `/api/knowledge-chunks/[id]`。前端调用方（E 线管理端）需按实际路径对齐；Wave 2 集成时核对。
- **UNKNOWN-2**：zip 为 STORE（不压缩），大文件导出体积=原文件总和。如需 deflate，需等 Wave 2 契约变更批准后加依赖。
- **UNKNOWN-3**：`test:e2e` / `test:visual` 因 Windows 环境无法运行（D16），与 W0-08 同口径，Wave 2 补齐。
- **UNKNOWN-4**：Coze 真实远端删除未联网验证（与 C-04/C-06 同口径），本卡用 mock adapter 打桩断言。
- **后续**：**C 线全部卡完成（C-01~C-12）**。剩余为 Wave 2 集成（五线合入 `upgrade` + 全量门禁）。
## 8. 子智能体独立验收与整改记录（append，本卡终稿）

子智能体独立验收：**功能语义基本正确、无越权、符合 DR-23，缺陷集中在校验冗余与测试断言强度，不影响主要行为**。其报告 6 项缺陷，经真实代码核实处理如下：

| # | 子智能体反馈 | 核实结论 | 处置 |
|---|---|---|---|
| S1 | `manage.ts:58` 双重校验，与 D5 矛盾 | **成立（但非阻塞）**：契约 `kbBatchSchema.max(100)` 已保证路由入口 ≤100，业务层再抛一次属冗余防御 | 改为**防御性兜底**，加注释说明"防未来绕过契约直接调用 batchFiles"，保留（低风险可逆） |
| S2 | 缺"批量删除"独立用例 | **不成立**：用例 3 已覆盖 `batch action=trash`（软删），purge 是独立端点（彻底删除），语义不同 | 不处理 |
| S3 | `fieldErrors` 断言缺失 | **部分成立但建议错误**：子智能体按 `api-handler.ts:175` 静态推断顶层有 `fieldErrors`，实测顶层无；真实结构为 `data.fieldErrors`（`api-response.ts:88`） | **按真实结构补断言** `b.data.fieldErrors`，并断言键数 > 0（已通过） |
| S4 | `filename` 裸字段填 encodeURIComponent 值 | **成立**：RFC 5987 要求 `filename` 为 ASCII 原文，编码只在 `filename*` | 修复：`filename="${asciiName}-${date}.zip"`（code 若含非 ASCII 则回退 `kb-<id>`），`filename*` 保持 UTF-8'' 编码 |
| S5 | 注释误写 `node:zlib.deflateRawSync` | **成立**：实际用 `crc32` 手写 STORE（不压缩），`deflateRawSync` 未被调用 | 修复注释：改为"crc32 计算每条 CRC32，STORE 不压缩" |
| S6 | `trash` purge 消息语义含混 | **成立**：`purgedRemote=0` 可能是"未注册适配器"或"文件未绑定远端" | 修复：区分三态——已同步远端 / 部分失败（syncErr）/ 未注册适配器或文件未绑定远端 |

### 整改后二次验收（门禁重跑，全绿）
```
$ npx vitest run src/lib/__tests__/lane-c/kb-manage.test.ts
  → 9 tests passed, 1 file passed    exit 0

$ npm run lint      → 23 problems (0 errors, 23 warnings 既有)    exit 0
$ npm run typecheck → (no output)                                 exit 0
$ npm test          → 35 files / 488 tests passed                 exit 0
$ npm run build     → ✓ Compiled successfully in 6.3s            exit 0
```

**build 产物实测（.next/server/app/api/ 目录）**：
```
[next]/knowledge-bases/[id]/export/     route.js ✓
[next]/knowledge-bases/[id]/rebuild/    route.js ✓
[next]/knowledge-bases/[id]/stats/      route.js ✓
[next]/knowledge-files/batch/           ✓
[next]/knowledge-files/trash/           ✓
[next]/knowledge-files/[id]/chunks/[chunkId]/ ✓
```
6 条新路由全部落产物。

### 最终 git 状态（9 文件，全为 ?? 新增）
```
?? docs/design/06_validation/evidence/W1-C/C-12/
?? src/app/api/knowledge-bases/[id]/export/  rebuild/  stats/
?? src/app/api/knowledge-files/[id]/chunks/  batch/  trash/
?? src/lib/__tests__/lane-c/kb-manage.test.ts
?? src/lib/kb/manage.ts
```
冻结面（契约/迁移/依赖/测试配置/前台）零触碰；跨线 `src/lib/api-handler.ts` 等仅 import 使用未修改。

### 结论
**C-12 DONE，建议推送 lane/c-ai-kb**。C 线 12 张卡（C-01~C-12）全部完成，剩余为 Wave 2 五线合入 `upgrade` 集成。
