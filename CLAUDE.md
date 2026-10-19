# CLAUDE.md

本文件是 Claude Code 等工具在 HDwebsite `upgrade` 分支上的入口指引。

- 核心规则以根目录 `AGENTS.md` 为唯一权威**（parity E2：本文件与 main 分支 `CLAUDE.md` 内容对等）。

@AGENTS.md

---

## 使用说明

- 开工前先按 `AGENTS.md` §1「读取顺序」加载规划与方向提示词。
- 前台视觉冻结（REQ-F-014）与所有权矩阵（`docs/V0.7-20261019/08-所有权矩阵与档位成本.md`）为硬约束。
- 冻结面（`src/contracts/**`、`prisma/schema.prisma` 与迁移、`package.json`/锁、vitest/Playwright 配置）只读；需改动必须先提《契约变更请求》。
- 验证门禁：`npm run lint && npm run typecheck && npm test && npm run build`，P02 起加 `npm run test:visual`。
- 每张规划卡完成后必须产出证据（`docs/design/06_validation/evidence/V7/<卡号>/`）并经独立验证者复审。