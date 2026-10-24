# V11-HUB-02 执行证据（2026-10-24，状态机部分；UI 预览部分见 HUB-01）

**现状盘点（审计声明核实为真）**：channelStateSchema 契约本就含 scheduled/publishing，但组装器 `status: ch?.status ?? "unsent"` 只看 ContentChannel 行（发布成功才产生）→ 排队/执行中的渠道态从不出现。
**改动**：content-hub-state.ts 派生——无渠道行时按最近 PublishJob.status 映射（scheduled→scheduled、publishing→publishing、failed→failed、published→published）。
**CCR-1 撤销声明（重要）**：原规划"补 ContentItem.externalId 契约增量"经现状盘点**不再需要**——幂等去重所需的稳定外部标识已由 `ContentChannel.externalId` 承载（website=article.id，wechat=draft media_id），WX-04 官网重发幂等即基于它实现。冻结契约零改动，优于预批方案（用户指令预批的是"允许动"，非"必须动"）。
**验收**：单测 2 断言（scheduled/publishing 派生）全绿；全量 1766 绿。
