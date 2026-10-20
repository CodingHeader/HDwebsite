import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/auth/me：当前登录用户（含角色权限；仅要求登录） */
export const GET = withApi(
  async ({ session }) => success(session, "获取成功"),
  { auth: true, errorMessage: "获取当前用户失败", route: "auth/me/GET" }
);