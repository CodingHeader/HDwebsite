# ADR-009 Setting 键体系统一（=C9）

- **状态**：accepted（2026-10-10 用户确认）
- **背景**：seed 写旧点分键（`site.title` 等，group=basic/school/…），Registry 定义新扁平键（`siteName` 等，group=site/topbar/…），/api/settings 同时返回两套，品牌名已现漂移（详见 04-数据设计 §7.2）。
- **决策**：统一为 Registry 扁平键体系——①编写存量 DB 迁移脚本（旧键值转换/清理）；②seed 改用新键；③废弃点分键不再写入。
- **影响**：S1 增加迁移脚本任务；Setting 成为单一事实源；品牌值漂移根除。
- **关联**：ADR-010（品牌基准）；04-数据设计 §7.2；16-新增设计 §13.1。
