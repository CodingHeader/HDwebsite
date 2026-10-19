# C-06-execution.md —— 知识库 API：库 CRUD+同步、文件上传三重校验/列表/删除/重解析/进度、kb/test 扩 baseIds/topK

> 执行线 C · 分支 `lane/c-ai-kb` · 起点 `c5fc3f9`（C-05 完成）
> 状态：**已实现 + 门禁 PASS**（含子智能体独立验收；命令级证据见 §4）

## 1. 交付内容

新增/修改（全部落在 C-06 允许修改路径内）：

| 文件 | 说明 |
|---|---|
| `src/lib/kb/ingest.ts` | **文件入库管线**：checkIngestFile（≤10MB + 三重校验）/ ingestFile（sha256 去重 + 落盘 `kbDir()/<baseId>/<sha>.<ext>` + 解析切片 + 事务）/ reparseFile / deleteFileCascade（事务删切片 + 尽力删盘） |
| `src/lib/kb/bases.ts` | **库级操作**：createBaseWithSync（Coze 未配置 → 记 syncErr 不抛错）/ deleteBaseCascade（级联清文件与孤儿切片）/ syncKnowledgeQueue |
| `src/lib/kb/coze.ts` | 新增 `loadCozeKbConfig()`（读 kbCozeProviderId/kbCozeSpaceId → PAT+spaceId；未配置/解密失败返 null） |
| `src/app/api/knowledge-bases/route.ts` | GET 列表 / POST 创建（knowledgeBaseCreateSchema；建库时同步 Coze dataset） |
| `src/app/api/knowledge-bases/[id]/route.ts` | GET / PUT / DELETE（级联） |
| `src/app/api/knowledge-bases/sync/route.ts` | POST 触发同步队列（processKbSyncQueue） |
| `src/app/api/knowledge-files/route.ts` | GET 列表（默认排除 deletedAt）/ POST multipart 上传（字段 `files`，≤10 个，全量预校验） |
| `src/app/api/knowledge-files/[id]/route.ts` | GET / PUT（仅 tags）/ DELETE（级联） |
| `src/app/api/knowledge-files/[id]/reparse/route.ts` | POST 重解析（重读磁盘原文 → 重建切片） |
| `src/app/api/knowledge-files/[id]/progress/route.ts` | GET 进度（本地 localParse/chunkCount + Coze 实时状态；Coze 未配置 → error 不抛错） |
| `src/app/api/kb/test/route.ts` | **删除内联 z.object**，改用契约 `kbSearchRequestSchema`；本地轨改走 C-05 `searchLocalWeighted`（baseIds/topK） |
| `src/lib/__tests__/lane-c/kb-api.test.ts` | 21 条路由测试（api-contract harness + 临时 SQLite + 临时 DATA_DIR） |

## 2. 关键设计决策

- **上传返回码**：新建 → 201；全批均为重复（同 `baseId+sha256`）→ 200（对齐契约头注释"重复上传返回已有记录，HTTP 200"）。实现见 `knowledge-files/route.ts` 尾部 `allExisting` 分支。
- **Coze 降级**：`bases.ts` 建库、`progress/route.ts` 进度均走"未配置 → 记录 syncErr/error，不抛错"，与 C-04 的 `configureCozeBackendFromSettings` 口径一致。
- **kb/test 双轨**：本地轨 `searchLocalWeighted(query, { tags, baseIds, take: topK })`；Coze 轨 `searchViaCoze(query)`（契约 `baseIds/topK` 仅供本地轨，Coze 轨不参与库过滤——设计口径，见子智能体建议 4）。
- **去重**：`prisma.knowledgeFile.findUnique({ where: { baseId_sha256 } })`，命中直接返回已有记录，不落盘、不重复解析。

## 3. 子智能体独立验收结论

子智能体（只读，无 bash）报告：**代码级验收 PASS**，无阻塞性代码缺陷；命令级验收因工具限制标 UNKNOWN，要求主 Agent 实机补齐。其建议已被采纳：

| 建议 | 处理 |
|---|---|
| 5. `.docx` 成功路径未测 | **已补**：`kb-api.test.ts` 新增最小 docx（zip 手工构造）上传用例，断言 201 + localParse=ok + chunkCount>0 |
| 3. `.md/.txt/.docx` 返回码口径 200 vs 201 | **已澄清**：新建 201、全重复 200；测试断言与实现一致 |
| 4. Coze 轨不参与 baseIds/topK | 属契约设计，本卡不改变，已在 §2 注明 |
| 2. 允许路径清单差异 | `src/app/api/knowledge/**`、`src/lib/crud-resources/kb-ai.ts` 属"允许但未使用"路径，本卡未改动，不构成越界 |

## 4. 门禁与命令证据（全部 exit 0）

```bash
$ npx vitest run src/lib/__tests__/lane-c/kb-api.test.ts
  Test Files  1 passed (1)
       Tests  21 passed (21)
  Duration    1.2s
  EXIT=0

$ npm run lint
  ✖ 20 problems (0 errors, 20 warnings)   # 全部为既有非本卡文件 warning
  EXIT=0

$ npm run typecheck
  tsc --noEmit  → 0 errors
  EXIT=0

$ npm test
  Test Files  29 passed (29)
       Tests  408 passed (408)
  EXIT=0

$ npm run build
  Route (app)
  ├ ƒ /api/kb/test
  ├ ƒ /api/knowledge-bases
  ├ ƒ /api/knowledge-bases/[id]
  ├ ƒ /api/knowledge-bases/sync
  ├ ƒ /api/knowledge-files
  ├ ƒ /api/knowledge-files/[id]
  ├ ƒ /api/knowledge-files/[id]/progress
  ├ ƒ /api/knowledge-files/[id]/reparse
  EXIT=0
```

## 5. 验收标准逐条结果

| # | 标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | kb-api.test.ts 全绿 | **PASS** | 21 passed；覆盖 400（.pdf/.png/.jpg/.exe/>10MB/超数量/空查询/topK 越界/code 不合法）、201（.md/.txt/.docx）、200（全重复）、401/403/404、级联删除、磁盘落盘、kb/test baseIds/topK |
| 2 | `grep -n "z.object" src/app/api/kb/test/route.ts` 为空 | **PASS** | grep 无匹配；route.ts 改用 `kbSearchRequestSchema`（DR-23） |
| 3 | 通用门禁 4 项 exit 0 | **PASS** | 见 §4 原始命令输出摘要（lint 0 error / typecheck 0 / test 408 / build exit 0） |
| 4 | 越界检查 | **PASS** | `git status --short` 改动仅：`src/app/api/kb/test/route.ts`、`src/lib/kb/coze.ts`（修改）+ `src/app/api/knowledge-bases/**`、`src/app/api/knowledge-files/**`、`src/lib/kb/{bases,ingest}.ts`、`src/lib/__tests__/lane-c/kb-api.test.ts`（新增）；未触碰 `src/contracts/**`、`prisma/**`、`package.json`、前台（`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`） |

## 6. 未覆盖 / UNKNOWN

- **Coze 真实联调**：`createDataset` / `getDocumentStatus` 端点路径未联网复核（环境无外网）。本卡在无凭证时走降级路径（已测），真实联调待 C-12 / W2 阶段补。
- **`.doc` 成功路径**：本地解析为 `skipped`（ADR-025 无纯 JS 方案），本卡不测其 chunkCount>0，仅保证 201 + localParse=skipped。
- **e2e**：知识库 e2e（e-knowledge / e-kb-manage）由 E-04/E-11/W2-05 消费，本卡不跑。

## 7. 复现步骤

```bash
git checkout lane/c-ai-kb
npx vitest run src/lib/__tests__/lane-c/kb-api.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```

一周后的执行者只需这三行即可复现全部验收结论。