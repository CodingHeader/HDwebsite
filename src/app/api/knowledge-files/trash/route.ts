/**
 * C-12：知识库回收站操作（`/api/knowledge-files/trash`，权限 kb:edit）。
 * - POST：restore（恢复）或 purge（彻底删除，同步删 Coze 远端，契约 kbTrashActionSchema）
 * - 彻底删除时远端删除被调用；失败记录 syncErr 返回给调用方（不得静默成功）
 */
import { success } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { kbTrashActionSchema } from "@/contracts/kb";
import { trashAction } from "@/lib/kb/manage";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/knowledge-files/trash */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, kbTrashActionSchema);
    const res = await trashAction(input);
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: input.action === "purge" ? "purge" : "restore",
      title: `${input.action} ${res.count} 个文件`,
      after: { action: input.action, count: res.count, purgedRemote: res.purgedRemote },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    if (input.action === "purge") {
      // 区分三种情形：已同步远端 / 部分失败（syncErr）/ 未注册适配器或文件未绑定远端
      const suffix = res.purgedRemote
        ? `，远端同步删除 ${res.purgedRemote} 个`
        : res.syncErr?.length
          ? `，${res.syncErr.length} 个远端删除失败：${res.syncErr[0]}`
          : "，未注册远端适配器或文件未绑定远端（本地已删除）";
      return success(res, `彻底删除成功（${res.count} 个${suffix}）`);
    }
    return success(res, `恢复成功（${res.count} 个）`);
  },
  { permission: "kb:edit", errorMessage: "回收站操作失败", route: "knowledge-files/trash/POST" }
);