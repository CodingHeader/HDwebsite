import { prisma } from "@/lib/prisma";
import { created, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { encryptField, maskSecret } from "@/lib/crypto";
import { parseBody, parseQuery, withApi } from "@/lib/api-handler";
import { listQuerySchema } from "@/contracts";
import { llmProviderCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** GET /api/llm/providers：供应商列表（apiKey 脱敏）——C-01 迁 withApi */
export const GET = withApi(
  async ({ request }) => {
    const { page, limit, keyword } = parseQuery(request, listQuerySchema);
    const where = keyword ? { OR: [{ name: { contains: keyword } }, { model: { contains: keyword } }] } : {};
    const [rows, total] = await Promise.all([
      prisma.lLMProvider.findMany({ where, orderBy: [{ priority: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
      prisma.lLMProvider.count({ where }),
    ]);
    const list = rows.map((r) => ({
      ...r,
      apiKey: maskSecret(r.apiKey),
    }));
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取供应商列表成功");
  },
  { permission: "llm:list", route: "llm/providers/list", errorMessage: "获取供应商列表失败" }
);

/** POST /api/llm/providers：新建（apiKey 加密落库；isDefault/isFallback 唯一性保护）——C-01 迁 withApi */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, llmProviderCreateSchema);
    if (input.isDefault) {
      await prisma.lLMProvider.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    if (input.isFallback) {
      await prisma.lLMProvider.updateMany({ where: { isFallback: true }, data: { isFallback: false } });
    }
    const provider = await prisma.lLMProvider.create({
      data: {
        name: input.name,
        endpoint: input.endpoint,
        apiKey: encryptField(input.apiKey),
        isEncrypted: true,
        model: input.model,
        botId: input.botId || null,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        priority: input.priority,
        isDefault: input.isDefault,
        isFallback: input.isFallback,
        balanceThreshold: input.balanceThreshold ?? null,
        dailyQuota: input.dailyQuota,
        rateLimit: input.rateLimit,
        status: input.status,
      },
    });
    await logOperation({
      userId: session.id, username: session.username, module: "llm",
      action: "create", title: provider.name, after: { id: provider.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return created({ ...provider, apiKey: maskSecret(provider.apiKey) }, "创建供应商成功");
  },
  { permission: "llm:edit", route: "llm/providers/create", errorMessage: "创建供应商失败" }
);
