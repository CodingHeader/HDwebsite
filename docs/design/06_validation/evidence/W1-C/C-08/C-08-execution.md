# C-08 执行证据：采集→目标库（ingestCollectItem 读 CollectSource.knowledgeBaseId / 默认 collect；G10 双向回链；Coze(txt) 推送到对应 dataset）

> 执行线：C AI 与知识库　分支：`lane/c-ai-kb`　所有者：Agent-AI　工作包：WPC.8
> 日期：2026-10-19（Asia/Shanghai）　档位：sonnect
> 起点：`736bc56`（C-07 交付后）　本卡提交：见文末

## 1. 5W1H 与深度分析

### What（事实）

- 任务要求：`ingestCollectItem` 内部读取 `CollectSource.knowledgeBaseId`；未指定时落到 seed 的 `collect` 采集资讯库；mock Coze 断言收到 `file_type=txt`；V0.3（G10）`KnowledgeFile.collectItemId` 指回来源 CollectItem，双向可查。
- 接手时工作区状态：`src/lib/kb-sync.ts` 已有未提交的 `resolveCollectBaseId` 雏形（`CollectSource.knowledgeBaseId` → `KnowledgeBase.code="collect"`），但存在三个缺陷：
  1. **G10 未落地**：`ingestCollectItem` 只创建 `Knowledge` 行，从未创建 `KnowledgeFile`，`KnowledgeFile.collectItemId` 恒为 NULL → REQ-F-006 AC60 / V0.6 缺口审计 `A5-2` 仍为「部分实现」。
  2. **Coze dataset 解析错误**：`kb/coze.ts:makeCozeBackend.pushEntry` 使用 `doc.externalId ?? String(doc.baseId ?? "default")`，把本端 `KnowledgeBase.id`（或 `default`）当作 Coze `dataset_id` 提交 → 违反 ADR-025 §6「推送到**对应** Coze dataset」，真实环境下采集内容会推到不存在的 `default` dataset。
  3. **无 C-08 单测**：`collect-autokb.test.ts` 只有 P06 的 4 条旧断言，未覆盖 baseId 落位、G10 回链、Coze 请求形态。

### Why（动机）

- REQ-F-006 明确要求采集内容按采集源配置的 `targetBaseId` 落库 + 回链；V0.6 需求缺口审计把 A5-2（KnowledgeFile.collectItemId 回链）标为「部分实现，无反向字段、无 UI 跳转」→ C-08 是补齐该缺口的后端负责卡。
- ADR-025 §6：采集条目以 `txt` 类型推送到**对应** Coze dataset；旧实现把本端主键当 dataset_id，属静默错误（推送成功但内容落到错的库）。
- E-11 的「文件详情跳转采集条目」以 `KnowledgeFile.collectItemId` 为数据源，C-08 不回写则 E-11 无法验收。

### Where / When

- 涉及文件：`src/lib/kb-sync.ts`、`src/lib/kb/coze.ts`、`src/lib/kb/types.ts`、`src/lib/__tests__/collect-autokb.test.ts`。
- 依赖前置：C-04（Coze 客户端）、C-05（本地检索）、C-07（已交付）；W0-06（迁移已加 `collectItemId` 列）。
- 边界：`collect-engine.ts` 属 D 线，**不改**（验收要求「不改 collect-engine.ts」）。

### Who

- 执行者：Agent-AI（本轮主代理直接实现 + 子智能体独立验收）。
- 调用方：`collect-engine.afterItemCreated`（autoToKb 触发）、`api/collect-items/[id]` PATCH approve 后补建。
- 下游消费：`E-11`（文件详情跳转采集条目）。

### How

1. `kb-sync.ts`：新增 `resolveCollectBaseId`（源指定 → 默认 collect）、`cozeDatasetIdOf`（`KnowledgeBase.cozeDatasetId`）、`upsertCollectFile`（镜像 KnowledgeFile，`collectItemId` 回链，sha256 去重列）。
2. `ingestCollectItem`：解析 baseId → 写 `Knowledge.baseId`；创建后 `upsertCollectFile`（失败仅 console.error，不阻塞入库）。
3. `kb/types.ts`：`KbDocument` 增加可选 `datasetId`（DTO 边界，推文档时优先）。
4. `kb/coze.ts`：`pushEntry` 改为 `datasetId ?? externalId`，缺失时抛错（不 fallback 到本端主键或 `default`）——保证「不静默成功」。
5. `kb-sync.getKbRemoteAdapter().push`：把 `cozeDatasetIdOf(k.baseId)` 作为 `datasetId` 传入。
6. `collect-autokb.test.ts`：重写为 6 用例（含 4 条旧断言等价），覆盖 C-08 三项验收 + mock Coze 请求形态。
7. 类型兼容：`ingestCollectItem` 形参 `sourceId?`（collect-engine 的运行时对象实际带该字段，但类型未声明——不改 D 线文件）。

### What if

- 若 `baseId` 为 null（既无源指定也无默认库）：`upsertCollectFile` 直接返回 null，`Knowledge.baseId` 为 null；反向回链仍由 `CollectItem.knowledgeId` 承担。
- 若目标库未绑定 `cozeDatasetId`：推送抛错 → `processKbSyncQueue` 记 `syncStatus=failed + syncErr`，**不会**推到 `default` dataset（避免污染其他库）。
- 若 `sourceId` 缺失（老调用方）：走默认 collect 库。

## 2. 关键证据（代码行）

- `src/lib/kb-sync.ts`：`resolveCollectBaseId`（源 `knowledgeBaseId` → `KnowledgeBase.code=collect`）、`cozeDatasetIdOf`（`KnowledgeBase.cozeDatasetId`）、`upsertCollectFile`（`collectItemId: item.id`）、`ingestCollectItem`（`baseId` 写入 `Knowledge.create`，随后 `upsertCollectFile`）、`getKbRemoteAdapter().push`（`datasetId: await cozeDatasetIdOf(k.baseId)`）。
- `src/lib/kb/coze.ts:pushEntry`：`const datasetId = doc.datasetId ?? doc.externalId; if (!datasetId) throw ...`。
- `src/lib/kb/types.ts`：`KbDocument.datasetId?: string | null`。
- `src/lib/__tests__/collect-autokb.test.ts`：6 用例。

## 3. 验收逐条结果

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | collect-autokb.test.ts：条目 baseId = 源指定库或默认库 | **PASS** | 用例 1（默认 collect）、用例 2（源指定 custom 优先）均断言 `Knowledge.baseId` 与 `KnowledgeFile.baseId` |
| 2 | mock Coze 收到 file_type=txt | **PASS** | 用例 3：`seen` 捕获 body，`every(s => s.file_type === "txt")`；Coze 请求 URL/Header 已有 C-04 单测覆盖，本卡聚焦 body 形态 |
| 3 | V0.3（G10）：KnowledgeFile.collectItemId 指回来源 CollectItem，双向可查 | **PASS** | 用例 1：`knowledgeFile.findFirst({ where: { collectItemId: it.id } })` 非空；反向 `collectItem.findUnique({ where: { id: files[0].collectItemId } }).knowledgeId` 非空 |
| 4 | 不改 collect-engine.ts | **PASS** | `git diff --name-only` 无 collect-engine.ts；D 线文件零改动 |
| 5 | 通用门禁 | **PASS** | `npm run lint` 0 errors（23 warnings 全为既有）；`npm run typecheck` exit 0；`npm test` 31 files / 451 tests 全绿；`npm run build` exit 0 |
| 6 | 允许路径内 diff | **PASS** | 4 文件全在 C-08 允许修改列表（kb-sync.ts、kb/**、collect-autokb.test.ts）；未触碰 contracts / prisma / package.json / vitest 配置 / 前台 |

## 4. 命令输出摘要

```bash
$ npx vitest run src/lib/__tests__/collect-autokb.test.ts
 ✓ src/lib/__tests__/collect-autokb.test.ts (6 tests) 2748ms
 Test Files  1 passed (1)
      Tests  6 passed (6)

$ npx vitest run src/lib/__tests__/lane-c
 Test Files  8 passed (8)     Tests  111 passed (111)

$ npm run lint        # exit 0，0 errors
$ npm run typecheck   # exit 0
$ npm test            # 31 files / 451 tests passed
$ npm run build       # exit 0（产物含 /api/knowledge-* 路由）
```

## 5. 子智能体独立验收

独立验收结论：**通过（含建议）**。
- 三条 C-08 验收在代码与单测层面证据完整（目标库解析优先源指定、回退 collect；mock Coze 收到 file_type=txt 且 dataset_id 取目标库 cozeDatasetId；G10 双向回链正向 + 反向可查）。
- 其 5/6/7（门禁、越界、契约未改）因验收者工具集不含 bash/git，标 UNKNOWN，由执行证据自报 + 本轮主代理实际复跑（见 §4）补充。
- 建议整改项已在同一轮内修复：
  1. **A（真实缺陷）**：`upsertCollectFile` 更新分支原只写 `filename/tags`，未刷新 `sha256/size`——审核通过后 `contentMd` 变化会导致去重主键 `@@unique([baseId, sha256])` 与 Knowledge 内容脱钩。已修：更新路径同时写 `sha256: sha256Of(\`${item.id}:${content}\`)` 与 `size`。
  2. **D（C-04 遗留）**：`makeCozeBackend.pushDocument` 原硬编码 `String(doc.baseId ?? "default")`；已修：改为 `datasetId ?? externalId`，缺失抛错，与 pushEntry 同口径。`removeDocument/getDocumentStatus` 因接口仅收 `externalId`、无 dataset 上下文，加 TODO 标注待 C-04/C-06 收口。
  3. **E**：`collect/<id>.md` 占位 `storagePath` 的导出/重解析提示由 E-11 处理（本卡登记）。

整改后复跑：`npx vitest run src/lib/__tests__/lane-c src/lib/__tests__/collect-autokb.test.ts` → 9 files / 117 tests passed；门禁 4/4 全绿。

## 6. UNKNOWN / 待确认

- **Coze 真实端点联调**：环境无外网，未做真实 `POST /open_api/knowledge/document/create` 联调；请求形态（URL/Header/body）由 mock fetch 契约测试覆盖，与 C-04/C-06 同口径。真实 `kbCozeProviderId`/`kbCozeSpaceId` 配置后需在 Wave 2 联调复验。
- **KnowledgeFile 镜像的 `storagePath` 为 `collect/<id>.md` 占位**：采集条目无真实磁盘文件；E-11 的「导出/重解析」若点击该镜像文件需提示重新上传（后续 E-11 处理）。

## 7. 越界复核

`git diff --name-only HEAD`：
```
src/lib/__tests__/collect-autokb.test.ts
src/lib/kb-sync.ts
src/lib/kb/coze.ts
src/lib/kb/types.ts
```
无 `src/app/(web)/**`、无 `prisma/**`、无 `src/contracts/**`、无 `package.json`/锁文件、无 `vitest.config.ts`、无 D 线文件（collect-engine.ts）。

## 8. 完成度

- 代码实现：100%（kb-sync 三项新增 + coze 推送口径修正 + DTO 扩展）
- 测试覆盖：100%（3 项验收各有 1 条正向断言 + 反向可查）
- 门禁：4/4 全绿
- 越界：0
- UNKNOWN：Coze 真实联调（环境限制）

## 9. 提交

见 `git log --oneline lane/c-ai-kb` 最新两笔：`feat(C-08)` + `docs(C-08)`。