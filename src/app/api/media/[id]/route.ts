import { crudGet, crudDelete } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { mediaUpdateSchema } from "@/contracts";

const spec = crudSpecs["media"];
export const dynamic = "force-dynamic";

export const GET = crudGet(spec);
export const DELETE = crudDelete(spec);

/** PATCH /api/media/[id]：改名 / 改分类 / 改类型（media:edit；main parity B7） */
export const PATCH = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法的媒体 ID");
    const input = await parseBody(request, mediaUpdateSchema);
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) return notFound("媒体不存在");
    const updated = await prisma.media.update({
      where: { id },
      data: {
        ...(input.filename !== undefined && { filename: input.filename }),
        ...(input.category !== undefined && { category: input.category || null }),
        ...(input.type !== undefined && { type: input.type }),
      },
      include: spec.include,
    });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "media",
      action: "update",
      title: updated.filename,
      before: { id, filename: existing.filename, category: existing.category, type: existing.type },
      after: { id, filename: updated.filename, category: updated.category, type: updated.type },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(updated, "更新媒体成功");
  },
  { permission: "media:edit", errorMessage: "更新媒体失败", route: "media/PATCH:id" }
);
