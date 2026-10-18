/**
 * C-04（ADR-025 §3/§6/§7）：Coze 知识库（dataset/document）客户端。
 * - 建库：POST {apiBase}/open_api/knowledge/document/create（chunk_strategy 必传、format_type 0）
 * - 推文档：**每批 ≤10**（契约 KB_MAX_FILES_PER_UPLOAD 同口径）
 * - 进度：POST /open_api/knowledge/document/list（document_infos[].status 0/1/9）
 * - 删除：POST /open_api/knowledge/document/delete
 * - md/markdown → txt（契约 COZE_FILE_TYPE_MAP）
 * - 错误映射：4013 等权限错误 → 中文提示（供 kb-sync 队列记录原因，不抛给用户）
 * - **自注册**：模块加载时 `registerKnowledgeBackend(cozeBackend)`（不改 instrumentation）
 *
 * fetch 可注入（`setCozeFetch`）——单测全用 mock，不触网。
 */
import { cozeHeaders } from "@/lib/coze";
import { httpFetch } from "@/lib/http-client";
import { cozeFileTypeOf, KB_MAX_FILES_PER_UPLOAD } from "@/contracts/kb";
import { registerKnowledgeBackend } from "@/lib/kb/registry";
import type { KnowledgeBackend, KbDocument, KbDocStatus } from "@/lib/kb/types";

const DEFAULT_API_BASE = "https://api.coze.cn";
/** 每批推文档上限（契约口径：单次 ≤10） */
export const COZE_BATCH_SIZE = KB_MAX_FILES_PER_UPLOAD;

export type CozeKbConfig = { pat: string; spaceId: string; apiBase?: string; timeoutMs?: number };

/** 可注入 fetch（测试用）；默认走项目 http-client（超时/重试/HttpError） */
type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; timeoutMs: number; logTag: string }) => Promise<Response>;
let fetchImpl: FetchLike = (url, init) => httpFetch(url, init);
export function setCozeFetch(f: FetchLike | null): void {
  fetchImpl = f ?? ((url, init) => httpFetch(url, init));
}

/** Coze 错误码 → 中文提示（ADR-025 §7） */
const COZE_ERROR_HINTS: Record<number, string> = {
  4000: "请求参数错误（请检查 space_id / 文档格式）",
  4001: "无效的访问令牌",
  4011: "Coze PAT 无效或已过期（请在模型供应商页更新）",
  4013: "Coze 权限不足：PAT 缺少 dataset/document 权限（请在 Coze 控制台为令牌勾选知识库读写权限）",
  4101: "Coze 智能体未发布",
  7001: "Coze 空间不存在或无权限（请检查 kbCozeSpaceId 设置）",
};

/** 把 Coze 错误码/HTTP 状态映射为中文消息（无匹配则保留原始信息） */
export function mapCozeError(code: number | undefined, message?: string): string {
  if (code != null && COZE_ERROR_HINTS[code]) {
    return message ? `${COZE_ERROR_HINTS[code]}（原始：${message}）` : COZE_ERROR_HINTS[code];
  }
  return message || `Coze 请求失败${code != null ? `（code ${code}）` : ""}`;
}

type CozeResponse<T> = { code: number; msg?: string; message?: string; data?: T };

async function callCoze<T>(cfg: CozeKbConfig, path: string, payload: Record<string, unknown>): Promise<T> {
  const apiBase = cfg.apiBase || DEFAULT_API_BASE;
  const res = await fetchImpl(`${apiBase}/open_api/knowledge/${path}`, {
    method: "POST",
    headers: cozeHeaders(cfg.pat),
    body: JSON.stringify(payload),
    timeoutMs: cfg.timeoutMs ?? 30_000,
    logTag: "coze-kb",
  });
  let body: CozeResponse<T> | null = null;
  try {
    body = (await res.json()) as CozeResponse<T>;
  } catch {
    body = null;
  }
  // HTTP 层错误（非 2xx）也走同一错误映射，保持提示一致
  const code = body?.code ?? (res.ok ? undefined : res.status);
  if (!res.ok || (body && body.code !== 0)) {
    throw new Error(mapCozeError(code, body?.msg ?? body?.message));
  }
  return (body?.data ?? ({} as T)) as T;
}

/** 单个文档的推送描述（md/markdown → txt：契约 COZE_FILE_TYPE_MAP） */
export type CozeDocInput = { name: string; content: string };

/**
 * 建库：以 space_id + name 创建 dataset。
 * 文档依据：Coze Open API `/open_api/knowledge/document/create`（见证据文件记录的核对日期）。
 */
export async function createDataset(cfg: CozeKbConfig, name: string, description?: string): Promise<{ datasetId: string }> {
  const data = await callCoze<{ dataset_id?: string; id?: string }>(cfg, "document/create", {
    // Coze 的 dataset 创建与文档创建同域；此处用 space_id 维度建库
    space_id: cfg.spaceId,
    name,
    ...(description ? { description } : {}),
    // ADR-025 §3：chunk_strategy 必传、format_type 0（文本）
    chunk_strategy: { separator: "\n\n", max_tokens: 800, remove_extra_spaces: false, remove_urls_emails: false },
    format_type: 0,
  });
  const datasetId = data.dataset_id ?? data.id;
  if (!datasetId) throw new Error("Coze 未返回 dataset_id");
  return { datasetId };
}

/** 单批推文档（调用方保证 ≤{@link COZE_BATCH_SIZE}） */
async function pushBatch(cfg: CozeKbConfig, datasetId: string, docs: CozeDocInput[]): Promise<string[]> {
  const data = await callCoze<{ document_infos?: { document_id?: string; id?: string }[] }>(cfg, "document/create", {
    dataset_id: datasetId,
    space_id: cfg.spaceId,
    // ADR-025 §3：chunk_strategy 必传、format_type 0；md/markdown 已由 cozeFileTypeOf 映射为 txt
    chunk_strategy: { separator: "\n\n", max_tokens: 800, remove_extra_spaces: false, remove_urls_emails: false },
    format_type: 0,
    documents: docs.map((d) => ({
      name: d.name,
      // Coze 文本知识库无 md 类型：由契约映射（md/markdown → txt；其余同名）
      file_type: cozeFileTypeOf(d.name) ?? "txt",
      content: d.content,
    })),
  });
  return (data.document_infos ?? []).map((x, i) => x.document_id ?? x.id ?? `${datasetId}-${i}`);
}

/** 推文档：自动按 ≤10 分批，返回全部 document_id（顺序与输入一致） */
export async function pushDocuments(cfg: CozeKbConfig, datasetId: string, docs: CozeDocInput[]): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < docs.length; i += COZE_BATCH_SIZE) {
    ids.push(...(await pushBatch(cfg, datasetId, docs.slice(i, i + COZE_BATCH_SIZE))));
  }
  return ids;
}

/** 进度查询：document_infos[].status（0 处理中 / 1 完成 / 9 失败） */
export async function getDocumentStatus(cfg: CozeKbConfig, datasetId: string, documentId: string): Promise<KbDocStatus> {
  const data = await callCoze<{ document_infos?: { status?: number; progress?: number; document_id?: string; error?: string }[] }>(
    cfg,
    "document/list",
    { dataset_id: datasetId, space_id: cfg.spaceId, document_ids: [documentId] }
  );
  const info = (data.document_infos ?? []).find((d) => d.document_id === documentId) ?? data.document_infos?.[0];
  const raw = info?.status;
  const status: KbDocStatus["status"] = raw === 0 || raw === 1 || raw === 9 ? raw : null;
  return { status, progress: typeof info?.progress === "number" ? info.progress : null, error: info?.error ?? null };
}

/** 删除文档 */
export async function deleteDocuments(cfg: CozeKbConfig, datasetId: string, documentIds: string[]): Promise<void> {
  await callCoze(cfg, "document/delete", { dataset_id: datasetId, space_id: cfg.spaceId, document_ids: documentIds });
}

/** coze 后端实现（注册到 C-02 的统一注册表） */
export function makeCozeBackend(getCfg: () => CozeKbConfig | null): KnowledgeBackend {
  return {
    name: "coze",
    // 检索走 cozeChat（kb-adapter.searchViaCoze），此处不由该后端承担
    search: async () => [],
    pushEntry: async (doc: KbDocument) => {
      const cfg = getCfg();
      if (!cfg) throw new Error("知识库同步未配置：请在站点设置填写 kbCozeProviderId / kbCozeSpaceId");
      const ids = await pushDocuments(cfg, doc.externalId ?? String(doc.baseId ?? "default"), [
        { name: doc.title, content: doc.content },
      ]);
      return { externalId: ids[0] ?? "" };
    },
    pushDocument: async (doc) => {
      const cfg = getCfg();
      if (!cfg) throw new Error("知识库同步未配置：请在站点设置填写 kbCozeProviderId / kbCozeSpaceId");
      const ids = await pushDocuments(cfg, String(doc.baseId ?? "default"), [{ name: doc.title, content: doc.content }]);
      return { documentId: ids[0] ?? "" };
    },
    removeDocument: async (externalId: string) => {
      const cfg = getCfg();
      if (!cfg) throw new Error("知识库同步未配置");
      await deleteDocuments(cfg, "default", [externalId]);
    },
    getDocumentStatus: async (externalId: string) => {
      const cfg = getCfg();
      if (!cfg) throw new Error("知识库同步未配置");
      return getDocumentStatus(cfg, "default", externalId);
    },
  };
}

/** 自注册（模块加载时；配置由调用方在运行时提供——未配置时方法抛中文提示，队列记录原因不崩） */
export function selfRegisterCozeBackend(getCfg: () => CozeKbConfig | null): void {
  registerKnowledgeBackend(makeCozeBackend(getCfg));
}
