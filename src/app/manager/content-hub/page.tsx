"use client";

/**
 * 内容中枢统一管理（E-09）：多渠道状态列 + 发布对话框（渠道多选/立即/定时/发布前提醒）+ 渠道预览 Tab
 * - 渠道状态列：GET /api/publish-jobs 按 itemId 聚合各渠道最近任务状态（B-07 多渠道映射：每渠道一条 PublishJob）；
 *   B-07 合并后切换契约聚合视图 GET /api/content-hub（contentHubItemSchema.channels 服务端组装）——W2 复跑调整口径
 * - 发布：POST /api/publish-jobs { channels: [..1~2 个] }（CCR-1 多渠道；后端按渠道各建一条）
 * - 预览：官网 Tab 用前台同款 Markdown 语义样式渲染（不引用 web 组件）；公众号 Tab 简化样式卡片
 * - 权限：无 publish:create 权限（且非超管）时发布入口不可见（SessionUser.role.permissions）
 */
import { useMemo, useState } from "react";
import { Send, Trash2, Eye } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { useAuthStore } from "@/store/authStore";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { DetailDialog } from "@/components/manager/DetailDialog";
import { Tabs } from "@/components/manager/ui/misc";
import { FormField } from "@/components/manager/ui/form-field";
import { Checkbox, DateTimeInput, Select, Switch } from "@/components/manager/ui";
import { SearchInput } from "@/components/manager/SearchInput";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { Forbidden, PageSkeleton, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge } from "@/components/manager/ui/misc";
import { StatusBadge, type Tone } from "@/components/manager/StatusBadge";

type Row = { id: number; title: string; contentType: string; source: string; status: string; author?: string | null; createdAt: string };
type ListData = { list: Row[]; pagination: { page: number; totalPages: number; total?: number } };
type Job = { id: number; itemId: number | null; channel: string; status: string; createdAt: string };

const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "草稿", tone: "muted" },
  pending: { label: "待发布", tone: "info" },
  scheduled: { label: "已排期", tone: "warning" },
  publishing: { label: "发布中", tone: "info" },
  published: { label: "已发布", tone: "success" },
  failed: { label: "失败", tone: "danger" },
  cancelled: { label: "已取消", tone: "muted" },
};

const CHANNEL_LABEL: Record<string, string> = { website: "官网", wechat: "公众号" };
const SOURCE_LABEL: Record<string, string> = { manual: "手动", collect: "采集" };

/** datetime-local 值 → ISO 8601 带时区偏移（契约 scheduledAt datetime offset） */
function toIsoOffset(local: string): string {
  return new Date(`${local}:00+08:00`).toISOString();
}

const TABS = [
  { key: "website", label: "官网预览" },
  { key: "wechat", label: "公众号预览" },
];

export default function ContentHubPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const qs = `page=${page}&limit=10${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`;
  const itemsQ = useManagerQuery<ListData>(`/api/content-items?${qs}`);
  const jobsQ = useManagerQuery<{ list: Job[] }>("/api/publish-jobs?limit=100");

  const user = useAuthStore((s) => s.user);
  const canPublish = user?.role?.isSuper || user?.role?.permissions?.includes("publish:create") || false;

  const [publishing, setPublishing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [serverError, setServerError] = useState("");
  const [detailTab, setDetailTab] = useState("website");
  const [detail, setDetail] = useState<{ content: string; title: string } | null>(null);

  // 发布对话框草稿：渠道多选 + 动作 + 定时 + 发布前提醒
  const [draft, setDraft] = useState<{ website: boolean; wechat: boolean; action: string; scheduledAt: string; preNotify: boolean; contentType: string }>({
    website: true,
    wechat: false,
    action: "publish",
    scheduledAt: "",
    preNotify: true,
    contentType: "article",
  });

  const list = useMemo(() => itemsQ.data?.list ?? [], [itemsQ.data]);
  const channelsOf = useMemo(() => {
    const map = new Map<string, Map<string, Job>>();
    for (const j of jobsQ.data?.list ?? []) {
      if (j.itemId == null) continue;
      const per = map.get(String(j.itemId)) ?? new Map<string, Job>();
      const prev = per.get(j.channel);
      if (!prev || j.id > prev.id) per.set(j.channel, j);
      map.set(String(j.itemId), per);
    }
    return map;
  }, [jobsQ.data]);

  function openPublish(row: Row) {
    setPublishing(row);
    setDraft((d) => ({ ...d, contentType: row.contentType === "html" ? "wechat" : "article" }));
    setServerError("");
  }

  function closePublish() {
    setPublishing(null);
    setServerError("");
  }

  const publishDirty = publishing !== null && draft !== null;

  async function submitPublish() {
    if (!publishing || busy !== null) return;
    const channels = [draft.website ? "website" : null, draft.wechat ? "wechat" : null].filter(Boolean) as string[];
    if (channels.length === 0) {
      setServerError("请至少选择一个渠道");
      return;
    }
    setBusy(publishing.id);
    setServerError("");
    try {
      // B-07 落库语义：每渠道一条 PublishJob；B-07 合并前单请求 channels 会被 prisma.create 拒绝
      // （PublishJob 无 channels 列，500）——按渠道逐条创建，语义一致；合并后可切单请求（W2 复跑调整口径）
      for (const ch of channels) {
        await managerFetch("/api/publish-jobs", {
          method: "POST",
          body: JSON.stringify({
            itemId: publishing.id,
            channel: ch,
            contentType: draft.contentType,
            action: draft.action,
            preNotify: draft.preNotify,
            ...(draft.scheduledAt ? { scheduledAt: toIsoOffset(draft.scheduledAt) } : {}),
          }),
        });
      }
      toast.success("发布任务已创建", `${channels.map((c) => CHANNEL_LABEL[c]).join("、")}，${draft.scheduledAt ? "按定时排期执行" : "系统每分钟扫描执行"}。`);
      closePublish();
      void jobsQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("创建失败", msg);
    } finally {
      setBusy(null);
    }
  }

  async function openPreview(row: Row) {
    setViewing(row);
    setDetailTab("website");
    setDetail(null);
    try {
      const full = await managerFetch<Row & { content: string }>(`/api/content-items/${row.id}`);
      setDetail({ content: full.content ?? "", title: full.title });
    } catch (e) {
      toast.error("预览加载失败", errorMessage(e));
      setViewing(null);
    }
  }

  async function removeItem(row: Row) {
    const ok = await confirmDialog({
      title: `删除「${row.title}」？`,
      description: "删除后前台与知识库不再可用，且不可恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setBusy(row.id);
    try {
      await managerFetch(`/api/content-items/${row.id}`, { method: "DELETE" });
      toast.success(toastCopy.deleted, row.title);
      void itemsQ.reload();
    } catch (e) {
      toast.error("删除失败", errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const error = itemsQ.error ?? jobsQ.error;
  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const columns: DataColumn<Row>[] = [
    {
      key: "title",
      label: "标题",
      primary: true,
      render: (r) => (
        <span className="line-clamp-1 font-medium" title={r.title}>
          {r.title}
        </span>
      ),
    },
    { key: "source", label: "来源", render: (r) => SOURCE_LABEL[r.source] ?? r.source },
    { key: "status", label: "状态", render: (r) => <StatusBadge tone={r.status === "published" ? "success" : r.status === "offline" ? "muted" : "info"}>{r.status}</StatusBadge> },
    {
      key: "channels",
      label: "渠道状态",
      render: (r) => {
        const per = channelsOf.get(String(r.id));
        if (!per || per.size === 0) return <span className="text-mgr-muted-fg">未发布</span>;
        return (
          <span className="inline-flex flex-wrap gap-1">
            {[...per.entries()].map(([ch, job]) => {
              const st = JOB_STATUS[job.status] ?? { label: job.status, tone: "muted" as Tone };
              return (
                <Badge key={ch} tone={st.tone === "muted" ? "neutral" : st.tone} title={`${CHANNEL_LABEL[ch] ?? ch}：${st.label}`}>
                  {CHANNEL_LABEL[ch] ?? ch}·{st.label}
                </Badge>
              );
            })}
          </span>
        );
      },
    },
    { key: "author", label: "作者", render: (r) => (typeof r.author === "string" ? r.author : r.author && typeof r.author === "object" ? String((r.author as { username?: string }).username ?? "—") : "—") },
    { key: "createdAt", label: "创建时间", render: (r) => r.createdAt?.slice(0, 16).replace("T", " ") },
  ];

  if (itemsQ.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="内容中枢"
        description="全站内容的统一管理入口：多渠道发布（官网/公众号）、定时与立即执行、渠道预览。"
        actions={
          <SearchInput
            value={keyword}
            placeholder="搜索标题/内容…"
            onChange={(v) => {
              setKeyword(v);
              setPage(1);
            }}
          />
        }
      />
      <div className={cardCls}>
        <DataTable<Row>
          caption="内容中枢"
          rows={list}
          columns={columns}
          rowKey={(r) => String(r.id)}
          loading={itemsQ.loading}
          refreshing={itemsQ.refreshing}
          error={itemsQ.error}
          onRetry={() => void itemsQ.reload()}
          emptyTitle={keyword ? `没有找到与「${keyword}」相关的内容` : "暂无内容"}
          emptyDescription={keyword ? "换个关键词试试。" : "新建文章或从「采集审核」通过后，内容会出现在这里。"}
          rowName={(r) => r.title}
          rowActions={(r) => [
            ...(canPublish ? [{ key: "publish", label: "发布", tone: "primary" as const, icon: <Send aria-hidden="true" />, onClick: () => openPublish(r) }] : []),
            { key: "preview", label: "预览", tone: "muted" as const, icon: <Eye aria-hidden="true" />, onClick: () => void openPreview(r) },
            { key: "delete", label: "删除", tone: "danger" as const, icon: <Trash2 aria-hidden="true" />, onClick: () => void removeItem(r), disabled: busy === r.id },
          ]}
          pagination={itemsQ.data && !error ? { page, limit: 10, totalPages: itemsQ.data!.pagination.totalPages, total: itemsQ.data!.pagination.total ?? list.length, onPageChange: setPage } : undefined}
          data-testid="content-hub-table"
        />
      </div>

      {publishing && (
        <FormDialog
          open
          title={`发布：${publishing.title}`}
          description="渠道可多选；多渠道发布按渠道各建一条任务，可单独重试/取消。"
          onClose={closePublish}
          onSubmit={() => void submitPublish()}
          saving={busy === publishing.id}
          dirty={publishDirty}
          serverError={serverError}
          submitText="创建发布任务"
        >
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">发布渠道（可多选）</legend>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Checkbox checked={draft.website} onChange={(e) => setDraft((d) => ({ ...d, website: e.target.checked }))} aria-label="发布到官网" data-testid="hub-channel-website" />
                  <span className="text-sm">官网</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Checkbox checked={draft.wechat} onChange={(e) => setDraft((d) => ({ ...d, wechat: e.target.checked }))} aria-label="发布到公众号" data-testid="hub-channel-wechat" />
                  <span className="text-sm">公众号</span>
                </span>
              </span>
            </fieldset>

            <FormField label="动作" id="hub-action">
              {(a11y) => (
                <Select
                  {...a11y}
                  value={draft.action}
                  onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                  options={[
                    { label: "发布", value: "publish" },
                    { label: "更新", value: "update" },
                    { label: "下线", value: "offline" },
                  ]}
                />
              )}
            </FormField>

            <FormField label="定时时间（留空 = 立即）" id="hub-scheduled" help="定时任务到点由系统执行；须晚于当前时间">
              {(a11y) => (
                <DateTimeInput
                  {...a11y}
                  value={draft.scheduledAt}
                  onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                  data-testid="hub-scheduled"
                />
              )}
            </FormField>

            <FormField label="发布前邮件提醒" inline>
              {(a11y) => (
                <Switch
                  {...a11y}
                  checked={draft.preNotify}
                  onCheckedChange={(checked) => setDraft((d) => ({ ...d, preNotify: checked }))}
                />
              )}
            </FormField>
          </div>
        </FormDialog>
      )}

      {viewing && (
        <DetailDialog open onClose={() => setViewing(null)} title={`预览：${viewing.title}`} description={SOURCE_LABEL[viewing.source] ?? viewing.source}>
          <div className="flex flex-col gap-3">
            <Tabs
              items={TABS}
              value={detailTab}
              onChange={setDetailTab}
              label="渠道预览"
            />
            {!detail ? (
              <div className="flex justify-center py-10 text-sm text-mgr-muted-fg">加载中…</div>
            ) : detailTab === "website" ? (
              <div className="max-h-[60vh] overflow-y-auto rounded-mgr-control border border-mgr-border bg-mgr-surface p-4" data-testid="hub-preview-website">
                <article className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-mgr-fg">{detail.content}</article>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto rounded-mgr-control border border-mgr-border bg-mgr-surface p-4" data-testid="hub-preview-wechat">
                <div className="rounded-mgr-control bg-[#f7f7f7] p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
                  <p className="mb-2 text-center text-[15px] font-bold text-black">{viewing.title}</p>
                  <p className="mb-3 text-center text-[11px] text-gray-400">点击上方蓝字关注我们</p>
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-800">{detail.content}</div>
                  <p className="mt-4 border-t border-gray-200 pt-2 text-center text-[11px] text-gray-400">— 完 —</p>
                </div>
              </div>
            )}
          </div>
        </DetailDialog>
      )}
    </div>
  );
}
