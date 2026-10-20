import { crudUpdate, crudDelete } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { parseId } from "@/lib/api-handler";
import { notFound, success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { buildItemChannelsFor } from "@/lib/channels/content-hub-state";

const spec = crudSpecs["content-items"];
export const dynamic = "force-dynamic";

/**
 * 详情（B-07，ADR-034）：在 crudGet 语义上追加 `channels`（渠道状态 DTO）。
 * 不新建文件、不动 crud.ts——在允许路径内以 withApi 显式实现等价 crudGet。
 */
export const GET = withApi(
  async ({ params }) => {
    const id = parseId(params.id);
    const row = await prisma.contentItem.findUnique({ where: { id }, include: spec.include });
    if (!row) return notFound(`${spec.label}不存在`);
    const channels = await buildItemChannelsFor(id);
    return success({ ...row, channels }, `获取${spec.label}成功`);
  },
  { permission: `${spec.permission}:list`, errorMessage: `获取${spec.label}失败`, route: `${spec.model}/GET:id` }
);

export const PUT = crudUpdate(spec);
export const DELETE = crudDelete(spec);
