"use client";

import { CrudPage } from "@/components/manager/CrudPage";
import { crudPageSpecs } from "@/components/manager/crud-specs";
import { managerFetch } from "@/lib/manager-fetch";
import type { RowAction } from "@/components/manager/CrudPage";

async function publishToWebsite(row: Record<string, unknown>, reload: () => void, fail: (m: string) => void) {
  try {
    await managerFetch("/api/publish-jobs", {
      method: "POST",
      body: JSON.stringify({ itemId: row.id, channel: "website", contentType: "article", action: "publish", preNotify: true }),
    });
    alert("已创建官网发布任务（publish.scan 每分钟扫描执行）");
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
    alert("已创建公众号发布任务（需先在「公众号账号」配置凭证）");
    reload();
  } catch (e) {
    fail(e instanceof Error ? e.message : "创建失败");
  }
}

const actions: RowAction[] = [
  { label: "发官网", run: publishToWebsite },
  { label: "发公众号", run: publishToWechat },
];

export default function Page() {
  return <CrudPage spec={{ ...crudPageSpecs["content-items"], rowActions: actions }} />;
}
