import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { encryptField, isEncryptedValue, maskSecret } from "@/lib/crypto";
import { idParamSchema } from "@/contracts";
import { llmProviderUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "llm:list");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  const provider = await prisma.lLMProvider.findUnique({ where: { id: parsedId.data } });
  if (!provider) return notFound("供应商不存在");
  return success({ ...provider, apiKey: maskSecret(provider.apiKey) }, "获取供应商成功");
}

/** PUT：更新（掩码 apiKey 跳过；isDefault/isFallback 唯一性） */
export async function PUT(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "llm:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = llmProviderUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const existing = await prisma.lLMProvider.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("供应商不存在");
    if (input.isDefault) {
      await prisma.lLMProvider.updateMany({ where: { isDefault: true, id: { not: parsedId.data } }, data: { isDefault: false } });
    }
    if (input.isFallback) {
      await prisma.lLMProvider.updateMany({ where: { isFallback: true, id: { not: parsedId.data } }, data: { isFallback: false } });
    }
    const apiKey =
      input.apiKey && !isEncryptedValue(input.apiKey) && !input.apiKey.includes("****")
        ? encryptField(input.apiKey)
        : undefined;
    const provider = await prisma.lLMProvider.update({
      where: { id: parsedId.data },
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
      userId: guard.session.id, username: guard.session.username, module: "llm",
      action: "update", title: provider.name, before: { id: provider.id }, after: { id: provider.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ ...provider, apiKey: maskSecret(provider.apiKey) }, "更新供应商成功");
  } catch (err) {
    console.error("[llm/providers/PUT:id] 更新失败：", err);
    return serverError("更新供应商失败");
  }
}

/** DELETE：删除供应商 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "llm:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const existing = await prisma.lLMProvider.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("供应商不存在");
    await prisma.lLMProvider.delete({ where: { id: parsedId.data } });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "llm",
      action: "delete", title: existing.name, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id: parsedId.data }, "删除供应商成功");
  } catch (err) {
    console.error("[llm/providers/DELETE:id] 删除失败：", err);
    return serverError("删除供应商失败");
  }
}
