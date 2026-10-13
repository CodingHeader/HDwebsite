/*
 * crudSpecs · 采集与发布域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import type { CrudSpec } from "@/lib/crud";
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
  },
};
