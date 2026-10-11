import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success } from "@/lib/api-response";
import { runSource } from "@/lib/collect-engine";
import { idParamSchema } from "@/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/collect-sources/[id]/run：立即执行采集（collect:edit） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "collect:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return error("非法 ID", 400);
  try {
    const source = await prisma.collectSource.findUnique({ where: { id: parsedId.data } });
    if (!source) return notFound("采集源不存在");
    const stat = await runSource(source);
    return success(stat, `采集完成：新增 ${stat.newCount}，跳过 ${stat.skipCount}`);
  } catch (err) {
    console.error("[collect/run] 执行失败：", err);
    return error(err instanceof Error ? err.message : "采集执行失败", 502);
  }
}

