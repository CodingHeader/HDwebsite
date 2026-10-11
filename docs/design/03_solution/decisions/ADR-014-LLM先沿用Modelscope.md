# ADR-014 LLM 先沿用 Modelscope

- **状态**：accepted（2026-10-10 用户确认）
- **决策**：新仓 LLMProvider 初始默认与兜底均指向现有 Modelscope OpenAI 兼容端点（具体模型名后台可改）；跑通多模型路由后再增 Provider；余额人工填报 + 阈值邮件（=C5）。
- **影响**：S3 无外部依赖阻塞；llm-gateway 按 priority/isDefault/isFallback 实现即插即用。
- **关联**：ADR-005；SOL-003。
