/**
 * C-06：知识库详情 / 更新 / 删除（`/api/knowledge-bases/[id]`，权限 kb:list/edit/delete）。
 * - 更新：契约 knowledgeBaseUpdateSchema（部分字段；仅保留请求体出现的键，避免 partial 默认值覆盖）
 * - 删除：级联清理文件（含磁盘与 Knowledge 切片）与孤儿条目（kb/bases.deleteBaseCascade）
 */
import { notFound, success } from "@/lib/api-response";
import { ApiHttpError, parseBody, parseId, withApi } from "@/lib/api-handler";
import { knowledgeBaseUpdateSchema } from "@/contracts/kb";
import { deleteBaseCascade } from "@/lib/kb/bases";
import { prisma } from "@/lib/prisma";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { id: string };

/** GET /api/knowledge-bases/[id] */
export const GET = withApi<IdParams>(
  async ({ params }) => {
    const id = parseId(params.id);
    const base = await prisma.knowledgeBase.findUnique({ where: { id } });
    if (!base) return notFound("知识库不存在");
    return success(base, "获取知识库成功");
  },
  { permission: "kb:list", errorMessage: "获取知识库失败", route: "knowledge-bases/GET:id" }
);

/** PUT /api/knowledge-bases/[id] */
export const PUT = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    if (!(await prisma.knowledgeBase.findUnique({ where: { id } }))) return notFound("知识库不存在");
    const parsed = await parseBody(request, knowledgeBaseUpdateSchema);
    const base = await prisma.knowledgeBase.update({ where: { id }, data: parsed });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "update",
      title: base.name,
      before: { id },
      after: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(base, "更新知识库成功");
  },
  { permission: "kb:edit", errorMessage: "更新知识库失败", route: "knowledge-bases/PUT:id" }
);

/** DELETE /api/knowledge-bases/[id]：级联删除 */
export const DELETE = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const res = await deleteBaseCascade(id);
    if (!res.ok) throw new ApiHttpError(404, res.message ?? "知识库不存在");
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "delete",
      title: res.base?.name ?? String(id),
      before: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ id, orphanChunks: res.orphanChunks ?? 0 }, "删除知识库成功（已级联清理文件与切片）");
  },
  { permission: "kb:delete", errorMessage: "删除知识库失败", route: "knowledge-bases/DELETE:id", conflictMessage: { foreignKey: "知识库存在关联数据，无法删除" } }
);