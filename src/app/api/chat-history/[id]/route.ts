/**
 * /api/chat-history/[id]（id = sessionId；main 以单条记录 id 寻址，upgrade 列表按会话聚合，故以会话寻址）
 * - GET：会话全部消息（时间正序；log:list）
 * - DELETE：删除整个会话（log:delete，查看与删除分权）+ 记 OperationLog
 */
import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { ApiHttpError, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { chatSessionIdSchema } from "@/contracts";

export const dynamic = "force-dynamic";

type Params = { id: string };

function parseSessionId(raw: string): string {
  const parsed = chatSessionIdSchema.safeParse(decodeURIComponent(raw ?? ""));
  if (!parsed.success) throw new ApiHttpError(400, "非法的会话 ID", [{ message: "非法的会话 ID" }]);
  return parsed.data;
}

export const GET = withApi<Params>(
  async ({ params }) => {
    const sessionId = parseSessionId(params.id);
    const messages = await prisma.aIChatHistory.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (messages.length === 0) return notFound("会话不存在");
    return success(
      {
        sessionId,
        channel: messages[0].channel,
        messageCount: messages.length,
        firstAt: messages[0].createdAt,
        lastAt: messages[messages.length - 1].createdAt,
        messages,
      },
      "获取会话详情成功"
    );
  },
  { permission: "log:list", errorMessage: "获取会话详情失败", route: "chat-history/GET:id" }
);

export const DELETE = withApi<Params>(
  async ({ request, params, session }) => {
    const sessionId = parseSessionId(params.id);
    const { count } = await prisma.aIChatHistory.deleteMany({ where: { sessionId } });
    if (count === 0) return notFound("会话不存在");
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "chat-history",
      action: "delete",
      title: sessionId,
      before: { sessionId, messageCount: count },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ sessionId, deleted: count }, `已删除会话（${count} 条消息）`);
  },
  { permission: "log:delete", errorMessage: "删除会话失败", route: "chat-history/DELETE:id" }
);
