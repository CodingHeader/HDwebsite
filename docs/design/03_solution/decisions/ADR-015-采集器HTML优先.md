# ADR-015 采集器 HTML 优先

- **状态**：accepted（2026-10-10 用户确认）
- **决策**：第一优先实现 HTML 网页采集器（CSS 选择器解析，适配学校/教育厅官网新闻页）；RSS 采集器次之；公众号文章采集后置（合规风险，需专用接口/第三方）。
- **影响**：S4 排期按 HTML→RSS→公众号顺序；CollectSource.type 实现优先级 html > rss > wechat_mp。
- **关联**：ADR-003；SOL-004。
