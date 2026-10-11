import { getSession } from "@/lib/auth";
import { success } from "@/lib/api-response";
import { logOperation, clientIp } from "@/lib/log";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout：无状态 JWT，客户端删除 token 即可；此处仅留审计 */
export async function POST(request: Request) {
  const session = await getSession(request);
  if (session) {
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "auth",
      action: "logout",
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
  }
  return success(null, "已退出登录");
}
