import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { encryptField, isEncryptedValue, maskSecret } from "@/lib/crypto";
import { clientIp, logOperation } from "@/lib/log";
import { idParamSchema } from "@/contracts";
import { wechatAccountUpdateSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "wechat:list");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  const account = await prisma.wechatAccount.findUnique({ where: { id: parsedId.data } });
  if (!account) return notFound("账号不存在");
  return success({ ...account, appSecret: maskSecret(account.appSecret), tokenCache: null, encodingAESKey: null }, "获取账号成功");
}

/** PUT：更新（appSecret 掩码跳过；AESKey 同理） */
export async function PUT(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "wechat:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = wechatAccountUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const existing = await prisma.wechatAccount.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("账号不存在");
    const appSecret =
      input.appSecret && !input.appSecret.includes("****") && !isEncryptedValue(input.appSecret)
        ? encryptField(input.appSecret)
        : undefined;
    const account = await prisma.wechatAccount.update({
      where: { id: parsedId.data },
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
      userId: guard.session.id, username: guard.session.username, module: "wechat",
      action: "update", title: account.name, before: { id: account.id }, after: { id: account.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ ...account, appSecret: maskSecret(account.appSecret), tokenCache: null, encodingAESKey: null }, "更新公众号账号成功");
  } catch (err) {
    console.error("[wechat/accounts/PUT:id] 更新失败：", err);
    return serverError("更新公众号账号失败");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "wechat:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const existing = await prisma.wechatAccount.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("账号不存在");
    await prisma.wechatAccount.delete({ where: { id: parsedId.data } });
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "wechat",
      action: "delete", title: existing.name, before: { id: existing.id },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id: parsedId.data }, "删除公众号账号成功");
  } catch (err) {
    console.error("[wechat/accounts/DELETE:id] 删除失败：", err);
    return serverError("删除公众号账号失败");
  }
}
