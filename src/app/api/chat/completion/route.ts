/**
 * 旧入口兼容（V11-COMPAT-01）：POST /api/chat/completion → 现役 chat-service 装配点
 *
 * 背景：main@94dbbbb 的前台非流式聊天代理（AIConfig 驱动，AIConfig 表/直连上游逻辑在 upgrade
 * 已废弃）。旧客户端契约（对齐 main 原语义，不复活旧实现）：
 *   请求：{ messages: [{role: user|assistant|system, content}] (1..40), sceneCode?, sessionId? }
 *   响应：ApiResponse 信封 { code, data: { reply, model, tokensUsed, responseTime, scene, knowledgeHit }, message }
 *
 * 适配转发：取最后一条 user 消息 → 现役唯一装配点 chat-service#chatOnce
 * （场景提示词 + 知识检索 + 历史裁剪 + 风控 + llm-gateway，与官网 SSE/公众号同链路）。
 * - 会话 id：`legacy-` 前缀 + 旧 sessionId（缺省随机 UUID），与官网 UUID 会话空间区分；
 *   风控标识（黑名单/限频）按 IP（匿名旧客户端无服务端会话，V11-SEC-04 会话签发不适用于旧入口）。
 * - knowledgeHit：现役装配点不对外暴露该标志（main 旧逻辑不复活），恒 false（证据映射表已登记）。
 * - SSE 需求请用现役 POST /api/chat/stream。
 */
import { randomUUID } from "node:crypto";
import { success, error, forbidden, tooManyRequests, badGateway } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";
import { findScene, chatOnce } from "@/lib/chat-service";
import { clientIp } from "@/lib/log";

export const dynamic = "force-dynamic";

type LegacyMessage = { role?: unknown; content?: unknown };

export const POST = withApi(
  async ({ request }) => {
    const startedAt = Date.now();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("请求体不是合法 JSON");
    }
    // 旧契约最小校验（旧 DTO 不复活为契约，仅适配层防御性解析）
    const obj = (body ?? {}) as { messages?: unknown; sceneCode?: unknown; sessionId?: unknown };
    const messages = Array.isArray(obj.messages) ? (obj.messages as LegacyMessage[]) : [];
    if (messages.length === 0 || messages.length > 40) {
      return error("messages 必须为 1..40 条");
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const message = typeof lastUser?.content === "string" ? lastUser.content.trim() : "";
    if (!message) {
      return error("messages 中必须包含至少一条 user 消息");
    }
    if (typeof message !== "string" || message.length > 4000) {
      return error("消息长度须在 4000 字以内");
    }
    const sceneCode = typeof obj.sceneCode === "string" && obj.sceneCode.length <= 32 ? obj.sceneCode : undefined;
    const legacySessionId =
      typeof obj.sessionId === "string" && obj.sessionId.length > 0 && obj.sessionId.length <= 64
        ? `legacy-${obj.sessionId}`.slice(0, 64)
        : `legacy-${randomUUID()}`;

    const scene = await findScene({ code: sceneCode });
    const result = await chatOnce({
      scene,
      sessionId: legacySessionId,
      channel: "website",
      message,
      identifier: `legacy-ip:${clientIp(request)}`,
    });

    if (!result.ok) {
      // 现役风控/网关错误按 ADR-028 码位映射（旧入口无此概念）
      if (result.errMsg === "咨询过于频繁，请稍后再试") return tooManyRequests();
      if (result.errMsg === "当前会话已被拒绝，请联系招生老师") return forbidden(result.errMsg);
      return badGateway(result.errMsg ?? "AI 服务不可用");
    }

    return success(
      {
        reply: result.reply,
        model: result.providerName ?? "gateway",
        tokensUsed: null, // 现役网关不对单次调用暴露 tokens（聚合口径，ADR-034）
        responseTime: Date.now() - startedAt,
        scene: scene ? { code: scene.code, name: scene.name, greeting: scene.greeting } : null,
        knowledgeHit: false, // chat-service 不对外暴露 kb 命中标志（映射表登记）
      },
      "ok"
    );
  },
  { route: "chat/completion", errorMessage: "AI 调用失败" }
);
