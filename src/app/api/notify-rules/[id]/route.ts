import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { notifyRuleUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** PATCH /api/notify-rules/[id]：启停/换模板/换通知组 */
export const PATCH = withApi<{ id: string }>(
  async ({ request, params }) => {
    const id = parseId(params.id);
    const input = await parseBody(request, notifyRuleUpdateSchema);
    const existing = await prisma.notifyRule.findUnique({ where: { id } });
    if (!existing) return notFound("通知规则不存在");
    const rule = await prisma.notifyRule.update({
      where: { id },
      data: {
        enabled: input.enabled ?? undefined,
        templateId: input.templateId ?? undefined,
        recipientGroups: input.recipientGroups ? JSON.stringify(input.recipientGroups) : undefined,
        quietHours:
          input.quietHours === null
            ? null
            : input.quietHours
              ? JSON.stringify(input.quietHours)
              : undefined,
      },
      include: { template: true },
    });
    return success(rule, "更新通知规则成功");
  },
  { permission: "notify:edit", route: "notify-rules/PATCH", errorMessage: "更新通知规则失败", conflictMessage: { foreignKey: "邮件模板不存在" } }
);
