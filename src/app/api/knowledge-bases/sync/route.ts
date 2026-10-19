/**
 * C-06：触发知识库同步队列（`/api/knowledge-bases/sync`，权限 kb:edit）。
 * 只处理条目级 pending/failed（kb-sync.processKbSyncQueue），返回摘要供管理页展示。
 */
import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";
import { syncKnowledgeQueue } from "@/lib/kb/bases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/knowledge-bases/sync */
export const POST = withApi(
  async () => {
    const r = await syncKnowledgeQueue();
    return success(r, r.skipped > 0 ? "同步跳过（未配置 Coze）" : "同步完成");
  },
  { permission: "kb:edit", errorMessage: "同步知识库失败", route: "knowledge-bases/sync/POST" }
);