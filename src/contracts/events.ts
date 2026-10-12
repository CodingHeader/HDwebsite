/**
 * 事件与状态机契约（P06，zod 唯一源）
 * - NotifyEvent：通知网关事件全集（SOL-005）；新增事件须同步 prisma/seed.ts 的 NotifyRule
 * - PublishJob 状态机：PUBLISH_TRANSITIONS（执行器/取消/重试端点据此校验迁移）
 * - ContentItem 状态机：通用 CRUD 只允许 draft/pending_review/offline；approved/rejected 走审核端点（review:edit，
 *   ADR-017），published 只由发布执行器写入
 */
import { z } from "zod";

export const NOTIFY_EVENTS = [
  "before_publish_news",
  "before_publish_info",
  "before_publish_wechat",
  "llm_balance_low",
  "job_failed",
  "system_error",
  "collect_failed",
] as const;
export const notifyEventSchema = z.enum(NOTIFY_EVENTS);
export type NotifyEvent = z.infer<typeof notifyEventSchema>;

/** 失败类事件：10 分钟同类聚合（只发 1 封） */
export const AGGREGATED_EVENTS: readonly NotifyEvent[] = ["system_error", "job_failed", "collect_failed"];

// ── PublishJob ──────────────────────────────────────────────
export const PUBLISH_JOB_STATUSES = ["pending", "reviewing", "scheduled", "publishing", "published", "failed", "cancelled"] as const;
export const publishJobStatusSchema = z.enum(PUBLISH_JOB_STATUSES);
export type PublishJobStatus = z.infer<typeof publishJobStatusSchema>;

export const PUBLISH_TRANSITIONS: Record<PublishJobStatus, readonly PublishJobStatus[]> = {
  pending: ["reviewing", "scheduled", "publishing", "cancelled"],
  reviewing: ["pending", "scheduled", "cancelled"],
  scheduled: ["publishing", "cancelled", "pending"],
  // publishing → scheduled：失败未达上限的退避重排 / 卡死回收
  publishing: ["published", "failed", "scheduled"],
  published: [],
  failed: ["scheduled", "pending", "cancelled"],
  cancelled: ["pending"],
};

export function canTransitionPublishJob(from: string, to: string): boolean {
  const list = (PUBLISH_TRANSITIONS as Record<string, readonly string[] | undefined>)[from];
  return Boolean(list && list.includes(to));
}

// ── ContentItem ─────────────────────────────────────────────
export const CONTENT_ITEM_STATUSES = ["draft", "pending_review", "rejected", "approved", "published", "offline"] as const;
export const contentItemStatusSchema = z.enum(CONTENT_ITEM_STATUSES);
export type ContentItemStatus = z.infer<typeof contentItemStatusSchema>;

/** 通用 CRUD 可写的状态（编辑权即可）；其余由审核端点/发布执行器写入 */
export const CONTENT_EDITABLE_STATUSES = ["draft", "pending_review", "offline"] as const;

export const contentItemStatusTransitions: Record<ContentItemStatus, readonly ContentItemStatus[]> = {
  draft: ["pending_review", "offline"],
  pending_review: ["draft", "approved", "rejected", "offline"],
  rejected: ["draft", "pending_review"],
  approved: ["published", "offline", "draft"],
  published: ["offline"],
  offline: ["draft", "pending_review"],
};

export function canTransitionContentItem(from: string, to: string): boolean {
  const list = (contentItemStatusTransitions as Record<string, readonly string[] | undefined>)[from];
  return Boolean(list && list.includes(to));
}

/** POST /api/content-items/[id]/review */
export const contentReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"], { message: "审核结论只能是 approved 或 rejected" }),
  remark: z.string().max(500).nullable().optional(),
});
