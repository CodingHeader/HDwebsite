/**
 * API 鉴权守卫（R1 收敛：路由内不再手写 roleForCheck 样板）
 * 用法：const guard = await requireAuth(request, "article:create");
 *      if (!guard.ok) return guard.response;
 *      guard.session → SessionUser
 */
import { getSession, hasPermission } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/api-response";
import { superAdminOnlyPermissions } from "@/contracts";
import type { SessionUser } from "@/contracts";

export type GuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: Response };

export async function requireAuth(request: Request, permission?: string): Promise<GuardResult> {
  const session = await getSession(request);
  if (!session) return { ok: false, response: unauthorized("未提供认证令牌") };
  if (permission) {
    // ADR-017：审核权 SuperAdmin 独享（isSuper 直接放行）
    if (superAdminOnlyPermissions.includes(permission) && !session.role.isSuper) {
      return { ok: false, response: forbidden(`权限不足：${permission} 仅超级管理员可执行`) };
    }
    if (!hasPermission(
      { isSuper: session.role.isSuper, permissions: session.role.permissions },
      permission
    )) {
      return { ok: false, response: forbidden(`权限不足：需要 ${permission}`) };
    }
  }
  return { ok: true, session };
}
