import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { created, error, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { encryptField, maskSecret } from "@/lib/crypto";
import { listQuerySchema } from "@/contracts";
import { llmProviderCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** GET /api/llm/providers：供应商列表（apiKey 脱敏） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "llm:list");
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error.issues);
  const { page, limit, keyword } = parsed.data;
  try {
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
  } catch (err) {
    console.error("[llm/providers/GET] 查询失败：", err);
    return serverError("获取供应商列表失败");
  }
}

/** POST /api/llm/providers：新建（apiKey 加密落库；isDefault/isFallback 唯一性保护） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "llm:edit");
  if (!guard.ok) return guard.response;
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = llmProviderCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
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
      userId: guard.session.id, username: guard.session.username, module: "llm",
      action: "create", title: provider.name, after: { id: provider.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return created({ ...provider, apiKey: maskSecret(provider.apiKey) }, "创建供应商成功");
  } catch (err) {
    console.error("[llm/providers/POST] 创建失败：", err);
    return serverError("创建供应商失败");
  }
}
