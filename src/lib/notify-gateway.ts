/**
 * 通知网关（SOL-005）：邮件单点——事件 → 规则 → 模板渲染 → 异步发送 + 留痕重试
 * - SMTP 走 Setting email 分组（ADR-004）；未配置 → skipped(smtp_not_configured)
 * - 同类错误 10 分钟聚合只发 1 封；发送间隔 ≥2s；失败重试 3 次指数退避（notify.retryCount）
 */
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";
import { getAllSettings } from "@/lib/settings";
import { execute as executeJob } from "@/lib/scheduler";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type NotifyEvent =
  | "before_publish_news"
  | "before_publish_info"
  | "before_publish_wechat"
  | "llm_balance_low"
  | "job_failed"
  | "system_error"
  | "collect_failed";

type NotifyVars = { title: string; time?: string; detail?: string; link?: string };

export async function smtpConfigured(): Promise<boolean> {
  const settings = await getAllSettings();
  return Boolean(settings.emailHost && settings.emailUsername);
}

async function transport(): Promise<any> {
  const settings = await getAllSettings();
  const password = settings.emailPassword?.startsWith("v1:") ? decryptField(settings.emailPassword) ?? "" : settings.emailPassword ?? "";
  return nodemailer.createTransport({
    host: settings.emailHost,
    port: Number(settings.emailPort || 465),
    secure: settings.emailSecure !== "false",
    auth: { user: settings.emailUsername, pass: password },
  });
}

/** 事件入口：查规则 → 组收件人 → 渲染模板 → 建 NotifyRecord（异步发送由 retry.failed 兜底重试） */
export async function notifyEvent(event: NotifyEvent, vars: NotifyVars): Promise<void> {
  try {
    const rule = await prisma.notifyRule.findUnique({ where: { event } });
    if (!rule || !rule.enabled) return;

    // system_error 事件不得再派生 system_error（防通知风暴）；失败类事件 10 分钟聚合
    // （聚合条件含未成功记录：SMTP 故障时护栏依然生效）
    if (event === "system_error" || event === "job_failed" || event === "collect_failed") {
      const recent = await prisma.notifyRecord.findFirst({
        where: { event, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
      });
      if (recent) return;
    }

    const template =
      (rule.templateId ? await prisma.notifyTemplate.findUnique({ where: { id: rule.templateId } }) : null) ??
      (await prisma.notifyTemplate.findFirst({ where: { isDefault: true } }));
    if (!template) return;

    let groups: string[] = ["publish"];
    try {
      const parsed = JSON.parse(rule.recipientGroups);
      if (Array.isArray(parsed)) groups = parsed;
    } catch { /* 默认 */ }

    const recipients = await prisma.notifyRecipient.findMany({ where: { enabled: true } });
    const toEmails = recipients
      .filter((r) => {
        try {
          const gs = JSON.parse(r.groups);
          return Array.isArray(gs) && gs.some((g: string) => groups.includes(g));
        } catch {
          return false;
        }
      })
      .map((r) => r.email);
    if (toEmails.length === 0) return;

    const time = vars.time ?? new Date().toISOString().slice(0, 19).replace("T", " ");
    const render = (text: string) =>
      text.replaceAll("{title}", vars.title).replaceAll("{time}", time).replaceAll("{detail}", vars.detail ?? "—").replaceAll("{link}", vars.link ?? "—");

    const record = await prisma.notifyRecord.create({
      data: {
        ruleId: rule.id, event, toEmails: toEmails.join(","),
        subject: render(template.subject), content: render(template.body), status: "pending",
      },
    });
    await deliver(record.id, 0);
  } catch (err) {
    console.error(`[notify] 事件 ${event} 处理失败：`, err);
  }
}

/** 实际投递：未配置 SMTP → skipped；失败 → 重试队列（notify.scan 每 5 分钟扫 pending/failed） */
async function deliver(recordId: number, attempt: number): Promise<void> {
  const record = await prisma.notifyRecord.findUnique({ where: { id: recordId } });
  if (!record || record.status === "sent" || record.status === "skipped") return;
  if (!(await smtpConfigured())) {
    await prisma.notifyRecord.update({
      where: { id: recordId },
      data: { status: "skipped", errMsg: "smtp_not_configured" },
    });
    return;
  }
  try {
    const transporter = await transport();
    const settings = await getAllSettings();
    await transporter.sendMail({
      from: settings.emailFrom || settings.emailUsername,
      to: record.toEmails.split(","),
      subject: record.subject,
      text: record.content,
    });
    await prisma.notifyRecord.update({ where: { id: recordId }, data: { status: "sent", sentAt: new Date(), retries: attempt } });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const settings = await getAllSettings();
    const maxRetry = Number(settings.notifyRetryCount || 3);
    if (attempt < maxRetry) {
      await prisma.notifyRecord.update({
        where: { id: recordId },
        data: { status: "failed", retries: attempt, errMsg },
      });
      const backoff = 2 ** attempt * 60_000;
      setTimeout(() => {
        deliver(recordId, attempt + 1).catch(() => undefined);
      }, backoff);
    } else {
      // 终态 dead：notifyRetryScan 只扫 pending，不再重投（防通知风暴）
      await prisma.notifyRecord.update({
        where: { id: recordId },
        data: { status: "dead", retries: attempt, errMsg },
      });
      if (record.event !== "system_error") {
        await notifyEvent("system_error", {
          title: "邮件投递失败（已终止重试）",
          detail: "记录 #" + recordId + "（" + record.event + "）：" + errMsg,
        }).catch(() => undefined);
      }
    }
  }
}

/** notify.scan 任务：重试失败/未发送的通知记录 */
export async function notifyRetryScan(): Promise<void> {
  const pending = await prisma.notifyRecord.findMany({
    where: { status: "pending" }, // failed 由退避定时器接管；dead 为终态
    orderBy: { id: "asc" },
    take: 10,
  });
  for (const record of pending) {
    await deliver(record.id, record.retries);
    await new Promise((r) => setTimeout(r, 2000)); // 邮件服务商限频：间隔 ≥2s
  }
}

/** publish 前提醒扫描：距 scheduledAt ≤ 提前量且未提醒 → before_publish_* 事件 */
export async function publishRemindScan(): Promise<void> {
  const settings = await getAllSettings();
  const aheadMinutes = Number(settings.publishRemindAheadMinutes || 30);
  if (!Number.isFinite(aheadMinutes) || aheadMinutes <= 0) return;
  const now = Date.now();
  const jobs = await prisma.publishJob.findMany({
    where: {
      status: { in: ["scheduled", "pending"] },
      preNotify: true,
      notifySentAt: null,
      scheduledAt: { not: null, gte: new Date(now), lte: new Date(now + aheadMinutes * 60_000) },
    },
    include: { item: true },
  });
  for (const job of jobs) {
    const event: NotifyEvent =
      job.channel === "wechat" ? "before_publish_wechat" : job.contentType === "info" ? "before_publish_info" : "before_publish_news";
    await notifyEvent(event, {
      title: job.item?.title ?? `发布任务 #${job.id}`,
      detail: `将于 ${job.scheduledAt?.toISOString().slice(0, 16).replace("T", " ")} 发布到${job.channel === "wechat" ? "公众号" : "官网"}`,
      link: `${process.env.APP_ORIGIN ?? "https://www.hd1994.com"}/manager/publish-jobs`,
    });
    await prisma.publishJob.update({ where: { id: job.id }, data: { notifySentAt: new Date() } });
  }
}

/** llm.balance-check 任务：低于阈值的供应商 → llm_balance_low 事件（每日一轮） */
export async function llmBalanceCheck(): Promise<void> {
  const providers = await prisma.lLMProvider.findMany({ where: { status: "active" } });
  const settings = await getAllSettings();
  const defaultThreshold = Number(settings.llmBalanceThreshold || 0);
  for (const p of providers) {
    if (p.balance == null) continue;
    const threshold = p.balanceThreshold ?? defaultThreshold;
    if (threshold > 0 && p.balance <= threshold) {
      await notifyEvent("llm_balance_low", {
        title: `模型「${p.name}」余额不足`,
        detail: `当前余额 ${p.balance} ${p.balanceCurrency}，阈值 ${threshold}。请前往后台填报充值后的余额。`,
        link: `${process.env.APP_ORIGIN ?? "https://www.hd1994.com"}/manager/llm-providers`,
      });
    }
  }
}

/** 触发采集失败告警（collect 引擎调用） */
export async function notifyCollectFailed(sourceName: string, errMsg: string): Promise<void> {
  await notifyEvent("collect_failed", {
    title: `采集源「${sourceName}」执行失败`,
    detail: errMsg,
    link: `${process.env.APP_ORIGIN ?? "https://www.hd1994.com"}/manager/collect-tasks`,
  });
}

export { executeJob };
