/**
 * 通知网关（SOL-005）：邮件单点——事件 → 规则 → 模板渲染 → 异步发送 + 留痕重试
 * - SMTP 走 Setting email 分组（ADR-004）；未配置 → skipped(smtp_not_configured)
 * - 同类错误 10 分钟聚合只发 1 封；发送间隔 ≥2s；失败重试 3 次指数退避（notify.retryCount）
 * - P06：事件全集移入契约（contracts/events）；立即发布任务执行前同步发 before_publish_*（notifyBeforePublish）；
 *   API 未捕获异常（api-handler onApiError 默认监听）与调度任务异常 → system_error / job_failed；链接走 appOrigin()
 * - V11-MAIL-01：投递移出主请求路径——notifyEvent 只建记录即返回（记录即队列），实际 SMTP 发送
 *   在后台执行（scheduleDeliver），主流程不再被 SMTP 挂起/慢速阻塞；发送超时上限 10s（超时按失败
 *   标记走既有 failed/dead 路径）。notifySettle() 供测试/优雅停机等待在途后台投递。
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

// ── V11-MAIL-01：发送超时上限 + 后台投递 ─────────────────────────
/** SMTP 发送超时上限（ms）；超时按发送失败处理（failed/dead 标记 + 退避重试）。测试可注入覆盖。 */
let sendTimeoutMs = 10_000;
export function __setNotifySendTimeout(ms: number | null): void {
  sendTimeoutMs = ms ?? 10_000;
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(msg)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 在途后台投递集合：notifySettle() 等待其全部结束（测试/优雅停机用，主流程不依赖） */
const inFlightDeliveries = new Set<Promise<unknown>>();

/** 后台投递：不阻塞调用方；异常只记日志（deliver 内部已把失败落库为 failed/dead） */
function scheduleDeliver(recordId: number, attempt: number): void {
  const p = deliver(recordId, attempt).catch((err) =>
    console.error(`[notify] 后台投递 #${recordId} 异常：`, err)
  );
  inFlightDeliveries.add(p);
  void p.finally(() => inFlightDeliveries.delete(p));
}

/** 等待所有在途后台投递结束（测试/优雅停机用；while 循环兜住投递期间新排程的记录） */
export async function notifySettle(): Promise<void> {
  while (inFlightDeliveries.size > 0) {
    await Promise.allSettled([...inFlightDeliveries]);
  }
}

/** 事件入口：查规则 → 组收件人 → 渲染模板 → 建 NotifyRecord（记录即队列；实际 SMTP 发送由
 * scheduleDeliver 移入后台，主请求路径不等待发送——V11-MAIL-01）
 * B-06：静默时段（规则级 quietHours 优先于全局 notifyQuietHours）内只建 deferred 记录不发信；
 *       聚合类事件去重改为单条 SQL 条件插入（跨进程原子），不再"查后建"竞态。
 */
export async function notifyEvent(event: NotifyEvent, vars: NotifyVars): Promise<void> {
  if (AGGREGATED_EVENTS.includes(event)) {
    const run = aggregateChain.then(() => notifyEventInner(event, vars));
    aggregateChain = run.catch(() => undefined);
    return run;
  }
  return notifyEventInner(event, vars);
}

// ── B-06：静默时段 ─────────────────────────────────────────────
type QuietWindow = { start: number; end: number }; // 单位分钟 0..1439

/** "HH:mm" → 当日分钟数；格式非法返回 null */
function parseHm(text: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 解析静默时段 JSON（`{start,end}`）；空/非法 → null（DR-14：无效时刻按"无静默"处理并记 warning） */
function parseQuietWindow(raw: string | null | undefined): QuietWindow | null {
  if (!raw) return null;
  const obj = parseJsonField<{ start?: unknown; end?: unknown } | null>(raw, null);
  if (!obj || typeof obj.start !== "string" || typeof obj.end !== "string") return null;
  const s = parseHm(obj.start);
  const e = parseHm(obj.end);
  if (s == null || e == null) {
    console.warn(`[notify] 静默时段格式无效（按无静默处理）：${raw}`);
    return null;
  }
  return { start: s, end: e };
}

/** 上海当前时刻（分钟 0..1439）；nowProvider 可注入（测试用，Intl 不受 vi.setSystemTime 影响） */
let nowProvider: () => Date = () => new Date();
export function __setNotifyClock(provider: (() => Date) | null): void {
  nowProvider = provider ?? (() => new Date());
}
function shanghaiNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(nowProvider());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** 时刻是否落在静默窗内（start<=end 同日内；start>end 跨夜，如 22:00→07:00） */
function inQuietWindow(win: QuietWindow, minute: number): boolean {
  return win.start <= win.end ? minute >= win.start && minute < win.end : minute >= win.start || minute < win.end;
}

/** 取某事件的生效静默窗：规则级 quietHours 优先，其次全局 notifyQuietHours；都无效 → null */
async function effectiveQuietWindow(event: string, ruleQuietRaw: string | null | undefined): Promise<QuietWindow | null> {
  const ruleWin = parseQuietWindow(ruleQuietRaw);
  if (ruleWin) return ruleWin;
  const settings = await getAllSettings();
  return parseQuietWindow(settings.notifyQuietHours);
}

// ── B-06：去重 ───────────────────────────────────────────────

/**
 * 跨进程原子去重：单条 INSERT...SELECT...WHERE NOT EXISTS——SQLite 单语句原子，
 * 两进程并发时仅一个的 WHERE 为真（另一返回空）。RETURNING 原子取回新行 id。
 * 去重键 = event + subject（渲染后含 {title}，title 承载"路由/任务名"标识）+ 10 分钟窗（卡定义）。
 * 时间窗用 SQLite `datetime('now','-10 minutes')`：createdAt 由 CURRENT_TIMESTAMP 写入
 * （`YYYY-MM-DD HH:MM:SS`，UTC），若把 Date 绑定成 ISO（`T` 分隔）则字典序比较会误判。
 * 不依赖唯一索引、不污染 errMsg。返回新记录 id；未插入（并发已处理）返回 null。
 */
async function insertDeduplicated(record: { ruleId: number; event: string; toEmails: string; subject: string; content: string; status: string }): Promise<number | null> {
  const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO "NotifyRecord" ("ruleId","event","toEmails","subject","content","status","retries","createdAt")
     SELECT ?,?,?,?,?,?,'0',CURRENT_TIMESTAMP WHERE NOT EXISTS (
       SELECT 1 FROM "NotifyRecord" WHERE "event"=? AND "subject"=? AND "createdAt">=datetime('now','-10 minutes')
     ) RETURNING "id"`,
    record.ruleId, record.event, record.toEmails, record.subject, record.content, record.status, record.event, record.subject
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

/** 邮件正文脱敏：token/key/password/secret 等形态字串替换为 ***（B-06，P06-verify:90） */
export function sanitizeSensitive(text: string): string {
  return text
    .replace(/(?:v1:)?[A-Za-z0-9_-]{20,}/g, "***")
    .replace(/\b(?:sk-[A-Za-z0-9]{8,})/g, "***")
    .replace(/(password|passwd|secret|token|api[_-]?key|access[_-]?token)\s*[=:]\s*\S+/gi, "$1=***");
}

// ── V11-MAIL-02：按事件类型选择 HTML 模板 ───────────────────────
type MailCategory = "publish" | "failed" | "balance" | "collect" | "generic";

const CATEGORY_META: Record<MailCategory, { label: string; color: string; bg: string }> = {
  publish: { label: "发布前提醒", color: "#1d4ed8", bg: "#eff6ff" },
  failed: { label: "失败告警", color: "#b91c1c", bg: "#fef2f2" },
  balance: { label: "余额提醒", color: "#b45309", bg: "#fffbeb" },
  collect: { label: "采集告警", color: "#6d28d9", bg: "#f5f3ff" },
  generic: { label: "系统通知", color: "#374151", bg: "#f9fafb" },
};

/** 事件 → 模板类别：before_publish_* → publish；job_failed/system_error → failed；
 * llm_balance_low → balance；collect_failed → collect；未知事件 → generic */
export function mailCategory(event: string): MailCategory {
  if (event.startsWith("before_publish_")) return "publish";
  if (event === "collect_failed") return "collect";
  if (event === "llm_balance_low") return "balance";
  if (event === "job_failed" || event === "system_error") return "failed";
  return "generic";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 渲染 HTML 邮件正文（内容先转义再换行转 <br>，防止错误堆栈里的尖括号被当标签）；text 版本照旧作为纯文本回退 */
export function renderNotifyHtml(event: string, subject: string, content: string): string {
  const meta = CATEGORY_META[mailCategory(event)];
  const body = escapeHtml(content).replace(/\n/g, "<br>");
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,\'Segoe UI\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif;">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">',
    `<div style="background:${meta.bg};padding:14px 20px;border-left:4px solid ${meta.color};">`,
    `<span style="color:${meta.color};font-size:13px;font-weight:600;letter-spacing:1px;">${meta.label}</span>`,
    `<div style="color:#111827;font-size:16px;font-weight:600;margin-top:4px;">${escapeHtml(subject)}</div>`,
    "</div>",
    `<div style="padding:20px;color:#374151;font-size:14px;line-height:1.7;word-break:break-word;">${body}</div>`,
    '<div style="padding:12px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">弘道教育 · 管理后台通知（系统邮件，请勿直接回复）</div>',
    "</div></body></html>",
  ].join("");
}

async function notifyEventInner(event: NotifyEvent, vars: NotifyVars): Promise<void> {
  try {
    const rule = await prisma.notifyRule.findUnique({ where: { event } });
    if (!rule || !rule.enabled) return;

    // B-06：静默时段判定（规则级 quietHours 优先，其次全局 notifyQuietHours；无效时刻按无静默处理）
    const quiet = await effectiveQuietWindow(event, rule.quietHours);
    const deferred = quiet ? inQuietWindow(quiet, shanghaiNowMinutes()) : false;

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

    const recordData = {
      ruleId: rule.id, event, toEmails: toEmails.join(","),
      subject: sanitizeSensitive(render(template.subject)),
      content: sanitizeSensitive(render(template.body)),
      status: (deferred ? "deferred" : "pending") as "deferred" | "pending",
    };

    let recordId: number;
    if (AGGREGATED_EVENTS.includes(event)) {
      // B-06：跨进程原子去重——单条 INSERT...RETURNING WHERE NOT EXISTS（event + 10 分钟窗），
      // 替代"查最近记录→建记录"的进程间竞态；进程内链仅作同进程串行的兜底。
      const insertedId = await insertDeduplicated(recordData);
      if (insertedId == null) return; // 其他进程已建同类记录
      recordId = insertedId;
    } else {
      const rec = await prisma.notifyRecord.create({ data: recordData });
      recordId = rec.id;
    }

    if (!deferred) scheduleDeliver(recordId, 0); // V11-MAIL-01：后台投递，不阻塞主请求路径
  } catch (err) {
    console.error(`[notify] 事件 ${event} 处理失败：`, err);
  }
}

/**
 * B-06：补发静默时段内 deferred 的通知记录（notify.scan 调用；jobs 属 D 线，本卡不注册新任务）。
 * 只处理仍为 deferred 的记录；时段结束后再次判定，若仍静默则跳过。
 */
export async function flushDeferred(): Promise<void> {
  const deferredList = await prisma.notifyRecord.findMany({
    where: { status: "deferred" },
    orderBy: { id: "asc" },
    take: 20,
  });
  for (const rec of deferredList) {
    const rule = rec.ruleId ? await prisma.notifyRule.findUnique({ where: { id: rec.ruleId } }) : null;
    const quiet = await effectiveQuietWindow(rec.event, rule?.quietHours);
    if (quiet && inQuietWindow(quiet, shanghaiNowMinutes())) continue;
    await prisma.notifyRecord.update({ where: { id: rec.id }, data: { status: "pending" } });
    await deliver(rec.id, rec.retries);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** 实际投递：未配置 SMTP → skipped；失败 → 重试队列（notify.scan 每 5 分钟扫 pending/failed，V11-MAIL-02） */
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
    // V11-MAIL-01：发送超时上限（默认 10s）——SMTP 挂起不再无限占用，超时按失败标记走重试/终态
    await withTimeout(
      transporter.sendMail({
        from: settings.emailFrom || settings.emailUsername,
        to: record.toEmails.split(","),
        subject: record.subject,
        text: record.content,
        // V11-MAIL-02：按事件类型渲染 HTML 模板（text 作纯文本回退）
        html: renderNotifyHtml(record.event, record.subject, record.content),
      }),
      sendTimeoutMs,
      `SMTP 发送超时（>${Math.round(sendTimeoutMs / 1000)}s，已按失败标记）`
    );
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
        scheduleDeliver(recordId, attempt + 1);
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

/**
 * notify.scan 任务：重试失败/未发送的通知记录；同时补发静默时段内 deferred 的记录（B-06）。
 * 先跑 flushDeferred 把已结束静默窗的 deferred 转 pending，再统一投递 pending。
 * V11-MAIL-02：failed 记录重启后重试——内存退避定时器随进程消亡，这里兜底扫描 failed
 * （次数上限 notifyRetryCount + 按 createdAt 起算的指数退避），不新增表字段。
 */
export async function notifyRetryScan(): Promise<void> {
  await flushDeferred();
  const pending = await prisma.notifyRecord.findMany({
    where: { status: "pending" }, // failed 由下方重启兜底扫描接管；dead 为终态
    orderBy: { id: "asc" },
    take: 10,
  });
  for (const record of pending) {
    await deliver(record.id, record.retries);
    await new Promise((r) => setTimeout(r, 2000)); // 邮件服务商限频：间隔 ≥2s
  }

  // V11-MAIL-02：failed 记录兜底重试（进程重启后内存定时器丢失的场景）
  const settings = await getAllSettings();
  const maxRetry = Number(settings.notifyRetryCount || 3);
  const failed = await prisma.notifyRecord.findMany({
    where: { status: "failed", retries: { lt: maxRetry } },
    orderBy: { id: "asc" },
    take: 10,
  });
  const now = Date.now();
  for (const record of failed) {
    // 退避：距记录创建 ≥ 2^retries 分钟才再试（NotifyRecord 无 updatedAt，按 createdAt 近似；
    // 定时扫描 5 分钟一轮，实际重试间隔不小于扫描周期）
    if (now - record.createdAt.getTime() < 2 ** record.retries * 60_000) continue;
    await deliver(record.id, record.retries + 1); // 从上次失败的下一跳继续（与内存定时器语义一致）
    await new Promise((r) => setTimeout(r, 2000));
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
