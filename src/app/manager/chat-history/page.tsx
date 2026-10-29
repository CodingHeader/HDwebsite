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
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { Button, Select, SearchField } from "@/components/manager/ui";
import { Bone, ErrorState, Forbidden, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";

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

  const columns: DataColumn<SessionRow>[] = [
    { key: "sessionId", label: "会话", primary: true, render: (row) => <span className="max-w-[180px] truncate font-mono text-[12px]" title={row.sessionId}>{row.sessionId}</span> },
    { key: "channel", label: "渠道", render: (row) => channelLabel[row.channel] ?? row.channel },
    { key: "messageCount", label: "消息数", align: "right" },
    { key: "lastUserMessage", label: "最近提问", render: (row) => <span className="max-w-[320px] truncate" title={row.lastUserMessage ?? ""}>{row.lastUserMessage ?? "—"}</span> },
    { key: "lastAt", label: "最后活跃", render: (row) => <span className="whitespace-nowrap tabular-nums text-mgr-muted-fg">{fmt(row.lastAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="对话日志"
        description="官网与公众号 AI 客服的访客会话记录，按会话聚合。"
        actions={
          <>
            <Select
              aria-label="按渠道筛选"
              className="w-auto sm:w-32"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "全部渠道", value: "" },
                { label: "官网", value: "website" },
                { label: "公众号", value: "wechat" },
              ]}
            />
            <SearchField
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

      <DataTable<SessionRow>
        caption="对话日志"
        rows={list}
        columns={columns}
        rowKey={(row) => `${row.sessionId}-${row.channel}`}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={reload}
        emptyTitle={keyword || channel ? "没有符合条件的会话" : "暂无对话记录"}
        emptyDescription={keyword || channel ? "调整筛选条件试试。" : "访客在官网或公众号与 AI 客服对话后，会话会出现在这里。"}
        emptyAction={
          keyword || channel ? (
            <Button type="button" onClick={() => { setKeyword(""); setChannel(""); setPage(1); }} variant="ghost">
              清除筛选
            </Button>
          ) : undefined
        }
        rowName={(row) => row.sessionId}
        rowActions={(row) => [
          { key: "view", label: "查看", tone: "primary", onClick: () => openDetail(row) },
          { key: "delete", label: "删除", tone: "danger", onClick: () => void remove(row), disabled: busy === row.sessionId },
        ]}
        pagination={data && !error ? { page, limit: 10, totalPages: data.pagination.totalPages, total: data.pagination.total ?? list.length, onPageChange: setPage } : undefined}
        data-testid="chat-history-table"
      />

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
            <Button type="button" variant="secondary" disabled={busy === openRow.sessionId} onClick={() => void remove(openRow)}>
              <Trash2 aria-hidden="true" />
              删除会话
            </Button>
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
