import { prisma } from "@/lib/prisma";
import { comparePassword, claimsFromSession, signToken, toSessionUser } from "@/lib/auth";
import { success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { loginRequestSchema } from "@/contracts";
import { ApiHttpError, parseBody, withApi } from "@/lib/api-handler";
import { checkRateLimit, trustedClientIp } from "@/lib/rate-limit";
import type { Role, User } from ".prisma/client";

export const dynamic = "force-dynamic";

// 登录防爆破（P2-2 引入；V11-SEC-02 改造）：同 IP 每分钟 ≤10 次尝试。
// - 键：trustedClientIp（TRUST_PROXY=true 才采信 x-forwarded-for 首跳；默认忽略转发头 →
//   共享桶 "unknown"，伪造 XFF 无法换键绕过——详见 src/lib/rate-limit.ts 模块注释）
// - 语义：进程内滑窗（REQ-C-003 单机口径）；命中返回 429 + Retry-After（原 400）
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 60_000;

/** POST /api/auth/login：用户名密码 → JWT（7d） */
export const POST = withApi(
  async ({ request }) => {
    const { username, password } = await parseBody(request, loginRequestSchema);
    const limit = checkRateLimit(`login:${trustedClientIp(request) ?? "unknown"}`, {
      limit: LOGIN_RATE_LIMIT,
      windowMs: LOGIN_RATE_WINDOW_MS,
    });
    if (!limit.allowed) {
      throw new ApiHttpError(429, "尝试过于频繁，请稍后再试", undefined, {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    const user = (await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    })) as (User & { role: Role }) | null;
    if (!user || !user.isActive || user.status !== "active") {
      throw new ApiHttpError(400, "用户名或密码错误");
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new ApiHttpError(400, "用户名或密码错误");

    const session = toSessionUser(user, user.role);
    const token = signToken(claimsFromSession(session));

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp(request),
        loginCount: { increment: 1 },
      },
    });
    await logOperation({
      userId: user.id,
      username: user.username,
      module: "auth",
      action: "login",
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return success({ token, user: session }, "登录成功");
  },
  { errorMessage: "登录失败", route: "auth/login/POST" }
);