"use client";

/**
 * 采集审核队列：待审条目 审阅/编辑/通过/拒绝
 * P05：五态接入；拒绝需确认；通过/拒绝 Toast；审阅弹窗（FormDialog）支持修改标题与正文后通过。
 */
import { useState } from "react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { FilterTabs } from "@/components/manager/FilterTabs";
import { StatusBadge, type Tone } from "@/components/manager/StatusBadge";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { Button, Input, Textarea } from "@/components/manager/ui";
import { Forbidden, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";

type Item = {
  id: number; title: string; url: string; source?: { name: string } | null;
  contentMd: string | null; summary: string | null; status: string; publishTime: string | null; createdAt: string;
};
type ListData = { list: Item[]; pagination: { page: number; totalPages: number; total?: number } };

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "new", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "imported", label: "已入库" },
];

const TONES: Record<string, Tone> = { new: "warning", approved: "success", imported: "success", rejected: "muted" };

export default function ManagerCollectItemsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(
    `/api/collect-items?page=${page}&limit=15${status ? `&status=${status}` : ""}`
  );
  const [viewing, setViewing] = useState<Item | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [serverError, setServerError] = useState("");

  async function review(item: Item, next: "approved" | "rejected", patch?: { title?: string; contentMd?: string }) {
    if (next === "rejected") {
      const ok = await confirmDialog({
        title: `拒绝「${item.title}」？`,
        description: "拒绝后该条目不会进入内容中枢与知识库，且无法再次审核。",
        confirmText: "拒绝",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(item.id);
    setServerError("");
    try {
      const res = await managerFetch<{ contentItemId?: number }>(`/api/collect-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, ...patch }),
      });
      toast.success(
        next === "approved" ? "审核通过" : "已拒绝",
        next === "approved" ? `已进入内容中枢${res?.contentItemId ? `（条目 #${res.contentItemId}）` : ""}与知识库，可在「内容中枢」发起发布。` : item.title
      );
      setViewing(null);
      void reload();
    } catch (e) {
      const msg = errorMessage(e, "操作失败");
      if (viewing) setServerError(msg);
      toast.error(next === "approved" ? "审核通过失败" : "拒绝失败", msg);
    } finally {
      setBusy(null);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];

  const columns: DataColumn<Item>[] = [
    {
      key: "title",
      label: "标题",
      primary: true,
      render: (it) => (
        <span className="line-clamp-1 font-medium" title={it.title}>
          {it.title}
        </span>
      ),
    },
    { key: "source", label: "来源", render: (it) => it.source?.name ?? "—" },
    { key: "status", label: "状态", render: (it) => <StatusBadge tone={TONES[it.status] ?? "muted"}>{STATUS_TABS.find((t) => t.key === it.status)?.label ?? it.status}</StatusBadge> },
    { key: "createdAt", label: "抓取时间", render: (it) => it.createdAt?.slice(0, 16).replace("T", " ") },
  ];

  return (
    <div>
      <PageHeader
        title="采集审核"
        description="采集源抓取的内容需人工审核：通过后进入内容中枢与知识库，拒绝则丢弃。"
        actions={
          <FilterTabs
            tabs={STATUS_TABS}
            value={status}
            onChange={(k) => {
              setStatus(k);
              setPage(1);
            }}
          />
        }
      />
      <DataTable<Item>
        caption="采集审核"
        rows={list}
        columns={columns}
        rowKey={(it) => String(it.id)}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={reload}
        emptyTitle={status === "new" ? "没有待审核的内容" : "暂无采集内容"}
        emptyDescription="在「采集源」中试抓或立即执行后，新条目会出现在这里。"
        rowName={(it) => it.title}
        rowActions={(it) => [
          {
            key: "review",
            label: "审阅",
            tone: "primary",
            onClick: () => {
              setViewing(it);
              setDraftTitle(it.title);
              setDraft(it.contentMd ?? "");
              setServerError("");
            },
          },
          ...(it.status === "new"
            ? [
                { key: "approve", label: "通过", tone: "primary" as const, ariaLabel: `通过 ${it.title}`, onClick: () => void review(it, "approved"), disabled: busy === it.id },
                { key: "reject", label: "拒绝", tone: "danger" as const, ariaLabel: `拒绝 ${it.title}`, onClick: () => void review(it, "rejected"), disabled: busy === it.id },
              ]
            : []),
        ]}
        pagination={data && !error ? { page, limit: 15, totalPages: data.pagination.totalPages, total: data.pagination.total ?? list.length, onPageChange: setPage } : undefined}
        data-testid="collect-items-table"
      />

      <FormDialog
        open={viewing !== null}
        title="审阅采集内容"
        description={viewing?.url}
        onClose={() => setViewing(null)}
        onSubmit={() => (viewing && viewing.status === "new" ? review(viewing, "approved", { contentMd: draft, title: draftTitle.trim() || viewing.title }) : setViewing(null))}
        saving={busy !== null}
        dirty={viewing !== null && viewing.status === "new" && (draft !== (viewing.contentMd ?? "") || draftTitle !== viewing.title)}
        submitText={viewing?.status === "new" ? "修改并通过" : "关闭"}
        serverError={serverError}
      >
        {viewing && (
          <div className="space-y-4">
            <div>
              <label htmlFor="ci-title" className="mb-1.5 block text-[13px] font-medium">标题</label>
              <Input id="ci-title" value={draftTitle} disabled={viewing.status !== "new"} onChange={(e) => setDraftTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ci-body" className="mb-1.5 block text-[13px] font-medium">正文（Markdown）</label>
              <Textarea
                id="ci-body"
                className="font-mono leading-5"
                rows={16}
                value={draft}
                disabled={viewing.status !== "new"}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            {viewing.status === "new" && (
              <div className="flex justify-start">
                <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => void review(viewing, "rejected")}>
                  拒绝此条
                </Button>
              </div>
            )}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
