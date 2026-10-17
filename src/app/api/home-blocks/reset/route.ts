import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { homeBlocksResetRequestSchema } from "@/contracts/blocks";
import { DEFAULT_HOME_BLOCK_ORDER, getBlockDefinition } from "@/lib/block-registry";

export const dynamic = "force-dynamic";

/**
 * POST /api/home-blocks/reset：恢复默认（ADR-024）——删除 home 模板全部 TemplateBlock 后按注册表默认顺序重建
 * （sort=(i+1)*10、config 置空 = 全部启用、无覆盖配置）；前台 resolveHomeBlocks() 随即回 main 原样渲染。
 * 破坏性操作：请求体须 { confirm: true }（契约 literal）；block:edit。
 */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, homeBlocksResetRequestSchema);
    const template = await prisma.pageTemplate.findUnique({ where: { code: input.templateCode } });
    if (!template) return success({ reset: 0 }, "模板不存在，无需恢复");
    await prisma.templateBlock.deleteMany({ where: { templateId: template.id } });
    let created = 0;
    for (const [i, code] of DEFAULT_HOME_BLOCK_ORDER.entries()) {
      const block = await prisma.contentBlock.findUnique({ where: { code } });
      if (!block || !getBlockDefinition(code)) continue;
      await prisma.templateBlock.create({ data: { templateId: template.id, blockId: block.id, sort: (i + 1) * 10, config: null } });
      created += 1;
    }
    return success({ reset: created }, "已恢复默认区块配置");
  },
  { permission: "block:edit", route: "home-blocks/reset/POST", errorMessage: "恢复默认失败" }
);
