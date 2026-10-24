import { crudList } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { created } from "@/lib/api-response";
import { clientIp } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { userActionCreateSchema } from "@/contracts";
import { ApiHttpError, parseBody, withApi } from "@/lib/api-handler";
import { checkRateLimit, trustedClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 公开埋点频控（V11-SEC-03）：同 IP + 同 actionType 每分钟 ≤30 次（进程内滑窗，REQ-C-003 单机口径）。
// 键用 trustedClientIp（默认不采信 x-forwarded-for，伪造不可换键绕过，见 src/lib/rate-limit.ts）；
// 落库的 ipAddress 字段仍记录 clientIp()（审计口径保留原始上报值）。
const UA_RATE_LIMIT = 30;
const UA_RATE_WINDOW_MS = 60_000;

/** GET：管理端行为记录列表（log:list，工厂） */
export const GET = crudList(crudSpecs["user-actions"]);

/** POST：公开埋点写入（ASM-008 最小埋点：表单提交 + 关键页浏览）——M1 口径保留 */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, userActionCreateSchema);
    const limit = checkRateLimit(`ua:${trustedClientIp(request) ?? "unknown"}:${input.actionType}`, {
      limit: UA_RATE_LIMIT,
      windowMs: UA_RATE_WINDOW_MS,
    });
    if (!limit.allowed) {
      throw new ApiHttpError(429, "记录过于频繁，请稍后再试", undefined, {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }
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