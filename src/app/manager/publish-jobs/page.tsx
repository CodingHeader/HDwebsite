"use client";

/** 发布任务：待发/已发/失败 + 立即执行/重试/取消 */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm, normalizeFormValues } from "@/components/manager/SchemaForm";
import type { FormValues } from "@/components/manager/SchemaForm";

type Job = {
  id: number; itemId: number | null; contentType: string; channel: string; action: string; status: string;
  scheduledAt: string | null; attemptCount: number; errMsg: string | null; createdAt: string;
  item?: { id: number; title: string } | null;
};
type ListData = { list: Job[]; pagination: { page: number; totalPages: number } };

const TABS = [
  { key: "", label: "全部" },
  { key: "pending", label: "待发布" },
  { key: "scheduled", label: "已排期" },
  { key: "published", label: "已发布" },
  { key: "failed", label: "失败" },
];

const FIELDS = [
  { key: "itemId", label: "内容条目 ID（ContentItem）", type: "number" as const },
  {
    key: "channel", label: "发布渠道", type: "select" as const,
    options: [{ label: "官网", value: "website" }, { label: "公众号", value: "wechat" }],
  },
  {
    key: "contentType", label: "内容类型", type: "select" as const,
    options: [
      { label: "文章", value: "article" }, { label: "资讯", value: "info" },
      { label: "服务指南", value: "service_guide" }, { label: "公众号文章", value: "wechat" },
    ],
  },
  {
    key: "action", label: "动作", type: "select" as const,
    options: [{ label: "发布", value: "publish" }, { label: "更新", value: "update" }, { label: "下线", value: "offline" }],
  },
  { key: "scheduledAt", label: "排期时间（留空=立即）", type: "date" as const },
  { key: "preNotify", label: "发布前邮件提醒", type: "switch" as const },
];

export default function ManagerPublishJobsPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<FormValues | null>(null);

  const load = useCallback(async () => {
    try {
      const st = status ? `&status=${status}` : "";
      setData(await managerFetch<ListData>(`/api/publish-jobs?page=${page}&limit=15${st}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据加载发生在 await 之后，属外部系统订阅
    load();
  }, [load]);

  async function action(job: Job, act: "retry" | "cancel") {
    setError("");
    try {
      await managerFetch(`/api/publish-jobs/${job.id}/${act}`, { method: "POST", body: "{}" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }

  async function create() {
    if (!creating) return;
    setError("");
    try {
      const body = normalizeFormValues(FIELDS, creating);
      await managerFetch("/api/publish-jobs", { method: "POST", body: JSON.stringify(body) });
      setCreating(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">发布任务</h1>
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm ${status === t.key ? "border-primary text-primary" : "border-border text-muted"}`}
            >
              {t.label}
            </button>
          ))}
          <button onClick={() => setCreating({ channel: "website", contentType: "article", action: "publish", preNotify: true })} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            新建任务
          </button>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">内容</th>
              <th className="px-4 py-3">渠道</th>
              <th className="px-4 py-3">动作</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">排期</th>
              <th className="px-4 py-3">尝试</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((j) => (
              <tr key={j.id} className="border-b border-border last:border-0">
                <td className="max-w-[280px] px-4 py-3">{j.item?.title ?? `#${j.itemId ?? "—"}`}</td>
                <td className="px-4 py-3">{j.channel === "website" ? "官网" : "公众号"}</td>
                <td className="px-4 py-3">{j.action}</td>
                <td className={`px-4 py-3 ${j.status === "failed" ? "text-red-600" : j.status === "published" ? "text-green-600" : ""}`}>
                  {j.status}{j.errMsg ? <span className="ml-1 text-xs" title={j.errMsg}>⚠</span> : null}
                </td>
                <td className="px-4 py-3">{j.scheduledAt?.slice(0, 16).replace("T", " ") ?? "—"}</td>
                <td className="px-4 py-3">{j.attemptCount}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {(j.status === "failed" || j.status === "cancelled") && (
                    <button onClick={() => action(j, "retry")} className="text-primary hover:underline">重试</button>
                  )}
                  {["pending", "scheduled", "reviewing"].includes(j.status) && (
                    <button onClick={() => action(j, "cancel")} className="ml-3 text-red-600 hover:underline">取消</button>
                  )}
                  {["published", "publishing"].includes(j.status) && <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">暂无任务</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCreating(null)}>
          <div className="w-full max-w-xl rounded-lg bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">新建发布任务</h2>
            <div className="mt-4">
              <SchemaForm fields={FIELDS} values={creating} onChange={setCreating} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCreating(null)} className="rounded-md border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={create} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
