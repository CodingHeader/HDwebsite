---
id: BACKLOG-001
type: requirement
title: 需求/工作待办池（Backlog）
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-10
---

# Product Backlog（待办池）

> 状态定义（规范 §9）：Proposed（已入 Inbox 待评估）/ Backlog（已评估待排期）/ Ready（已排期条件齐全可执行）/ In Progress / Done / Icebox（暂缓）/ Rejected。
> 排期参照落地顺序 S1~S6（[16-新增设计.md](../16-新增设计.md) §11）；执行从 [current-plan.md](../04_planning/current-plan.md) 进入。

| ID | 标题 | 类型 | 优先级 | 状态 | 来源/方案 |
| --- | --- | --- | --- | --- | --- |
| S1-基建 | 调度基座 + Setting 加密 + Setting 键体系统一迁移（ADR-009）+ Markdown 管线 | Infra | High | **Ready** | SOL-001 / REQ-F-004 / ADR-009 |
| S1-迁移 | C1：News 数据迁入 Article（channel 区分） | Task | High | **Ready** | ADR-001 / DEP-014 |
| S1-安全 | 修复 services/[slug] XSS 净化缺口 | Tech-Debt | High | **Ready** | REQ-NF-002 |
| S1-SEO | 补 sitemap.ts/robots.ts + lang=zh-CN | Tech-Debt | High | **Ready** | REQ-NF-003 |
| S1-埋点 | UserAction 最小埋点接通（表单提交 + 关键页浏览；Q7 轮定，ASM-008） | Tech-Debt | High | **Ready** | 05-交互 §4 / ASM-008 |
| S2 | KBAdapter 外部知识库适配 + 对接 + 本地兜底双轨（ADR-020） | Feature | High | Backlog | SOL-002 / REQ-F-007 / ADR-020 |
| S3 | LLM 多模型网关 + 模型管理页 | Feature | High | Backlog | SOL-003 / REQ-F-008、010 |
| S3 | 官网端 AI 客服升级（SSE 流式；float + apply 双入口，ADR-018） | Feature | High | Backlog | SOL-003 / REQ-F-009 |
| S4 | 采集引擎 + 采集源管理 + 审核队列 | Feature | Medium | Backlog | SOL-004 / REQ-F-002 |
| S4 | 采集默认入知识库（pending 审核） | Feature | Medium | Backlog | SOL-004 / REQ-F-006 |
| S5 | 发布中枢：官网定时/自动发布 | Feature | High | Backlog | SOL-005 / REQ-F-003 |
| S5 | 邮箱提醒（SMTP + 五类事件 + 多收件人） | Feature | High | Backlog | SOL-005 / REQ-F-011 |
| S6 | 公众号账号管理 + 文章发布 | Feature | Medium | Backlog（凭证依赖 DEP-001） | SOL-006 / REQ-F-001、005 |
| S6 | 公众号 AI 客服（被动回复+异步补发） | Feature | Medium | Backlog（凭证依赖 DEP-001） | SOL-006 / REQ-F-009 |
| TD-CRUD | CrudPage 通用组件收敛 25 管理页样板 | Tech-Debt | Medium | Backlog（新页面先行使用） | 08-复用 R2 |
| TD-R1~R7 | 复用不足收敛（requirePermission/集中 zod/日志工具等） | Tech-Debt | Medium | Backlog（随 SOL 就近） | 08-复用 §2 |
| ICE-VEC | 向量语义检索（embedding + 混合检索） | Feature | Low | Icebox | 12-知识库 §3.3 二期 |
| ICE-PG | PostgreSQL 迁移 | Infra | Low | Icebox | 14-存储 S5（P1 触发时评估） |
| ICE-OSS | 上传迁对象存储 | Infra | Low | Icebox | 14-存储 S1 远期 |
| MET-确认 | 成功指标目标值确认（success-metrics.md；M1 验收时，Q7 轮定时点） | Decision | High | Proposed（时点已定） | MET-001 |

## 触发条件备注

- S4 预置数据、S5 联调、S6 启用分别依赖 DEP-004（采集源）、DEP-003（SMTP）、DEP-001（微信凭证）就绪（见 dependencies.md）。
- 任一 Backlog 项进入执行前：确认 current-plan → 创建 TASK → 更新本表状态。
