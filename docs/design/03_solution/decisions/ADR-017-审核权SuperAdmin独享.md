# ADR-017 审核权 SuperAdmin 独享

- **状态**：accepted（2026-10-10 用户确认）
- **决策**：ContentItem 审核流（pending_review→approved）与采集条目审核（CollectItem）的审核权均归 **SuperAdmin**；Editor 仅起草/提交。新增权限点 `review:edit`（仅 SuperAdmin 角色持有）。
- **影响**：S5 发布中枢按此实现权限校验；C8"发布前提醒仅通知"不受影响（提醒≠审批）。
- **关联**：ADR-008；SOL-005。

## 2026-10-11 补充（Q10 轮）

- 审核流程细化为**单级审核**：pending_review → approved/rejected 由 SuperAdmin 一次终审，无多级/会签链；Editor 仅起草提交。

## 2026-10-12 补充（P06 执行）

- **审核门强制落地**：ContentItem 通用 CRUD 只能把状态改为 draft/pending_review/offline（表单回传未改动的 approved/published 放行，"变更到"审核/发布态一律 400）；approved/rejected 只能经 `POST /api/content-items/[id]/review`（`review:edit`，SuperAdmin 独享）；published 只由发布执行器写入，且执行器拒绝发布未审核内容（failed + errMsg"内容未通过审核"）。
- **CollectSource.autoApprove 语义**（默认 false）：视为 **SuperAdmin 对该采集源的预授权**——只有 SuperAdmin 可开启或改动（非超管即使持有 `collect:edit`，创建/更新时改动 autoApprove → 403；P07 UI 对非超管隐藏/禁用该开关），开启后新条目直接生成 approved ContentItem，并逐条写 OperationLog（module=review, action=auto_approve, username=system, after.reason 注明预授权来源）。与本 ADR "审核权独享"自洽：预授权是超管事先做出的审核决定，而非绕过审核。
- **自动发布**（REQ"自动发布到官网与公众号"，A-3"自动 = 审核后按排期自动执行"）：审核通过后按 Setting `publishAutoChannels`（默认 website,wechat；公众号仅在存在启用的服务号时建任务）与 `publishAutoDelayMinutes`（默认 60）自动建 scheduled 发布任务；发布前提醒（ADR-008，提前量 30 分钟）先于执行发出，运营可在发布任务页取消。
