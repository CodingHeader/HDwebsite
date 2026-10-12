---
id: EVD-P01-EXEC
type: evidence
title: P01 需求——执行证据（需求基线定稿、用户裁决落盘、P0-verify 勘误）
status: final
owner: P01 执行者
created: 2026-10-12
updated: 2026-10-12
related: [PROMPT-P01, PLAN-CURRENT, PARITY-MATRIX, REQ-F-013, REQ-F-014, REQ-F-015, ADR-024, ADR-025, EVD-P0-VERIFY]
---

# P01 执行证据

- 分支 `upgrade`，起点 `2cafee1`（P0 校验报告），未推送。
- 提交：`4896222`、`05e9a36`、`c7a5f8b`、`56beefd`、（本证据提交，见 git log）——全部前缀 `docs(P01)`。
- 范围：仅 `docs/design/**` 与仓库根 `AGENTS.md`（P01 允许路径）；未改任何业务代码、测试、配置。

## 1. 分析（5W1H 简版 + 自问 + 正反论证）

- **What**：把本轮需求定稿为可追溯的正式需求（REQ-F-013 对等 / 014 前台风格冻结 / 015 管理端顶级体验），并把 2026-10-12 用户裁决写进需求、未知登记册、current-plan 与 P02~P15 提示词；落 AGENTS.md；应用 P0-verify 的 6 条勘误。
- **Why**：后续 14 个代码方向的验收都引用这里；裁决不落盘，执行者会按 P0 的旧条件方案（如 P12 的 md/txt/html 本地优先）做错。
- **Who**：执行代理（读 AGENTS.md）、独立验证者（读 diff + 命令输出）。
- **When/Where**：P02 开工前；文档根 `docs/design/`。
- **How**：先核对 main 事实（schema/seed/dev.db/block-registry/AGENTS.md/CLAUDE.md），再写文档；每个裁决都标来源与日期。
- **自问 1：ADR-024 应写 proposed（P01 提示词原要求）还是 accepted？** 提示词写于用户裁决前，要求"不得替用户裁决"。现在用户已明确裁决（恢复 + 取代 ADR-012），写 accepted 是记录用户决定而非替其决定。→ accepted，并在 P01 提示词顶部注明这一调整。
- **自问 2：恢复方式——复活 main 原 4 张表，还是 P0 建议的 Setting + 注册表（不复活表）？** 正方（复活表）：用户原话"restore ElementConfig"、REQ-F-013 要求数据层对等，main dev.db 中确有 4 模板 + 4 区块数据。反方（Setting 方案）：表在 main 中"建而未用"，复活增加迁移面。结论：按 main 字段复活（仅加法迁移，P04），并让它真正可用（P06 接线 + P07 管理页）；`templateFile` 不驱动动态加载（main 中指向不存在文件），记为已知限制。
- **自问 3：迁移归属**。P03 在 P04 之前、P04 只能改 prisma/seed，故：P04 = 表 + seed；P06 = 注册表 + 契约 + API + 首页组合层（需要一次性前台组合层授权，已写入 P06 允许路径与 current-plan §9）；P07 = 管理页。P04 原验收"迁移只含 CREATE INDEX"相应放宽为"仅加法"。
- **自问 4：Coze 是否接受 Markdown？** 查 Coze 官方文档（https://docs.coze.cn/developer_guides_create_knowledge_files.md ，2026-10-12 读取）：文本知识库本地文件仅 pdf/txt/doc/docx。→ Markdown 以 `txt` 上传（ADR-025 第 3 条）；PDF 虽被 Coze 支持，但用户明确排除。
- **自问 5：doc（旧二进制）本地解析**。没有可确定的零风险纯 JS 方案 → P12 二选一（有可接受依赖则解析，否则仅 Coze 侧解析、本地 `skipped` 并明示），不在 P01 预先指定依赖。
- **自问 6：CLAUDE.md**。main 有 `CLAUDE.md`（内容 `@AGENTS.md`），但 P01 允许路径只有 `docs/design/**` 与 `AGENTS.md`（验收脚本也这样检查）→ 不越界，分派给 P11（已写入 P11 输出与允许路径、parity E2、backlog BL-P11-4）。

## 2. 改动文件

| 文件 | 改动 |
| --- | --- |
| `AGENTS.md`（新，83 行） | Next 16 规则块（沿用 main）+ 读取顺序 + 用户裁决 + 风格冻结 + 所有权/迁移 + 禁止事项 + 完成定义（规划总指令 §9.2）+ 验证命令 + 提交/证据规范 |
| `02_requirements/features/REQ-F-013-main功能对等.md`（新） | 对等需求、收口脚本、方向归属 |
| `02_requirements/features/REQ-F-014-前台风格冻结.md`（新） | main 红色横幅轮播风格；验收 = `npm run test:visual`（P02 建立）等 |
| `02_requirements/features/REQ-F-015-管理端顶级体验.md`（新） | 统一风格/标准组件/完整 CRUD/全动态/交互可用；自动化验收 |
| `02_requirements/features/REQ-F-006、REQ-F-007` | 追加 2026-10-12 裁决节（采集入库即进知识库 + 推 Coze；Coze 集成、Word/MD/TXT、拒 PDF/图片） |
| `02_requirements/product-requirements.md` | §1 增 012~015、更新 007；§4 页面数更正（I12）；§6 增 013~015 与 §6.1 M-1~M-14 → 方向 → 验证命令 |
| `02_requirements/backlog.md` | 本轮按方向的 parity 待办（BL-P01-1 … BL-P15-1，引用 A18 等行号） |
| `02_requirements/parity-matrix.md` | C9/C10 dropped-by-ADR → missing（P04/P06/P07）；汇总 missing 11 / dropped 0；A1 25→26；B6 备注；E2 增 P11；F6 Coze 口径 |
| `03_solution/decisions/ADR-024-用户对等要求与ADR-012复核.md`（新，accepted） | 恢复四模型 + 注册表 + 接线规格；取代 ADR-012 |
| `03_solution/decisions/ADR-025-知识库Coze集成与文件类型.md`（新，accepted） | Coze 集成、白名单、md→txt 映射、本地兜底、凭证降级、UNKNOWN 项 |
| `03_solution/decisions/ADR-012-闲置资产裁剪.md` | 状态改 superseded by ADR-024（原文保留） |
| `00_governance/assumptions.md` | 登记 A-1~A-7（A-5 补 docx 解析依赖） |
| `00_governance/risks.md` | 登记 R-P1~R-P9（新增 R-P8 区块默认值漂移、R-P9 Coze 限制） |
| `00_governance/document-index.md` | 收录新 REQ/ADR/提示词/证据/AGENTS.md |
| `04_planning/master-plan.md` | 顶部"已被 current-plan 2026-10-12 版取代"指引；§1/§3 更正块（I1/I3）；裁剪行更正 |
| `04_planning/current-plan.md` | 文首"2026-10-12 用户裁决"表 D1~D5；§3.2 M-1/M-2/M-5/M-9/M-10/M-13；§3.3 K1/K2/K4；§3.4 U-B1~U-B4 全部改为已裁决（原条件方案折叠保留）；§4/§5/§6/§7/§8/§9/§10/§11/§12/§13/§14/§16 同步；勘误 #1/#2/#3/#5 |
| `04_planning/review-prompts/P01` | status done + 执行时更新说明（ADR-024 accepted 的原因） |
| `04_planning/review-prompts/P02~P15` | 每份加裁决提示行；P02（红色轮播、26 组件、data-block 锚点）；P03（B6）；P04（四模型恢复 + seed + 加法迁移验收，ViewStats ADR 改号 026）；P05；P06（block-registry/契约/API/首页组合层、行号 :118/:119）；P07（三个管理页 + 菜单）；P08；P09（KnowledgeBackend 方法、ADR 改号 027）；P10（区块配置缓存）；P11（CLAUDE.md、banner 键与注册表同源）；**P12 全文按 ADR-025 重写**；P13；P14（`kbFilesDir`）；P15（根目录白名单含 AGENTS/CLAUDE、知识库白名单分治、parity 收口、ADR-012 不得作删除依据） |
| `06_validation/evidence/P0-baseline.md` | 勘误 #1/#2/#5 以〔勘误〕行内标注（原数值保留，便于对照） |

## 3. 验收标准逐条结果

| # | 验收（P01 提示词 + 编排附加项） | 结果 | 证据摘要 |
| --- | --- | --- | --- |
| 1 | （自动）REQ-F-013/014/015、AGENTS.md、ADR-024 存在 | PASS | `ls …` 列出 6 个文件（含 ADR-025） |
| 2 | （自动）`grep -c "P0[1-9]\|P1[0-5]" product-requirements.md` ≥14 | PASS | 20 |
| 3 | （自动）parity 每个 missing/partial 行有方向 | PASS | `rows without direction: 0`；状态复算 present 16 / replaced 9 / partial 21 / missing 11 / dropped 0 = 57 |
| 4 | （自动）只改了 `docs/design/**` 与 `AGENTS.md` | PASS | 对 `2cafee1..HEAD` 与 `HEAD~1` 均 "only docs changed"。注意：提示词原命令未加 `-c core.quotepath=off`，git 会把中文路径转义成带引号的八进制串，使 `^docs/design/` 不匹配而**误报**；需用 `git -c core.quotepath=off diff --name-only …` |
| 5 | （人工）ADR-024 状态 proposed、未替用户裁决 | PASS（按用户裁决调整） | 用户已于 2026-10-12 裁决 → ADR-024 = accepted，引用用户决定与日期；P01 提示词顶部已注明调整原因。验证者请按调整后的标准判定 |
| 6 | 2026-10-12 用户裁决写入需求、未知登记册、current-plan、相关提示词（P12 改为 Coze + 文件类型） | PASS | REQ-F-006/007/013/014/015、ADR-024/025、current-plan 文首 D1~D5 与 §3.4、P02~P15（`grep -L "2026-10-12 用户裁决" review-prompts/P*.md` 只剩 P01，P01 以执行时更新说明替代） |
| 7 | P0-verify 6 条非阻断勘误 | PASS（6/6） | #1 路由计数 87/34（current-plan §1/§2.1、P0-baseline）；#2 10,929 行；#3 wechat.ts:118/:119（current-plan M-5、P06 评审 #5、product-requirements §6.1）；#4 26 个组件（parity A1、P02 评审 #3 与输出）；#5 构建耗时波动 90~120s（current-plan §1/§11、P0-baseline）；#6 B6 写入 P03 评审 #7 + 输出 |
| 8 | `npm run lint` | PASS | exit 0，`25 problems (0 errors, 25 warnings)`（与基线相同） |
| 9 | `npm run typecheck` | PASS | exit 0 |
| 10 | `npm test` | PASS | `Test Files 6 passed (6)`、`Tests 33 passed (33)` |
| 11 | `npm run build` | PASS | exit 0；`✓ Compiled successfully in 22.8s`；`Generating static pages (37/37)`；`⨯ cssChunking` 警告同基线 |

命令原始输出摘要见 `06_validation/evidence/P01/verify-output.md`。

## 4. UNKNOWN 及原因（P01 本身无 UNKNOWN；以下为登记给后续方向的残留未知）

- 微信公众号真实联调（M-9/M-12 公众号部分）：用户不提供凭证 → P06 mock，UNKNOWN。
- SMTP 真实发信（M-13）：同上。
- Coze 知识库真实联调（M-10）：本仓没有带 dataset/createDocument 权限的 PAT → P12 mock，UNKNOWN。
- Coze 单文件大小上限：所读文档未写明 → P12 联调时核实（ADR-025 第 8 条）。

## 5. 后续方向待办

- P02：首页区块加 `data-block` 锚点、组合式渲染（ADR-024 前置）；visual 套件断言轮播与区块顺序。
- P03：B6 二选一决定写入证据并更新 parity B6。
- P04：迁移 p04 包含四个恢复表 + Navigation.templateId（仅加法）；seed 写入 main 4 模板 + 4 区块 + home 模板；ViewStats ADR 用 **ADR-026**。
- P06：block-registry + `src/contracts/blocks.ts` + 四资源 API + 首页组合层（只改顺序/开关，visual 门禁）。
- P07：home-blocks / page-templates / element-configs 三个管理页 + 菜单 + "恢复默认"。
- P09：注册表 ADR 用 **ADR-027**；KnowledgeBackend 预留 push/remove/status 方法。
- P11：根目录 `CLAUDE.md`（`@AGENTS.md`）；banner/homeCards 等设置键与区块注册表同源。
- P12：按重写后的提示词实现 Coze 集成（Word/MD/TXT，拒 PDF/图片；md→txt）；docx 依赖说明理由。
- P14：`kbFilesDir()` 纳入备份与孤儿扫描。
- P15：根目录白名单含 AGENTS.md/CLAUDE.md；parity 收口脚本（REQ-F-013 §5）。
- 所有验证者：P01 类"只改文档"检查请用 `git -c core.quotepath=off`。
