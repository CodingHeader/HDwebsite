# V11-KB-01 执行证据（2026-10-25）
**现状盘点（审计属实）**：pushDocument 能力存在于 coze 后端但无调用方——ingestFile 只落库切片，从不出网推送。
**改动**：kb/ingest.ts 新增 pushFileToCoze（fire-and-forget，不阻塞上传）：configuredCozeBackendFromSettings 装配 → base.cozeDatasetId 校验 → pushDocument（文件名+全文解析文本）→ OperationLog 记录结果/失败。解析失败的文件不推。
**验收**：上传链路代码接线（created 分支 void 调用）；失败隔离（不影响上传响应）；真实推送 UNKNOWN（凭证缺失）。
