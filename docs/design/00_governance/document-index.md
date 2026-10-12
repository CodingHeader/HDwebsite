---
id: DOC-IDX-001
type: project-map
title: 文档总索引
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-12
---

# Document Index（文档总索引）

> 本索引覆盖 `docs/get/` 全部文档。目录结构与关联关系见 [project-map.md](./project-map.md)；文档规则见 [document-standard.md](./document-standard.md)。

## 1. 治理（00_governance/）

- [project-map.md](./project-map.md) — 目录结构与文档关联关系（导航地图）
- [document-standard.md](./document-standard.md) — 本项目文档规范落地约定
- [glossary.md](./glossary.md) — 术语表
- [stakeholders.md](./stakeholders.md) — 角色与责任
- [risks.md](./risks.md) — 风险登记（治理级，含触发信号）
- [assumptions.md](./assumptions.md) — 假设登记（含证伪影响）
- [dependencies.md](./dependencies.md) — 外部/内部依赖登记
- 本文件（document-index.md）

## 2. 产品（01_product/）

- [product-definition.md](../01_product/product-definition.md) — 产品定义（愿景/目标/范围/用户）
- [success-metrics.md](../01_product/success-metrics.md) — 成功指标（草案；目标值 M1 验收时确认，Q7 轮定时点）

## 3. 需求（02_requirements/）

### 入口与基线

- [REQ-INBOX-20261010-001](../02_requirements/inbox/REQ-INBOX-20261010-001.md) — 原始需求入口（11 项新增设计）
- [product-requirements.md](../02_requirements/product-requirements.md) — 当前需求基线（含 §6 可追溯性矩阵）
- [backlog.md](../02_requirements/backlog.md) — 需求/工作待办池（含本轮 P01~P15 对等缺口待办）
- [parity-matrix.md](../02_requirements/parity-matrix.md) — main → upgrade 功能对等矩阵（P0 建立，P01 更新）

### 功能需求（features/，REQ-F-001~011 对应 N1~N11；各含优先级与用户故事）

- [REQ-F-001-官网公众号统一管理](../02_requirements/features/REQ-F-001-官网公众号统一管理.md)
- [REQ-F-002-自动采集政策新闻](../02_requirements/features/REQ-F-002-自动采集政策新闻.md)
- [REQ-F-003-自动更新发布官网信息](../02_requirements/features/REQ-F-003-自动更新发布官网信息.md)
- [REQ-F-004-Markdown发布管线](../02_requirements/features/REQ-F-004-Markdown发布管线.md)
- [REQ-F-005-自动发布公众号文章](../02_requirements/features/REQ-F-005-自动发布公众号文章.md)
- [REQ-F-006-采集默认入知识库](../02_requirements/features/REQ-F-006-采集默认入知识库.md)
- [REQ-F-007-知识库管理](../02_requirements/features/REQ-F-007-知识库管理.md)
- [REQ-F-008-大模型配置与使用](../02_requirements/features/REQ-F-008-大模型配置与使用.md)
- [REQ-F-009-官网公众号AI客服](../02_requirements/features/REQ-F-009-官网公众号AI客服.md)
- [REQ-F-010-多模型优先级与兜底](../02_requirements/features/REQ-F-010-多模型优先级与兜底.md)
- [REQ-F-011-邮箱提醒](../02_requirements/features/REQ-F-011-邮箱提醒.md)
- [REQ-F-012-专业与招生计划管理](../02_requirements/features/REQ-F-012-专业与招生计划管理.md)（B 仓补录，ADR-022）
- [REQ-F-013-main功能对等](../02_requirements/features/REQ-F-013-main功能对等.md)（2026-10-12，P01）
- [REQ-F-014-前台风格冻结](../02_requirements/features/REQ-F-014-前台风格冻结.md)（2026-10-12，P01；main 红色横幅轮播风格）
- [REQ-F-015-管理端顶级体验](../02_requirements/features/REQ-F-015-管理端顶级体验.md)（2026-10-12，P01）

### 非功能需求（non-functional/）

- [REQ-NF-001-性能与响应](../02_requirements/non-functional/REQ-NF-001-性能与响应.md)
- [REQ-NF-002-安全](../02_requirements/non-functional/REQ-NF-002-安全.md)
- [REQ-NF-003-SEO与可访问性](../02_requirements/non-functional/REQ-NF-003-SEO与可访问性.md)
- [REQ-NF-004-部署与可用性](../02_requirements/non-functional/REQ-NF-004-部署与可用性.md)

### 约束需求（constraints/）

- [REQ-C-001-技术栈约束](../02_requirements/constraints/REQ-C-001-技术栈约束.md)
- [REQ-C-002-微信公众号平台约束](../02_requirements/constraints/REQ-C-002-微信公众号平台约束.md)
- [REQ-C-003-部署环境约束](../02_requirements/constraints/REQ-C-003-部署环境约束.md)

## 4. 方案与设计（03_solution/）

- [architecture.md](../03_solution/architecture.md) — 架构设计（As-Is + To-Be）
- 决策记录（decisions/）：[ADR-001 News并入Article](../03_solution/decisions/ADR-001-News并入Article.md) ｜ [ADR-002 公众号官方API设计凭证后补](../03_solution/decisions/ADR-002-公众号官方API设计凭证后补.md) ｜ [ADR-003 采集源后台配置](../03_solution/decisions/ADR-003-采集源后台配置.md) ｜ [ADR-004 SMTP后台配置](../03_solution/decisions/ADR-004-SMTP后台配置.md) ｜ [ADR-005 兼容端点与人工余额](../03_solution/decisions/ADR-005-兼容端点与人工余额.md) ｜ [ADR-006 公众号AI客服形态](../03_solution/decisions/ADR-006-公众号AI客服形态.md) ｜ [ADR-007 英文草稿删除](../03_solution/decisions/ADR-007-英文草稿删除.md) ｜ [ADR-008 发布前提醒仅通知](../03_solution/decisions/ADR-008-发布前提醒仅通知.md)——各 ADR 含备选方案对比
- 执行方案（solutions/）：[SOL-001 基础基座](../03_solution/solutions/SOL-001-基础基座.md) ｜ [SOL-002 知识库平台](../03_solution/solutions/SOL-002-知识库平台.md) ｜ [SOL-003 LLM网关与AI客服](../03_solution/solutions/SOL-003-LLM网关与AI客服.md) ｜ [SOL-004 采集引擎](../03_solution/solutions/SOL-004-采集引擎.md) ｜ [SOL-005 发布中枢与邮箱提醒](../03_solution/solutions/SOL-005-发布中枢与邮箱提醒.md) ｜ [SOL-006 公众号对接](../03_solution/solutions/SOL-006-公众号对接.md)——各 SOL 含 §3.5 API 与页面、§3.6 技术选型、§3.7 风险与缓解、§4 数据模型字段表

## 5. 计划（04_planning/）

- [roadmap.md](../04_planning/roadmap.md) — 长期路线
- [milestones.md](../04_planning/milestones.md) — 里程碑（M1~M4，含进入/退出标准与主要风险）
- [current-plan.md](../04_planning/current-plan.md) — 当前执行计划
- [master-plan.md](../04_planning/master-plan.md) — 任务分配与执行规划总纲（2026-10-11 历史版，已被 current-plan 2026-10-12 版取代）
- review-prompts/ — 本轮 15 方向可执行提示词：[P01-需求](../04_planning/review-prompts/P01-需求.md) ｜ [P02-前端](../04_planning/review-prompts/P02-前端.md) ｜ [P03-后端](../04_planning/review-prompts/P03-后端.md) ｜ [P04-数据](../04_planning/review-prompts/P04-数据.md) ｜ [P05-交互](../04_planning/review-prompts/P05-交互.md) ｜ [P06-逻辑](../04_planning/review-prompts/P06-逻辑.md) ｜ [P07-组件](../04_planning/review-prompts/P07-组件.md) ｜ [P08-复用](../04_planning/review-prompts/P08-复用.md) ｜ [P09-拓展](../04_planning/review-prompts/P09-拓展.md) ｜ [P10-性能](../04_planning/review-prompts/P10-性能.md) ｜ [P11-配置](../04_planning/review-prompts/P11-配置.md) ｜ [P12-知识库](../04_planning/review-prompts/P12-知识库.md) ｜ [P13-响应](../04_planning/review-prompts/P13-响应.md) ｜ [P14-存储](../04_planning/review-prompts/P14-存储.md) ｜ [P15-资源](../04_planning/review-prompts/P15-资源.md)

## 6. 执行（05_execution/）

- [task-template.md](../05_execution/task-template.md) — 原子任务模板
- [task-index.md](../05_execution/task-index.md) — 任务索引（TASK-M1-001~011 全部 done，见 05_execution/tasks/；规划总纲见 04_planning/master-plan.md）

## 7. 验证（06_validation/）

- [validation-plan.md](../06_validation/validation-plan.md) — 验证计划（按里程碑；含用例记录格式与证据目录规范；M1 起验收加自动 UI 走查）
- evidence/ — 完成证据目录（按 EVD-xxx/ 组织，验证发生时创建）；本轮：[P0-baseline](../06_validation/evidence/P0-baseline.md) ｜ [P0-verify](../06_validation/evidence/P0-verify.md) ｜ [P01-execution](../06_validation/evidence/P01-execution.md)

## 8. 发布（07_release/）

- [changelog.md](../07_release/changelog.md) — 变更日志

## 9. 知识（08_knowledge/）

- [lessons-learned.md](../08_knowledge/lessons-learned.md) — 经验沉淀
- [technical-notes.md](../08_knowledge/technical-notes.md) — 技术笔记

## 10. 根级设计提取文档（docs/get/ 平铺，01~16）

设计事实权威来源，被上述体系文档引用：

- [README.md](../README.md) — 提取总索引与项目速览
- [01-需求设计.md](../01-需求设计.md) ｜ [02-前端设计.md](../02-前端设计.md) ｜ [03-后端设计.md](../03-后端设计.md) ｜ [04-数据设计.md](../04-数据设计.md) ｜ [05-交互设计.md](../05-交互设计.md) ｜ [06-逻辑设计.md](../06-逻辑设计.md) ｜ [07-组件设计.md](../07-组件设计.md) ｜ [08-复用设计.md](../08-复用设计.md) ｜ [09-拓展设计.md](../09-拓展设计.md) ｜ [10-性能设计.md](../10-性能设计.md) ｜ [11-配置设计.md](../11-配置设计.md) ｜ [12-知识库设计.md](../12-知识库设计.md) ｜ [13-响应设计.md](../13-响应设计.md) ｜ [14-存储设计.md](../14-存储设计.md) ｜ [15-资源设计.md](../15-资源设计.md) ｜ [16-新增设计.md](../16-新增设计.md)
- [talk.md](../talk.md) — 对话 QA 记录（Q1~Q10，逐字增量）
- [new-features.md](../new-features.md) — N1~N11 新增设计方案综合（2026-10-11 并发出现，核验与 ADR-001~020 一致后收录；映射行笔误已修正；§15 增 Q10 轮十项决策，对齐 ADR-021）

## 2026-10-10 增补：ADR-009~021（提问轮落定；021 为 2026-10-11 Q10 轮）

[ADR-009 Setting键体系统一](../03_solution/decisions/ADR-009-Setting键体系统一.md) ｜ [ADR-010 品牌基准弘道教育](../03_solution/decisions/ADR-010-品牌基准弘道教育.md) ｜ [ADR-011 平行新仓重写](../03_solution/decisions/ADR-011-平行新仓重写.md) ｜ [ADR-012 闲置资产裁剪](../03_solution/decisions/ADR-012-闲置资产裁剪.md) ｜ [ADR-013 公众号已认证服务号](../03_solution/decisions/ADR-013-公众号已认证服务号.md) ｜ [ADR-014 LLM先沿用Modelscope](../03_solution/decisions/ADR-014-LLM先沿用Modelscope.md) ｜ [ADR-015 采集器HTML优先](../03_solution/decisions/ADR-015-采集器HTML优先.md) ｜ [ADR-016 向量检索二期后置](../03_solution/decisions/ADR-016-向量检索二期后置.md) ｜ [ADR-017 审核权SuperAdmin独享](../03_solution/decisions/ADR-017-审核权SuperAdmin独享.md) ｜ [ADR-018 AI客服挂载范围](../03_solution/decisions/ADR-018-AI客服挂载范围.md) ｜ [ADR-019 数据库本期保持SQLite](../03_solution/decisions/ADR-019-数据库本期保持SQLite.md) ｜ [ADR-020 外部知识库对接](../03_solution/decisions/ADR-020-外部知识库对接.md) ｜ [ADR-021 部署切换灰度发布](../03_solution/decisions/ADR-021-部署切换灰度发布.md) ｜ [ADR-022 B仓业务域补录](../03_solution/decisions/ADR-022-B仓业务域补录.md)（执行轮新增）

## 2026-10-12 增补：ADR-024~025 与根目录 AGENTS.md（P01，用户裁决）

[ADR-024 用户对等要求与ADR-012复核](../03_solution/decisions/ADR-024-用户对等要求与ADR-012复核.md)（accepted，取代 ADR-012：恢复首页区块配置与 ElementConfig） ｜ [ADR-025 知识库Coze集成与文件类型](../03_solution/decisions/ADR-025-知识库Coze集成与文件类型.md)（accepted：Coze 集成，Word/Markdown/TXT，拒 PDF/图片）。ADR-012 状态改为 superseded（原文保留）。

仓库根 `AGENTS.md`：执行代理规则入口（读取顺序、用户裁决、风格冻结、迁移所有权、禁止事项、完成定义、验证命令）；`CLAUDE.md` 由 P11 补（parity E2）。
