/** P06 评审 #7：发布任务/内容状态机——全部合法与非法迁移 */
import { describe, expect, it } from "vitest";
import {
  PUBLISH_JOB_STATUSES,
  PUBLISH_TRANSITIONS,
  canTransitionPublishJob,
  CONTENT_ITEM_STATUSES,
  contentItemStatusTransitions,
  canTransitionContentItem,
  notifyEventSchema,
} from "@/contracts/events";

const LEGAL: Record<string, string[]> = {
  pending: ["reviewing", "scheduled", "publishing", "cancelled"],
  reviewing: ["pending", "scheduled", "cancelled"],
  scheduled: ["publishing", "cancelled", "pending"],
  publishing: ["published", "failed", "scheduled"],
  published: [],
  failed: ["scheduled", "pending", "cancelled"],
  cancelled: ["pending"],
};

describe("PublishJob 状态机", () => {
  it("迁移表与期望完全一致", () => {
    expect(Object.keys(PUBLISH_TRANSITIONS).sort()).toEqual([...PUBLISH_JOB_STATUSES].sort());
    for (const s of PUBLISH_JOB_STATUSES) expect([...PUBLISH_TRANSITIONS[s]].sort()).toEqual([...LEGAL[s]].sort());
  });
  for (const from of Object.keys(LEGAL)) {
    for (const to of Object.keys(LEGAL)) {
      const legal = LEGAL[from].includes(to);
      it(`${from} → ${to} ${legal ? "合法" : "非法"}`, () => {
        expect(canTransitionPublishJob(from, to)).toBe(legal);
      });
    }
  }
  it("未知状态一律非法", () => {
    expect(canTransitionPublishJob("pending", "bogus")).toBe(false);
    expect(canTransitionPublishJob("bogus", "pending")).toBe(false);
  });
});

const CONTENT_LEGAL: Record<string, string[]> = {
  draft: ["pending_review", "offline"],
  pending_review: ["draft", "approved", "rejected", "offline"],
  rejected: ["draft", "pending_review"],
  approved: ["published", "offline", "draft"],
  published: ["offline"],
  offline: ["draft", "pending_review"],
};

describe("ContentItem 状态机", () => {
  it("状态全集", () => {
    expect([...CONTENT_ITEM_STATUSES].sort()).toEqual(Object.keys(CONTENT_LEGAL).sort());
  });
  for (const from of Object.keys(CONTENT_LEGAL)) {
    for (const to of Object.keys(CONTENT_LEGAL)) {
      const legal = CONTENT_LEGAL[from].includes(to);
      it(`${from} → ${to} ${legal ? "合法" : "非法"}`, () => {
        expect(canTransitionContentItem(from, to)).toBe(legal);
        expect((contentItemStatusTransitions as Record<string, readonly string[]>)[from].includes(to)).toBe(legal);
      });
    }
  }
});

describe("NotifyEvent 契约", () => {
  it("包含 7 个既有事件", () => {
    for (const e of ["before_publish_news", "before_publish_info", "before_publish_wechat", "llm_balance_low", "job_failed", "system_error", "collect_failed"]) {
      expect(notifyEventSchema.safeParse(e).success).toBe(true);
    }
    expect(notifyEventSchema.safeParse("nope").success).toBe(false);
  });
});
