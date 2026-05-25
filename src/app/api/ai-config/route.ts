import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const configs = await prisma.aIConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(success(configs, "获取AI配置成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取AI配置失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const {
      name,
      apiEndpoint,
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      greeting,
      isActive,
      temperature,
      maxTokens,
      rateLimit,
      dailyQuota,
    } = body;

    if (!name || !apiEndpoint || !apiKey) {
      return NextResponse.json(error("名称、API端点和API Key为必填项"), { status: 400 });
    }

    // 如果设为激活，先将其他配置设为非激活
    if (isActive) {
      await prisma.aIConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const config = await prisma.aIConfig.create({
      data: {
        name,
        apiEndpoint,
        apiKey,
        model: model || "gpt-3.5-turbo",
        systemPrompt: systemPrompt || null,
        userPrompt: userPrompt || null,
        greeting: greeting || null,
        isActive: isActive ?? false,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 1000,
        rateLimit: rateLimit ?? 60,
        dailyQuota: dailyQuota ?? 1000,
      },
    });

    return NextResponse.json(success(config, "创建AI配置成功"), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建AI配置失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
