import { prisma } from "@/lib/prisma";
import { error } from "@/lib/api-response";
import { gatewayChatStream, recordGatewayFailure } from "@/lib/llm-gateway";
import { buildChatContext, findScene, recordMessage } from "@/lib/chat-service";
import { withApi } from "@/lib/api-handler";
import { clientIp } from "@/lib/log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatRequestSchema = z.object({
  sessionId: z.string().min(8).max(64),
  sceneCode: z.string().max(50).default("float"),
  message: z.string().min(1, "消息不能为空").max(2000),
});

const RATE_LIMIT_PER_MINUTE = 10;

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

    // 限频（SOL-003：默认 10 次/分钟）
    const recent = await prisma.aIChatHistory.count({
      where: { role: "user", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent >= RATE_LIMIT_PER_MINUTE) {
      return error("提问太频繁，请稍后再试", 400);
    }

    // 敏感词挡板（最小集：提示词注入与违禁引流；M2 按需扩充）
    const banned = ["忽略之前的指令", "ignore previous instructions", "system prompt"];
    if (banned.some((w) => message.toLowerCase().includes(w.toLowerCase()))) {
      return error("消息包含不允许的内容", 400);
    }

    // 场景装配 + 知识检索 + 历史裁剪（chat-service，与公众号共用）
    const scene = await findScene({ code: sceneCode });
    const ctx = await buildChatContext({ scene, sessionId, message });
    if (!ctx.isRetry) {
      // 重试同一失败问题时不重复写入（ChatWidget 重试去重，P06）
      await recordMessage({ sessionId, channel: "website", role: "user", message, ipAddress: ip, userAgent: request.headers.get("user-agent") });
    }

    const routed = await gatewayChatStream(ctx.messages, { preferredProviderId: ctx.preferredProviderId });
    if (!routed.ok) {
      await recordMessage({ sessionId, channel: "website", role: "assistant", message: "", model: "gateway", metadata: JSON.stringify({ error: routed.errMsg }) });
      return error(`AI 服务暂时不可用：${routed.errMsg}`, 502);
    }

    const encoder = new TextEncoder();
    const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          sse("meta", { scene: { code: scene?.code ?? "float", name: scene?.name ?? "智能客服" }, greeting: scene?.greeting, provider: routed.providerName })
        );
        let full = "";
        const reader = routed.stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = new TextDecoder().decode(value);
            full += text;
            controller.enqueue(sse("delta", { text }));
          }
          controller.enqueue(sse("done", { conversationId: sessionId }));
        } catch (err) {
          console.error("[chat/stream] 流式读取失败：", err);
          await recordGatewayFailure(routed.providerId).catch(() => undefined);
          controller.enqueue(
            sse("error", {
              message:
                err instanceof Error && err.message.startsWith("Coze ")
                  ? err.message
                  : "生成中断，请重试",
            })
          );
        } finally {
          if (!full.trim()) {
            controller.enqueue(
              sse("error", { message: "AI 未返回内容（供应商凭证可能已失效，请在后台更新）" })
            );
          }
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
