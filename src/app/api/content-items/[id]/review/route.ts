import { success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp } from "@/lib/log";
import { contentReviewSchema } from "@/contracts/events";
import { reviewContentItem } from "@/lib/content-workflow";

export const dynamic = "force-dynamic";

/**
 * POST /api/content-items/[id]/review：内容审核（review:edit，SuperAdmin 独享，ADR-017）
 * body { decision: "approved" | "rejected", remark? }；通过后按设置自动建发布任务（官网/公众号）
 */
export const POST = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const { decision, remark } = await parseBody(request, contentReviewSchema);
    const { item, jobs } = await reviewContentItem(id, decision, {
      id: session.id,
      username: session.username,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    }, remark);
    return success(
      { id: item.id, status: item.status, publishJobIds: jobs },
      decision === "approved" ? (jobs.length ? `审核通过，已排期自动发布（${jobs.length} 个任务）` : "审核通过") : "已驳回"
    );
  },
  { permission: "review:edit", route: "content-items/review", errorMessage: "审核失败" }
);
