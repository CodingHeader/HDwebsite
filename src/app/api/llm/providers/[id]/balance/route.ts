import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { providerBalanceSchema } from "@/contracts";
import { getAllSettings } from "@/lib/settings";
import { notifyEvent } from "@/lib/notify-gateway";
import { managerLink } from "@/lib/app-origin";

export const dynamic = "force-dynamic";

/** POST /api/llm/providers/[id]/balance：余额人工填报（ADR-005）+ 阈值检查；低于阈值即发 llm_balance_low 邮件（P06） */
export const POST = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const input = await parseBody(request, providerBalanceSchema);
    const existing = await prisma.lLMProvider.findUnique({ where: { id } });
    if (!existing) return notFound("供应商不存在");
    // P06：llmBalanceThreshold 为非公开键，须用 getAllSettings 读取
    const settings = await getAllSettings();
    const threshold = existing.balanceThreshold ?? Number(settings.llmBalanceThreshold || 0);
    const provider = await prisma.lLMProvider.update({
      where: { id },
      data: { balance: input.balance, balanceCurrency: input.balanceCurrency, balanceCheckedAt: new Date() },
    });
    await logOperation({
      userId: session.id, username: session.username, module: "llm",
      action: "balance", title: provider.name,
      after: { balance: input.balance },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    const lowBalance = threshold > 0 && input.balance <= threshold;
    if (lowBalance) {
      await notifyEvent("llm_balance_low", {
        title: `模型「${provider.name}」余额不足`,
        detail: `当前余额 ${provider.balance} ${provider.balanceCurrency}，阈值 ${threshold}。请及时充值并回填余额。`,
        link: await managerLink("llm-providers"),
      });
    }
    return success({ balance: provider.balance, lowBalance, threshold }, lowBalance ? "已填报：余额低于提醒阈值（已发提醒邮件）" : "余额填报成功");
  },
  { permission: "llm:edit", route: "llm/providers/balance", errorMessage: "余额填报失败" }
);
