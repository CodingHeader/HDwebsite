"use client";

import { CrudPage } from "@/components/manager/CrudPage";
import { crudPageSpecs } from "@/components/manager/crud-specs";
import { managerFetch } from "@/lib/manager-fetch";
import type { RowAction } from "@/components/manager/CrudPage";
import { toast } from "@/components/manager/feedback";

async function publishToWebsite(row: Record<string, unknown>, reload: () => void, fail: (m: string) => void) {
  try {
    await managerFetch("/api/publish-jobs", {
      method: "POST",
      body: JSON.stringify({ itemId: row.id, channel: "website", contentType: "article", action: "publish", preNotify: true }),
    });
    toast.success("已创建官网发布任务", "系统每分钟扫描执行，可在「发布任务」查看进度。");
    reload();
  } catch (e) {
    fail(e instanceof Error ? e.message : "创建失败");
  }
}

async function publishToWechat(row: Record<string, unknown>, reload: () => void, fail: (m: string) => void) {
  try {
    await managerFetch("/api/publish-jobs", {
      method: "POST",
      body: JSON.stringify({ itemId: row.id, channel: "wechat", contentType: "wechat", action: "publish", preNotify: true }),
    });
    toast.success("已创建公众号发布任务", "需先在「公众号账号」配置凭证，否则任务将失败。");
    reload();
  } catch (e) {
    fail(e instanceof Error ? e.message : "创建失败");
  }
}

const actions: RowAction[] = [
  { label: "发官网", confirm: (row) => `为「${row.title}」创建官网发布任务（立即排入队列）。`, run: publishToWebsite },
  { label: "发公众号", confirm: (row) => `为「${row.title}」创建公众号发布任务（需已配置公众号凭证）。`, run: publishToWechat },
];

export default function Page() {
  return <CrudPage spec={{ ...crudPageSpecs["content-items"], rowActions: actions }} />;
}
