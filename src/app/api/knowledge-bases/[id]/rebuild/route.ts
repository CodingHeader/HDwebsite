/**
 * C-12：知识库重建切片（`/api/knowledge-bases/[id]/rebuild`，权限 kb:edit）。
 * - POST：单库全量重建切片，复用 C-03 管线（read → parseByExt → chunkText → Knowledge 覆盖）
 * - 异步执行，立即返回 jobId（契约 kbRebuildResponseSchema）；进度走 C-06 已建的文件进度契约
 */
import { created, notFound } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { rebuildBase } from "@/lib/kb/manage";
import { prisma } from "@/lib/prisma";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/knowledge-bases/[id]/rebuild */
export const POST = withApi<Params>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const base = await prisma.knowledgeBase.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!base) return notFound("知识库不存在");
    const { jobId } = await rebuildBase(id);
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "rebuild",
      title: base.name,
      after: { jobId },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return created({ jobId }, "重建切片任务已启动");
  },
  { permission: "kb:edit", errorMessage: "重建切片失败", route: "knowledge-bases/POST:id/rebuild" }
);