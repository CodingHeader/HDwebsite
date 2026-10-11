import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success } from "@/lib/api-response";
import { getAllSettings } from "@/lib/settings";
import { decryptField } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/settings/email/test：SMTP 连接测试（SOL-005） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "setting:edit");
  if (!guard.ok) return guard.response;
  try {
    const settings = await getAllSettings();
    if (!settings.emailHost || !settings.emailUsername) {
      return Response.json({
        code: 200,
        data: { ok: false, message: "SMTP 未配置：请先在「站点设置 → 邮件」填写服务器与账号" },
        message: "测试完成",
      });
    }
    const password = settings.emailPassword?.startsWith("v1:") ? decryptField(settings.emailPassword) ?? "" : settings.emailPassword ?? "";
    const transporter = nodemailer.createTransport({
      host: settings.emailHost,
      port: Number(settings.emailPort || 465),
      secure: settings.emailSecure !== "false",
      auth: { user: settings.emailUsername, pass: password },
      connectionTimeout: 10_000,
    });
    await transporter.verify();
    const { count } = { count: await prisma.notifyRecipient.count({ where: { enabled: true } }) };
    return Response.json({
      code: 200,
      data: { ok: true, message: `SMTP 连接成功（${settings.emailHost}:${settings.emailPort}）；启用中的接收人 ${count} 名` },
      message: "测试完成",
    });
  } catch (err) {
    return Response.json({
      code: 200,
      data: { ok: false, message: err instanceof Error ? err.message : "SMTP 连接失败" },
      message: "测试完成",
    });
  }
}
