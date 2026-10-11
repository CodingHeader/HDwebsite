/**
 * 契约：用户行为埋点（UserAction，ASM-008 最小埋点）
 * POST /api/user-actions 公开写入：表单提交（submit）+ 关键页浏览（view）
 */
import { z } from "zod";

export const userActionCreateSchema = z.object({
  actionType: z.enum(["click", "view", "submit"]),
  actionTarget: z.string().min(1).max(64),
  sessionId: z.string().min(8).max(64),
  pageUrl: z.string().max(500).optional(),
  pageTitle: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UserActionCreateInput = z.infer<typeof userActionCreateSchema>;
