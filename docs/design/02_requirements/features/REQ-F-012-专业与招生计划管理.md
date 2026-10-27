---
id: REQ-F-012
type: requirement
title: 专业与招生计划管理（B 仓业务域补录）
status: accepted
priority: MUST
owner: 产品所有者
created: 2026-10-11
updated: 2026-10-11
source: hdwebsite_0429 分支既有功能（ADR-022）
---

# REQ-F-012：专业与招生计划管理

## 1. 背景与来源

前期设计文档（01~16 提取件）以 `04292309/` 仓为事实源，未覆盖 `hdwebsite_0429/` 仓后续演进出的业务域。任务书要求「原分支有的功能现分支也要有」，故将 B 仓独有功能补录为正式需求。

## 2. 需求描述

后台支持维护**专业（Major）**与**招生计划/收费（EnrollmentOffering）**：

1. 专业管理：名称（唯一）、slug、简介、学制、封面、状态、排序、挂靠分类；与课程/热门专业关联。
2. 招生计划管理：专业 × 合作院校维度，含批次（sourceBatch，默认 26春）、学历类型（educationType，默认自考）、层次、专业代码、学习形式、学年学费/总学费/费用明细/额外费用说明、hasPrice 标记、状态与排序；同一 (批次, 院校, 专业, 学历类型, 层次, 专业代码) 唯一。
3. 前台展示：课程与热门专业可关联专业；招生计划数据供院校/专业页展示（R0 重建时对齐 B 仓展示形态）。

## 3. 范围

- 做：Major/EnrollmentOffering 模型与关联字段（Course.priceText/majorId、HotMajor.backgroundImage/majorId、Category.majors、Partner.offerings）；/api/majors、/api/enrollment-offerings(+[id])；/manager/enrollment-offerings 管理页；B 仓配套 lib（enrollment-pricing/enrollment-sync/media-assets/media-management/showcase 等）在 R0 重建对应能力时移植。
- 不做：B 仓 `.docs/`/`.memory.md` 等协作文件迁移；重复 B 仓未接线的测试文件（新仓统一 vitest）。

## 4. 验收条件

- [x] 后台可对专业与招生计划完成增删改查（含唯一约束冲突提示）。（证据：src/lib/__tests__/w0-contracts.test.ts）
- [x] /api/majors、/api/enrollment-offerings 契约入 src/contracts，校验与错误码符合契约②。（证据：src/lib/__tests__/w0-contracts.test.ts）
- [x] B 仓 schema 差异字段（Course.priceText 等）在新仓 schema 中存在且迁移通过。（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）
- [x] 招生计划重复导入（同唯一键）被拒绝且不影响既有数据。（证据：src/lib/__tests__/w0-contracts.test.ts）

## 5. 关联

- 方案：SOL-R0（基线重建）；决策：ADR-022。
- 影响面：prisma schema（已含）、R0 管理页清单（+enrollment-offerings、+majors）、契约源。
