/**
 * JWT 签发与校验（契约③ Identity：HS256 / 7 天）
 */
import jwt from "jsonwebtoken";
import type { JwtClaims } from "@/contracts";

const JWT_EXPIRES_IN = "7d";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("FATAL: JWT_SECRET 缺失或长度不足 32 字符，拒绝启动");
  }
  return s;
}

export function signToken(claims: JwtClaims): string {
  return jwt.sign(claims, secret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtClaims | null {
  try {
    const decoded = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    const parsed = jwtClaimsSchemaSafe(decoded);
    return parsed;
  } catch {
    return null;
  }
}

function jwtClaimsSchemaSafe(decoded: unknown): JwtClaims | null {
  if (typeof decoded !== "object" || decoded === null) return null;
  const d = decoded as Record<string, unknown>;
  if (typeof d.uid !== "number" || typeof d.username !== "string") return null;
  return {
    uid: d.uid,
    username: d.username,
    roleId: typeof d.roleId === "number" ? d.roleId : 0,
    isSuper: d.isSuper === true,
    permissions: Array.isArray(d.permissions)
      ? (d.permissions as string[]).filter((p) => typeof p === "string")
      : [],
  };
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
}
