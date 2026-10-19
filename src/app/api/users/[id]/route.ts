import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { assertUserWriteAllowed } from "@/lib/authz/escalation";
import { idParamSchema } from "@/contracts";
import { userUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "user:list");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  const user = await prisma.user.findUnique({ where: { id: parsedId.data }, include: { role: true } });
  if (!user) return notFound("用户不存在");
  const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
  return success(safe, "获取用户成功");
}

/** PUT /api/users/[id]：更新（user:edit）；password 传入即重置；最后一名 SuperAdmin 保护 */
export async function PUT(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "user:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const existing = await prisma.user.findUnique({ where: { id: parsedId.data }, include: { role: true } });
    if (!existing) return notFound("用户不存在");
    // V7-SEC-01：E4/E5——非超管不得触碰超管账号/不得重置超管密码/不得自改角色；
    // 不得把最后一名超管改离超管角色
    let requestedRoleIsSuper = existing.role.isSuper;
    if (input.roleId != null && input.roleId !== existing.roleId) {
      const targetRole = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!targetRole) return error("目标角色不存在", 400);
      requestedRoleIsSuper = targetRole.isSuper;
    }
    // 若本次变更会把系统超管数降为 0，判为"最后一名超管"
    let lastSuper = false;
    if (existing.role.isSuper && requestedRoleIsSuper === false) {
      const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
      lastSuper = supers <= 1;
    }
    {
      const denial = assertUserWriteAllowed(
        {
          isSuper: guard.session.role.isSuper,
          permissions: guard.session.role.permissions,
          callerRoleId: guard.session.role.id,
          callerUserId: guard.session.id,
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
      if (denial) return error(denial.message, denial.code);
    }
    if (existing.role.isSuper && input.isActive === false) {
      const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
      if (supers <= 1) return error("不能停用最后一名超级管理员", 400);
    }
    const data: Record<string, unknown> = {
      nickname: input.nickname, email: input.email || null, phone: input.phone,
      roleId: input.roleId, isActive: input.isActive,
    };
    if (input.password) data.passwordHash = await hashPassword(input.password);
    const user = await prisma.user.update({
      where: { id: parsedId.data },
      data,
      include: { role: true },
    });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "user",
      action: "update", title: user.username,
      before: { id: user.id }, after: { id: user.id, passwordReset: !!input.password },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
    return success(safe, "更新用户成功");
  } catch (err) {
    console.error("[users/PUT:id] 更新失败：", err);
    return serverError("更新用户失败");
  }
}

/** DELETE /api/users/[id]：删除（user:delete）；不可删除自己、非超管不可删超管、不可删最后一名 SuperAdmin */
export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "user:delete");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const existing = await prisma.user.findUnique({ where: { id: parsedId.data }, include: { role: true } });
    if (!existing) return notFound("用户不存在");
    if (existing.id === guard.session.id) return error("不能删除当前登录账号", 400);
    // V7-SEC-02：E4——非超管不得删除超管账号（角色写入越权的 DELETE 变体）
    if (!guard.session.role.isSuper && existing.role.isSuper) {
      return error("不能删除超级管理员账号", 403);
    }
    if (existing.role.isSuper) {
      const supers = await prisma.user.count({ where: { isActive: true, role: { isSuper: true } } });
      if (supers <= 1) return error("不能删除最后一名超级管理员", 400);
    }
    await prisma.user.delete({ where: { id: parsedId.data } });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "user",
      action: "delete", title: existing.username, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id: parsedId.data }, "删除用户成功");
  } catch (err) {
    console.error("[users/DELETE:id] 删除失败：", err);
    return serverError("删除用户失败");
  }
}
