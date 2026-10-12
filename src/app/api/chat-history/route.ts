/**
 * GET /api/chat-history：对话日志（按会话聚合；log:list；main parity B11/C4）
 * - 每行 = 一个会话（sessionId + channel）：消息数、首/末条时间、末条用户消息摘要。
 * - 筛选：channel、sessionId、keyword（消息内容/会话 ID 模糊）、startDate~endDate。
 * - main 的公开 POST 不恢复：upgrade 由 /api/chat/stream 服务端写入（replaced，见 contracts chatHistoryQuerySchema 注释）。
 */
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { parseQuery, withApi } from "@/lib/api-handler";
import { chatHistoryQuerySchema } from "@/contracts";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async ({ request }) => {
    const q = parseQuery(request, chatHistoryQuerySchema);
    const where: Record<string, unknown> = {};
    if (q.channel) where.channel = q.channel;
    if (q.sessionId) where.sessionId = q.sessionId;
    if (q.keyword) where.OR = [{ message: { contains: q.keyword } }, { sessionId: { contains: q.keyword } }];
    if (q.startDate || q.endDate) {
      where.createdAt = { ...(q.startDate && { gte: q.startDate }), ...(q.endDate && { lte: q.endDate }) };
    }

    // 会话总数（distinct sessionId+channel）
    const allGroups = await prisma.aIChatHistory.groupBy({ by: ["sessionId", "channel"], where });
    const total = allGroups.length;

    const groups = await prisma.aIChatHistory.groupBy({
      by: ["sessionId", "channel"],
      where,
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true, id: true },
      orderBy: { _max: { id: "desc" } },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });

    // 末条用户消息摘要（每会话 1 次小查询，limit ≤ 100）
    const list = await Promise.all(
      groups.map(async (g) => {
        const last = await prisma.aIChatHistory.findFirst({
          where: { sessionId: g.sessionId, channel: g.channel, role: "user" },
          orderBy: { id: "desc" },
          select: { message: true, ipAddress: true, pageUrl: true },
        });
        return {
          id: g.sessionId,
          sessionId: g.sessionId,
          channel: g.channel,
          messageCount: g._count._all,
          firstAt: g._min.createdAt,
          lastAt: g._max.createdAt,
          lastUserMessage: last?.message ? last.message.slice(0, 120) : null,
          ipAddress: last?.ipAddress ?? null,
          pageUrl: last?.pageUrl ?? null,
        };
      })
    );

    return success(
      { list, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } },
      "获取对话日志成功"
    );
  },
  { permission: "log:list", errorMessage: "获取对话日志失败", route: "chat-history/GET" }
);
