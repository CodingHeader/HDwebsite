# W0-10 执行记录（CCR-1 契约补冻结）

分支 w0/ccr-1（自 5a987be，docs-only 提交链）。执行：本会话（P1 契约员角色）。

## 改动（全部在 allow 内）
- 新增 src/contracts/content-hub.ts（CHANNEL_STATUSES/channelStateSchema/contentHubItemSchema）
- 新增 src/contracts/llm.ts（llmUsageQuery/llmUsageRow/llmProviderOrder）
- resources.ts：publishJobCreateSchema +channels 二选一 refine + scheduledAt 晚于现在；quietHours 收敛 ^([01]\d|2[0-3]):[0-5]\d$
- kb.ts：+7 个扩展 DTO（knowledgeFileUpdate/kbBatch/kbTrashAction/kbStats/kbExportQuery/knowledgeChunkUpdate/kbRebuildResponse）
- settings-registry.ts：+chatGuardRateLimitPerMin/chatGuardSensitiveWords/chatGuardBlacklist（group=llm，扁平键）
- definitions/route.ts：GROUP_LABELS +kb
- index.ts：导出 content-hub/llm
- 测试：w0-contracts.test.ts 66 例（+24 G 系列）、settings-registry.test.ts 9 例（+3 CCR-1）
- ADR-034（派生字段、enable/disable 映射、偏差 D1 用量无费用/耗时、D2 扁平键、D3 旧 channel 保留）

## 验收结果
| 项 | 结果 |
|---|---|
| 契约测试 | 75/75 PASS（≥24 新增） |
| 点分键 grep chatGuard\. | 空 ✅ |
| settings-registry chatGuard 计数 | 3 ✅ |
| contracts costCent/latencyMs grep | 空 ✅ |
| 通用门禁 | lint/typecheck/test/build 全 EXIT=0（gate-ccr1.log） |
| Linux e2e | 8/8 PASS 1.3m（e2e-ccr1.log，旧单 channel 兼容） |
