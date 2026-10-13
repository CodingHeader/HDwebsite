<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next 16) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HDwebsite（弘道教育官网 + 管理后台）代理规则

本文件是执行代理进入本仓库的唯一规则入口（main 的 AGENTS.md/CLAUDE.md 对等项，parity E2）。分支 `upgrade` = Next.js 16 + React 19 + Prisma 7（libsql/SQLite）+ Tailwind v4 + zod 4 重建版；`origin/main@94dbbbb` = 旧站（功能与前台视觉的对照基准）。

## 1. 读取顺序（开工前必读）

1. `docs/design/规划总指令-任务分配与完整规划.md`——治理标准（其"只读"规则仅约束 P0 规划步；执行方向在提示词允许路径内改代码）。
2. `docs/design/04_planning/current-plan.md`——当前轮计划（16 节：事实基线、MUST、冲突、未知登记册、迁移编排、所有权矩阵）。
3. 当前方向提示词 `docs/design/04_planning/review-prompts/PXX-*.md`——本方向的输出、允许/禁止修改路径、验收与验证命令。
4. 需求与决策：`docs/design/02_requirements/`（REQ-F-013 对等、REQ-F-014 前台风格冻结、REQ-F-015 管理端顶级体验、`parity-matrix.md`）、`docs/design/03_solution/decisions/`（ADR）。
5. 前序方向证据：`docs/design/06_validation/evidence/`。

## 2. 已裁决的用户决定（有约束力，2026-10-12）

- **前台（web）**：沿用 main 原有的**红色横幅轮播**风格，外观不变；任何方向不得把前台改离 main 风格（REQ-F-014）。
- **功能对等**：main 上的每个功能都必须在 upgrade 存在；首页区块配置 + ElementConfig 恢复（ADR-024 取代 ADR-012，REQ-F-013）。
- **管理端（/manager）**：顶级设计、极度友好（REQ-F-015）。
- **知识库**：Coze 集成；可上传文件仅 Word（.docx/.doc）、Markdown（.md/.markdown）、TXT；**拒绝 PDF 与图片**（ADR-025）。
- **微信公众号、SMTP 凭证缺失**：完整实现，用 mock 测试，真实联调标 UNKNOWN（Coze dataset 凭证同）。
- 基础目标：统一风格、标准组件、完整 CRUD、全动态数据、交互可用。

## 3. 前台风格冻结规则

- 范围：`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css` 的 web 令牌、`src/app/layout.tsx` 的字体与 lang。
- 唯一标准：`origin/main@94dbbbb`。组件 JSX/className 与 main 逐字一致；允许差异仅限 import 路径、类型、数据适配层、XSS 净化、Markdown 渲染、SEO/埋点。
- 管理端令牌只能写在 `[data-theme="manager"]` 作用域内。
- P02 建立 `npm run test:visual`（15 路由 × 1440/768/375，`maxDiffPixelRatio 0.01`）后，**每个方向结束时必须重跑且通过**；P02 之前的方向不得触碰前台文件。
- 首页区块配置（ADR-024）的默认值必须复现 main 原样。

## 4. 所有权与迁移

- 只在当前方向提示词"允许修改"路径内写入；必须越界时在证据中写明文件与理由。
- 契约唯一源 `src/contracts/**`（zod）：改代码前先补本方向契约；禁止在路由/组件内重复定义 DTO。
- **迁移只允许 P04（`p04_data_integrity`）、P06（`p06_collect_kb_review`）、P12（`p12_knowledge_base`）各新增 1 个**，按顺序串行；其他方向需改表 → 写 ADR 并停止该子项。已有迁移目录不得修改。
- **编排（2026-10-13 用户裁决 D11=2 名执行者）**：Wave 0（W0-01~W0-08）在 `upgrade` 上**串行冻结**，产出 tag `w1-base`；Wave 1 **五条 lane 并行**（所有权矩阵见 `04_planning/parallel-w1/07-所有权矩阵.md`，重叠 0、越权 0），由 **2 名执行者**承载：X = `lane/ui`（A→E）、Y = `lane/backend`（B→C→D）；Wave 2 集成与终审。规划包入库于 `docs/design/04_planning/parallel-w1/`。
- **冻结面**：`w1-base` 之后 `src/contracts/**`、`prisma/schema.prisma` 与迁移、依赖（`package.json`/锁文件）、`vitest.config.ts`/Playwright 配置全部只读；任何线需要改动 → 停止该子项并写《契约变更请求》（`04_planning/parallel-w1/11-验收与审查规程.md` §4），批准后由契约员在 `upgrade` 上最小提交并打 `w1-base-ccr-<n>`。
- **所有权不相交**：各线只在自己 lane 分支的"允许修改"路径内写入；越界即 FAIL。两条线的唯一共享物是 tag `w1-base` 上冻结的契约、迁移、依赖与本规划包。

## 5. 禁止事项

- 改变前台视觉风格；把管理端令牌写到全局作用域。
- 提交 `.env*`、`prisma/dev.db`、`backups/`、运行时上传文件、任何密钥；把 token 写进 remote URL、文件、日志或输出。
- 未经独立验证即推送。**推送规则（2026-10-13 用户裁决 D8）**：Wave 0 的 W0-08 经独立验证 PASS 后，推送 `upgrade` 与 tag `w1-base`；Wave 1 期间各线只推自己的 lane 分支（`lane/ui`、`lane/backend`），`upgrade` 只由集成者在 Wave 2 推送。
- 引入 Redis/MQ/无头浏览器/独立 worker（REQ-C-003）；群发接口。
- 并行修改 `src/contracts/**` 或同一迁移。
- 读取或迁移凭据类文件（如 main 的 `website_error/.token.txt`）。
- 替用户裁决 BLOCKING 未知项；遇到 MUST 之间的新冲突 → 记入 current-plan §3.3 并上报。
- 为"将来可能需要"提前抽象（规划总指令 §13）。

## 6. 完成定义（规划总指令 §9.2，全项目唯一口径）

```text
Done ≠ 模型说"完成" ≠ 代码写完 ≠ 推送到 GitHub
Done = 所有权内 diff 符合任务
     ∧ 验收条目逐条有结果（PASS / FAIL / UNKNOWN）
     ∧ 自动测试或脚本可复现
     ∧ evidence 能让一周后的人复现，不用问原作者
     ∧ 守卫通过（契约测试 / 边界检查 / 根目录污染 / 密钥扫描 / 相关单测）
     ∧ 无新增同类错误记录
     ∧ 未修改冻结契约（除非本任务就是改契约）
```

防自证循环：验收标准由规划阶段写定；执行者执行；判定由独立验证者只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN。

## 7. 验证命令（每个方向最后必跑，全部 exit 0）

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual        # P02 起每方向必跑（前台风格门禁）
npm run test:e2e           # P05 起（如该方向提示词要求）
```

环境：node v22 可用（engines 要求 >=24，EBADENGINE 警告可忽略，生产按 24）。本地需 `.env.local`（JWT_SECRET ≥32 位等，参照 `.env.example`）。默认管理员 admin/admin123 仅限本地，上线前必须修改。

## 8. 提交与证据

- 小而聚焦的提交，信息前缀 `feat(PXX)` / `fix(PXX)` / `docs(PXX)`；提交作者不改全局 git config。
- 证据写入 `docs/design/06_validation/evidence/PXX-execution.md`（分析 5W1H 简版、改动文件、验收逐条结果与命令输出摘要、UNKNOWN 及原因、后续方向待办）。
- 并行编排期间（2026-10-13 起）证据目录按波次/执行线分桶：Wave 0 → `evidence/W0/<卡号>/`；Wave 1 → `evidence/W1-B/<卡号>/`、`evidence/W1-C/…`、`evidence/W1-D/…`、`evidence/W1-A/…`、`evidence/W1-E/…`；Wave 2 → `evidence/W2/`。独立验证报告 `<卡号>-verify.md` 由被验证方原样提交进自己的证据目录（`docs(<卡号>): verify report`）。
- 熔断：同一件事失败两次即停止并上报；同一方向连续 2 次独立验证 FAIL → 停止改代码，改写提示词/升级档位/标 blocked。
