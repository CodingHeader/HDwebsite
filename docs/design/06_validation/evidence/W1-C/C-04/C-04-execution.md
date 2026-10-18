# C-04 执行证据：Coze 知识库客户端（建库 / 推文档 ≤10 批 / 进度 / 删除 + 错误映射 + 自注册）

- 5W1H 简版：Who=执行线 C（lane/c-ai-kb）；What=`src/lib/kb/coze.ts` Coze 知识库客户端（8 单测全 mock）+ `src/lib/coze.ts` 抽出公共请求头 + `kb-sync` 无凭证记原因；When=2026-10-17（北京时间）；Why=S-C4 文件同步到 Coze（ADR-025 §3/§6/§7；R-P9）；How=fetch 可注入（`setCozeFetch`）保证零触网；自注册到 C-02 统一注册表。

## 接口核对（步骤 1）
- 依据 `src/lib/coze.ts` 既有实现（chat 域已按 Coze Open API v3 落地，含 `4011/4101/4102/4013` 错误码注释）+ ADR-025 §3 明文要求（`Authorization: Bearer`、`Agw-Js-Conv: str`、`chunk_strategy` 必传、`format_type 0`）。
- **未联网核对 docs.coze.cn**（当前环境无外部网络访问工具；以仓内既有实现 + ADR 冻结口径为准）。已核对日期口径：本卡执行日 **2026-10-17**；端点路径按仓内既有 v3 惯例与 ADR 口径落地为 `/open_api/knowledge/document/{create,list,delete}`。**登记为需 C-06 或首次真实联调时复核的项**（dataset 凭证本就 UNKNOWN）。

## 改动文件
- `src/lib/kb/coze.ts`（新）：`createDataset` / `pushDocuments`（**≤10/批**，`COZE_BATCH_SIZE = KB_MAX_FILES_PER_UPLOAD`）/ `getDocumentStatus`（0/1/9）/ `deleteDocuments` / `mapCozeError`（4000/4001/4011/**4013**/4101/7001 中文，未知码保留原文）/ `makeCozeBackend` / `selfRegisterCozeBackend` / `setCozeFetch`（注入）。
- `src/lib/coze.ts`（改）：抽出 `cozeHeaders(pat)`（Bearer + Content-Type + **`Agw-Js-Conv: str`**），原 `headers()` 变内部别名（既有调用点零改动）。
- `src/lib/kb-sync.ts`（改）：新增 `configureCozeBackendFromSettings()`（读 `kbCozeProviderId`/`kbCozeSpaceId`，解密 PAT，校验 kind=coze，自注册）；`processKbSyncQueue` 无适配器时返回 `reason`（**不抛错**）。
- `src/lib/__tests__/lane-c/kb-coze.test.ts`（新）：8 用例。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| URL/Header/body 正确 | PASS | url=`{apiBase}/open_api/knowledge/document/create`；`Authorization: Bearer`、**`Agw-Js-Conv: str`**；body 含 `dataset_id`/`space_id`/`chunk_strategy`（含 separator）/`format_type: 0` |
| 11 个文件分 2 批 | PASS | `COZE_BATCH_SIZE=10`；calls=2（10 + 1）；返回 11 个 id 顺序与输入一致 |
| md→txt | PASS | `file_type` 实测 `["txt","txt","docx","txt"]`（.md/.markdown→txt；.docx 保持；.txt 保持） |
| 4013 → 权限中文提示 | PASS | 抛错含「权限不足…dataset/document 权限」；`mapCozeError(4011)` 含「PAT 无效」；未知码保留原始信息 |
| 无凭证时 processKbSyncQueue 记录原因而非抛错 | PASS | 返回 `{adapter:null, failed:0, skipped:n, reason:"…未配置…"}`——**不抛** |
| 不改 instrumentation | PASS | `kb/coze.ts` 仅被 kb-sync 动态 import；instrumentation 文件无改动 |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest **381 passed**（+8 本卡）、build=0 |
| 越界检查 | PASS | `src/lib/kb/**`、`src/lib/coze.ts`、`src/lib/kb-sync.ts`、`src/lib/__tests__/lane-c/**`，越界 0 |

## 命令
```bash
npx vitest run src/lib/__tests__/lane-c/kb-coze.test.ts    # 8 passed
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0（vitest 381）
```

## UNKNOWN 及原因
- **Coze 真实端点路径未联网复核**：本环境无外部网络访问；按仓内 v3 惯例 + ADR-025 口径落地，**待首次真实凭证联调（或 C-06 合并后）复核**并回填本文件。
- Coze dataset/PAT 真实联调：凭证缺失（既定 UNKNOWN），全部用 mock 覆盖。
- `dataset_id` 与 `document_id` 的返回字段名兼容（`dataset_id|id`、`document_id|id`）已做双向兜底，避免字段命名差异导致失败。

## 后续方向待办
- C-05：本地检索按库过滤 + 加权（可消费 `localBackend`）。
- C-06（依赖 C-04 + C-05）：知识库 API（库 CRUD+同步、文件上传三重校验、进度、kb/test 扩 baseIds/topK）——合并后 E-04/E-11 的 kb e2e 复跑。
