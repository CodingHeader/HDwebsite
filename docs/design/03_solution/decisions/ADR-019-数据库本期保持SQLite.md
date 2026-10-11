# ADR-019 数据库本期保持 SQLite

- **状态**：accepted（2026-10-10 用户确认）
- **决策**：新仓仍用 SQLite（Prisma 7 + libsql adapter）；schema 不使用 SQLite 特有语法保持 PG 可迁移；部署沿用挂载持久化 + 调度基座定时备份（S1 内置 backup 任务）。
- **关联**：ADR-011；SOL-001；14-存储设计 §5。
