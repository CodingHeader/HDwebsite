import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { encryptField, isEncryptedValue, maskSecret } from "@/lib/crypto";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { llmProviderUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** GET /api/llm/providers/[id]：供应商详情（apiKey 脱敏）——C-01 迁 withApi */
export const GET = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const provider = await prisma.lLMProvider.findUnique({ where: { id } });
    if (!provider) return notFound("供应商不存在");
    return success({ ...provider, apiKey: maskSecret(provider.apiKey) }, "获取供应商成功");
  },
  { permission: "llm:list", route: "llm/providers/detail", errorMessage: "获取供应商失败" }
);

/** PUT：更新（掩码 apiKey 跳过；isDefault/isFallback 唯一性）——C-01 迁 withApi */
export const PUT = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const input = await parseBody(request, llmProviderUpdateSchema);
    const existing = await prisma.lLMProvider.findUnique({ where: { id } });
    if (!existing) return notFound("供应商不存在");
    if (input.isDefault) {
      await prisma.lLMProvider.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
    }
    if (input.isFallback) {
      await prisma.lLMProvider.updateMany({ where: { isFallback: true, id: { not: id } }, data: { isFallback: false } });
    }
    const apiKey =
      input.apiKey && !isEncryptedValue(input.apiKey) && !input.apiKey.includes("****")
        ? encryptField(input.apiKey)
        : undefined;
    const provider = await prisma.lLMProvider.update({
      where: { id },
      data: {
        name: input.name,
        endpoint: input.endpoint,
        apiKey,
        model: input.model,
        botId: input.botId,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        priority: input.priority,
        isDefault: input.isDefault,
        isFallback: input.isFallback,
        balance: input.balance,
        balanceThreshold: input.balanceThreshold,
        dailyQuota: input.dailyQuota,
        rateLimit: input.rateLimit,
        status: input.status,
      },
    });
    await logOperation({
      userId: session.id, username: session.username, module: "llm",
      action: "update", title: provider.name, before: { id: provider.id }, after: { id: provider.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ ...provider, apiKey: maskSecret(provider.apiKey) }, "更新供应商成功");
  },
  { permission: "llm:edit", route: "llm/providers/update", errorMessage: "更新供应商失败" }
);

/** DELETE：删除供应商——C-01 迁 withApi */
export const DELETE = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const existing = await prisma.lLMProvider.findUnique({ where: { id } });
    if (!existing) return notFound("供应商不存在");
    await prisma.lLMProvider.delete({ where: { id } });
    await logOperation({
      userId: session.id, username: session.username, module: "llm",
      action: "delete", title: existing.name, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id }, "删除供应商成功");
  },
  { permission: "llm:edit", route: "llm/providers/delete", errorMessage: "删除供应商失败" }
);
