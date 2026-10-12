/**
 * main 嵌套路径兼容层（parity B6）：/api/campus/[id]/images/[imageId]
 * - PUT：更新（campus:edit）　- DELETE：删除（campus:delete）
 * 图片必须属于路径中的校区，否则 404（防止跨校区操作）。
 */
import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { campusImageCreateSchema } from "@/contracts";

export const dynamic = "force-dynamic";

type Params = { id: string; imageId: string };
const updateSchema = campusImageCreateSchema.omit({ campusId: true }).partial();

async function findScoped(params: Params) {
  const campusId = parseId(params.id, "非法的校区 ID");
  const imageId = parseId(params.imageId, "非法的图片 ID");
  const image = await prisma.campusImage.findFirst({ where: { id: imageId, campusId } });
  return { campusId, imageId, image };
}

export const PUT = withApi<Params>(
  async ({ request, params, session }) => {
    const { campusId, imageId, image } = await findScoped(params);
    const input = await parseBody(request, updateSchema);
    if (!image) return notFound("图片不存在");
    const updated = await prisma.campusImage.update({ where: { id: imageId }, data: input });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "campus",
      action: "update",
      title: `校区图片 #${imageId}`,
      before: { id: imageId, campusId },
      after: { id: imageId, campusId },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(updated, "更新成功");
  },
  { permission: "campus:edit", errorMessage: "更新校区图片失败", route: "campus/images/PUT:id" }
);

export const DELETE = withApi<Params>(
  async ({ request, params, session }) => {
    const { campusId, imageId, image } = await findScoped(params);
    if (!image) return notFound("图片不存在");
    await prisma.campusImage.delete({ where: { id: imageId } });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "campus",
      action: "delete",
      title: `校区图片 #${imageId}`,
      before: { id: imageId, campusId },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ id: imageId }, "删除成功");
  },
  { permission: "campus:delete", errorMessage: "删除校区图片失败", route: "campus/images/DELETE:id" }
);
