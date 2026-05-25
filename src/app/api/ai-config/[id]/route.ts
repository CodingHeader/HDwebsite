import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const configId = parseInt(id);
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

    if (isActive) {
      await prisma.aIConfig.updateMany({
        where: { isActive: true, id: { not: configId } },
        data: { isActive: false },
      });
    }

    const config = await prisma.aIConfig.update({
      where: { id: configId },
      data: {
        ...(name !== undefined && { name }),
        ...(apiEndpoint !== undefined && { apiEndpoint }),
        ...(apiKey !== undefined && { apiKey }),
        ...(model !== undefined && { model }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(userPrompt !== undefined && { userPrompt }),
        ...(greeting !== undefined && { greeting }),
        ...(isActive !== undefined && { isActive }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(dailyQuota !== undefined && { dailyQuota }),
      },
    });

    return NextResponse.json(success(config, "更新AI配置成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新AI配置失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const configId = parseInt(id);

    await prisma.aIConfig.delete({ where: { id: configId } });

    return NextResponse.json(success(null, "删除AI配置成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除AI配置失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
