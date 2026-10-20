import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { assertRoleWriteAllowed } from "@/lib/authz/escalation";
import { roleCreateSchema } from "@/contracts/resources";
import { ApiHttpError, parseBody, parseId, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/roles/[id]：角色详情 */
export const GET = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id, "非法 ID");
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) return notFound("角色不存在");
    const { permissions, _count, ...rest } = role as Record<string, unknown> & { permissions: string };
    return success({ ...rest, permissions: JSON.parse(permissions), userCount: (_count as { users: number }).users }, "获取角色成功");
  },
  { permission: "role:list", errorMessage: "获取角色失败", route: "roles/GET:id" }
);

/** PUT /api/roles/[id]：更新（role:edit）；内置超管角色 slug=super-admin 不可改 isSuper/permissions */
export const PUT = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    const input = await parseBody(request, roleCreateSchema.partial());
    try {
      const existing = await prisma.role.findUnique({ where: { id } });
      if (!existing) return notFound("角色不存在");
      // V7-SEC-01：E1/E2——非超管不得自升超管 / 授予自身没有的权限
      const denial = assertRoleWriteAllowed(
        {
          isSuper: session.role.isSuper,
          permissions: session.role.permissions,
          callerRoleId: session.role.id,
        },
        { targetRoleId: existing.id, isSuper: input.isSuper, permissions: input.permissions },
      );
      if (denial) throw new ApiHttpError(denial.code, denial.message);
      if (existing.slug === "super-admin" && (input.isSuper === false || input.permissions)) {
        throw new ApiHttpError(400, "内置超管角色的权限不可修改");
      }
      const role = await prisma.role.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          isSuper: input.isSuper,
          status: input.status,
          // V7-SEC-01 观察项：zod4 的 .partial() 保留 .default([])，只提交 description 时
          // permissions 会被填成 []，必须用 !== undefined 判断，避免误覆写原权限
          ...(input.permissions !== undefined ? { permissions: JSON.stringify(input.permissions) } : {}),
        },
      });
      await logOperation({
        userId: session.id, username: session.username, module: "role",
        action: "update", title: role.name, before: { id: role.id }, after: { id: role.id },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return success({ ...role, permissions: JSON.parse(role.permissions) }, "更新角色成功");
    } catch (err) {
      console.error("[roles/PUT:id] 更新失败：", err);
      throw err;
    }
  },
  { permission: "role:edit", errorMessage: "更新角色失败", route: "roles/PUT:id" }
);

/** DELETE /api/roles/[id]：删除（role:delete）；有用户或内置超管不可删 */
export const DELETE = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    try {
      const existing = await prisma.role.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
      });
      if (!existing) return notFound("角色不存在");
      if (existing.slug === "super-admin") throw new ApiHttpError(400, "内置超管角色不可删除");
      if (existing._count.users > 0) throw new ApiHttpError(400, "该角色下仍有用户，无法删除");
      await prisma.role.delete({ where: { id } });
      await logOperation({
        userId: session.id, username: session.username, module: "role",
        action: "delete", title: existing.name, before: { id: existing.id },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return success({ id }, "删除角色成功");
    } catch (err) {
      console.error("[roles/DELETE:id] 删除失败：", err);
      throw err;
    }
  },
  { permission: "role:delete", errorMessage: "删除角色失败", route: "roles/DELETE:id" }
);