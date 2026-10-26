/**
 * POST /api/chat/stream：SSE 流式 AI 客服（公开 + 双层限频 + 敏感词挡板 + chat-service 场景装配）
 * C-07：
 * - 请求体与 SSE 事件全部走契约 `src/contracts/chat.ts`（DR-23：删除内联 zod 定义）
 * - 限频命中返回 HTTP 429 / code 429（ADR-028 契约错误码；原为 400）
 * - 场景 providerIds [B,A] 逐个尝试 → llmProviderId → 默认 → priority → fallback（网关顺序保证回落）
 * - 场景级参数（temperature/maxTokens/topP）透传网关 → 适配器
 * - 流中途失败只发一条 error（catch 与 finally 去重，ChatWidget 只显示一条）
 *
 * V13-RL-01（2026-10-26）：限流单源化。原实现在本文件硬编码 `RATE_LIMIT_PER_MINUTE = 10`
 * 并按 IP 计数，与 `llm/guard.ts` 的设置驱动限频（默认 20、按 scene:identifier）并存 →
 * 后台改「客服限流」对本通道完全无效，且 IP 硬性 10 次/分在 NAT 下误伤同网用户。
 * 现在：**唯一数值来源 = 设置键 chatGuardRateLimitPerMin**（用户裁决：10 次/分钟）。
 *   - 会话级：checkChatGuard（走 buildChatContext）按 scene:identifier 限频
 *   - IP 级  ：checkIpCap 使用同一个设置值，仅用于堵"换会话绕过"
 */
import { prisma } from "@/lib/prisma";
import { error, serviceUnavailable, tooManyRequests } from "@/lib/api-response";
import { gatewayChatStream, recordGatewayFailure } from "@/lib/llm-gateway";
import { buildChatContext, findScene, readChatSessionCookie, recordMessage, verifyChatSession } from "@/lib/chat-service";
import { checkIpCap, GUARD_FALLBACK_REPLY, loadChatGuardSettings } from "@/lib/llm/guard";
import { withApi } from "@/lib/api-handler";
import { clientIp } from "@/lib/log";
import { sseFrame, reduceSseError } from "@/lib/llm/sse";
import { chatRequestSchema } from "@/contracts/chat";

export const dynamic = "force-dynamic";

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
    // V11-SEC-04：会话必须由服务端签发（GET /api/chat/session → 签名 cookie）；
    // body.sessionId 须与 cookie 一致——裸信 body 会话的劫持面关闭。
    const { sessionId: bodySessionId, sceneCode, message } = parsed.data;
    const cookieSession = verifyChatSession(readChatSessionCookie(request));
    if (!cookieSession) return error("会话无效或已过期，请刷新页面后重试", 400);
    if (bodySessionId !== cookieSession) return error("会话不匹配", 400);
    const sessionId = cookieSession;
    const ip = clientIp(request);

    // V13-RL-01：限频唯一数值来源 = 设置键 chatGuardRateLimitPerMin（用户裁决 10 次/分钟）。
    // 本处只做 IP 级兜底，用于堵"换会话绕过"；会话级限频在下方
    // buildChatContext → checkChatGuard 内按 scene:identifier 执行，两者共用同一设置值。
    //
    // 只在能取到 IP 时启用（ip 为 null 说明无 x-forwarded-for/x-real-ip，例如直连或测试环境）：
    //   · 若在 ip=null 时也计数，所有访客会挤进同一个空字符串桶 → 变成全站共享配额（真实缺陷）
    //   · 传 null 给 DB 的 `ipAddress: null` 会命中所有历史空 IP 记录，跨时间累积误判
    // 无 IP 时退化为"仅会话级限频"，这是可接受的降级（本地/内网场景本就没有可信 IP）。
    if (ip) {
      const guardSettings = await loadChatGuardSettings();
      if (guardSettings.rateLimitPerMin > 0) {
        const recentIpHits = await prisma.aIChatHistory.count({
          where: { role: "user", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
        });
        const ipVerdict = await checkIpCap({ countInWindow: recentIpHits, settings: guardSettings });
        if (ipVerdict.type === "rate") return tooManyRequests();
      }
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