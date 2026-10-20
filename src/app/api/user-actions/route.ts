import { crudList } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { created } from "@/lib/api-response";
import { clientIp } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { userActionCreateSchema } from "@/contracts";
import { parseBody, withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET：管理端行为记录列表（log:list，工厂） */
export const GET = crudList(crudSpecs["user-actions"]);

/** POST：公开埋点写入（ASM-008 最小埋点：表单提交 + 关键页浏览）——M1 口径保留 */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, userActionCreateSchema);
    const action = await prisma.userAction.create({
      data: {
        actionType: input.actionType,
        actionTarget: input.actionTarget,
        sessionId: input.sessionId,
        ipAddress: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        pageUrl: input.pageUrl ?? null,
        pageTitle: input.pageTitle ?? null,
        referrer: input.referrer ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
    return created({ id: action.id }, "已记录");
  },
  { errorMessage: "记录失败", route: "user-actions/POST" }
);