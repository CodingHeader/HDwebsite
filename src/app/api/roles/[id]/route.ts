import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { idParamSchema } from "@/contracts";
import { roleCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/roles/[id]：角色详情 */
export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "role:list");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  const role = await prisma.role.findUnique({ where: { id: parsedId.data }, include: { _count: { select: { users: true } } } });
  if (!role) return notFound("角色不存在");
  const { permissions, _count, ...rest } = role as Record<string, unknown> & { permissions: string };
  return success({ ...rest, permissions: JSON.parse(permissions), userCount: (_count as { users: number }).users }, "获取角色成功");
}

/** PUT /api/roles/[id]：更新（role:edit）；内置超管角色 slug=super-admin 不可改 isSuper/permissions */
export async function PUT(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "role:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = roleCreateSchema.partial().safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const existing = await prisma.role.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("角色不存在");
    if (existing.slug === "super-admin" && (input.isSuper === false || input.permissions)) {
      return error("内置超管角色的权限不可修改", 400);
    }
    const role = await prisma.role.update({
      where: { id: parsedId.data },
      data: {
        name: input.name,
        description: input.description,
        isSuper: input.isSuper,
        status: input.status,
        ...(input.permissions ? { permissions: JSON.stringify(input.permissions) } : {}),
      },
    });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "role",
      action: "update", title: role.name, before: { id: role.id }, after: { id: role.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ ...role, permissions: JSON.parse(role.permissions) }, "更新角色成功");
  } catch (err) {
    console.error("[roles/PUT:id] 更新失败：", err);
    return serverError("更新角色失败");
  }
}

/** DELETE /api/roles/[id]：删除（role:delete）；有用户或内置超管不可删 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "role:delete");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const existing = await prisma.role.findUnique({
      where: { id: parsedId.data },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) return notFound("角色不存在");
    if (existing.slug === "super-admin") return error("内置超管角色不可删除", 400);
    if (existing._count.users > 0) return error("该角色下仍有用户，无法删除", 400);
    await prisma.role.delete({ where: { id: parsedId.data } });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "role",
      action: "delete", title: existing.name, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id: parsedId.data }, "删除角色成功");
  } catch (err) {
    console.error("[roles/DELETE:id] 删除失败：", err);
    return serverError("删除角色失败");
  }
}

