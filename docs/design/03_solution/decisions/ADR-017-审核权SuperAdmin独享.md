# ADR-017 审核权 SuperAdmin 独享

- **状态**：accepted（2026-10-10 用户确认）
- **决策**：ContentItem 审核流（pending_review→approved）与采集条目审核（CollectItem）的审核权均归 **SuperAdmin**；Editor 仅起草/提交。新增权限点 `review:edit`（仅 SuperAdmin 角色持有）。
- **影响**：S5 发布中枢按此实现权限校验；C8"发布前提醒仅通知"不受影响（提醒≠审批）。
- **关联**：ADR-008；SOL-005。

## 2026-10-11 补充（Q10 轮）

- 审核流程细化为**单级审核**：pending_review → approved/rejected 由 SuperAdmin 一次终审，无多级/会签链；Editor 仅起草提交。
