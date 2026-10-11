import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { idParamSchema } from "@/contracts";
import { notifyRuleUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** PATCH /api/notify-rules/[id]：启停/换模板/换通知组 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "notify:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = notifyRuleUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  try {
    const existing = await prisma.notifyRule.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("通知规则不存在");
    const rule = await prisma.notifyRule.update({
      where: { id: parsedId.data },
      data: {
        enabled: parsed.data.enabled ?? undefined,
        templateId: parsed.data.templateId ?? undefined,
        recipientGroups: parsed.data.recipientGroups ? JSON.stringify(parsed.data.recipientGroups) : undefined,
      },
      include: { template: true },
    });
    return success(rule, "更新通知规则成功");
  } catch (err) {
    console.error("[notify-rules/PATCH] 更新失败：", err);
    return serverError("更新通知规则失败");
  }
}

function inputGuard(v: boolean | undefined): boolean | undefined {
  return v;
}
