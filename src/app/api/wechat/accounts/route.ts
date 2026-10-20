import { prisma } from "@/lib/prisma";
import { created, success } from "@/lib/api-response";
import { encryptField, maskSecret } from "@/lib/crypto";
import { clientIp, logOperation } from "@/lib/log";
import { listQuerySchema } from "@/contracts";
import { wechatAccountCreateSchema } from "@/contracts/resources";
import { parseBody, parseQuery, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/wechat/accounts：账号列表（appSecret 脱敏） */
export const GET = withApi(
  async ({ request }) => {
    const { page, limit } = parseQuery(request, listQuerySchema);
    const [list, total] = await Promise.all([
      prisma.wechatAccount.findMany({ orderBy: { id: "asc" }, skip: (page - 1) * limit, take: limit, include: { scene: { select: { id: true, name: true } } } }),
      prisma.wechatAccount.count(),
    ]);
    return success(
      { list: list.map((a) => ({ ...a, appSecret: maskSecret(a.appSecret), tokenCache: null, encodingAESKey: null })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      "获取公众号账号成功"
    );
  },
  { permission: "wechat:list", errorMessage: "获取公众号账号失败", route: "wechat/accounts/GET" }
);

/** POST：新建（appSecret 加密落库） */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, wechatAccountCreateSchema);
    const account = await prisma.wechatAccount.create({
      data: {
        name: input.name,
        type: input.type,
        appid: input.appid,
        appSecret: encryptField(input.appSecret),
        isEncrypted: true,
        verifyToken: input.verifyToken ?? null,
        encodingAESKey: input.encodingAESKey ? encryptField(input.encodingAESKey) : null,
        aiEnabled: input.aiEnabled,
        freepublishEnabled: input.freepublishEnabled,
        sceneId: input.sceneId ?? null,
        status: input.status,
      },
    });
    await logOperation({
      userId: session.id, username: session.username, module: "wechat",
      action: "create", title: account.name, after: { id: account.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return created({ ...account, appSecret: maskSecret(account.appSecret) }, "创建公众号账号成功");
  },
  { permission: "wechat:edit", errorMessage: "创建公众号账号失败", route: "wechat/accounts/POST" }
);