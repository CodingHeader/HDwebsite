---
id: REQ-F-007
type: requirement-feature
title: 知识库管理（库管理、文件管理、其他管理）
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-12
---

# REQ-F-007：知识库管理

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 7 条："知识库模型管理、知识库中的文件管理、其他管理"） |
| 对应原编号 | N7 |
| 优先级 | P0（M2） |

## 2. 背景

现状 Knowledge 单表扁平（12-知识库 K1~K5）：无库/文件层级、contains 检索粗糙、不切片、无导入导出、无采集接入位，无法支撑 N6 的自动入库与 AI 质量要求。

## 3. 目标

知识库升级为"库 → 文件 → 切片"三级模型，配套三类管理界面，支撑人工维护 + 采集自动入库双流量。

### 用户故事

作为知识库管理员，我想按"库→文件→切片"三级维护知识并批量导入文档，以便检索命中更准、维护更省。

## 4. 需求描述

三级模型：KnowledgeBase（库：code/name/description/isDefault/vectorProvider 预留）、KnowledgeFile（文件：title/format/content/source/collectItemId 回链/status）、KnowledgeChunk（切片：seq/content ≤800 字/tags/priority/keywords/embedding 预留）。
三类管理（对应原始需求三块）：
- **库管理（模型管理）**：库 CRUD、默认库指定、向量模型配置（预留）、库统计
- **文件管理**：文件树/列表、markdown 在线编辑、导入（md/txt/docx）、导出、批量启停、采集产物审核
- **其他管理**：标签管理、切片重建任务、检索测试（输入问题 → 预览命中 chunk）、回收站

## 5. 范围

### In Scope

- 三级模型 + 三类管理页 + Chunk 级检索（tags contains + priority，take 6，带 [库名] 标题前缀注入）
- 数据迁移：现有 Knowledge 单表数据迁入默认库（K5 解决）

### Out of Scope

- 向量语义检索（embedding 字段预留，Icebox ICE-VEC）
- 知识库权限隔离（按库授权给不同运营，二期）
- docx 解析复杂版式（正文提取为主）

## 6. 约束与依赖

- 检索预算（REQ-NF-001）：命中 ≤6 chunk、注入 token 上限维持现状量级
- 依赖 SOL-001（调度基座：切片重建任务）

## 7. 验收条件

- [x] 三级模型落地，现有 Knowledge 数据无损迁入默认库（计数核对）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 库/文件/其他三类管理页全部可用（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 导入 md/txt/docx 成功率 ≥95%（常规文档），导入后可编辑（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 切片重建任务可对单库/单文件重跑（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] 检索测试工具返回命中 chunk 及归属（库名/文件/标签）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）
- [x] AI 场景检索改走 Chunk 级（ChatScene 绑定 baseId 列表，tags 库内过滤）（证据：docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md）

## 8. 影响分析

- `/manager/knowledge` 单表页升级为三页；ChatScene 配置项扩展（knowledgeTags → baseId 列表 + tags）
- 替换 chat/completion 检索实现（注入格式带前缀）

## 9. 关联文档

- Solution：SOL-002
- 设计提取：12-知识库设计 §3（权威设计）、16-新增设计 §6
- Plan：M2（S2）

---

## 2026-10-10 决策更新（ADR-020）

需求实现方式变更：知识库管理主体移至外部平台（选型未定），项目内不部署三级知识库。本需求收敛为：①KBAdapter 适配层与外部库连接配置；②检索测试界面；③本地兜底条目管理（沿用现有 Knowledge 表）。验收条件相应改为"外部库检索可用 + 本地兜底可用 + 采集产物可推送外部库"。

---

## 2026-10-12 用户裁决更新（ADR-025，关闭 U-B3）

- **知识库形态**：通过扣子（Coze）集成——本端知识库映射 Coze 文本知识库（dataset），本端文件映射 Coze document；本地兜底条目（Knowledge）保留，用于非 Coze 模型的检索注入与 Coze 不可用时兜底（ADR-020 双轨口径不变）。
- **可上传文件类型（唯一口径，取代上文"导入 md/txt/docx"）**：Word（`.docx`、`.doc`）、Markdown（`.md`、`.markdown`）、TXT（`.txt`）。**不接受 PDF，不接受图片**；前端 `accept` 与后端扩展名 + MIME + 文件头三重校验，拒绝时返回 400 与中文提示。
- Markdown 以 `txt` 类型上传到 Coze（Coze 文本知识库本地文件仅支持 pdf/txt/doc/docx）。
- 验收条件相应调整：
  - [ ] 后台可新建/绑定/编辑/删除知识库（含 Coze dataset 映射与同步状态）。
  - [ ] 上传 .docx/.doc/.md/.txt 成功并显示 Coze 处理状态；上传 .pdf 或任一图片被拒绝（400，中文提示）——自动化测试。
  - [ ] 删除文件同时删除 Coze document 与本地兜底条目（mock 测试）。
  - [ ] 检索测试页分别显示 Coze 链路与本地兜底链路的结果；无 Coze 凭证/权限时给出明确提示。
  - [ ] Coze 真实联调：本轮无本仓可用凭证 → UNKNOWN（以 mock 契约测试验证请求形态）。
- 落地方向：P12（主）；P09（KnowledgeBackend 注册表）、P06（采集默认入库）、P14（上传文件存储路径）。
