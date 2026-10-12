import { success } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { kbSearch } from "@/lib/kb-adapter";
import { z } from "zod";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  query: z.string().min(1, "请输入检索问题").max(500),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/** POST /api/kb/test：检索测试（双轨：本地兜底 + Coze） */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, testSchema);
    const result = await kbSearch(input.query, { tags: input.tags });
    return success(
      {
        local: { hits: result.hits, error: result.localError ?? null },
        coze: { ok: !result.cozeError, error: result.cozeError ?? null },
      },
      "检索完成"
    );
  },
  { permission: "kb:list", route: "kb/test", errorMessage: "检索失败" }
);
