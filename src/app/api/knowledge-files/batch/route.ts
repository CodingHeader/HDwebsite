/**
 * C-12：知识库文件批量操作（`/api/knowledge-files/batch`，权限 kb:edit）。
 * - POST：批量 enable/disable/tag/untag/trash（契约 kbBatchSchema）
 * - ids ≤ 100（契约 max(100)）；超限由 parseBody 返回 400 + fieldErrors
 */
import { success } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { kbBatchSchema } from "@/contracts/kb";
import { batchFiles } from "@/lib/kb/manage";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/knowledge-files/batch */
export const POST = withApi(
  async ({ request, session }) => {
    // ids 长度 1..100 由契约 kbBatchSchema 强制；超限 parseBody 返回 400 + fieldErrors
    const input = await parseBody(request, kbBatchSchema);
    const res = await batchFiles(input);
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "batch",
      title: `${input.action} ${res.count} 个文件`,
      after: { action: input.action, count: res.count },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(res, `批量${input.action}成功（${res.count} 个）`);
  },
  { permission: "kb:edit", errorMessage: "批量操作失败", route: "knowledge-files/batch/POST" }
);