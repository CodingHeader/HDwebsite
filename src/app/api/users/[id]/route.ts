import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { notFound, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { assertUserWriteAllowed } from "@/lib/authz/escalation";
import { userUpdateSchema } from "@/contracts/resources";
import { ApiHttpError, parseBody, parseId, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/users/[id]：详情（user:list） */
export const GET = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id, "非法 ID");
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) return notFound("用户不存在");
    const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
    return success(safe, "获取用户成功");
  },
  { permission: "user:list", errorMessage: "获取用户失败", route: "users/GET:id" }
);

/** PUT /api/users/[id]：更新（user:edit）；password 传入即重置；最后一名 SuperAdmin 保护 */
export const PUT = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    const input = await parseBody(request, userUpdateSchema);
    const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing) return notFound("用户不存在");
    // V7-SEC-01：E4/E5——非超管不得触碰超管账号/不得重置超管密码/不得自改角色；
    // 不得把最后一名超管改离超管角色
    let requestedRoleIsSuper = existing.role.isSuper;
    if (input.roleId != null && input.roleId !== existing.roleId) {
      const targetRole = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!targetRole) throw new ApiHttpError(400, "目标角色不存在");
      requestedRoleIsSuper = targetRole.isSuper;
    }
    // 若本次变更会把系统超管数降为 0，判为"最后一名超管"
    let lastSuper = false;
    if (existing.role.isSuper && requestedRoleIsSuper === false) {
      const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
      lastSuper = supers <= 1;
    }
    const denial = assertUserWriteAllowed(
      {
        isSuper: session.role.isSuper,
        permissions: session.role.permissions,
        callerRoleId: session.role.id,
        callerUserId: session.id,
      },
      {
        targetUserId: existing.id,
        // E4/E5 用"当前角色"，E3 用"请求目标角色"——分别判定
        targetRoleIsSuper: existing.role.isSuper,
        requestedRoleId: input.roleId ?? null,
        requestedRoleIsSuper: requestedRoleIsSuper,
        resetsPassword: !!input.password,
      },
      { isLastActiveSuperAdmin: lastSuper },
    );
    if (denial) throw new ApiHttpError(denial.code, denial.message);
    if (existing.role.isSuper && input.isActive === false) {
      const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
      if (supers <= 1) throw new ApiHttpError(400, "不能停用最后一名超级管理员");
    }
    try {
      const data: Record<string, unknown> = {
        nickname: input.nickname, email: input.email || null, phone: input.phone,
        roleId: input.roleId, isActive: input.isActive,
      };
      if (input.password) data.passwordHash = await hashPassword(input.password);
      const user = await prisma.user.update({
        where: { id },
        data,
        include: { role: true },
      });
      await logOperation({
        userId: session.id, username: session.username, module: "user",
        action: "update", title: user.username,
        before: { id: user.id }, after: { id: user.id, passwordReset: !!input.password },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
      return success(safe, "更新用户成功");
    } catch (err) {
      console.error("[users/PUT:id] 更新失败：", err);
      throw err;
    }
  },
  { permission: "user:edit", errorMessage: "更新用户失败", route: "users/PUT:id" }
);

/** DELETE /api/users/[id]：删除（user:delete）；不可删除自己、非超管不可删超管、不可删最后一名 SuperAdmin */
export const DELETE = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    try {
      const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
      if (!existing) return notFound("用户不存在");
      if (existing.id === session.id) throw new ApiHttpError(400, "不能删除当前登录账号");
      // V7-SEC-02：E4——非超管不得删除超管账号（角色写入越权的 DELETE 变体）
      if (!session.role.isSuper && existing.role.isSuper) {
        throw new ApiHttpError(403, "不能删除超级管理员账号");
      }
      if (existing.role.isSuper) {
        const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
        if (supers <= 1) throw new ApiHttpError(400, "不能删除最后一名超级管理员");
      }
      await prisma.user.delete({ where: { id } });
      await logOperation({
        userId: session.id, username: session.username, module: "user",
        action: "delete", title: existing.username, before: { id: existing.id },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return success({ id }, "删除用户成功");
    } catch (err) {
      console.error("[users/DELETE:id] 删除失败：", err);
      throw err;
    }
  },
  { permission: "user:delete", errorMessage: "删除用户失败", route: "users/DELETE:id" }
);