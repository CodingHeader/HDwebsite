---
id: DOCSTD-001
type: project
title: 文档规范落地约定
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-10
---

# Document Standard（本项目文档规范）

> **权威规范**：`docs/项目完整文档体系.txt`（v1.1）。本文件是该规范在本项目（docs/get/）的落地约定，不复制其全文；冲突时以权威规范为准。

## 1. 范围

- 本体系管理 `docs/get/00_governance ~ 08_knowledge` 下的项目文档。
- `docs/get/` 根级 `01~16-*.md` 为设计提取文档（一次性提取基准 + 增量修订），属于设计事实权威来源，不套用本体系的模板与编号，仅被引用。
- `docs/get/talk.md` 为对话 QA 记录（辅助信息，非最终事实来源；会谈结论必须沉淀进 ADR/REQ，见规范 §35）。

## 2. 文档 ID 规范

| ID | 含义 | 示例 |
| --- | --- | --- |
| REQ-INBOX-YYYYMMDD-NNN | 需求入口 | REQ-INBOX-20261010-001 |
| REQ-F-NNN | 功能需求 | REQ-F-004 |
| REQ-NF-NNN | 非功能需求 | REQ-NF-002 |
| REQ-C-NNN | 约束需求 | REQ-C-001 |
| SOL-NNN | 执行方案 | SOL-001 |
| ADR-NNN | 决策记录 | ADR-001 |
| MILE-NNN | 里程碑 | MILE-001 |
| WP-NNN | Work Package | WP-001 |
| TASK-NNN | 原子任务 | TASK-001 |
| VAL-NNN | 验证记录 | VAL-001 |
| EVD-NNN | 证据目录 | EVD-001 |
| REL-NNN | 发布记录 | REL-001 |
| RISK-NNN / ASM-NNN / DEP-NNN | 风险/假设/依赖 | RISK-001 |

ID 一经分配不得变更；编号不复用。

## 3. 命名规范

```text
REQ-F-004-Markdown发布管线.md      # REQ：<ID>-<短横线中文短名>.md
SOL-001-基础基座.md                # SOL/ADR 同上
TASK-001-<短名>.md                 # TASK 固定路径 05_execution/tasks/
EVD-001/                           # 证据目录：<ID>/<证据文件>
```

## 4. Front Matter（正式文档必备）

```yaml
---
id: REQ-F-004
type: requirement-feature   # 见规范 §31
title: Markdown 发布管线
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---
```

## 5. 状态规范（规范 §33）

`draft → proposed → under-review → approved → active → superseded/archived`；特殊：`rejected / cancelled`。

| 状态 | 含义 |
| --- | --- |
| draft | 起草中 |
| approved / active | 已批准 / 生效中 |
| superseded | 被 ADR-xxx 取代（保留原文与 ID） |
| blocked | （任务）阻塞，须记录原因/缺失信息/已尝试方案/需谁处理 |

## 6. 模板索引

| 文档类型 | 模板位置 |
| --- | --- |
| 需求（REQ-F/NF/C） | 规范 §7（11 节结构），本项目已裁剪为 9 节 |
| Solution | 规范 §11.4 |
| ADR | 规范 §22 |
| Atomic Task | [05_execution/task-template.md](../05_execution/task-template.md) |
| Validation | 规范 §25 |
| Release Record | 规范 §27（首个发布时创建于 07_release/release-records/） |

## 7. 更新规则（规范 §43 映射）

| 触发 | 必须更新 |
| --- | --- |
| 需求变化 | REQ → SOL → backlog → current-plan → TASK → 相关 VAL |
| 方案变化 | SOL → architecture → ADR（如涉及决策）→ PLAN → TASK |
| 任务完成 | TASK → VAL → EVD；（必要时）changelog |
| 新增重要文档 | document-index.md + project-map.md §3 |

## 8. 历史与归档（规范 §36）

- 正式决策/需求不得删除或覆盖历史；用 `superseded / rejected / cancelled` 状态替代。
- `09_archive/` 于**首个归档发生时**创建（superseded/ cancelled/ obsolete 三个子目录），归档保留原 ID。
- 已删除但需留痕的内容：在 talk.md/changelog 记录处置事实（先例：英文草稿删除 → ADR-007 + changelog）。

## 9. AI Agent 执行规则（规范 §50 落地）

1. 任务执行前必须能从 TASK 关联字段定位 SOL/REQ/ADR；三者缺失且无法推断 → `status: blocked`。
2. 发现与上层事实（REQ/SOL/ADR/Scope）冲突 → 记录问题 → blocked/review → 等待正式决策，不得自行重定义。
3. 完成任务必须返回证据：完成了什么/修改了什么/验证了什么/结果如何/证据在哪里。
4. 完成定义（规范 §40）：`Done = Implementation + Acceptance + Verification + Evidence`。
5. 单会话产出原则：同一目录的文档产出须先核对现有清单，避免并发双体系（教训见 lessons-learned.md LL-001）。

## 10. 文档质量检查（规范 §49，定期自查）

完整性 / 一致性 / 可追溯性（REQ→TASK→EVD 双向）/ 时效性 / 唯一事实源 / 可验证性 / project-map 与 document-index 是否同步。
