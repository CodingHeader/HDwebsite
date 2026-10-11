import { requireAuth } from "@/lib/api-auth";
import { error, serverError, success } from "@/lib/api-response";
import { kbSearch } from "@/lib/kb-adapter";
import { z } from "zod";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  query: z.string().min(1, "请输入检索问题").max(500),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/** POST /api/kb/test：检索测试（双轨：本地兜底 + Coze） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "kb:list");
  if (!guard.ok) return guard.response;
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "参数错误", 400);
  try {
    const result = await kbSearch(parsed.data.query, { tags: parsed.data.tags });
    return success(
      {
        local: { hits: result.hits, error: result.localError ?? null },
        coze: { ok: !result.cozeError, error: result.cozeError ?? null },
      },
      "检索完成"
    );
  } catch (err) {
    console.error("[kb/test] 检索失败：", err);
    return serverError("检索失败");
  }
}
