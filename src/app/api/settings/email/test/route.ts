import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { getAllSettings } from "@/lib/settings";
import { decryptField } from "@/lib/crypto";
import { withApi } from "@/lib/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/settings/email/test：SMTP 连接测试（SOL-005）
 * 测试本身不抛错：无论连接成败都返回 code 200 信封 + data.ok 布尔；
 * 只有解析设置/DB 计数这类基础设施错误才会被 withApi 映射为 500（含 system_error 告警）。
 */
export const POST = withApi(async () => {
  const settings = await getAllSettings();
  if (!settings.emailHost || !settings.emailUsername) {
    return success(
      { ok: false, message: "SMTP 未配置：请先在「站点设置 → 邮件」填写服务器与账号" },
      "测试完成",
    );
  }
  const password = settings.emailPassword?.startsWith("v1:") ? decryptField(settings.emailPassword) ?? "" : settings.emailPassword ?? "";
  const transporter = nodemailer.createTransport({
    host: settings.emailHost,
    port: Number(settings.emailPort || 465),
    secure: settings.emailSecure !== "false",
    auth: { user: settings.emailUsername, pass: password },
    connectionTimeout: 10_000,
  });
  try {
    await transporter.verify();
    const count = await prisma.notifyRecipient.count({ where: { enabled: true } });
    return success(
      { ok: true, message: `SMTP 连接成功（${settings.emailHost}:${settings.emailPort}）；启用中的接收人 ${count} 名` },
      "测试完成",
    );
  } catch (err) {
    return success(
      { ok: false, message: err instanceof Error ? err.message : "SMTP 连接失败" },
      "测试完成",
    );
  }
}, { permission: "setting:edit", errorMessage: "SMTP 测试执行失败", route: "settings/email-test/POST" });