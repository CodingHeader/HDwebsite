/**
 * 通知网关（SOL-005）：邮件单点——事件 → 规则 → 模板渲染 → 异步发送 + 留痕重试
 * - SMTP 走 Setting email 分组（ADR-004）；未配置 → skipped(smtp_not_configured)
 * - 同类错误 10 分钟聚合只发 1 封；发送间隔 ≥2s；失败重试 3 次指数退避（notify.retryCount）
 * - P06：事件全集移入契约（contracts/events）；立即发布任务执行前同步发 before_publish_*（notifyBeforePublish）；
 *   API 未捕获异常（api-handler onApiError 默认监听）与调度任务异常 → system_error / job_failed；链接走 appOrigin()
 */
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";
import { getAllSettings } from "@/lib/settings";
import { execute as executeJob } from "@/lib/scheduler";
import { managerLink } from "@/lib/app-origin";
import { parseJsonField } from "@/lib/json-field";
import { AGGREGATED_EVENTS, type NotifyEvent } from "@/contracts/events";
import type { PublishJob } from ".prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type { NotifyEvent };

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

// 聚合类事件进程内串行化：并发异常同时到达时，"查最近记录 → 建记录"不被交错，保证 10 分钟只建 1 条
let aggregateChain: Promise<unknown> = Promise.resolve();

/** 事件入口：查规则 → 组收件人 → 渲染模板 → 建 NotifyRecord（异步发送由 retry.failed 兜底重试） */
export async function notifyEvent(event: NotifyEvent, vars: NotifyVars): Promise<void> {
  if (AGGREGATED_EVENTS.includes(event)) {
    const run = aggregateChain.then(() => notifyEventInner(event, vars));
    aggregateChain = run.catch(() => undefined);
    return run;
  }
  return notifyEventInner(event, vars);
}

async function notifyEventInner(event: NotifyEvent, vars: NotifyVars): Promise<void> {
  try {
    const rule = await prisma.notifyRule.findUnique({ where: { event } });
    if (!rule || !rule.enabled) return;

    // system_error 事件不得再派生 system_error（防通知风暴）；失败类事件 10 分钟聚合
    // （聚合条件含未成功记录：SMTP 故障时护栏依然生效）
    if (AGGREGATED_EVENTS.includes(event)) {
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
    const parsedGroups = parseJsonField<string[] | null>(rule.recipientGroups, null);
    if (Array.isArray(parsedGroups)) groups = parsedGroups;

    const recipients = await prisma.notifyRecipient.findMany({ where: { enabled: true } });
    const toEmails = recipients
      .filter((r) => {
        const gs = parseJsonField<unknown>(r.groups, null);
        return Array.isArray(gs) && gs.some((g: string) => groups.includes(g));
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
    await notifyBeforePublish(job);
  }
}

function beforePublishEvent(job: Pick<PublishJob, "channel" | "contentType">): NotifyEvent {
  return job.channel === "wechat" ? "before_publish_wechat" : job.contentType === "info" ? "before_publish_info" : "before_publish_news";
}

/**
 * 发布前提醒（单任务）：preNotify 且未提醒 → before_publish_* 事件 + 标记 notifySentAt。
 * 定时任务由 publishRemindScan 提前量触发；立即发布（scheduledAt=null 或提前量内才被扫到）由执行器在执行前同步调用。
 */
export async function notifyBeforePublish(job: PublishJob & { item?: { title: string } | null }): Promise<boolean> {
  if (!job.preNotify || job.notifySentAt) return false;
  // 先抢占标记，防 notify.scan 与执行器并发重复提醒
  const claimed = await prisma.publishJob.updateMany({ where: { id: job.id, notifySentAt: null }, data: { notifySentAt: new Date() } });
  if (claimed.count === 0) return false;
  const title =
    job.item?.title ??
    (job.itemId ? (await prisma.contentItem.findUnique({ where: { id: job.itemId }, select: { title: true } }))?.title : null) ??
    `发布任务 #${job.id}`;
  const when = job.scheduledAt && job.scheduledAt.getTime() > Date.now() ? job.scheduledAt : null;
  await notifyEvent(beforePublishEvent(job), {
    title,
    detail: when
      ? `将于 ${when.toISOString().slice(0, 16).replace("T", " ")}（UTC）发布到${job.channel === "wechat" ? "公众号" : "官网"}`
      : `即将立即发布到${job.channel === "wechat" ? "公众号" : "官网"}`,
    link: await managerLink("publish-jobs"),
  });
  return true;
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
        link: await managerLink("llm-providers"),
      });
    }
  }
}

/** 触发采集失败告警（collect 引擎调用） */
export async function notifyCollectFailed(sourceName: string, errMsg: string): Promise<void> {
  await notifyEvent("collect_failed", {
    title: `采集源「${sourceName}」执行失败`,
    detail: errMsg,
    link: await managerLink("collect-tasks"),
  });
}

/** 调度任务异常 → job_failed（scheduler 调用；10 分钟聚合） */
export async function notifyJobFailed(jobName: string, errMsg: string): Promise<void> {
  await notifyEvent("job_failed", {
    title: `调度任务「${jobName}」执行失败`,
    detail: errMsg,
    link: await managerLink("dashboard"),
  });
}

/** API 未捕获异常 → system_error（api-handler onApiError 默认监听调用；10 分钟聚合） */
export async function notifyApiError(ctx: { error: unknown; method: string; path: string; route?: string; username?: string | null; at: Date }): Promise<void> {
  const e = ctx.error;
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  const stack = e instanceof Error && e.stack ? e.stack.split("\n").slice(1, 6).join("\n") : "";
  await notifyEvent("system_error", {
    title: `接口异常 ${ctx.method} ${ctx.route ?? ctx.path}`,
    time: ctx.at.toISOString().slice(0, 19).replace("T", " "),
    detail: [`路径：${ctx.path}`, `用户：${ctx.username ?? "匿名"}`, `错误：${msg}`, stack].filter(Boolean).join("\n"),
    link: await managerLink("logs"),
  });
}

export { executeJob };
