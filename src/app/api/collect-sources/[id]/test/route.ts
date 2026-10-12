import { prisma } from "@/lib/prisma";
import { notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { fetchTextOnce, testParseSource } from "@/lib/collect-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/collect-sources/[id]/test：试抓预览（不入库，ADR-003）；抓取失败以 data.errMsg 返回（200） */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const source = await prisma.collectSource.findUnique({ where: { id } });
    if (!source) return notFound("采集源不存在");
    try {
      const result = await testParseSource(source, fetchTextOnce);
      return success(
        { count: result.items.length, samples: result.items.slice(0, 5).map((i) => ({ title: i.title, url: i.url })) },
        result.errMsg ?? "试抓完成"
      );
    } catch (err) {
      return success({ count: 0, samples: [], errMsg: err instanceof Error ? err.message : String(err) }, "试抓完成");
    }
  },
  { permission: "collect:edit", route: "collect-sources/test", errorMessage: "试抓失败" }
);
