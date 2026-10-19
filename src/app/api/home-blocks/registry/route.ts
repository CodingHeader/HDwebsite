import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";
import { blockRegistryResponseSchema } from "@/contracts/blocks";
import { getBlockRegistry } from "@/lib/block-registry";

export const dynamic = "force-dynamic";

/** GET /api/home-blocks/registry：可插入首页的区块注册表（ADR-024；定义唯一源 src/lib/block-registry-defs.ts，E-03 只读） */
export const GET = withApi(
  async () => {
    const items = getBlockRegistry().map((def) => ({
      code: def.code,
      name: def.name,
      defaultOrder: def.order,
      fields: def.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
    }));
    // 契约自校验（W0 契约 blockRegistryItem）
    return success(blockRegistryResponseSchema.parse(items), "获取区块注册表成功");
  },
  { permission: "block:list", route: "home-blocks/registry/GET", errorMessage: "获取区块注册表失败" }
);
