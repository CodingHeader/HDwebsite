import { prisma } from "@/lib/prisma";
import { error, serverError } from "@/lib/api-response";
import { gatewayChatStream, recordGatewayFailure } from "@/lib/llm-gateway";
import { searchLocal, formatKbContext } from "@/lib/kb-adapter";
import { clientIp } from "@/lib/log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatRequestSchema = z.object({
  sessionId: z.string().min(8).max(64),
  sceneCode: z.string().max(50).default("float"),
  message: z.string().min(1, "消息不能为空").max(2000),
});

const RATE_LIMIT_PER_MINUTE = 10;

/** POST /api/chat/stream：SSE 流式 AI 客服（公开 + IP 限频 + 敏感词挡板 + 场景装配） */
export async function POST(request: Request) {
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

  try {
    // 限频（SOL-003：默认 10 次/分钟）
    const recent = await prisma.aIChatHistory.count({
      where: { role: "user", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent >= RATE_LIMIT_PER_MINUTE) {
      return error("提问太频繁，请稍后再试", 400);
    }

    const scene = await prisma.chatScene.findFirst({ where: { code: sceneCode, status: "active" } });

    // 敏感词挡板（最小集：提示词注入与违禁引流；M2 按需扩充）
    const banned = ["忽略之前的指令", "ignore previous instructions", "system prompt"];
    if (banned.some((w) => message.toLowerCase().includes(w.toLowerCase()))) {
      return error("消息包含不允许的内容", 400);
    }

    // 会话历史（≤40 条/4000 字收敛入网关，TN-012）
    const history = await prisma.aIChatHistory.findMany({
      where: { sessionId },
      orderBy: { id: "desc" },
      take: 40,
    });
    const trimmed: { role: "user" | "assistant"; content: string }[] = [];
    let budget = 4000;
    for (const h of history.reverse()) {
      if (h.role !== "user" && h.role !== "assistant") continue;
      const content = h.message.slice(0, Math.max(0, budget));
      if (!content) break;
      budget -= content.length;
      trimmed.unshift({ role: h.role, content });
    }

    // 知识检索（双轨；场景绑定 tags）
    let kbContext = "";
    if (!scene || scene.useKnowledgeBase) {
      // 公网聊天只走本地兜底检索（Coze 双轨检索留给管理端"检索测试"，避免每条消息多付一次调用与 30s 延迟）
      const tags = scene?.knowledgeTags?.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      kbContext = formatKbContext(await searchLocal(message, { tags }));
    }

    const systemPrompt = [
      scene?.systemPrompt ?? "你是弘道教育的客服助手，礼貌、专业、合规，不承诺保过。",
      kbContext ? `以下是可参考的知识库内容：\n${kbContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const userMsg = { role: "user" as const, content: message };
    await prisma.aIChatHistory.create({
      data: { sessionId, channel: "website", role: "user", message, ipAddress: ip, userAgent: request.headers.get("user-agent") },
    });

    const routed = await gatewayChatStream([{ role: "system", content: systemPrompt }, ...trimmed, userMsg]);
    if (!routed.ok) {
      await prisma.aIChatHistory.create({
        data: { sessionId, channel: "website", role: "assistant", message: "", model: "gateway", metadata: JSON.stringify({ error: routed.errMsg }) },
      });
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
  } catch (err) {
    console.error("[chat/stream] 处理失败：", err);
    return serverError("会话处理失败");
  }
}

