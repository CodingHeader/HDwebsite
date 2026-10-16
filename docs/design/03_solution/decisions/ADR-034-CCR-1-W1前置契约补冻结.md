# ADR-034 · CCR-1：W1 前置契约补冻结（W0-10，2026-10-16）

> 状态：已采纳。来源：`18-V0.6-W0过闸复核与统一规划.md` §4 契约冻结包；V0.6-W0 交付独立核验 F6（W0-05 未冻结 G 系列 DTO）。
> 执行卡：W0-10（分支 `w0/ccr-1`）。冻结 tag：`w1-base-ccr-1`（W0-13 打上后生效）。

## 1. 背景

V0.6 独立核验发现（F6）：W0-05 按 V0.2 包执行，V0.3 对 G 系列的增补（渠道状态、多渠道发布、LLM 用量与排序、知识库管理扩展、knowledgeFile 更新、客服风控键）未进入冻结面。B-07、C-10、C-11、C-12、D-04、E-09、E-10、E-11 八张卡依赖这些 DTO——若不在 W1 开工前补冻结，四条线都要中途走 CCR。

## 2. 决策

### 2.1 新增契约文件

- `src/contracts/content-hub.ts`：`CHANNEL_STATUSES`（数组唯一源 = `ContentChannel.status` 列取值）、`channelStateSchema`、`contentHubItemSchema`。消费卡：B-07、E-09。
- `src/contracts/llm.ts`：`llmUsageQuerySchema`（groupBy=provider|day、区间 ≤92 天）、`llmUsageRowSchema`、`llmProviderOrderSchema`（1~50 不重复）。消费卡：C-11、E-10。

### 2.2 既有契约扩展

- `resources.ts` `publishJobCreateSchema`：新增 `channels: channelKind[]（1~2、去重）`，与旧单 `channel` 二选一（refine"二者恰一"）；`scheduledAt` 必须晚于当前（refine"定时时间必须晚于现在"）。旧单 channel 保留（e2e collect-publish 走旧字段，必须保持 8/8）。
- `resources.ts` `notifyRuleUpdateSchema.quietHours`：范围收敛为 `^([01]\d|2[0-3]):[0-5]\d$`（0..23/0..59）；跨零点允许（start > end = 跨夜）；规则级优先于全局 `notifyQuietHours`（JSDoc）。
- `kb.ts`：`knowledgeFileUpdateSchema{tags?}`、`kbBatchSchema{ids 1..100, action: enable|disable|tag|untag|trash, tags?}`、`kbTrashActionSchema{ids, action: restore|purge}`、`kbStatsSchema{baseId, files, chunks, trash, cozeOk, cozeFailed, lastSyncAt}`、`kbExportQuerySchema{baseId, includeTrash?}`、`knowledgeChunkUpdateSchema{content 1..20000}`、`kbRebuildResponseSchema{jobId}`。消费卡：C-12、E-04、E-11。

### 2.3 设置键（settings-registry.ts，仅加法）

- `chatGuardRateLimitPerMin`（number，默认 20）、`chatGuardSensitiveWords`（"[]"）、`chatGuardBlacklist`（"[]"），group=llm，全部 isPublic=false。扁平 key（ADR-009）；JSON 数组串存储由 `jsonifyFields` 接线（C-07 同款）。
- `definitions/route.ts` GROUP_LABELS 增 `kb: "知识库"`。

## 3. 派生字段与映射（本 ADR 的核心登记）

| 字段 | 数据来源列（均为 schema.prisma 现有列） | 组装方 |
|---|---|---|
| `channelState.scheduledAt` | `PublishJob.scheduledAt`（该渠道最近一条） | B-07 服务端 |
| `channelState.publishedAt` | `PublishJob.publishedAt` | B-07 服务端 |
| `channelState.externalUrl` | `PublishJob.result` / 公众号外链回写 | B-07 服务端 |
| `channelState.accountId` | `ContentChannel.accountId`（官网为 null） | B-07 服务端 |
| `kbStats.lastSyncAt` | `Knowledge.syncedAt` 最大值（无记录为 null） | C-12 服务端 |
| `kbBatch.enable/disable` | `Knowledge.status`（按 `Knowledge.fileId` 批量设 active/inactive）；**KnowledgeFile 无 enabled 列，不加字段** | C-12 服务端 |
| `kbBatch.trash` | `KnowledgeFile.deletedAt` | C-12 服务端 |

## 4. 偏差登记

| # | 偏差 | 说明 | 后续 |
|---|---|---|---|
| D1 | LLM 用量**不含费用与耗时列**（`llmUsageRow` 只有 calls/tokensIn/tokensOut/failures） | LLMUsage 表无 costCent/latencyMsSum 列；REQ-F-010 AC6"成败与耗时"的耗时项记偏差；V0.3 增补曾写 `costCent/promptTokens`，以表为准（X7） | 如必须 → 迁移 p13 ADD COLUMN，需 K8 裁决 + 重排迁移编排；默认接受偏差 |
| D2 | `chatGuard.*` 以**扁平键**注册 | V0.3 增补曾写点分键（X8）；ADR-009 / settings-registry.ts:3 禁止点分键 | 无 |
| D3 | `publishJobCreateSchema` 保留旧单 `channel` | 兼容 e2e collect-publish 与既有调用；B-07 服务端把 channel 规范化为 [channel] | W2 收口时再评估收敛 |

## 5. 影响与验证

- 契约自检（规划 §4）：前端只凭契约能写 E-09/E-10/E-11 调用层 → 是；后端能实现 B-07/C-11/C-12 → 是；无新表 → 是；错误码覆盖批量越界/重复 id/无权限/定时早于现在 → 是；viewer 越权在契约③ → 是。
- 验证：`npx vitest run src/lib/__tests__/w0-contracts.test.ts src/lib/__tests__/settings-registry.test.ts`（75 例全绿，新增 ≥24）；通用门禁 4 项；Linux e2e 8/8。
- 落地前，依赖这些 DTO 的 8 张卡不得开工（依赖已改为 W0-13）。
