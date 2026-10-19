/**
 * C-06：知识库文件详情 / 标签更新 / 删除（`/api/knowledge-files/[id]`，权限 kb:list/edit/delete）。
 * - GET：单文件详情（含切片数 chunkCount）
 * - PUT：仅更新 tags（契约 knowledgeFileUpdateSchema；KnowledgeFile.tags 列已存在）
 * - DELETE：级联删除本地切片与磁盘文件（ingest.deleteFileCascade）；Coze 远端删除见 C-12
 */
import { notFound, success } from "@/lib/api-response";
import { ApiHttpError, parseBody, parseId, withApi } from "@/lib/api-handler";
import { knowledgeFileUpdateSchema } from "@/contracts/kb";
import { deleteFileCascade } from "@/lib/kb/ingest";
import { prisma } from "@/lib/prisma";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { id: string };

/** GET /api/knowledge-files/[id] */
export const GET = withApi<IdParams>(
  async ({ params }) => {
    const id = parseId(params.id);
    const f = await prisma.knowledgeFile.findUnique({ where: { id } });
    if (!f || f.deletedAt) return notFound("文件不存在");
    return success(f, "获取文件成功");
  },
  { permission: "kb:list", errorMessage: "获取文件失败", route: "knowledge-files/GET:id" }
);

/** PUT /api/knowledge-files/[id]：更新 tags */
export const PUT = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    if (!(await prisma.knowledgeFile.findUnique({ where: { id } }))) return notFound("文件不存在");
    const parsed = await parseBody(request, knowledgeFileUpdateSchema);
    const f = await prisma.knowledgeFile.update({
      where: { id },
      data: { tags: JSON.stringify(parsed.tags ?? []) },
    });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "update",
      title: f.filename,
      before: { id },
      after: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(f, "更新文件成功");
  },
  { permission: "kb:edit", errorMessage: "更新文件失败", route: "knowledge-files/PUT:id" }
);

/** DELETE /api/knowledge-files/[id]：级联删除（本地切片 + 磁盘文件） */
export const DELETE = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const res = await deleteFileCascade(id);
    if (!res.ok) throw new ApiHttpError(404, res.message ?? "文件不存在");
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "delete",
      title: res.file?.filename ?? String(id),
      before: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ id, cozeDocumentId: res.file?.cozeDocumentId ?? null }, "删除文件成功（已级联清理切片）");
  },
  { permission: "kb:delete", errorMessage: "删除文件失败", route: "knowledge-files/DELETE:id" }
);