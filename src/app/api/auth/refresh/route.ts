import { claimsFromSession, signToken } from "@/lib/auth";
import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** POST /api/auth/refresh：校验现有 token 并签发新 7d token（仅要求登录） */
export const POST = withApi(
  async ({ session }) => {
    const token = signToken(claimsFromSession(session));
    return success({ token, user: session }, "刷新成功");
  },
  { auth: true, errorMessage: "刷新失败", route: "auth/refresh/POST" }
);