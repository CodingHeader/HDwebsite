---
id: PRJMAP-001
type: project-map
title: 项目目录结构与文档关联关系
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-10
---

# Project Map

## 1. 文档目录结构（docs/get/）

```text
docs/get/
├── README.md                     # 提取总索引（根级入口）
├── talk.md                       # 对话 QA 递增记录（Q1~Q10）
├── new-features.md               # N1~N11 新增设计方案综合（2026-10-11 收录）
├── 01~16-*.md                    # 根级设计提取文档（16 个，设计事实权威来源）
│
├── 00_governance/                # 治理
│   ├── document-index.md         # 文档总索引
│   ├── project-map.md            # 本文件：结构与关联关系
│   ├── document-standard.md      # 文档规范落地约定
│   ├── glossary.md               # 术语表
│   ├── stakeholders.md           # 角色与责任
│   ├── risks.md                  # 风险登记（治理级）
│   ├── assumptions.md            # 假设登记
│   └── dependencies.md           # 依赖登记
│
├── 01_product/                   # 产品定义
│   ├── product-definition.md
│   └── success-metrics.md
│
├── 02_requirements/              # 需求系统
│   ├── inbox/                    # 新需求原始入口
│   ├── features/                 # 功能需求 REQ-F-001~011
│   ├── non-functional/           # 非功能需求 REQ-NF-001~004
│   ├── constraints/              # 约束需求 REQ-C-001~003
│   ├── product-requirements.md   # 当前需求基线
│   └── backlog.md                # 待办池
│
├── 03_solution/                  # 方案与设计
│   ├── architecture.md           # 架构设计
│   ├── solutions/                # 执行方案 SOL-001~006
│   └── decisions/                # 决策记录 ADR-001~008 ＋ ADR-009~021
│
├── 04_planning/                  # 计划
│   ├── roadmap.md
│   ├── milestones.md             # M1~M4
│   └── current-plan.md
│
├── 05_execution/                 # 执行
│   ├── task-template.md
│   ├── tasks/                    # 任务文件（TASK-M1-001~011，全部 done）
│   └── task-index.md
│
├── 06_validation/                # 验证
│   ├── validation-plan.md
│   └── evidence/                 # 证据（EVD-M1/verification.log，M1 已留证）
│
├── 07_release/                   # 发布
│   └── changelog.md
│
└── 08_knowledge/                 # 知识
    ├── lessons-learned.md
    └── technical-notes.md
```

> 09_archive/ 遵循"首个归档发生时创建"策略（见 document-standard.md §8）。

## 2. 文档关联关系

### 2.1 核心追溯链

```text
REQ-INBOX-20261010-001
        ↓
REQ-F-001~011 / REQ-NF-001~004 / REQ-C-001~003
        ↓
SOL-001~006 ＋ ADR-001~008（C1~C8）＋ ADR-009~021（提问轮）
        ↓
PLAN（roadmap / milestones / current-plan）
        ↓
WP（SOL 内 Work Package 分解）
        ↓
TASK-xxx（05_execution/tasks/）
        ↓
VAL-xxx ＋ EVD-xxx（06_validation/）
        ↓
REL（07_release/changelog.md）
```

### 2.2 关键关联说明

| 来源文档 | 目标文档 | 关联关系 |
| --- | --- | --- |
| REQ-INBOX-20261010-001 | REQ-F-001~011 | 原始 11 项需求经分析归档为正式功能需求 |
| REQ-F-xxx | SOL-001~006 | 需求按落地顺序 S1~S6 分组为六个执行方案 |
| C1~C8（README §4 决策表） | ADR-001~008 | 决策会谈结论正式化为 ADR |
| 根级 01~16 提取文档 | 体系各文档 | 提取文档 = 设计事实权威来源；体系文档引用不复制 |
| SOL-xxx | milestones.md M1~M4 | 方案编排进里程碑（M1=S1，M2=S2+S3，M3=S4+S5，M4=S6） |
| TASK-xxx | VAL/EVD | 任务完成 → 验证 → 证据链 |
| risks/assumptions/dependencies | SOL/REQ | 治理登记项被方案与需求引用（RISK/ASM/DEP 编号） |

### 2.3 根级提取文档 ↔ 体系文档映射

| 提取文档（权威来源） | 对应体系文档（引用方） |
| --- | --- |
| 01-需求设计.md（N1~N11、C1~C6） | REQ-F-001~011、ADR-001~006、product-requirements.md |
| 16-新增设计.md（§1~§12、S1~S6） | SOL-001~006、roadmap.md、backlog.md、ADR-007/008 |
| 02/03/04-前端/后端/数据设计.md | architecture.md、REQ-C-001 |
| 10-性能设计.md（P1~P7、预算） | REQ-NF-001、risks.md |
| 14-存储设计.md（S1~S5） | REQ-NF-004、risks.md、REQ-NF-002 |
| 12-知识库设计.md（K1~K5） | REQ-F-006/007、SOL-002 |
| 08-复用设计.md（R1~R7） | backlog.md 技术债项、SOL 各方案复用约束 |
| 13-响应设计.md | REQ-NF-001、validation-plan.md（合同验证） |
| 05-交互设计.md（埋点实证） | REQ-NF-003、lessons-learned.md、backlog.md 埋点决策项 |
| 11/15-配置/资源设计.md | dependencies.md、REQ-C-003 |

## 3. 当前项目文档状态总览

| 文档 | 路径 | 状态 |
| --- | --- | --- |
| 设计提取（16 文档 + README + talk） | docs/get/ 根级 | ✅ 已完成（2026-10-10） |
| 文档管理体系（本体系） | 00_governance ~ 08_knowledge | ✅ 已建立（2026-10-10） |
| 需求基线 | 02_requirements/product-requirements.md | ✅ 已创建（含 §6 可追溯性矩阵） |
| 决策 ADR-001~008 ＋ ADR-009~022 | 03_solution/decisions/ | ✅ 已创建（全部 accepted；022 为执行轮 B 仓补录） |
| 执行方案 SOL-001~006 | 03_solution/solutions/ | ✅ 已创建（proposed，M1 开工时转 active） |
| 可追溯性矩阵 | 02_requirements/product-requirements.md §6 | ✅ 已建立（2026-10-11） |
| 里程碑与当前计划 | 04_planning/ | ✅ 已创建 |
| 原子任务 | 05_execution/tasks/ | 🚧 待创建（S1 启动时拆解） |
| 验证记录与证据 | 06_validation/ | 🚧 待创建（随执行产生） |
| 成功指标 | 01_product/success-metrics.md | ⚠️ 草案（目标值 M1 验收时确认，Q7 轮定时点） |
| new-features.md（N1~N11 设计综合） | docs/get/ 根级 | ✅ 已收录（2026-10-11 并发出现，核验一致后注册） |

## 4. 更新规则

- 新增重要文档 → 同步更新 document-index.md 与本文件 §3。
- 目录结构重大变化 → 同步更新本文件 §1。
- 本文件不存储任何需求、任务、决策的具体内容（仅结构与关联）。
