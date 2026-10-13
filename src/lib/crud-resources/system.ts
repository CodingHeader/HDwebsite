/*
 * crudSpecs · 系统/通知/审计域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import type { CrudSpec } from "@/lib/crud";
import { notifyTemplateCreateSchema, recipientCreateSchema } from "@/contracts/resources";
import { jsonifyArray } from "./shared";

export const systemSpecs: Record<string, CrudSpec> = {
  'notify-recipients': {
    model: "notifyRecipient",
    permission: "notify",
    label: "提醒接收人",
    searchFields: ["name", "email"],
    orderBy: [{ id: "asc" }],
    createSchema: recipientCreateSchema,
    ...jsonifyArray(["groups"]),
  },
  "notify-templates": {
    model: "notifyTemplate",
    permission: "notify",
    label: "邮件模板",
    searchFields: ["name", "subject"],
    orderBy: [{ id: "asc" }],
    createSchema: notifyTemplateCreateSchema,
  },
  "notify-records": {
    model: "notifyRecord",
    permission: "notify",
    label: "通知记录",
    searchFields: ["subject", "toEmails"],
    filters: { event: "string", status: "string" },
    orderBy: [{ id: "desc" }],
  },
  "user-actions": {
    model: "userAction",
    permission: "log",
    label: "行为记录",
    searchFields: ["actionTarget", "pageUrl"],
    filters: { actionType: "string" },
    orderBy: [{ id: "desc" }],
  },
  logs: {
    model: "operationLog",
    permission: "log",
    label: "操作日志",
    searchFields: ["username", "module", "title"],
    filters: { module: "string" },
    orderBy: [{ id: "desc" }],
  },
};
