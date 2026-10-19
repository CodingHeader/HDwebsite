# ADR-031：移除 CRON_SECRET 环境变量（无调用方）

- 状态：已接受（D-03 实施）
- 日期：2026-10-19
- 背景：`.env.example` 含 `# CRON_SECRET=`（可选），但 `grep -rn "CRON_SECRET" src/ scripts/` 0 命中（`.env.example:20` 为唯一出现处）。C-ops 审计（`docs/design/04_planning/parallel-w1/evidence/C-ops-审计.md`）已确认其为**死键**。
- 决策：从 `.env.example` 移除 `CRON_SECRET`，不实现外部 cron 触发鉴权。若未来需要（如外部调度器调用定时触发接口），另立新需求并新增专用密钥命名。
- 影响：
  - 无代码调用方，移除不影响现有功能。
  - `.env.local` 中若已有该键，运行时将被忽略（无消费方），无需删除。
- 关联：D-03（`src/lib/env.ts` 集中校验）、V0.6 `A-D-1`（CRON_SECRET 用途判定）。