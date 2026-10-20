/**
 * POST /api/media/batch：媒体批量操作（main parity B8；main 为 DELETE/PATCH 两个方法，upgrade 收敛为 action 字段）
 * - { action: "delete", ids }             → media:delete
 * - { action: "move-category", ids, category } → media:edit
 * ids 1~100；只处理存在的记录，返回实际影响数与缺失 ID。
 * D-11：delete 动作在删库后清理原图 + thumb/small/medium 缩略图物理文件（删除失败不阻断）。
 */
import { prisma } from "@/lib/prisma";
import { forbidden, success } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth";
import { parseBody, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { removeMediaFiles } from "@/lib/crud-resources/media";
import { mediaBatchSchema } from "@/contracts";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, mediaBatchSchema);
    const needed = input.action === "delete" ? "media:delete" : "media:edit";
    if (!hasPermission({ isSuper: session.role.isSuper, permissions: session.role.permissions }, needed)) {
      return forbidden(`权限不足：需要 ${needed}`);
    }
    const ids = [...new Set(input.ids)];
    const found = await prisma.media.findMany({
      where: { id: { in: ids } },
      select: { id: true, filename: true, path: true, metadata: true },
    });
    const foundIds = found.map((m) => m.id);
    const missing = ids.filter((id) => !foundIds.includes(id));

    let affected = 0;
    if (foundIds.length > 0) {
      if (input.action === "delete") {
        affected = (await prisma.media.deleteMany({ where: { id: { in: foundIds } } })).count;
        // D-11：删库后清理物理文件（含缩略图）；失败不阻断 DB 删除
        for (const m of found) {
          try {
            removeMediaFiles({ path: m.path, metadata: m.metadata });
          } catch (err) {
            console.error("[media] 批量删除清理文件失败（不阻断）：", m.id, err);
          }
        }
      } else {
        affected = (
          await prisma.media.updateMany({ where: { id: { in: foundIds } }, data: { category: input.category || null } })
        ).count;
      }
      await logOperation({
        userId: session.id,
        username: session.username,
        module: "media",
        action: input.action === "delete" ? "batch-delete" : "batch-move-category",
        title: `${affected} 个媒体`,
        before: { ids: foundIds },
        after: input.action === "move-category" ? { category: input.category || null } : undefined,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
    }
    const verb = input.action === "delete" ? "删除" : "移动分类";
    return success({ action: input.action, affected, missing }, `已${verb} ${affected} 个媒体`);
  },
  // 先要求 media:list（可见媒体库），具体动作权限在 handler 内按 action 判定
  { permission: "media:list", errorMessage: "批量操作失败", route: "media/batch/POST" }
);
