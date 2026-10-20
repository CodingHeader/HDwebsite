import { success } from "@/lib/api-response";
import { logOperation, clientIp } from "@/lib/log";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout：无状态 JWT，客户端删除 token 即可；此处仅留审计（auth: optional） */
export const POST = withApi(
  async ({ request, session }) => {
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
  },
  { auth: "optional", errorMessage: "退出登录失败", route: "auth/logout/POST" }
);