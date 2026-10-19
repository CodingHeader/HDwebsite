/**
 * C-06：检索测试（`/api/kb/test`，权限 kb:list）。
 * 契约唯一源 `src/contracts/kb.ts`（kbSearchRequestSchema：query + tags + baseIds + topK），
 * 本地轨走 C-05 `searchLocalWeighted`（标题加权 + bigram + 库过滤 + 预筛 ≤500），
 * Coze 轨走 kb-adapter.searchViaCoze（优雅降级：未配置返回 errMsg 不抛错）。
 */
import { success } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { kbSearchRequestSchema } from "@/contracts/kb";
import { searchLocalWeighted } from "@/lib/kb/local";
import { searchViaCoze } from "@/lib/kb-adapter";

export const dynamic = "force-dynamic";

/** POST /api/kb/test：检索测试（双轨：本地加权兜底 + Coze） */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, kbSearchRequestSchema);
    const [localHits, coze] = await Promise.all([
      searchLocalWeighted(input.query, { tags: input.tags, baseIds: input.baseIds, take: input.topK }).then(
        (h) => h,
        (err) => err as Error
      ),
      searchViaCoze(input.query).then(
        (r) => r,
        (err) => ({ ok: false, errMsg: err instanceof Error ? err.message : String(err) })
      ),
    ]);
    return success(
      {
        local: { hits: Array.isArray(localHits) ? localHits : [], error: Array.isArray(localHits) ? null : localHits.message },
        coze: { ok: coze.ok, answer: "answer" in coze ? coze.answer ?? null : null, error: coze.ok ? null : coze.errMsg ?? "检索失败" },
      },
      "检索完成"
    );
  },
  { permission: "kb:list", route: "kb/test", errorMessage: "检索失败" }
);