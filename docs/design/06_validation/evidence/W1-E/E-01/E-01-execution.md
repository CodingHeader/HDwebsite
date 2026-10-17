# E-01 执行记录：表单规格对齐冻结契约 + spec-drift 护栏

分支 `lane/e-manager-pages`（合入 A 线最新后）。执行：本会话（Hark-E 角色）。

## 改动（全部在 allow 内，2 文件）

- `src/components/manager/resource-meta/__tests__/spec-drift.test.ts`（新，6 用例）：三组护栏——
  1. content-items 状态选项 ⊆ 冻结契约枚举（draft/pending_review/offline）
  2. collect-sources 冻结契约字段（autoToKb/autoApprove/knowledgeBaseId）在 spec 中声明或白名单
  3. chat-scenes 冻结契约字段（temperature/maxTokens/topP/llmProviderId）在 spec 中声明或白名单
  TDD 灰度：红灯 3 失败（漂移全部暴露）→ 修正后绿灯 6/6。
- `src/components/manager/crud-specs.tsx`：三处修正——
  1. **content-items** status 选项去掉 approved/published（冻结契约只接受 draft/pending_review/offline；审核走专用端点）
  2. **collect-sources** 补 3 字段：autoToKb（自动入知识库，默认开）、autoApprove（visibleTo:"super" 仅超管可见可改）、knowledgeBaseId（采集目标库）；cron 补 help"留空=仅手动执行"
  3. **chat-scenes** 补 4 字段：llmProviderId（专属模型）、temperature、maxTokens、topP（场景参数）

## 验收结果

| 项 | 结果 |
|---|---|
| spec-drift.test.ts | **6/6 PASS**（白名单每项附理由在字段 help 中） |
| 全部 manager 组件测试 | 23/23 PASS（4 文件） |
| typecheck | 0 ✅ |
| e2e collect-publish | 9/9（A-07 的 Windows 运行同基线；E-01 的 spec 修正后需复跑确认） |
| 非超管看不到 autoApprove | visibleTo:"super"（ADR-028/W0-04 机制，组件层已实现——SchemaForm visibleFields 过滤）✅ |
| 越界检查 | 2 文件 ⊆ allow ✅ |
