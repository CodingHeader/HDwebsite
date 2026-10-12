"use client";

/**
 * 发布任务：待发/已发/失败 + 重试/取消 + 新建
 * P05：五态接入；取消需确认；新建弹窗内容条目改为下拉（来自内容中枢）+ 行内校验；Toast 反馈。
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { SchemaForm, normalizeFormValues, validateRequired } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { FilterTabs } from "@/components/manager/FilterTabs";
import { StatusBadge, type Tone } from "@/components/manager/StatusBadge";
import { Pagination, tableCls } from "@/components/manager/Pagination";
import { Forbidden, TableState, btnCls, confirmDialog, linkCls, toast, useManagerQuery } from "@/components/manager/feedback";

type Job = {
  id: number; itemId: number | null; contentType: string; channel: string; action: string; status: string;
  scheduledAt: string | null; attemptCount: number; errMsg: string | null; createdAt: string;
  item?: { id: number; title: string } | null;
};
type ListData = { list: Job[]; pagination: { page: number; totalPages: number; total?: number } };

const TABS = [
  { key: "", label: "全部" },
  { key: "pending", label: "待发布" },
  { key: "scheduled", label: "已排期" },
  { key: "published", label: "已发布" },
  { key: "failed", label: "失败" },
];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "草稿", tone: "muted" },
  reviewing: { label: "审核中", tone: "info" },
  pending: { label: "待发布", tone: "info" },
  scheduled: { label: "已排期", tone: "warning" },
  publishing: { label: "发布中", tone: "info" },
  published: { label: "已发布", tone: "success" },
  failed: { label: "失败", tone: "danger" },
  cancelled: { label: "已取消", tone: "muted" },
};

const ACTIONS: Record<string, string> = { publish: "发布", update: "更新", offline: "下线" };

export default function ManagerPublishJobsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(
    `/api/publish-jobs?page=${page}&limit=15${status ? `&status=${status}` : ""}`
  );
  const [creating, setCreating] = useState<FormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [items, setItems] = useState<{ label: string; value: number }[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const fields: FieldSpec[] = [
    { key: "itemId", label: "内容条目（来自内容中枢）", type: "select", options: items, required: true, colSpan: 2 },
    { key: "channel", label: "发布渠道", type: "select", options: [{ label: "官网", value: "website" }, { label: "公众号", value: "wechat" }] },
    {
      key: "contentType", label: "内容类型", type: "select",
      options: [
        { label: "文章", value: "article" }, { label: "资讯", value: "info" },
        { label: "服务指南", value: "service_guide" }, { label: "公众号文章", value: "wechat" },
      ],
    },
    { key: "action", label: "动作", type: "select", options: [{ label: "发布", value: "publish" }, { label: "更新", value: "update" }, { label: "下线", value: "offline" }] },
    { key: "scheduledAt", label: "排期时间（留空=立即）", type: "date" },
    { key: "preNotify", label: "发布前邮件提醒", type: "switch" },
  ];

  async function openCreate() {
    setCreating({ itemId: null, channel: "website", contentType: "article", action: "publish", scheduledAt: null, preNotify: true });
    setFieldErrors({});
    setServerError("");
    try {
      const res = await managerFetch<{ list: { id: number; title: string; status: string }[] }>("/api/content-items?limit=100");
      setItems(res.list.map((c) => ({ label: `#${c.id} ${c.title}`, value: c.id })));
    } catch (e) {
      setItems([]);
      toast.error("内容条目加载失败", errorMessage(e));
    }
  }

  async function action(job: Job, act: "retry" | "cancel") {
    if (act === "cancel") {
      const ok = await confirmDialog({
        title: `取消发布任务 #${job.id}？`,
        description: `「${job.item?.title ?? "未关联内容"}」将不会被发布，之后可在列表中点「重试」重新排队。`,
        confirmText: "取消任务",
        cancelText: "保留",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(job.id);
    try {
      await managerFetch(`/api/publish-jobs/${job.id}/${act}`, { method: "POST", body: "{}" });
      toast.success(act === "retry" ? "已重新排队" : "任务已取消", `任务 #${job.id}`);
      void reload();
    } catch (e) {
      toast.fromError(e, act === "retry" ? "重试失败" : "取消失败");
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!creating) return;
    const errs = validateRequired(fields, creating);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setServerError("");
    try {
      const body = normalizeFormValues(fields, creating);
      await managerFetch("/api/publish-jobs", { method: "POST", body: JSON.stringify(body) });
      toast.success(toastCopy.created, creating.scheduledAt ? "已按排期加入队列" : "系统每分钟扫描执行");
      setCreating(null);
      void reload();
    } catch (e) {
      const msg = errorMessage(e, "创建失败");
      setServerError(msg);
      toast.error("创建失败", msg);
    } finally {
      setSaving(false);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];

  return (
    <div>
      <PageHeader
        title="发布任务"
        description="内容中枢条目发布到官网或公众号的队列；失败任务可重试，排期任务可取消。"
        actions={
          <>
            <FilterTabs
              tabs={TABS}
              value={status}
              onChange={(k) => {
                setStatus(k);
                setPage(1);
              }}
            />
            <button type="button" onClick={() => void openCreate()} className={btnCls("primary")} data-testid="publish-create">
              <Plus aria-hidden="true" />
              新建任务
            </button>
          </>
        }
      />
      <div className={tableCls.wrap} aria-busy={loading || refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>内容</th>
              <th scope="col" className={tableCls.th}>渠道</th>
              <th scope="col" className={tableCls.th}>动作</th>
              <th scope="col" className={tableCls.th}>状态</th>
              <th scope="col" className={tableCls.th}>排期</th>
              <th scope="col" className={`${tableCls.th} text-right`}>尝试</th>
              <th scope="col" className={`${tableCls.th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className={refreshing ? "opacity-60 transition-opacity" : undefined}>
            <TableState
              columns={7}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle="暂无发布任务"
              emptyDescription="在「内容中枢」点「发官网 / 发公众号」，或在此新建任务。"
              emptyAction={
                <button type="button" onClick={() => void openCreate()} className={btnCls("primary")}>
                  <Plus aria-hidden="true" />
                  新建任务
                </button>
              }
            />
            {!error &&
              list.map((j) => {
                const st = STATUS[j.status] ?? { label: j.status, tone: "muted" as Tone };
                return (
                  <tr key={j.id} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                    <td className={`${tableCls.td} max-w-[280px]`}>
                      <span className="line-clamp-1" title={j.item?.title}>{j.item?.title ?? `#${j.itemId ?? "—"}`}</span>
                    </td>
                    <td className={tableCls.td}>{j.channel === "website" ? "官网" : "公众号"}</td>
                    <td className={tableCls.td}>{ACTIONS[j.action] ?? j.action}</td>
                    <td className={tableCls.td}>
                      <StatusBadge tone={st.tone} title={j.errMsg ?? undefined}>
                        {st.label}
                      </StatusBadge>
                      {j.errMsg && <p className="mt-0.5 line-clamp-1 max-w-[220px] text-[11px] text-mgr-muted-fg" title={j.errMsg}>{j.errMsg}</p>}
                    </td>
                    <td className={`${tableCls.td} tabular-nums text-mgr-muted-fg`}>
                      {j.scheduledAt ? new Date(j.scheduledAt).toLocaleString("zh-CN", { hour12: false }).slice(0, -3) : "立即"}
                    </td>
                    <td className={`${tableCls.td} text-right tabular-nums`}>{j.attemptCount}</td>
                    <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                      {(j.status === "failed" || j.status === "cancelled") && (
                        <button type="button" disabled={busy === j.id} onClick={() => void action(j, "retry")} className={linkCls("primary")}>
                          重试
                        </button>
                      )}
                      {["pending", "scheduled", "reviewing"].includes(j.status) && (
                        <button type="button" disabled={busy === j.id} onClick={() => void action(j, "cancel")} className={linkCls("danger")}>
                          取消
                        </button>
                      )}
                      {["published", "publishing"].includes(j.status) && <span className="text-mgr-muted-fg">—</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {data && !error && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />}

      <FormDialog
        open={creating !== null}
        title="新建发布任务"
        onClose={() => setCreating(null)}
        onSubmit={create}
        saving={saving}
        submitText="创建"
        serverError={serverError}
        size="md"
      >
        {creating && (
          <SchemaForm
            fields={fields}
            values={creating}
            onChange={setCreating}
            errors={fieldErrors}
            onFieldChange={(k) =>
              setFieldErrors((p) => {
                if (!p[k]) return p;
                const n = { ...p };
                delete n[k];
                return n;
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
