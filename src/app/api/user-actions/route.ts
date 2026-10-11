import { prisma } from "@/lib/prisma";
import { created, error, serverError, validationError } from "@/lib/api-response";
import { clientIp } from "@/lib/log";
import { userActionCreateSchema } from "@/contracts";

export const dynamic = "force-dynamic";

/** POST /api/user-actions：公开埋点写入（ASM-008 最小埋点：表单提交 + 关键页浏览） */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("请求体不是合法 JSON");
  }
  const parsed = userActionCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;

  try {
    const action = await prisma.userAction.create({
      data: {
        actionType: input.actionType,
        actionTarget: input.actionTarget,
        sessionId: input.sessionId,
        ipAddress: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        pageUrl: input.pageUrl ?? null,
        pageTitle: input.pageTitle ?? null,
        referrer: input.referrer ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
    return created({ id: action.id }, "已记录");
  } catch (err) {
    console.error("[user-actions/POST] 写入失败：", err);
    return serverError("记录失败");
  }
}
