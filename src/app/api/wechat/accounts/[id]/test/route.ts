import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { notFound } from "@/lib/api-response";
import { testAccount } from "@/lib/wechat";
import { idParamSchema } from "@/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/wechat/accounts/[id]/test：access_token 获取测试（凭证后补即插桩） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "wechat:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return Response.json({ code: 400, data: null, message: "非法 ID" }, { status: 400 });
  const account = await prisma.wechatAccount.findUnique({ where: { id: parsedId.data } });
  if (!account) return notFound("账号不存在");
  const result = await testAccount(account);
  return Response.json({ code: 200, data: result, message: "测试完成" });
}
