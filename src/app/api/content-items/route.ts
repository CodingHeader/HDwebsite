import { crudList, crudCreate } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { buildItemChannels } from "@/lib/channels/content-hub-state";

const spec = crudSpecs["content-items"];
export const dynamic = "force-dynamic";

/**
 * 内容中枢渠道状态（B-07，ADR-034 派生字段）：列表行透传后合并 channels。
 * `spec.mapList` 的返回会被 `crudList` 直接用；不改共享 crud.ts。
 */
export const GET = crudList({
  ...spec,
  mapList: async (rows) => {
    const merged = spec.mapList ? await spec.mapList(rows) : rows;
    const states = await buildItemChannels(merged as { id: number }[]);
    return merged.map((r) => ({ ...r, channels: states.get(r.id as number) ?? [] }));
  },
});
export const POST = crudCreate(spec);
