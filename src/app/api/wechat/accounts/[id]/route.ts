import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { encryptField, isEncryptedValue, maskSecret } from "@/lib/crypto";
import { clientIp, logOperation } from "@/lib/log";
import { wechatAccountUpdateSchema } from "@/contracts/resources";
import { parseBody, parseId, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/wechat/accounts/[id]：账号详情（appSecret 脱敏） */
export const GET = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id, "非法 ID");
    const account = await prisma.wechatAccount.findUnique({ where: { id } });
    if (!account) return notFound("账号不存在");
    return success({ ...account, appSecret: maskSecret(account.appSecret), tokenCache: null, encodingAESKey: null }, "获取账号成功");
  },
  { permission: "wechat:list", errorMessage: "获取账号失败", route: "wechat/accounts/GET:id" }
);

/** PUT：更新（appSecret 掩码跳过；AESKey 同理） */
export const PUT = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    const input = await parseBody(request, wechatAccountUpdateSchema);
    const existing = await prisma.wechatAccount.findUnique({ where: { id } });
    if (!existing) return notFound("账号不存在");
    const appSecret =
      input.appSecret && !input.appSecret.includes("****") && !isEncryptedValue(input.appSecret)
        ? encryptField(input.appSecret)
        : undefined;
    const account = await prisma.wechatAccount.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        appid: input.appid,
        appSecret,
        verifyToken: input.verifyToken,
        encodingAESKey: input.encodingAESKey && !isEncryptedValue(input.encodingAESKey) ? encryptField(input.encodingAESKey) : undefined,
        aiEnabled: input.aiEnabled,
        freepublishEnabled: input.freepublishEnabled,
        sceneId: input.sceneId,
        status: input.status,
      },
    });
    await logOperation({
      userId: session.id, username: session.username, module: "wechat",
      action: "update", title: account.name, before: { id: account.id }, after: { id: account.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ ...account, appSecret: maskSecret(account.appSecret), tokenCache: null, encodingAESKey: null }, "更新公众号账号成功");
  },
  { permission: "wechat:edit", errorMessage: "更新公众号账号失败", route: "wechat/accounts/PUT:id" }
);

/** DELETE /api/wechat/accounts/[id]：删除账号 */
export const DELETE = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id, "非法 ID");
    const existing = await prisma.wechatAccount.findUnique({ where: { id } });
    if (!existing) return notFound("账号不存在");
    await prisma.wechatAccount.delete({ where: { id } });
    await logOperation({
      userId: session.id, username: session.username, module: "wechat",
      action: "delete", title: existing.name, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id }, "删除公众号账号成功");
  },
  { permission: "wechat:edit", errorMessage: "删除公众号账号失败", route: "wechat/accounts/DELETE:id" }
);