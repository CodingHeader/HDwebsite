"use client";

/**
 * 对话日志（P03）：按会话聚合列表 + 会话详情弹窗 + 删除会话
 * 数据：GET /api/chat-history、GET/DELETE /api/chat-history/[sessionId]
 * 样式沿用 CrudPage 只读模式的表格与弹窗；P07 再升级为设计系统组件。
 */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

type SessionRow = {
  id: string;
  sessionId: string;
  channel: string;
  messageCount: number;
  firstAt: string;
  lastAt: string;
  lastUserMessage: string | null;
  ipAddress: string | null;
};
type ListData = { list: SessionRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
type Message = { id: number; role: string; message: string; createdAt: string; model: string | null };
type Detail = { sessionId: string; channel: string; messageCount: number; messages: Message[] };

const channelLabel: Record<string, string> = { website: "官网", wechat: "公众号" };
const roleLabel: Record<string, string> = { user: "访客", assistant: "AI", system: "系统" };

function fmt(t: string | null | undefined) {
  if (!t) return "—";
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString("zh-CN", { hour12: false });
}

export default function ChatHistoryPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [channel, setChannel] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "10" });
      if (keyword) qs.set("keyword", keyword);
      if (channel) qs.set("channel", channel);
      setData(await managerFetch<ListData>(`/api/chat-history?${qs.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page, keyword, channel]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(row: SessionRow) {
    setLoadingDetail(true);
    setError("");
    try {
      setDetail(await managerFetch<Detail>(`/api/chat-history/${encodeURIComponent(row.sessionId)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载会话失败");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function remove(row: SessionRow) {
    if (!window.confirm(`确认删除会话 ${row.sessionId}（${row.messageCount} 条消息）？此操作不可恢复。`)) return;
    try {
      await managerFetch(`/api/chat-history/${encodeURIComponent(row.sessionId)}`, { method: "DELETE" });
      setDetail(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">对话日志</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="渠道"
            className="rounded-md border border-border px-3 py-2 text-sm"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部渠道</option>
            <option value="website">官网</option>
            <option value="wechat">公众号</option>
          </select>
          <input
            className="rounded-md border border-border px-3 py-2 text-sm"
            placeholder="搜索消息内容/会话…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">会话</th>
              <th className="px-4 py-3">渠道</th>
              <th className="px-4 py-3">消息数</th>
              <th className="px-4 py-3">最近提问</th>
              <th className="px-4 py-3">最后活跃</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((row) => (
              <tr key={`${row.sessionId}-${row.channel}`} className="border-b border-border last:border-0">
                <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs" title={row.sessionId}>
                  {row.sessionId}
                </td>
                <td className="px-4 py-3">{channelLabel[row.channel] ?? row.channel}</td>
                <td className="px-4 py-3">{row.messageCount}</td>
                <td className="max-w-[320px] truncate px-4 py-3" title={row.lastUserMessage ?? ""}>
                  {row.lastUserMessage ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{fmt(row.lastAt)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button onClick={() => openDetail(row)} className="text-primary hover:underline" disabled={loadingDetail}>
                    查看
                  </button>
                  <button onClick={() => remove(row)} className="ml-3 text-red-600 hover:underline">
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  暂无对话记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded border px-3 py-1 text-sm ${p === page ? "border-primary text-primary" : "border-border text-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div
            role="dialog"
            aria-label="会话详情"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">会话详情</h2>
                <p className="mt-1 font-mono text-xs text-muted">
                  {detail.sessionId} · {channelLabel[detail.channel] ?? detail.channel} · {detail.messageCount} 条
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted hover:underline">
                关闭
              </button>
            </div>
            <ol className="mt-4 space-y-3">
              {detail.messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-md border border-border p-3 text-sm ${m.role === "user" ? "bg-card" : "bg-black/[0.03]"}`}
                >
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>{roleLabel[m.role] ?? m.role}</span>
                    <span>{fmt(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.message || "（空）"}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
