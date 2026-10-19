import { prisma } from "@/lib/prisma";
import { notFound, serverError } from "@/lib/api-response";
import { decryptField } from "@/lib/crypto";
import { getAdapter } from "@/lib/llm/registry";
import { parseId, withApi } from "@/lib/api-handler";
import { providerTestSchema } from "@/contracts/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = { ok: boolean; latencyMs: number; reply?: string; errMsg?: string };

/** POST /api/llm/providers/[id]/test：连通性测试（延迟 + 回复；失败也以 data.ok=false 返回）
 * C-01：复用适配器注册表（去 kind 分支与原生超时信号），超时 60s 与原实现一致 */
export const POST = withApi<{ id: string }>(
  async ({ request, params }) => {
    const id = parseId(params.id);
    // 空体允许（与原实现一致，不用 parseBody 的 400 语义）
    let body: unknown = {};
    try { body = await request.json(); } catch { /* 空体允许 */ }
    const parsed = providerTestSchema.safeParse(body ?? {});
    const prompt = parsed.success ? parsed.data.prompt : "你好，请回复“连通正常”四个字。";

    try {
      const provider = await prisma.lLMProvider.findUnique({ where: { id } });
      if (!provider) return notFound("供应商不存在");
      const apiKey = provider.apiKey.startsWith("v1:") ? decryptField(provider.apiKey) ?? "" : provider.apiKey;
      if (!apiKey) return Response.json({ code: 400, data: null, message: "API Key 解密失败" });

      const start = Date.now();
      let result: TestResult;
      try {
        // C-01：复用适配器（openai/coze 的调用细节全部在适配器内）
        const r = await getAdapter(provider.kind).chat(provider, apiKey, [{ role: "user", content: prompt }], 60_000);
        result = { ok: true, latencyMs: Date.now() - start, reply: r.reply };
      } catch (err) {
        result = { ok: false, latencyMs: Date.now() - start, errMsg: err instanceof Error ? err.message : String(err) };
      }
      return Response.json({ code: 200, data: result, message: "测试完成" });
    } catch (err) {
      console.error("[llm/test] 测试失败：", err);
      return serverError("测试失败");
    }
  },
  { permission: "llm:edit", route: "llm/providers/test", errorMessage: "测试失败" }
);
