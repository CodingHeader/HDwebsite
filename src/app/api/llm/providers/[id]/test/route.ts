import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError } from "@/lib/api-response";
import { decryptField } from "@/lib/crypto";
import { cozeChat } from "@/lib/coze";
import { idParamSchema } from "@/contracts";
import { providerTestSchema } from "@/contracts/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = { ok: boolean; latencyMs: number; reply?: string; errMsg?: string };

/** POST /api/llm/providers/[id]/test：连通性测试（延迟 + 回复；失败也以 data.ok=false 返回） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "llm:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return error("非法 ID", 400);
  let body: unknown = {};
  try { body = await request.json(); } catch { /* 空体允许 */ }
  const parsed = providerTestSchema.safeParse(body ?? {});
  const prompt = parsed.success ? parsed.data.prompt : "你好，请回复“连通正常”四个字。";

  try {
    const provider = await prisma.lLMProvider.findUnique({ where: { id: parsedId.data } });
    if (!provider) return notFound("供应商不存在");
    const apiKey = provider.apiKey.startsWith("v1:") ? decryptField(provider.apiKey) ?? "" : provider.apiKey;
    if (!apiKey) return error("API Key 解密失败", 400);

    const start = Date.now();
    let result: TestResult;
    if (provider.kind === "coze") {
      const coze = await cozeChat(
        { pat: apiKey, botId: provider.botId ?? "", apiBase: provider.endpoint, timeoutMs: 60_000 },
        prompt
      );
      result = coze.ok
        ? { ok: true, latencyMs: Date.now() - start, reply: coze.reply }
        : { ok: false, latencyMs: Date.now() - start, errMsg: coze.errMsg };
    } else {
      const endpoint = provider.endpoint.replace(/\/+$/, "");
      try {
        const res = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: "user", content: prompt }],
            temperature: provider.temperature,
            max_tokens: 100,
          }),
          signal: AbortSignal.timeout(60_000),
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          result = { ok: false, latencyMs, errMsg: `上游 ${res.status}：${text.slice(0, 200)}` };
        } else {
          const body2 = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          result = { ok: true, latencyMs, reply: body2.choices?.[0]?.message?.content ?? "" };
        }
      } catch (err) {
        result = { ok: false, latencyMs: Date.now() - start, errMsg: err instanceof Error ? err.message : String(err) };
      }
    }
    return Response.json({ code: 200, data: result, message: "测试完成" });
  } catch (err) {
    console.error("[llm/test] 测试失败：", err);
    return serverError("测试失败");
  }
}
