import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { testAccount } from "@/lib/wechat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/wechat/accounts/[id]/test：access_token 获取测试（凭证后补即插桩） */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const account = await prisma.wechatAccount.findUnique({ where: { id } });
    if (!account) return notFound("账号不存在");
    const result = await testAccount(account);
    return success(result, "测试完成");
  },
  { permission: "wechat:edit", route: "wechat/accounts/test", errorMessage: "测试失败" }
);
