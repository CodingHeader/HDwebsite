import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { created, error, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { listQuerySchema } from "@/contracts";
import { roleCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** GET /api/roles：角色列表（含用户数与权限数组） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "role:list");
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error.issues);
  const { page, limit, keyword } = parsed.data;
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
    return serverError("获取角色列表失败");
  }
}

/** POST /api/roles：创建角色（permissions 数组 → JSON 串；isSuper 仅 SuperAdmin 可设） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "role:create");
  if (!guard.ok) return guard.response;
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = roleCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  if (input.isSuper && !guard.session.role.isSuper) return error("仅超级管理员可创建超管角色", 403);
  try {
    const exists = await prisma.role.findFirst({
      where: { OR: [{ name: input.name }, ...(input.slug ? [{ slug: input.slug }] : [])] },
    });
    if (exists) return error("角色名或标识已存在", 400);
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
      userId: guard.session.id, username: guard.session.username, module: "role",
      action: "create", title: role.name, after: { id: role.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return created({ ...role, permissions: safePerms(role.permissions) }, "创建角色成功");
  } catch (err) {
    console.error("[roles/POST] 创建失败：", err);
    return serverError("创建角色失败");
  }
}

function safePerms(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
