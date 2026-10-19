/**
 * POST /api/chat/stream：SSE 流式 AI 客服（公开 + IP 限频 + 敏感词挡板 + chat-service 场景装配）
 * C-07：
 * - 请求体与 SSE 事件全部走契约 `src/contracts/chat.ts`（DR-23：删除内联 zod 定义）
 * - 限频命中返回 HTTP 429 / code 429（ADR-028 契约错误码；原为 400）
 * - 场景 providerIds [B,A] 逐个尝试 → llmProviderId → 默认 → priority → fallback（网关顺序保证回落）
 * - 场景级参数（temperature/maxTokens/topP）透传网关 → 适配器
 * - 流中途失败只发一条 error（catch 与 finally 去重，ChatWidget 只显示一条）
 */
import { prisma } from "@/lib/prisma";
import { error, serviceUnavailable, tooManyRequests } from "@/lib/api-response";
import { gatewayChatStream, recordGatewayFailure } from "@/lib/llm-gateway";
import { buildChatContext, findScene, recordMessage } from "@/lib/chat-service";
import { GUARD_FALLBACK_REPLY } from "@/lib/llm/guard";
import { withApi } from "@/lib/api-handler";
import { clientIp } from "@/lib/log";
import { sseFrame, reduceSseError } from "@/lib/llm/sse";
import { chatRequestSchema } from "@/contracts/chat";

export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_MINUTE = 10;

/** C-10：敏感词命中时的兜底流（meta → delta(固定回复) → done），不调用模型 */
function guardFallbackStream(input: {
  sessionId: string;
  scene: { code: string | null; name: string | null } | null;
  reply: string;
}): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        sseFrame("meta", {
          scene: { code: input.scene?.code ?? "float", name: input.scene?.name ?? "智能客服" },
          provider: "guard",
        })
      );
      controller.enqueue(sseFrame("delta", { text: input.reply }));
      controller.enqueue(sseFrame("done", { conversationId: input.sessionId }));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** POST /api/chat/stream：SSE 流式 AI 客服（公开 + IP 限频 + 敏感词挡板 + chat-service 场景装配） */
export const POST = withApi(
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("请求体不是合法 JSON");
    }
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "参数错误", 400);
    const { sessionId, sceneCode, message } = parsed.data;
    const ip = clientIp(request);

    // 限频（SOL-003：默认 10 次/分钟；C-07：HTTP 429 + code 429）
    const recent = await prisma.aIChatHistory.count({
      where: { role: "user", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent >= RATE_LIMIT_PER_MINUTE) {
      return tooManyRequests();
    }

    // 敏感词挡板（最小集：提示词注入与违禁引流；M2 按需扩充）
    const banned = ["忽略之前的指令", "ignore previous instructions", "system prompt"];
    if (banned.some((w) => message.toLowerCase().includes(w.toLowerCase()))) {
      return error("消息包含不允许的内容", 400);
    }

    // 场景装配 + 知识检索 + 历史裁剪 + 风控（chat-service，与公众号共用同一入口）
    const scene = await findScene({ code: sceneCode });
    const ctx = await buildChatContext({ scene, sessionId, message });

    // C-10：风控结果分派（黑名单/限频 → 429；敏感词 → 固定兜底回复，不调用模型）
    if (ctx.guard.kind === "blacklist") {
      return tooManyRequests("当前会话已被拒绝，请联系招生老师");
    }
    if (ctx.guard.kind === "rate") {
      return tooManyRequests();
    }
    if (ctx.guard.kind === "sensitive") {
      return guardFallbackStream({ sessionId, scene, reply: GUARD_FALLBACK_REPLY });
    }

    if (!ctx.isRetry) {
      // 重试同一失败问题时不重复写入（ChatWidget 重试去重，P06）
      await recordMessage({ sessionId, channel: "website", role: "user", message, ipAddress: ip, userAgent: request.headers.get("user-agent") });
    }

    const routed = await gatewayChatStream(ctx.messages, {
      preferredProviderId: ctx.preferredProviderId,
      preferredProviderIds: ctx.preferredProviderIds,
      overrides: ctx.overrides,
    });
    if (!routed.ok) {
      await recordMessage({ sessionId, channel: "website", role: "assistant", message: "", model: "gateway", metadata: JSON.stringify({ error: routed.errMsg }) });
      // C-09：全部供应商超配额/限频 → 503；其余上游失败 → 502
      return routed.status === 503 ? serviceUnavailable(routed.errMsg) : error(`AI 服务暂时不可用：${routed.errMsg}`, 502);
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          sseFrame("meta", { scene: { code: scene?.code ?? "float", name: scene?.name ?? "智能客服" }, greeting: scene?.greeting, provider: routed.providerName })
        );
        let full = "";
        let errMsg: string | null = null;
        const reader = routed.stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = new TextDecoder().decode(value);
            full += text;
            controller.enqueue(sseFrame("delta", { text }));
          }
          controller.enqueue(sseFrame("done", { conversationId: sessionId }));
        } catch (err) {
          console.error("[chat/stream] 流式读取失败：", err);
          await recordGatewayFailure(routed.providerId).catch(() => undefined);
          errMsg =
            err instanceof Error && err.message.startsWith("Coze ")
              ? err.message
              : "生成中断，请重试";
        } finally {
          if (!full.trim()) {
            errMsg = reduceSseError(errMsg, "AI 未返回内容（供应商凭证可能已失效，请在后台更新）");
          }
          if (errMsg) controller.enqueue(sseFrame("error", { message: errMsg }));
          await prisma.aIChatHistory
            .create({
              data: {
                sessionId,
                channel: "website",
                role: "assistant",
                message: full,
                model: routed.providerName,
                pageUrl: request.headers.get("referer") ?? null,
              },
            })
            .catch(() => undefined);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  },
  { route: "chat/stream", errorMessage: "会话处理失败" }
);