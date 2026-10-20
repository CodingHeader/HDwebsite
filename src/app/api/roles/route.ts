import { prisma } from "@/lib/prisma";
import { created, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { assertRoleWriteAllowed } from "@/lib/authz/escalation";
import { listQuerySchema } from "@/contracts";
import { roleCreateSchema } from "@/contracts/resources";
import { ApiHttpError, parseBody, parseQuery, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/roles：角色列表（含用户数与权限数组） */
export const GET = withApi(
  async ({ request }) => {
    const { page, limit, keyword } = parseQuery(request, listQuerySchema);
    try {
      const where = keyword ? { OR: [{ name: { contains: keyword } }, { slug: { contains: keyword } }] } : {};
      const [rows, total] = await Promise.all([
        prisma.role.findMany({
          where, orderBy: { id: "asc" }, skip: (page - 1) * limit, take: limit,
          include: { _count: { select: { users: true } } },
        }),
        prisma.role.count({ where }),
      ]);
      const list = rows.map((r) => ({
        ...r,
        permissions: safePerms(r.permissions),
        userCount: r._count.users,
        _count: undefined,
      }));
      return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取角色列表成功");
    } catch (err) {
      console.error("[roles/GET] 查询失败：", err);
      throw err;
    }
  },
  { permission: "role:list", errorMessage: "获取角色列表失败", route: "roles/GET" }
);

/** POST /api/roles：创建角色（permissions 数组 → JSON 串；isSuper 仅 SuperAdmin 可设） */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, roleCreateSchema);
    // V7-SEC-01：E1/E2——非超管不得创建超管角色 / 授予自身没有的权限
    const denial = assertRoleWriteAllowed(
      {
        isSuper: session.role.isSuper,
        permissions: session.role.permissions,
        callerRoleId: session.role.id,
      },
      { targetRoleId: undefined, isSuper: input.isSuper, permissions: input.permissions },
    );
    if (denial) throw new ApiHttpError(denial.code, denial.message);
    try {
      const exists = await prisma.role.findFirst({
        where: { OR: [{ name: input.name }, ...(input.slug ? [{ slug: input.slug }] : [])] },
      });
      if (exists) throw new ApiHttpError(400, "角色名或标识已存在");
      const role = await prisma.role.create({
        data: {
          name: input.name,
          slug:
            input.slug ||
            input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
            "role-" + Date.now().toString(36),
          description: input.description ?? null,
          permissions: JSON.stringify(input.permissions),
          isSuper: input.isSuper,
          status: input.status,
        },
      });
      await logOperation({
        userId: session.id, username: session.username, module: "role",
        action: "create", title: role.name, after: { id: role.id },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return created({ ...role, permissions: safePerms(role.permissions) }, "创建角色成功");
    } catch (err) {
      console.error("[roles/POST] 创建失败：", err);
      throw err;
    }
  },
  { permission: "role:create", errorMessage: "创建角色失败", route: "roles/POST" }
);

function safePerms(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}