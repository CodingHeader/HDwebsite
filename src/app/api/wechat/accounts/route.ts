import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { created, error, serverError, success, validationError } from "@/lib/api-response";
import { encryptField, maskSecret } from "@/lib/crypto";
import { clientIp, logOperation } from "@/lib/log";
import { listQuerySchema } from "@/contracts";
import { wechatAccountCreateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** GET /api/wechat/accounts：账号列表（appSecret 脱敏） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "wechat:list");
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error.issues);
  const { page, limit } = parsed.data;
  try {
    const [list, total] = await Promise.all([
      prisma.wechatAccount.findMany({ orderBy: { id: "asc" }, skip: (page - 1) * limit, take: limit, include: { scene: { select: { id: true, name: true } } } }),
      prisma.wechatAccount.count(),
    ]);
    return success(
      { list: list.map((a) => ({ ...a, appSecret: maskSecret(a.appSecret), tokenCache: null, encodingAESKey: null })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      "获取公众号账号成功"
    );
  } catch (err) {
    console.error("[wechat/accounts/GET] 查询失败：", err);
    return serverError("获取公众号账号失败");
  }
}

/** POST：新建（appSecret 加密落库） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "wechat:edit");
  if (!guard.ok) return guard.response;
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = wechatAccountCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  try {
    const account = await prisma.wechatAccount.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        appid: parsed.data.appid,
        appSecret: encryptField(parsed.data.appSecret),
        isEncrypted: true,
        verifyToken: parsed.data.verifyToken ?? null,
        encodingAESKey: parsed.data.encodingAESKey ? encryptField(parsed.data.encodingAESKey) : null,
        aiEnabled: parsed.data.aiEnabled,
        freepublishEnabled: parsed.data.freepublishEnabled,
        sceneId: parsed.data.sceneId ?? null,
        status: parsed.data.status,
      },
    });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "wechat",
      action: "create", title: account.name, after: { id: account.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return created({ ...account, appSecret: maskSecret(account.appSecret) }, "创建公众号账号成功");
  } catch (err) {
    console.error("[wechat/accounts/POST] 创建失败：", err);
    return serverError("创建公众号账号失败");
  }
}
