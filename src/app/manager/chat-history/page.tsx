"use client";

/**
 * 对话日志（P03）：按会话聚合列表 + 会话详情弹窗 + 删除会话
 * 数据：GET /api/chat-history、GET/DELETE /api/chat-history/[sessionId]
 * P05：五态接入；详情弹窗内加载骨架/错误重试；删除走 ConfirmDialog + Toast。
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { DetailDialog } from "@/components/manager/DetailDialog";
import { SearchInput } from "@/components/manager/SearchInput";
import { Pagination, tableCls } from "@/components/manager/Pagination";
import { Bone, ErrorState, Forbidden, TableState, btnCls, confirmDialog, inputCls, linkCls, toast, useManagerQuery } from "@/components/manager/feedback";

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
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [channel, setChannel] = useState("");
  const qs = new URLSearchParams({ page: String(page), limit: "10" });
  if (keyword) qs.set("keyword", keyword);
  if (channel) qs.set("channel", channel);
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(`/api/chat-history?${qs.toString()}`);

  const [openRow, setOpenRow] = useState<SessionRow | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function loadDetail(row: SessionRow) {
    setDetail(null);
    setDetailError("");
    try {
      setDetail(await managerFetch<Detail>(`/api/chat-history/${encodeURIComponent(row.sessionId)}`));
    } catch (e) {
      setDetailError(errorMessage(e, "加载会话失败"));
    }
  }

  function openDetail(row: SessionRow) {
    setOpenRow(row);
    void loadDetail(row);
  }

  async function remove(row: SessionRow) {
    const ok = await confirmDialog({
      title: "删除该会话？",
      description: `会话 ${row.sessionId}（${row.messageCount} 条消息）将被永久删除，不可恢复。`,
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setBusy(row.sessionId);
    try {
      await managerFetch(`/api/chat-history/${encodeURIComponent(row.sessionId)}`, { method: "DELETE" });
      toast.success(toastCopy.deleted, `${row.messageCount} 条消息已删除`);
      setOpenRow(null);
      if (data && data.list.length === 1 && page > 1) setPage(page - 1);
      else void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setBusy(null);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];

  return (
    <div>
      <PageHeader
        title="对话日志"
        description="官网与公众号 AI 客服的访客会话记录，按会话聚合。"
        actions={
          <>
            <select
              aria-label="按渠道筛选"
              className={`${inputCls.replace("w-full ", "")} w-auto sm:w-32`}
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
            <SearchInput
              value={keyword}
              placeholder="搜索消息内容/会话…"
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
          </>
        }
      />

      <div className={tableCls.wrap} aria-busy={loading || refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>会话</th>
              <th scope="col" className={tableCls.th}>渠道</th>
              <th scope="col" className={`${tableCls.th} text-right`}>消息数</th>
              <th scope="col" className={tableCls.th}>最近提问</th>
              <th scope="col" className={tableCls.th}>最后活跃</th>
              <th scope="col" className={`${tableCls.th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className={refreshing ? "opacity-60 transition-opacity" : undefined}>
            <TableState
              columns={6}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle={keyword || channel ? "没有符合条件的会话" : "暂无对话记录"}
              emptyDescription={keyword || channel ? "调整筛选条件试试。" : "访客在官网或公众号与 AI 客服对话后，会话会出现在这里。"}
            />
            {!error &&
              list.map((row) => (
                <tr key={`${row.sessionId}-${row.channel}`} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                  <td className={`${tableCls.td} max-w-[180px] truncate font-mono text-[12px]`} title={row.sessionId}>
                    {row.sessionId}
                  </td>
                  <td className={tableCls.td}>{channelLabel[row.channel] ?? row.channel}</td>
                  <td className={`${tableCls.td} text-right tabular-nums`}>{row.messageCount}</td>
                  <td className={`${tableCls.td} max-w-[320px] truncate`} title={row.lastUserMessage ?? ""}>
                    {row.lastUserMessage ?? "—"}
                  </td>
                  <td className={`${tableCls.td} whitespace-nowrap tabular-nums text-mgr-muted-fg`}>{fmt(row.lastAt)}</td>
                  <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                    <div className="inline-flex items-center gap-2">
                      <button type="button" onClick={() => openDetail(row)} className={linkCls("primary")}>
                        查看
                      </button>
                      <button type="button" disabled={busy === row.sessionId} onClick={() => void remove(row)} className={linkCls("danger")}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && !error && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />}

      <DetailDialog
        open={openRow !== null}
        onClose={() => setOpenRow(null)}
        title="会话详情"
        description={
          openRow ? (
            <span className="font-mono">
              {openRow.sessionId} · {channelLabel[openRow.channel] ?? openRow.channel} · {detail?.messageCount ?? openRow.messageCount} 条
            </span>
          ) : undefined
        }
        footer={
          openRow ? (
            <button type="button" className={btnCls("secondary")} disabled={busy === openRow.sessionId} onClick={() => void remove(openRow)}>
              <Trash2 aria-hidden="true" />
              删除会话
            </button>
          ) : undefined
        }
      >
        {detailError ? (
          <ErrorState compact message={detailError} onRetry={() => (openRow ? loadDetail(openRow) : undefined)} />
        ) : !detail ? (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">加载中…</span>
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ol className="space-y-3">
            {detail.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-mgr-card border border-mgr-border p-3 text-[13px] ${m.role === "user" ? "bg-mgr-surface" : "bg-mgr-subtle"}`}
              >
                <div className="mb-1 flex justify-between text-[12px] text-mgr-muted-fg">
                  <span className="font-medium">{roleLabel[m.role] ?? m.role}{m.model ? ` · ${m.model}` : ""}</span>
                  <span className="tabular-nums">{fmt(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{m.message || <span className="text-mgr-muted-fg">（空回复）</span>}</p>
              </li>
            ))}
          </ol>
        )}
      </DetailDialog>
    </div>
  );
}
