/**
 * PATCH|PUT /api/llm/providers/order：供应商优先级批量排序（C-11 / G7）
 * ==========================================================
 * - 权限：llm:edit（permissionCatalog 只有 llm:list/edit；契约注释写 llm:update 但 auth.ts:80 无该动作 → 对齐可执行目录）
 * - 契约：llmProviderOrderSchema（W0-10 冻结于 src/contracts/llm.ts）
 * - 语义：ids 为逐个尝试的优先级序列（先到先试，失败兜底），与 ChatScene.providerIds 同构；
 *   第 i 位 → priority = i+1（小值优先，1 最高）
 * - 事务内批量写：先校验全部 id 存在（缺失 400 fieldErrors），再写 priority
 * - 方法：契约注释用 PUT；卡输出用 PATCH。两方法共用同一 handler（兼容两处调用方）
 */
import { prisma } from "@/lib/prisma";
import { success, validationError } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { llmProviderOrderSchema } from "@/contracts/llm";

export const dynamic = "force-dynamic";

async function reorder({ request }: { request: Request }): Promise<Response> {
  const { ids } = await parseBody(request, llmProviderOrderSchema);

  // 1. 校验全部 id 存在（缺失 → 400 fieldErrors，与契约 ② 一致）
  const found = await prisma.lLMProvider.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const foundSet = new Set(found.map((f) => f.id));
  const missing = ids.filter((id) => !foundSet.has(id));
  if (missing.length) {
    return validationError([{ path: ["ids"], message: `供应商不存在：${missing.join(",")}` }]);
  }

  // 2. 事务内按序写 priority（第 i 位 → i+1）
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.lLMProvider.update({ where: { id }, data: { priority: i + 1 } })
    )
  );

  return success({ ids, priority: ids.map((_, i) => i + 1) }, "优先级已更新");
}

/** PATCH /api/llm/providers/order（卡输出约定） */
export const PATCH = withApi(reorder, {
  permission: "llm:edit",
  route: "llm/providers/order",
  errorMessage: "更新优先级失败",
});

/** PUT /api/llm/providers/order（契约注释约定） */
export const PUT = withApi(reorder, {
  permission: "llm:edit",
  route: "llm/providers/order",
  errorMessage: "更新优先级失败",
});