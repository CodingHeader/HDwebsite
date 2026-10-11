import { getSession, claimsFromSession, signToken } from "@/lib/auth";
import { error, success, unauthorized } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/auth/refresh：校验现有 token 并签发新 7d token */
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) return unauthorized("认证无效或已过期");
  try {
    const token = signToken(claimsFromSession(session));
    return success({ token, user: session }, "刷新成功");
  } catch {
    return error("刷新失败", 500, 500);
  }
}
