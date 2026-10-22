import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { created, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { assertUserWriteAllowed } from "@/lib/authz/escalation";
import { listQuerySchema } from "@/contracts";
import { userCreateSchema } from "@/contracts/resources";
import { ApiHttpError, parseBody, parseQuery, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const publicSelect = {
  id: true, username: true, nickname: true, email: true, realName: true, avatar: true,
  phone: true, roleId: true, role: true, isActive: true, status: true,
  lastLoginAt: true, lastLoginIp: true, loginCount: true, createdAt: true, updatedAt: true,
} as const;

/** GET /api/users：用户列表（不含密码哈希） */
export const GET = withApi(
  async ({ request }) => {
    const { page, limit, keyword } = parseQuery(request, listQuerySchema);
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
      throw err;
    }
  },
  { permission: "user:list", errorMessage: "获取用户列表失败", route: "users/GET" }
);

/** POST /api/users：创建用户（user:create；密码 bcrypt 落库） */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, userCreateSchema);
    const exists = await prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new ApiHttpError(400, "用户名已存在");
    // V7-SEC-01：E3——非超管不得指派超管角色
    const targetRole = input.roleId ? await prisma.role.findUnique({ where: { id: input.roleId } }) : null;
    const denial = assertUserWriteAllowed(
      {
        isSuper: session.role.isSuper,
        permissions: session.role.permissions,
        callerRoleId: session.role.id,
        callerUserId: session.id,
      },
      { targetUserId: -1, targetRoleIsSuper: false, requestedRoleId: input.roleId, requestedRoleIsSuper: !!targetRole?.isSuper },
      { isLastActiveSuperAdmin: false },
    );
    if (denial) throw new ApiHttpError(denial.code, denial.message);
    try {
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
        userId: session.id, username: session.username, module: "user",
        action: "create", title: input.username, after: { id: user.id },
        ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      const { passwordHash: _ph, ...safe } = user as Record<string, unknown>;
      return created(safe, "创建用户成功");
    } catch (err) {
      console.error("[users/POST] 创建失败：", err);
      throw err;
    }
  },
  { permission: "user:create", errorMessage: "创建用户失败", route: "users/POST" }
);
