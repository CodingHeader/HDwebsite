/*
 * crudSpecs · 采集与发布域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import type { CrudSpec } from "@/lib/crud";
import { badRequest } from "@/lib/api-handler";
import { collectSourceCreateSchema, publishJobCreateSchema } from "@/contracts/resources";
import { assertAutoApproveAllowed, collectSourceTags } from "./shared";

export const collectSpecs: Record<string, CrudSpec> = {
  "collect-sources": {
    model: "collectSource",
    permission: "collect",
    label: "采集源",
    searchFields: ["name", "url"],
    filters: { type: "string", enabled: "boolean" },
    orderBy: [{ id: "asc" }],
    createSchema: collectSourceCreateSchema,
    // P06 / ADR-017 补充：autoApprove = 超管预授权，仅 SuperAdmin 可开启（Editor 持有 collect:edit 也不行）
    beforeCreate: async (data, session) => {
      assertAutoApproveAllowed(data, session);
      return collectSourceTags.beforeCreate(data);
    },
    beforeUpdate: async (data, existing, session) => {
      if (data.autoApprove !== existing.autoApprove) assertAutoApproveAllowed(data, session);
      return collectSourceTags.beforeUpdate(data);
    },
  },
  "collect-tasks": {
    model: "collectTask",
    permission: "collect",
    label: "采集任务",
    searchFields: [],
    filters: { sourceId: "number", status: "string" },
    orderBy: [{ id: "desc" }],
    include: { source: { select: { id: true, name: true } } },
  },
  "publish-jobs": {
    model: "publishJob",
    permission: "publish",
    label: "发布任务",
    searchFields: [],
    filters: { channel: "string", status: "string" },
    orderBy: [{ id: "desc" }],
    include: { item: { select: { id: true, title: true } } },
    // P06：列表返回内容标题（无关联内容时回退"发布任务 #id"）
    mapList: async (rows) =>
      rows.map((r) => ({ ...r, title: (r.item as { title?: string } | null)?.title ?? `发布任务 #${r.id}` })),
    createSchema: publishJobCreateSchema,
    /**
     * F-01 补充：`publishJobCreateSchema` 带两条 refine，zod4 无法 `.partial()`，
     * crudUpdate 退化到「重建 shape」路径后，两条跨字段规则会丢失：
     *   ① channels/channel 二选一 —— 部分更新下天然不适用，丢失可接受；
     *   ② **scheduledAt 必须晚于现在** —— 这条是真实业务约束，丢失会让 PUT 能把过期时间写库。
     * 因此在 beforeUpdate 里把 ② 补回来（只校验「本次请求确实要改 scheduledAt」时）。
     * ①  仍不在此校验：PUT 只改 action/preNotify 时不该被"必须选渠道"拦住。
     */
    beforeUpdate: async (data) => {
      const raw = data.scheduledAt;
      if (raw === undefined) return data; // 本次没改定时时间
      if (raw === null) return data; // 显式清空 = 立即发布，合法
      const t = new Date(String(raw)).getTime();
      if (Number.isNaN(t)) throw badRequest("定时时间格式不正确");
      if (t <= Date.now()) throw badRequest("定时时间必须晚于现在");
      return data;
    },
  },
};
