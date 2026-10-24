# STEP S3（内容中枢 UI）

## V11-HUB-01 内容中枢编辑/新建/审核界面（Hark，大）
目标：补齐编辑、新建、提交审核、审核（通过/拒绝）界面，接通 /review 端点
步骤：现状盘点：内容中枢页面与 /api/content-items 端点能力对照；补编辑/新建表单（复用管理端规范组件）与「提交审核」动作；审核界面（通过/拒绝+理由）调 /review；e2e：新建→提交→审核通过/拒绝 闭环
验收：UI 全流程可用（e2e 闭环）；权限口径不变（content:edit / 审核权独享 ADR-017）

## V11-HUB-02 预览渲染、渠道状态机与 externalId 契约（Hark，中）
目标：预览走 MarkdownRenderer；渠道状态补 scheduled/publishing 写入；externalId 契约变更（CCR-1 已预批）
步骤：预览组件替换为 MarkdownRenderer（与前台同管线）；发布执行器在排队/执行期写入 scheduled/publishing 状态（渠道状态表）；契约最小增量：内容条目补 externalId 字段（CCR-1：用户在 V1.1 指令中已预批），契约测试同步
验收：预览与前台渲染一致（抽查）；状态机含 scheduled/publishing 且可观测；契约增量最小且测试全绿
