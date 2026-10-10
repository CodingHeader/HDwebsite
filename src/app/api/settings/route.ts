/**
 * Settings API v1 兼容层
 *
 * 旧调用继续工作，内部通过Registry增强：
 * - GET: 合并Registry默认值，返回扁平键值对
 * - POST: 走Registry校验 + upsert
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, serverError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/api-auth";
import { getDefaultValues, validateSettings, getRegistry } from "@/lib/settings-registry";

// GET /api/settings - 获取所有公开设置（兼容层）
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { isPublic: true },
    });

    // 合并Registry默认值
    const defaults = getDefaultValues();
    const settingsMap = settings.reduce<Record<string, string | null>>(
      (acc: Record<string, string | null>, setting: { key: string; value: string | null }) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {}
    );

    // 填充缺失的默认值
    for (const [key, val] of Object.entries(defaults)) {
      if (settingsMap[key] === undefined || settingsMap[key] === null) {
        settingsMap[key] = val;
      }
    }

    return NextResponse.json(success(settingsMap));
  } catch (err) {
    console.error("Get settings error:", err);
    return NextResponse.json(serverError("获取设置失败"), { status: 500 });
  }
}

// POST /api/settings - 批量更新设置（兼容层，走Registry校验）
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(error("参数格式错误"), { status: 400 });
    }

    // Registry校验
    const validation = validateSettings(body);
    if (!validation.valid) {
      return NextResponse.json(
        error(`校验失败: ${Object.values(validation.errors).join("; ")}`),
        { status: 400 }
      );
    }

    // 获取Registry元数据用于upsert
    const registry = getRegistry();
    const registryMap = new Map(registry.map((s) => [s.key, s]));

    const results = await Promise.all(
      Object.entries(body as Record<string, string>).map(async ([key, value]) => {
        const def = registryMap.get(key);
        return prisma.setting.upsert({
          where: { key },
          update: { value },
          create: {
            key,
            value,
            type: def?.type === "number" ? "number" : def?.type === "boolean" ? "boolean" : "string",
            group: def?.group ?? "other",
            isPublic: def?.isPublic ?? true,
            isEncrypted: def?.isEncrypted ?? false,
          },
        });
      })
    );

    return NextResponse.json(success(results, "保存成功"), { status: 201 });
  } catch (err) {
    console.error("Save settings error:", err);
    return NextResponse.json(serverError("保存设置失败"), { status: 500 });
  }
}
