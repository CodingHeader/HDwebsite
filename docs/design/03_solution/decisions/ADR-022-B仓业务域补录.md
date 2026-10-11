---
id: ADR-022
type: decision
title: B 仓（hdwebsite_0429）业务域补录进新仓
status: accepted
owner: 开发
created: 2026-10-11
updated: 2026-10-11
requires: [REQ-F-012]
---

# ADR-022：B 仓业务域补录进新仓

## Context（背景）

任务书要求参考 `04292309/` 与 `hdwebsite_0429/` 两个仓的优点，且「原分支有的功能现分支也要有」。实地勘察发现：前期设计提取（01~16 文档、REQ-F-001~011）以 04292309 仓为事实源，而 hdwebsite_0429 仓在其后新增了完整业务域：专业（Major）、招生计划（EnrollmentOffering，含学费定价）、媒体批量管理（media/batch）、showcase 展示配置等（schema 32→35 模型、API +3、管理页 +1、lib +7）。

## Problem（问题）

若不补录，新仓重建将丢失 B 仓功能，违反任务书硬性要求（M-2）；且该差异属于「文档与代码不一致」中最严重的一类——设计文档声称覆盖了原项目，实际缺失一个业务域。

## Options（备选）

1. **补录为正式需求（REQ-F-012）+ schema 一次性纳入**：B 仓差异字段随 M1 数据模型基线落地，管理页与 lib 随 R0 重建。← 选定
2. 补录但延后实现：先按 A 仓口径重建，B 域后补。→ 违反 M-2 优先级（MUST），且二次迁移打乱已冻结的数据基线。
3. 不补录：以设计文档为准。→ 直接违反任务书，否决。

## Decision（决策）

1. B 仓独有模型与字段（Major/EnrollmentOffering/Course.priceText+majorId/HotMajor.backgroundImage+majorId/Category.majors/Partner.offerings）全部进入新仓数据模型基线（已随 20261011052216_init 落地）。
2. 新增 REQ-F-012 承载该业务域；R0 基线重建切片将 B 仓 API（majors/enrollment-offerings/media/batch）、管理页（enrollment-offerings、majors）与配套 lib 能力（enrollment-pricing/enrollment-sync/media-assets/media-management/showcase/chat-history-view/operation-log-query）逐项对照移植，移植清单进 RISK-009 核验表。
3. B 仓的 settings/block-registry 文案差异（“弘道经理学院” vs “弘道教育”/statsText 合并）以 ADR-010 品牌基准（弘道教育）为准，statsText 合并口径保留（Registry 已含）。

## Consequences（后果）

- 正面：M-2 可验收；数据基线一次成型避免二次迁移；B 仓两年演进的定价/同步逻辑不丢失。
- 代价：R0 范围扩大（+2 API 族、+2 管理页、+7 lib 对照移植）；M1 基线迁移较原设计多 2 模型。
- 风险：B 仓部分 lib 依赖其自身演进上下文，移植时可能发现隐含耦合 → 在 R0 任务卡中以「对照移植 + 行为对齐测试」控制。

## Related

- REQ-F-012、SOL-R0（R0 切片卡，随 R0 开工建立）、RISK-022、master-plan §2（不一致清单第 6 条）。
