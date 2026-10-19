/**
 * C-12：切片内容在线编辑（PATCH `/api/knowledge-files/[id]/chunks/[chunkId]`，权限 kb:edit）。
 * - body 用契约 knowledgeChunkUpdateSchema（仅 content，1..20000 字符）
 * - chunkId 走路径参数（parseId 校验）；编辑后 syncStatus 置 pending 待重新同步
 * - 注意：契约注释写 `/api/knowledge-chunks/[id]`，但该路径不属于 C 线所有权；
 *   故挂载于 C 线允许的 `/api/knowledge-files/**` 下，行为一致
 * - 路由参数名由 Next 推断为 { id, chunkId }（id 即 fileId）
 */
import { success } from "@/lib/api-response";
import { ApiHttpError, parseBody, parseId, withApi } from "@/lib/api-handler";
import { knowledgeChunkUpdateSchema } from "@/contracts/kb";
import { updateChunk } from "@/lib/kb/manage";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string; chunkId: string };

/** PATCH /api/knowledge-files/[id]/chunks/[chunkId] */
export const PATCH = withApi<Params>(
  async ({ request, params, session }) => {
    const fileId = parseId(params.id);
    const chunkId = parseId(params.chunkId);
    const body = await parseBody(request, knowledgeChunkUpdateSchema);
    try {
      await updateChunk(chunkId, body.content);
    } catch (err) {
      if (err instanceof Error && err.message.includes("不存在")) throw new ApiHttpError(404, err.message);
      throw err;
    }
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "update-chunk",
      title: `切片 #${chunkId}`,
      after: { fileId, chunkId },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ chunkId, fileId }, "切片更新成功（待重新同步）");
  },
  { permission: "kb:edit", errorMessage: "更新切片失败", route: "knowledge-files/PATCH:id/chunks/:chunkId" }
);