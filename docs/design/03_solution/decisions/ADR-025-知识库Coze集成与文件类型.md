---
id: ADR-025
type: decision
title: 知识库采用扣子（Coze）集成；可上传文件类型限定为 Word（.docx/.doc）、Markdown、TXT，拒绝 PDF 与图片
status: accepted
owner: 产品所有者
created: 2026-10-12
updated: 2026-10-12
requires: [REQ-F-006, REQ-F-007, REQ-F-008, REQ-F-009]
related: [ADR-020, ADR-023, ADR-016, PLAN-CURRENT]
---

# ADR-025：知识库 Coze 集成与文件类型

## Context（背景）

- P0 把"知识库形态与文件格式"登记为 BLOCKING 未知 U-B3（current-plan §3.4）：方案 A 本地优先（md/txt/html，Coze 可选同步）/ 方案 B 外部优先（管理 Coze 数据集映射 + 本地兜底）；另问是否需要 docx/pdf。
- 已有决策：ADR-020（知识库主体走外部平台）、ADR-023（选用 Coze；LLM provider kind=coze；KBAdapter 预留 CozeClient；PAT 无 dataset 权限时优雅降级）。
- Coze OpenAPI 事实（来源：https://docs.coze.cn/developer_guides_create_knowledge_files.md ，2026-10-12 读取）：
  - 上传接口 `POST https://api.coze.cn/open_api/knowledge/document/create`，权限 `createDocument`，Header 需 `Agw-Js-Conv: str`；本地文件以 `file_base64` + `file_type` 上传；**文本知识库本地文件仅支持 pdf、txt、doc、docx**（不含 md）；每次最多 10 个文件；`chunk_strategy` 必传（chunk_type 0 自动 / 1 自定义，max_tokens 100~2000）；仅知识库所有者可上传；返回 `document_infos[].document_id/status(0 处理中/1 完成/9 失败)`。
  - 创建知识库 `POST /v1/datasets`（需 `space_id`、`format_type` 0=文本）——来源：https://docs.coze.cn/developer_guides_create_dataset 。

## Decision（决策）

**2026-10-12 用户裁决：知识库通过 Coze 集成（U-B3 = 外部优先，即方案 B 口径）；可接受文件类型仅 Word（.docx/.doc）、Markdown（.md/.markdown）、TXT（.txt）；不接受 PDF，不接受图片。**

执行规格（P12 落地，P06/P09/P14 配合）：

1. **知识库 = Coze 文本知识库映射**：本端 `KnowledgeBase` 记录对应一个 Coze dataset（`cozeDatasetId`；可在后台"新建并同步到 Coze"或"绑定已有 dataset_id"）；本端 `KnowledgeFile` 记录对应 Coze document（`cozeDocumentId`、`cozeStatus`、进度、错误信息），后台可查看处理进度、重传、删除（同步删除 Coze document）。
2. **文件类型白名单（前后端双重校验）**：扩展名 ∈ {`.docx`, `.doc`, `.md`, `.markdown`, `.txt`}，同时校验 MIME 与文件头（docx 为 ZIP 头 `PK\x03\x04`，doc 为 OLE 头 `D0 CF 11 E0`，md/txt 须为合法 UTF-8 文本）。PDF（`%PDF` 头或 .pdf）与任何图片（image/* 或常见图片文件头）**一律拒绝**，返回 400 与中文提示："仅支持 Word（.docx/.doc）、Markdown（.md）、TXT 文件，不支持 PDF 和图片"。前端上传控件 `accept` 同口径。
3. **映射到 Coze file_type**：docx→`docx`，doc→`doc`，txt→`txt`，**md/markdown→`txt`**（Coze 不接受 md，Markdown 原文按 UTF-8 文本上传，不做渲染）。
4. **本地兜底条目**：上传时同时在本地解析出纯文本并切分为 `Knowledge` 条目（供 OpenAI 兼容模型的检索注入与 Coze 不可用时兜底，ADR-020 双轨）。txt/md 直接读取；docx 需新增解析依赖（候选 `mammoth`，P12 在证据中说明体积与安全影响后添加）；doc（旧二进制格式）本地解析如无可接受的纯 JS 依赖，则该文件仅在 Coze 侧解析，本地标记 `localParse=skipped` 并在后台明示。
5. **检索与对话**：provider kind=coze 时，知识问答由绑定了对应 dataset 的 Coze 智能体完成；其他 provider 使用本地兜底条目检索注入。对话场景（ChatScene）绑定知识库集合、模型优先级、提示词与参数（M-11），官网与公众号共用（M-12）。
6. **采集默认入库**（REQ-F-006、M-8）：采集条目（HTML→Markdown）在 `autoToKb=true` 时写入目标知识库：本地条目 + 以 `txt` 类型推送到对应 Coze dataset。
7. **凭证与降级**：Coze PAT、space_id 加密存储/脱敏回显（REQ-NF-002、ADR-023）；PAT 缺少 `createDocument`/dataset 权限或无凭证时，上传/同步返回明确的权限提示，本地兜底仍可用。本轮无可用于本仓的 Coze dataset 凭证 → 真实联调标 **UNKNOWN**，以 mock fetch 契约测试验证请求形态（URL、Header、body 字段、file_type 映射、错误处理）。
8. **大小限制**：单文件 ≤10MB（base64 膨胀约 1.33 倍）；Coze 侧单文件上限未在上述文档中写明 → 记为 UNKNOWN，联调时核实。

## Alternatives（备选方案）

| 方案 | 内容 | 结论 |
| --- | --- | --- |
| A 本地优先 | 本地库/文件实体为主，md/txt/html，Coze 可选同步 | 未采纳（用户选 Coze 集成） |
| B 外部优先（采纳，含本地兜底） | Coze 数据集映射 + 文件同步 + 本地兜底条目 | 采纳 |
| 支持 PDF/图片 | Coze 接口支持 pdf，图片需图片知识库 | 用户明确排除 |
| 支持 HTML 上传 | P0 方案 A 曾含 html | 不在用户允许的类型内，移除（采集链路内部的 HTML→Markdown 转换不受影响） |

## Consequences（后果）

- current-plan §3.4 U-B3 关闭；P12 提示词按本 ADR 重写（迁移字段、API、白名单、测试）。
- 新增依赖：docx 解析库 1 个（P12 说明理由）；不新增 PDF/图片解析依赖。
- 风险：Coze PAT 有效期（约 30 天级，ADR-023）与权限勾选；Coze 接口变更 → 封装于 `src/lib/kb/coze.ts` 单模块（P09 注册表）。

## Related

- ADR-020（外部知识库对接）、ADR-023（Coze 选型）、ADR-016（向量二期，仍后置）、REQ-F-006/007/008/009、current-plan §3.4 U-B3、P06/P09/P12/P14 提示词。
