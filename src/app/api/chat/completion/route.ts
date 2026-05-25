import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { success, error as errorResp } from "@/lib/api-response";

/**
 * POST /api/chat/completion
 *
 * 前台 AI 聊天代理：
 *  1. 读取当前激活的 AIConfig（endpoint/key/model/温度/系统提示）
 *  2. 可选读取 ChatScene（入口差异化：欢迎语/场景提示/知识库 tag 白名单）
 *  3. 按 scene.knowledgeTags 检索 Knowledge 表拼接知识上下文
 *  4. 组装 OpenAI 兼容 messages 数组，转发到 Modelscope API
 *  5. 返回 assistant 回复与 scene/knowledge 元信息
 *
 * 说明：为避免 API Key 裸露给浏览器，所有调用必须走本代理。
 */

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
  sceneCode: z.string().max(32).optional(),
  sessionId: z.string().max(64).optional(),
});

type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResp(parsed.error.issues[0]?.message || "参数错误"), {
        status: 400,
      });
    }
    const { messages, sceneCode } = parsed.data;

    // 1. 读取激活的 AI 配置
    const config = await prisma.aIConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!config) {
      return NextResponse.json(errorResp("AI客服尚未配置，请联系管理员在后台【AI配置】中添加并启用AI模型"), {
        status: 503,
      });
    }

    // 检查API密钥是否已配置
    if (!config.apiKey || config.apiKey.includes('请替换') || config.apiKey.length < 10) {
      return NextResponse.json(errorResp("AI服务API密钥未配置，请联系管理员在后台【AI配置】中设置有效的API密钥"), {
        status: 503,
      });
    }

    // 2. 读取场景（可选）
    const scene = sceneCode
      ? await prisma.chatScene.findUnique({ where: { code: sceneCode } })
      : null;

    // 3. 知识库检索（根据 scene.knowledgeTags 匹配，受 useKnowledgeBase 开关控制）
    let knowledgeContext = "";
    if (scene && scene.useKnowledgeBase !== false && scene.knowledgeTags) {
      const tags = scene.knowledgeTags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        const items = await prisma.knowledge.findMany({
          where: {
            status: "active",
            OR: tags.map((t: string) => ({ tags: { contains: t } })),
          },
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
          take: 6,
        });
        if (items.length > 0) {
          knowledgeContext = items
            .map((k: { title: string; content: string }, i: number) => `[${i + 1}] ${k.title}\n${k.content}`)
            .join("\n\n");
        }
      }
    }

    // 4. 组装 messages
    const systemParts: string[] = [];
    if (config.systemPrompt) systemParts.push(config.systemPrompt);
    if (scene?.systemPrompt) systemParts.push(scene.systemPrompt);
    if (knowledgeContext) {
      systemParts.push(
        `以下是可供参考的弘道经理学院知识片段，请在回答学员问题时优先使用，并结合自己的理解给出自然答复：\n\n${knowledgeContext}`
      );
    }
    const openaiMessages: OpenAIMessage[] = [];
    if (systemParts.length > 0) {
      openaiMessages.push({ role: "system", content: systemParts.join("\n\n---\n\n") });
    }
    for (const m of messages) openaiMessages.push(m);

    // 5. 转发到 Modelscope（或其它 OpenAI 兼容端）——支持 55s timeout + 1 次冷启动重试
    const endpoint = config.apiEndpoint.replace(/\/$/, "") + "/chat/completions";
    const payload = JSON.stringify({
      model: config.model,
      messages: openaiMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1000,
      stream: false,
    });

    async function callUpstream(timeoutMs: number) {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config!.apiKey}`,
          },
          body: payload,
          signal: ac.signal,
        });
        return res;
      } finally {
        clearTimeout(tid);
      }
    }

    const start = Date.now();
    let upstream: Response | null = null;
    let attemptError: unknown = null;
    // 单次大 timeout (88s) 足以承受 Modelscope 冷启动；5xx 额外短 retry 15s
    try {
      upstream = await callUpstream(88_000);
      if (!upstream.ok && upstream.status >= 500) {
        const text = await upstream.clone().text().catch(() => "");
        console.warn(`[chat/completion] upstream 5xx=${upstream.status}`, text.slice(0, 200));
        try {
          upstream = await callUpstream(15_000);
        } catch (retryErr) {
          attemptError = retryErr;
        }
      }
    } catch (err) {
      attemptError = err;
      const isAbort = (err as Error | undefined)?.name === "AbortError";
      console.warn(`[chat/completion] upstream aborted=${isAbort}`);
    }
    const elapsed = Date.now() - start;

    if (!upstream || !upstream.ok) {
      const msg = !upstream
        ? (attemptError instanceof Error ? attemptError.message : "AI 上游响应超时")
        : `AI 服务错误：${upstream.status}`;
      return NextResponse.json(errorResp(msg), { status: 502 });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { role: string; content: string } }>;
      usage?: { total_tokens?: number };
    };

    let reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error('[chat/completion] 上游AI返回空回复:', JSON.stringify(data));
      return NextResponse.json(errorResp("AI服务暂时无响应，请稍后重试或联系管理员检查AI配置"), { status: 502 });
    }
    const tokensUsed = data.usage?.total_tokens ?? null;

    return NextResponse.json(
      success(
        {
          reply,
          model: config.model,
          tokensUsed,
          responseTime: elapsed,
          scene: scene
            ? {
                code: scene.code,
                name: scene.name,
                greeting: scene.greeting,
              }
            : null,
          knowledgeHit: !!knowledgeContext,
        },
        "ok"
      )
    );
  } catch (err) {
    console.error("[chat/completion] error", err);
    const message = err instanceof Error ? err.message : "AI 调用失败";
    return NextResponse.json(errorResp(message), { status: 500 });
  }
}
