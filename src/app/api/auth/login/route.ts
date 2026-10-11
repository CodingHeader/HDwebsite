import { prisma } from "@/lib/prisma";
import { comparePassword, claimsFromSession, signToken, toSessionUser } from "@/lib/auth";
import { error, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { loginRequestSchema } from "@/contracts";
import type { Role, User } from ".prisma/client";

export const dynamic = "force-dynamic";

// 登录防爆破（P2-2）：同 IP 每分钟 ≤10 次尝试（内存计数，单机口径 REQ-C-003）
const loginAttempts = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (loginAttempts.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 10) return true;
  list.push(now);
  loginAttempts.set(ip, list);
  return false;
}

/** POST /api/auth/login：用户名密码 → JWT（7d） */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("请求体不是合法 JSON");
  }
  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { username, password } = parsed.data;
  if (isRateLimited(clientIp(request) ?? "unknown")) {
    return error("尝试过于频繁，请稍后再试", 400);
  }

  try {
    const user = (await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    })) as (User & { role: Role }) | null;
    if (!user || !user.isActive || user.status !== "active") {
      return error("用户名或密码错误", 400);
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return error("用户名或密码错误", 400);

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
  } catch (err) {
    console.error("[auth/login] 登录失败：", err);
    return error("登录失败", 500, 500);
  }
}
