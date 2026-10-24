# V11-KB-02 执行证据（2026-10-25）
**现状盘点（审计属实，官方文档佐证）**：pushBatch 用 `documents[]/file_type:"txt"` 形态——官方 create_knowledge_files 要求 `document_bases[].source_info {file_type:"document", content}`（来源：coze.com/open/docs/developer_guides/create_knowledge_files，2026-10-24 核对；旧 mock 断言 file_type=txt 反向固化了错误形态）。
**改动**：pushBatch 改 document_bases（file_type=document + source_info.content）；移除推文档 payload 中的 space_id（官方 create-doc 无此字段，建库才有）。建库 createDataset 的 space_id/chunk_strategy/format_type 0 保留（正确）。
**验收**：kb-coze.test 适配后全绿（URL/Header/document_bases 结构/批次 ≤10）；collect-autokb C-08 断言同步官方形态。真实 Coze 行为 UNKNOWN（凭证缺失，维持口径）。
