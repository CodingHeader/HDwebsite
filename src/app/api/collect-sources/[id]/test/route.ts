import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound } from "@/lib/api-response";
import { fetchTextOnce, testParseSource } from "@/lib/collect-test";
import { idParamSchema } from "@/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/collect-sources/[id]/test：试抓预览（不入库，ADR-003） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "collect:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return error("非法 ID", 400);
  try {
    const source = await prisma.collectSource.findUnique({ where: { id: parsedId.data } });
    if (!source) return notFound("采集源不存在");
    const result = await testParseSource(source, fetchTextOnce);
    return Response.json({
      code: 200,
      data: { count: result.items.length, samples: result.items.slice(0, 5).map((i) => ({ title: i.title, url: i.url })) },
      message: result.errMsg ?? "试抓完成",
    });
  } catch (err) {
    return Response.json({
      code: 200,
      data: { count: 0, samples: [], errMsg: err instanceof Error ? err.message : String(err) },
      message: "试抓完成",
    });
  }
}
