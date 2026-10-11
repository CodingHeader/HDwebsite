import { getSession } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/auth/me：当前登录用户（含角色权限） */
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return unauthorized("未提供认证令牌");
  return success(session, "获取成功");
}
