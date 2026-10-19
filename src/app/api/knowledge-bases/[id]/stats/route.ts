/**
 * C-12：知识库统计（`/api/knowledge-bases/[id]/stats`，权限 kb:list）。
 * - GET：返回文件数 / 切片数 / 回收站数 / Coze 同步成功·失败数 / lastSyncAt（契约 kbStatsSchema）
 */
import { notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { statsOf } from "@/lib/kb/manage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/knowledge-bases/[id]/stats */
export const GET = withApi<Params>(
  async ({ params }) => {
    const id = parseId(params.id);
    const base = await prisma.knowledgeBase.findUnique({ where: { id }, select: { id: true } });
    if (!base) return notFound("知识库不存在");
    const stats = await statsOf(id);
    return success(stats, "获取知识库统计成功");
  },
  { permission: "kb:list", errorMessage: "获取知识库统计失败", route: "knowledge-bases/GET:id/stats" }
);