import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { idParamSchema, providerBalanceSchema } from "@/contracts";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** POST /api/llm/providers/[id]/balance：余额人工填报（ADR-005）+ 阈值检查标记 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "llm:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = providerBalanceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  try {
    const existing = await prisma.lLMProvider.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("供应商不存在");
    const settings = await getSettings();
    const threshold = existing.balanceThreshold ?? Number(settings.llmBalanceThreshold || 0);
    const provider = await prisma.lLMProvider.update({
      where: { id: parsedId.data },
      data: {
        balance: parsed.data.balance,
        balanceCurrency: parsed.data.balanceCurrency,
        balanceCheckedAt: new Date(),
      },
    });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "llm",
      action: "balance", title: provider.name,
      after: { balance: parsed.data.balance },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    const lowBalance = threshold > 0 && parsed.data.balance <= threshold;
    return success({ balance: provider.balance, lowBalance, threshold }, lowBalance ? "已填报：余额低于提醒阈值" : "余额填报成功");
  } catch (err) {
    console.error("[llm/balance] 填报失败：", err);
    return serverError("余额填报失败");
  }
}
