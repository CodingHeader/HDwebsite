/**
 * main 嵌套路径兼容层（parity B6）：/api/campus/[id]/images
 * 唯一数据契约仍是扁平 /api/campus-images[/id]（crudSpecs["campus-images"]）；本路由只做路径适配：
 * - GET：该校区全部图片（数组，main 口径；campus:list）
 * - POST：为该校区新增图片（body 同 campusImageCreateSchema，campusId 取自路径；campus:create）
 */
import { prisma } from "@/lib/prisma";
import { created, notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { campusImageCreateSchema } from "@/contracts";

export const dynamic = "force-dynamic";

type Params = { id: string };
const bodySchema = campusImageCreateSchema.omit({ campusId: true });

export const GET = withApi<Params>(
  async ({ params }) => {
    const campusId = parseId(params.id, "非法的校区 ID");
    const campus = await prisma.campus.findUnique({ where: { id: campusId }, select: { id: true } });
    if (!campus) return notFound("校区不存在");
    const images = await prisma.campusImage.findMany({ where: { campusId }, orderBy: [{ sort: "asc" }, { id: "asc" }] });
    return success(images, "获取校区图片成功");
  },
  { permission: "campus:list", errorMessage: "获取校区图片失败", route: "campus/images/GET" }
);

export const POST = withApi<Params>(
  async ({ request, params, session }) => {
    const campusId = parseId(params.id, "非法的校区 ID");
    const input = await parseBody(request, bodySchema);
    const campus = await prisma.campus.findUnique({ where: { id: campusId }, select: { id: true } });
    if (!campus) return notFound("校区不存在");
    const image = await prisma.campusImage.create({ data: { ...input, campusId } });
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "campus",
      action: "create",
      title: `校区图片 #${image.id}`,
      after: { id: image.id, campusId },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return created(image, "添加成功");
  },
  { permission: "campus:create", errorMessage: "添加校区图片失败", route: "campus/images/POST" }
);
