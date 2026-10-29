"use client";

/**
 * 内容中枢统一管理（E-09 + V7-UI-01）：渠道状态列（服务端组装）+ 发布对话框（渠道多选/立即/定时/发布前提醒）+ 渠道预览 Tab
 * - 渠道状态列：消费 B-07 `/api/content-items` 返回的 `channels`（`channelStateSchema`，ADR-034 派生字段）；
 *   失败态可重试（POST /api/publish-jobs/[id]/retry，jobId 由本页从列表解析，幂等键沿用契约）
 * - 发布：POST /api/publish-jobs { channels: [..1~2 个] }（CCR-1 多渠道；后端按渠道各建一条，事务回滚）
 * - 预览：官网 Tab 用前台同款 Markdown 语义样式渲染（不引用 web 组件）；公众号 Tab 简化样式卡片
 * - 权限：无 publish:create 权限（且非超管）时发布入口不可见；重试需 publish:edit（ADR-035）
 */
import { useMemo, useState } from "react";
import { Send, Trash2, Eye, FilePlus2, Pencil, ClipboardCheck } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { type ChannelState } from "@/contracts/content-hub";
import { useAuthStore } from "@/store/authStore";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { DetailDialog } from "@/components/manager/DetailDialog";
import { Tabs } from "@/components/manager/ui/misc";
import { FormField } from "@/components/manager/ui/form-field";
import { Checkbox, DateTimeInput, Input, RadioGroup, Select, Switch, Textarea, Button, SearchField } from "@/components/manager/ui";
import { ContentMarkdown } from "@/components/manager/ContentMarkdown";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { Forbidden, PageSkeleton, cardCls, confirmDialog, toast, useManagerQuery, ErrorState } from "@/components/manager/feedback";
import { ChannelStates } from "@/components/manager/publish/ChannelStates";
import { StatusBadge } from "@/components/manager/StatusBadge";

type Row = { id: number; title: string; contentType: string; source: string; status: string; author?: string | null; createdAt: string; channels?: ChannelState[]; excerpt?: string | null; coverImage?: string | null };
type ListData = { list: Row[]; pagination: { page: number; totalPages: number; total?: number } };
/** jobsQ 仅用于解析重试所需 PublishJob.id（契约 channelState 不含 jobId） */
type Job = { id: number; itemId: number | null; channel: string; status: string; createdAt: string };

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
  const canRetry = user?.role?.isSuper || user?.role?.permissions?.includes("publish:edit") || false;
  // V11-HUB-01：编辑/提交审核（content:edit）与审核（review:edit，ADR-017 审核权独享）
  const canEdit = user?.role?.isSuper || user?.role?.permissions?.includes("content:edit") || false;
  const canReview = user?.role?.isSuper || user?.role?.permissions?.includes("review:edit") || false;

  const [publishing, setPublishing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [serverError, setServerError] = useState("");
  const [detailTab, setDetailTab] = useState("website");
  const [detail, setDetail] = useState<{ content: string; title: string } | null>(null);

  // V11-HUB-01：新建/编辑表单与审核对话框
  type EditDraft = { title: string; contentType: string; content: string; excerpt: string; coverImage: string };
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ title: "", contentType: "markdown", content: "", excerpt: "", coverImage: "" });
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected">("approved");
  const [reviewRemark, setReviewRemark] = useState("");

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
  // 仅用于解析重试所需 PublishJob.id（channelState 契约无 jobId）；不做渠道状态展示
  const failedJobIdsOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobsQ.data?.list ?? []) {
      if (j.itemId == null || j.status !== "failed") continue;
      const key = `${j.itemId}:${j.channel}`;
      const prev = map.get(key);
      if (prev == null || j.id > prev) map.set(key, j.id);
    }
    return map;
  }, [jobsQ.data]);

  function resolveJobId(itemId: number, channel: string): number | null {
    return failedJobIdsOf.get(`${itemId}:${channel}`) ?? null;
  }

  function onRetried() {
    void itemsQ.reload();
    void jobsQ.reload();
  }

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


  function openEdit(row: Row | "new") {
    setServerError("");
    if (row === "new") {
      setEditDraft({ title: "", contentType: "markdown", content: "", excerpt: "", coverImage: "" });
    } else {
      setEditDraft({ title: row.title, contentType: row.contentType, content: "", excerpt: row.excerpt ?? "", coverImage: row.coverImage ?? "" });
      void managerFetch<Row & { content: string }>(`/api/content-items/${row.id}`)
        .then((full) => setEditDraft((d) => ({ ...d, content: full.content ?? "" })))
        .catch((e) => toast.error("内容加载失败", errorMessage(e)));
    }
    setEditing(row);
  }

  function closeEdit() {
    setEditing(null);
    setServerError("");
  }

  async function submitEdit() {
    if (!editing || busy !== null) return;
    if (!editDraft.title.trim() || !editDraft.content.trim()) {
      setServerError("标题与正文必填");
      return;
    }
    setBusy(editing === "new" ? -1 : editing.id);
    setServerError("");
    try {
      const body = {
        title: editDraft.title,
        contentType: editDraft.contentType,
        content: editDraft.content,
        excerpt: editDraft.excerpt || null,
        coverImage: editDraft.coverImage || null,
      };
      if (editing === "new") {
        await managerFetch("/api/content-items", { method: "POST", body: JSON.stringify(body) });
        toast.success("已创建", `「${body.title}」已入库，可提交审核。`);
      } else {
        await managerFetch(`/api/content-items/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("已保存");
      }
      closeEdit();
      void itemsQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setBusy(null);
    }
  }

  async function submitForReview(row: Row) {
    if (busy !== null) return;
    setBusy(row.id);
    try {
      await managerFetch(`/api/content-items/${row.id}`, { method: "PUT", body: JSON.stringify({ status: "pending_review" }) });
      toast.success("已提交审核", "等待超级管理员审核。");
      void itemsQ.reload();
    } catch (e) {
      toast.error("提交失败", errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function openReview(row: Row) {
    setReviewing(row);
    setReviewDecision("approved");
    setReviewRemark("");
    setServerError("");
  }

  async function submitReview() {
    if (!reviewing || busy !== null) return;
    setBusy(reviewing.id);
    setServerError("");
    try {
      await managerFetch(`/api/content-items/${reviewing.id}/review`, {
        method: "POST",
        body: JSON.stringify({ decision: reviewDecision, remark: reviewRemark || null }),
      });
      toast.success("审核完成", reviewDecision === "approved" ? "已通过（可建发布任务）" : "已拒绝");
      setReviewing(null);
      void itemsQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("审核失败", msg);
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
  // V8-UI-01：非 403 的请求失败也要有明确错误态（此前会静默显示空表）
  if (error && !isForbidden(error)) return <ErrorState message={error.message} onRetry={() => { void itemsQ.reload(); void jobsQ.reload(); }} />;

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
      render: (r) => (
        <ChannelStates
          itemId={r.id}
          channels={r.channels ?? []}
          canRetry={canRetry}
          resolveJobId={resolveJobId}
          onRetried={onRetried}
        />
      ),
    },
    { key: "author", label: "作者", render: (r) => (typeof r.author === "string" ? r.author : r.author && typeof r.author === "object" ? String((r.author as { username?: string }).username ?? "—") : "—") },
    { key: "createdAt", label: "创建时间", render: (r) => r.createdAt?.slice(0, 16).replace("T", " ") },
  ];

  if (itemsQ.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <Button variant="primary" size="sm" className="self-start" data-testid="hub-new" onClick={() => openEdit("new")}>
          新建内容
        </Button>
      )}
      <PageHeader
        title="内容中枢"
        description="全站内容的统一管理入口：多渠道发布（官网/公众号）、定时与立即执行、渠道预览。"
        actions={
          <SearchField
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
          emptyAction={
            keyword ? (
              <Button type="button" onClick={() => { setKeyword(""); setPage(1); }} variant="ghost">
                清除筛选
              </Button>
            ) : (
              <Button type="button" onClick={() => openEdit("new")} variant="primary">
                新建内容
              </Button>
            )
          }
          rowName={(r) => r.title}
          rowActions={(r) => [
            ...(canEdit && (r.status === "draft" || r.status === "rejected") ? [{ key: "edit", label: "编辑", tone: "muted" as const, icon: <Pencil aria-hidden="true" />, onClick: () => openEdit(r) }] : []),
            ...(canEdit && r.status === "draft" ? [{ key: "submit", label: "提交审核", tone: "muted" as const, icon: <FilePlus2 aria-hidden="true" />, onClick: () => void submitForReview(r), disabled: busy === r.id }] : []),
            ...(canReview && r.status === "pending_review" ? [{ key: "review", label: "审核", tone: "primary" as const, icon: <ClipboardCheck aria-hidden="true" />, onClick: () => openReview(r) }] : []),
            ...(canPublish ? [{ key: "publish", label: "发布", tone: "primary" as const, icon: <Send aria-hidden="true" />, onClick: () => openPublish(r) }] : []),
            { key: "preview", label: "预览", tone: "muted" as const, icon: <Eye aria-hidden="true" />, onClick: () => void openPreview(r) },
            { key: "delete", label: "删除", tone: "danger" as const, icon: <Trash2 aria-hidden="true" />, onClick: () => void removeItem(r), disabled: busy === r.id },
          ]}
          pagination={itemsQ.data && !error ? { page, limit: 10, totalPages: itemsQ.data!.pagination.totalPages, total: itemsQ.data!.pagination.total ?? list.length, onPageChange: setPage } : undefined}
          data-testid="content-hub-table"
        />
      </div>


      {editing && (
        <FormDialog
          open
          title={editing === "new" ? "新建内容" : `编辑：${editing.title}`}
          description="markdown/html 正文；封面与摘要留空时入库自动派生（V11-WX-01）。"
          onClose={closeEdit}
          onSubmit={() => void submitEdit()}
          saving={busy === (editing === "new" ? -1 : editing.id)}
          dirty
          serverError={serverError}
          submitText={editing === "new" ? "创建" : "保存"}
        >
          <div className="flex flex-col gap-4">
            <FormField label="标题" required>
              {(a11y) => (
                <Input {...a11y} value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} data-testid="hub-edit-title" />
              )}
            </FormField>
            <FormField label="内容类型">
              {(a11y) => (
                <Select {...a11y} value={editDraft.contentType} onChange={(e) => setEditDraft((d) => ({ ...d, contentType: e.target.value }))} options={[{ value: "markdown", label: "markdown" }, { value: "html", label: "html" }]} data-testid="hub-edit-type" />
              )}
            </FormField>
            <FormField label="正文" required>
              {(a11y) => (
                <Textarea {...a11y} rows={14} className="w-full font-mono text-[13px]" value={editDraft.content} onChange={(e) => setEditDraft((d) => ({ ...d, content: e.target.value }))} data-testid="hub-edit-content" />
              )}
            </FormField>
            <FormField label="摘要（留空自动生成）">
              {(a11y) => (
                <Textarea {...a11y} rows={2} className="w-full" value={editDraft.excerpt} onChange={(e) => setEditDraft((d) => ({ ...d, excerpt: e.target.value }))} />
              )}
            </FormField>
            <FormField label="封面图路径（留空取正文首图）">
              {(a11y) => (
                <Input {...a11y} value={editDraft.coverImage} onChange={(e) => setEditDraft((d) => ({ ...d, coverImage: e.target.value }))} />
              )}
            </FormField>
          </div>
        </FormDialog>
      )}

      {reviewing && (
        <FormDialog
          open
          title={`审核：${reviewing.title}`}
          description="通过后可建发布任务；拒绝须给出理由（ADR-017：审核权独享）。"
          onClose={() => setReviewing(null)}
          onSubmit={() => void submitReview()}
          saving={busy === reviewing.id}
          dirty
          serverError={serverError}
          submitText="提交审核结论"
        >
          <div className="flex flex-col gap-4">
            <RadioGroup
              label="审核结论"
              name="review-decision"
              variant="card"
              value={reviewDecision}
              onValueChange={(v) => setReviewDecision(v === "rejected" ? "rejected" : "approved")}
              options={[
                { value: "approved", label: "通过", testId: "hub-review-approved" },
                { value: "rejected", label: "拒绝", testId: "hub-review-rejected" },
              ]}
            />
            <FormField label="备注（拒绝时建议填写理由）">
              {(a11y) => (
                <Textarea {...a11y} rows={3} className="w-full" value={reviewRemark} onChange={(e) => setReviewRemark(e.target.value)} data-testid="hub-review-remark" />
              )}
            </FormField>
          </div>
        </FormDialog>
      )}

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
                <ContentMarkdown content={detail.content} contentType={viewing.contentType} />
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto rounded-mgr-control border border-mgr-border bg-mgr-surface p-4" data-testid="hub-preview-wechat">
                <div className="rounded-mgr-control bg-[#f7f7f7] p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
                  <p className="mb-2 text-center text-[15px] font-bold text-black">{viewing.title}</p>
                  <p className="mb-3 text-center text-[11px] text-gray-400">点击上方蓝字关注我们</p>
                  <div className="text-[13px] leading-6 text-gray-800">
                    <ContentMarkdown content={detail.content} contentType={viewing.contentType} />
                  </div>
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
