/**
 * C-06：文件重解析（`/api/knowledge-files/[id]/reparse`，权限 kb:edit）。
 * 重新读取磁盘原文 → 解析 → 重建切片（删除旧切片 + 重建），更新 localParse/chunkCount。
 * 文件不存在 → 404；解析失败（如损坏）→ 200 且 localParse="failed"（前端展示原因）。
 */
import { success } from "@/lib/api-response";
import { ApiHttpError, parseId, withApi } from "@/lib/api-handler";
import { reparseFile } from "@/lib/kb/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { id: string };

/** POST /api/knowledge-files/[id]/reparse */
export const POST = withApi<IdParams>(
  async ({ params }) => {
    const id = parseId(params.id);
    const r = await reparseFile(id);
    if (!r.ok) throw new ApiHttpError(404, r.message ?? "文件不存在");
    return success({ id, localParse: r.localParse, chunkCount: r.chunkCount }, "重解析完成");
  },
  { permission: "kb:edit", errorMessage: "重解析失败", route: "knowledge-files/reparse/POST" }
);