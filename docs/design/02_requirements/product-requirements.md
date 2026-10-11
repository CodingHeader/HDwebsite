---
id: PR-BASE-001
type: requirement
title: 当前需求基线（Product Requirements Baseline）
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# Product Requirements Baseline（当前需求基线）

> 本文件只描述**当前有效**的需求状态；历史与明细见各 REQ 文档。来源：REQ-INBOX-20261010-001 + 现状提取。

## 1. 功能需求（Feature，11 项 = 重构新增 N1~N11）

| ID | 名称 | 状态 | 方案 | 关联 |
| --- | --- | --- | --- | --- |
| REQ-F-001 | 官网和官方公众号统一管理 | approved | SOL-006（+SOL-005） | ADR-002 |
| REQ-F-002 | 自定义自动采集各大学校/部门政策、新闻 | approved | SOL-004 | ADR-003 |
| REQ-F-003 | 自动更新和发布官网信息和新闻 | approved | SOL-005 | ADR-008 |
| REQ-F-004 | 官网信息发布支持 Markdown，自动转网页 | approved | SOL-001 | — |
| REQ-F-005 | 自动发布公众号文章 | approved | SOL-006 | ADR-002 |
| REQ-F-006 | 采集的信息、新闻默认作为知识库文件 | approved | SOL-004（+SOL-002） | ADR-003 |
| REQ-F-007 | 知识库管理（库/文件/其他） | approved | SOL-002 | — |
| REQ-F-008 | 大模型配置与使用（知识库/提示词/参数） | approved | SOL-003 | ADR-005 |
| REQ-F-009 | 官网和公众号的 AI 客服 | approved | SOL-003（官网）/ SOL-006（公众号） | ADR-006 |
| REQ-F-010 | 多模型配置：对话优先级、默认与兜底 | approved | SOL-003 | ADR-005 |
| REQ-F-011 | 邮箱提醒（多人、五类事件） | approved | SOL-005 | ADR-004、ADR-008 |

## 2. 非功能需求（Non-Functional，4 项）

| ID | 名称 | 状态 |
| --- | --- | --- |
| REQ-NF-001 | 性能与响应（预算表） | approved |
| REQ-NF-002 | 安全（凭据加密/XSS 统一净化/上传校验/白名单） | approved |
| REQ-NF-003 | SEO 与可访问性（sitemap/robots/lang/metadata） | approved |
| REQ-NF-004 | 部署与可用性（standalone/备份/持久化） | approved |

## 3. 约束需求（Constraint，3 项）

| ID | 名称 | 状态 |
| --- | --- | --- |
| REQ-C-001 | 技术栈约束（沿用现有栈） | active |
| REQ-C-002 | 微信公众号平台约束（认证/API 频控/IP 白名单） | active |
| REQ-C-003 | 部署环境约束（宝塔单机/6789/SQLite） | active |

## 4. 现状功能（As-Is，重构保留基线）

前台 13 类页面 + 全局悬浮咨询、后台 25 管理页 + login、RBAC 三角色、AI 场景咨询、统一上传与媒体库。
明细以 [01-需求设计.md](../01-需求设计.md) §2~§5 为权威（SSOT，不在此复制）。

## 5. 基线内技术债（随 S1 处理，来源：02-前端 §9 / 05-交互 §4 / 08-复用 §2）

| 项 | 处置 |
| --- | --- |
| C1：News 并入 Article | S1 执行（ADR-001） |
| services/[slug] XSS 净化缺口 | S1 修复（REQ-NF-002） |
| sitemap/robots 缺失、lang="en" | S1 修复（REQ-NF-003） |
| 埋点三件套接线 or 移除 | S1 决策并执行（backlog） |
| R1~R7 复用收敛 | 随各 SOL 就近收敛（CrudPage 随新页面先行） |

## 6. 可追溯性矩阵（需求 → 方案 → 决策 → 里程碑 → 验证）

| 需求 | 方案 | 决策 | 里程碑 | 验证 |
| --- | --- | --- | --- | --- |
| REQ-F-001 | SOL-006（+SOL-005） | ADR-002、ADR-013 | M4 | validation-plan §M4 |
| REQ-F-002 | SOL-004 | ADR-003、ADR-015 | M3 | §M3 |
| REQ-F-003 | SOL-005 | ADR-008 | M3 | §M3 |
| REQ-F-004 | SOL-001 | — | M1 | §M1 |
| REQ-F-005 | SOL-006 | ADR-002、ADR-013 | M4 | §M4 |
| REQ-F-006 | SOL-004（+SOL-002） | ADR-003、ADR-020 | M3 | §M3 |
| REQ-F-007 | SOL-002 | ADR-020 | M2 | §M2 |
| REQ-F-008 | SOL-003 | ADR-005、ADR-014 | M2 | §M2 |
| REQ-F-009 | SOL-003（官网）/ SOL-006（公众号） | ADR-006、ADR-013、ADR-018 | M2（官网）/ M4（公众号） | §M2 / §M4 |
| REQ-F-010 | SOL-003 | ADR-005、ADR-014 | M2 | §M2 |
| REQ-F-011 | SOL-005 | ADR-004、ADR-008 | M3 | §M3 |
| REQ-F-012（B 仓补录） | SOL-R0（基线重建，随 R0 建卡） | ADR-022 | M1（数据基线已落地）+ R0（页面/API） | R0 验收节 |
| REQ-NF-001~004 | 各 SOL 非功能节 | ADR-021（NF-004 部署切换） | 全程（M1 起验收） | G1~G4 + 各 M 节（NF-004 灰度演练挂 M4-7） |
| REQ-C-001~003 | architecture.md 架构约束 | ADR-011、ADR-019 相关 | 全程 | 架构评审 + VAL |

反向追溯：SOL → 需求见各 SOL front matter；ADR → 影响见各 ADR §影响；里程碑 → 任务见 milestones/current-plan。

## 7. 被拒绝/取消需求

- 无。截至 2026-10-10 尚无被拒绝或取消的正式需求（处置类决策 C7 见 ADR-007）。

## 8. 基线变更规则

正式需求不得无记录修改：走变更流程（规范 §29）→ 更新对应 REQ → 本基线 → backlog → 关联 SOL/PLAN。
