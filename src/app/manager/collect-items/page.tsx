"use client";

/** 采集审核队列：待审条目 编辑/通过/拒绝 */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

type Item = {
  id: number; title: string; url: string; source?: { name: string } | null;
  contentMd: string | null; summary: string | null; status: string; publishTime: string | null; createdAt: string;
};
type ListData = { list: Item[]; pagination: { page: number; totalPages: number } };

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "new", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "imported", label: "已入库" },
];

export default function ManagerCollectItemsPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<Item | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const st = status ? `&status=${status}` : "";
      setData(await managerFetch<ListData>(`/api/collect-items?page=${page}&limit=15${st}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据加载发生在 await 之后，属外部系统订阅
    load();
  }, [load]);

  async function review(item: Item, next: "approved" | "rejected", patch?: { title?: string; contentMd?: string }) {
    setError("");
    try {
      await managerFetch(`/api/collect-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, ...patch }),
      });
      setViewing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">采集审核</h1>
        <div className="flex gap-2">
          {STATUS_TABS.map((t) => (
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
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">来源</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">抓取时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((it) => (
              <tr key={it.id} className="border-b border-border last:border-0">
                <td className="max-w-[420px] px-4 py-3">{it.title}</td>
                <td className="px-4 py-3">{it.source?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={
                    it.status === "new" ? "text-amber-600" : it.status === "approved" || it.status === "imported" ? "text-green-600" : "text-muted"
                  }>
                    {STATUS_TABS.find((t) => t.key === it.status)?.label ?? it.status}
                  </span>
                </td>
                <td className="px-4 py-3">{it.createdAt?.slice(0, 16).replace("T", " ")}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      setViewing(it);
                      setDraft(it.contentMd ?? "");
                    }}
                  >
                    审阅
                  </button>
                  <button onClick={() => review(it, "approved")} className="ml-3 text-green-600 hover:underline">通过</button>
                  <button onClick={() => review(it, "rejected")} className="ml-3 text-red-600 hover:underline">拒绝</button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">暂无待审内容</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`rounded border px-3 py-1 text-sm ${p === page ? "border-primary text-primary" : "border-border text-muted"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{viewing.title}</h2>
            <p className="mt-1 text-xs text-muted">{viewing.url}</p>
            <textarea
              className="mt-4 w-full rounded-md border border-border px-3 py-2 font-mono text-sm"
              rows={16}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setViewing(null)} className="rounded-md border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={() => review(viewing, "rejected")} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600">拒绝</button>
              <button
                onClick={() => review(viewing, "approved", { contentMd: draft, title: viewing.title })}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                修改并通过
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
