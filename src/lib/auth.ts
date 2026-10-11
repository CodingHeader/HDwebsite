/**
 * 密码哈希与会话（契约③ Identity 实现）
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, verifyToken, extractBearerToken } from "@/lib/jwt";
import type { JwtClaims, SessionUser } from "@/contracts";
import { sessionUserSchema } from "@/contracts";
import type { Role, User } from ".prisma/client";

export { signToken, verifyToken, extractBearerToken };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** 权限匹配顺序（原项目口径）：isSuper → 精确 → module:* → * */
export function hasPermission(claims: Pick<JwtClaims, "isSuper" | "permissions">, permission: string): boolean {
  if (claims.isSuper) return true;
  const perms = claims.permissions ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(":");
  return perms.includes(`${module}:*`);
}

/** 从请求中解析会话（无 token / 无效 → null） */
export async function getSession(request: Request): Promise<SessionUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  const claims = verifyToken(token);
  if (!claims) return null;
  const user = (await prisma.user.findUnique({
    where: { id: claims.uid },
    include: { role: true },
  })) as (User & { role: Role }) | null;
  if (!user || !user.isActive || user.status !== "active") return null;
  return toSessionUser(user, user.role);
}

export function toSessionUser(user: User, role: Role): SessionUser {
  let permissions: string[] = [];
  try {
    const parsed = JSON.parse(role.permissions);
    if (Array.isArray(parsed)) permissions = parsed.filter((p) => typeof p === "string");
  } catch {
    permissions = [];
  }
  return sessionUserSchema.parse({
    id: user.id,
    username: user.username,
    nickname: user.nickname ?? null,
    email: user.email ?? null,
    role: {
      id: role.id,
      name: role.name,
      slug: role.slug,
      permissions,
      isSuper: role.isSuper,
    },
  });
}

export function claimsFromSession(session: SessionUser): JwtClaims {
  return {
    uid: session.id,
    username: session.username,
    roleId: session.role.id,
    isSuper: session.role.isSuper,
    permissions: session.role.permissions,
  };
}
