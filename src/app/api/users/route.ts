import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { created, error, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { listQuerySchema } from "@/contracts";
import { userCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

const publicSelect = {
  id: true, username: true, nickname: true, email: true, realName: true, avatar: true,
  phone: true, roleId: true, role: true, isActive: true, status: true,
  lastLoginAt: true, lastLoginIp: true, loginCount: true, createdAt: true, updatedAt: true,
} as const;

/** GET /api/users：用户列表（不含密码哈希） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "user:list");
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error.issues);
  const { page, limit, keyword } = parsed.data;
  try {
    const where = keyword
      ? { OR: [{ username: { contains: keyword } }, { nickname: { contains: keyword } }, { email: { contains: keyword } }] }
      : {};
    const [list, total] = await Promise.all([
      prisma.user.findMany({ where, select: publicSelect, orderBy: { id: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.user.count({ where }),
    ]);
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取用户列表成功");
  } catch (err) {
    console.error("[users/GET] 查询失败：", err);
    return serverError("获取用户列表失败");
  }
}

/** POST /api/users：创建用户（user:create；密码 bcrypt 落库） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "user:create");
  if (!guard.ok) return guard.response;
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const exists = await prisma.user.findUnique({ where: { username: input.username } });
    if (exists) return error("用户名已存在", 400);
    const user = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash: await hashPassword(input.password),
        nickname: input.nickname ?? null,
        email: input.email || null,
        phone: input.phone ?? null,
        roleId: input.roleId,
        isActive: input.isActive,
      },
      include: { role: true },
    });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "user",
      action: "create", title: input.username, after: { id: user.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
    return created(safe, "创建用户成功");
  } catch (err) {
    console.error("[users/POST] 创建失败：", err);
    return serverError("创建用户失败");
  }
}
