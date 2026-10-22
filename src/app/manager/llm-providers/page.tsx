"use client";

/**
 * 模型供应商：列表 + 优先级/默认/兜底 + 连通性测试 + 余额填报 + 新建/编辑/删除
 * P05：五态接入；原生 prompt 余额填报 → promptDialog（行内校验）；删除走 ConfirmDialog（补齐 CRUD 的 D）；测试结果 Toast。
 * E-10：Tabs（供应商 / 用量统计）+ 优先级拖拽排序（HTML5 DnD + 键盘上/下移按钮，a11y 可替代）
 *   + 一次保存（逐条 PUT /api/llm/providers/[id] {priority}；C-11 合并后可切 PUT /api/llm/providers/order 单请求）
 *   + 保存失败回滚顺序；用量 Tab（GET /api/llm/usage，C-11 未合并前错误态）表格 + 简单柱状（无新依赖）。
 */
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { validateRequired } from "@/components/manager/form-utils";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import dynamic from "next/dynamic";

// W2-04 减包：SchemaForm 仅在打开表单弹窗时需要，改为懒加载，不进列表页首屏
const SchemaForm = dynamic(
  () => import("@/components/manager/SchemaForm").then((m) => m.SchemaForm),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-md bg-mgr-muted" /> }
);
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { StatusBadge } from "@/components/manager/StatusBadge";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { Button, IconButton, Input, Select } from "@/components/manager/ui";
import { ErrorState, Forbidden, cardCls, confirmDialog, promptDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge, Tabs } from "@/components/manager/ui/misc";
import type { LlmUsageRow } from "@/contracts/llm";

type Provider = {
  id: number; name: string; kind: string; endpoint: string; model: string; botId: string | null;
  apiKey: string; priority: number; isDefault: boolean; isFallback: boolean; status: string;
  balance: number | null; balanceCheckedAt: string | null; balanceThreshold: number | null;
};
type ListData = { list: Provider[]; pagination: { page: number; totalPages: number } };

const FIELDS: FieldSpec[] = [
  { key: "name", label: "名称", required: true },
  {
    key: "kind", label: "类型", type: "select" as const, required: true,
    options: [{ label: "OpenAI 兼容", value: "openai" }, { label: "扣子 Coze 智能体", value: "coze" }],
  },
  { key: "endpoint", label: "端点（openai: https://api…/v1；coze: https://api.coze.cn）", required: true, colSpan: 2 },
  { key: "apiKey", label: "API Key / PAT（保存后脱敏显示）", required: true, colSpan: 2 },
  { key: "botId", label: "Coze bot_id（仅 coze 类型）" },
  { key: "model", label: "模型名（openai 必填；coze 可留空）", required: true },
  { key: "temperature", label: "温度", type: "number" },
  { key: "maxTokens", label: "最大 Token", type: "number" },
  { key: "priority", label: "优先级（小值优先）", type: "number" },
  { key: "balanceThreshold", label: "余额提醒阈值", type: "number" },
  { key: "isDefault", label: "默认模型（新会话首选）", type: "switch" },
  { key: "isFallback", label: "兜底模型（全败必试）", type: "switch" },
  { key: "status", label: "状态", type: "select", options: [{ label: "启用", value: "active" }, { label: "停用", value: "inactive" }] },
];

export default function ManagerLlmProvidersPage() {
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(`/api/llm/providers?page=1&limit=50`);
  const [tab, setTab] = useState("providers");
  // E-10 优先级排序：本地顺序（priority 升序初始化）+ dirty + 保存失败回滚
  const [order, setOrder] = useState<Provider[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // E-10：远端数据到达后初始化本地顺序（仅首次；hooks 须在 early return 之前）
  useEffect(() => {
    if (data && order === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部数据到达后一次性初始化
      setOrder([...data.list].sort((a, b) => a.priority - b.priority || a.id - b.id));
    }
  }, [data, order]);
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [initial, setInitial] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  function begin(id: number | null, values: FormValues) {
    setEditingId(id);
    setEditing(values);
    setInitial(JSON.stringify(values));
    setFieldErrors({});
    setServerError("");
  }

  async function save() {
    if (!editing) return;
    const required = FIELDS.map((f) => (f.key === "model" && editing.kind === "coze" ? { ...f, required: false } : f));
    const errs = validateRequired(required, editing);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setServerError("");
    try {
      const body = { ...editing };
      for (const k of ["balanceThreshold", "temperature", "maxTokens", "priority"]) {
        if (body[k] === "" || body[k] === undefined) body[k] = null;
        else if (typeof body[k] === "string") body[k] = Number(body[k]);
      }
      if (body.temperature === null) delete body.temperature;
      if (body.maxTokens === null) delete body.maxTokens;
      if (body.priority === null) delete body.priority;
      if (editingId) {
        await managerFetch(`/api/llm/providers/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/llm/providers", { method: "POST", body: JSON.stringify(body) });
      }
      toast.success(editingId ? toastCopy.saved : toastCopy.created, String(body.name));
      setEditing(null);
      void reload();
    } catch (e) {
      const msg = errorMessage(e, "保存失败");
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function test(p: Provider) {
    setBusy(p.id);
    try {
      const res = await managerFetch<{ ok: boolean; latencyMs: number; reply?: string; errMsg?: string }>(
        `/api/llm/providers/${p.id}/test`,
        { method: "POST", body: "{}" }
      );
      if (res.ok) toast.success(`「${p.name}」连通正常（${res.latencyMs}ms）`, res.reply ? `回复：${res.reply.slice(0, 80)}` : undefined);
      else toast.error(`「${p.name}」测试失败`, res.errMsg ?? "未知错误");
    } catch (e) {
      toast.fromError(e, "测试失败");
    } finally {
      setBusy(null);
    }
  }

  async function fillBalance(p: Provider) {
    const raw = await promptDialog({
      title: `填报「${p.name}」余额`,
      description: `当前：${p.balance ?? "未填报"}${p.balanceThreshold != null ? `；低于阈值 ${p.balanceThreshold} 时每日邮件提醒` : ""}`,
      label: "当前余额",
      defaultValue: p.balance != null ? String(p.balance) : "",
      inputMode: "decimal",
      confirmText: "保存",
      validate: (v) => {
        if (v.trim() === "") return "请输入余额";
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? null : "余额必须是 ≥0 的数字";
      },
    });
    if (raw === null) return;
    setBusy(p.id);
    try {
      await managerFetch(`/api/llm/providers/${p.id}/balance`, { method: "POST", body: JSON.stringify({ balance: Number(raw) }) });
      toast.success("余额已更新", `${p.name}：${Number(raw)}`);
      void reload();
    } catch (e) {
      toast.fromError(e, "填报失败");
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Provider) {
    const ok = await confirmDialog({
      title: `删除供应商「${p.name}」？`,
      description: p.isDefault || p.isFallback ? "该供应商是默认/兜底模型，删除后 AI 客服将按优先级改用其他供应商。" : "删除后不可恢复，用量统计将一并移除。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      await managerFetch(`/api/llm/providers/${p.id}`, { method: "DELETE" });
      toast.success(toastCopy.deleted, p.name);
      void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setBusy(null);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];
  const byPriority = [...list].sort((a, b) => a.priority - b.priority || a.id - b.id);
  const current = order ?? byPriority;
  const orderDirty = order !== null && JSON.stringify(order.map((p) => p.id)) !== JSON.stringify(byPriority.map((p) => p.id));

  function moveOrder(from: number, to: number) {
    if (to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  }

  async function saveOrder() {
    if (!order || savingOrder) return;
    setSavingOrder(true);
    const baseline = [...byPriority]; // 失败回滚基准
    try {
      // 逐条 PUT（现有端点）；C-11 合并后可切 PUT /api/llm/providers/order 单请求
      for (const [i, p] of order.entries()) {
        await managerFetch(`/api/llm/providers/${p.id}`, { method: "PUT", body: JSON.stringify({ priority: (i + 1) * 10 }) });
      }
      toast.success("优先级已保存", "新会话按新顺序路由");
      setOrder(null);
      void reload();
    } catch (e) {
      setOrder(baseline); // 失败回滚
      toast.error("保存失败，已回滚顺序", errorMessage(e));
    } finally {
      setSavingOrder(false);
    }
  }

  const create = () =>
    begin(null, { name: "", kind: "openai", endpoint: "", apiKey: "", model: "", temperature: 0.7, maxTokens: 2048, priority: 10, status: "active", isDefault: false, isFallback: false });

  const columns: DataColumn<Provider>[] = [
    { key: "name", label: "名称", primary: true, render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "kind", label: "类型", render: (p) => (p.kind === "coze" ? "Coze" : "OpenAI 兼容") },
    { key: "model", label: "模型/bot", render: (p) => <span className="text-mgr-muted-fg">{p.kind === "coze" ? `bot ${p.botId ?? "—"}` : p.model}</span> },
    { key: "priority", label: "优先级", align: "right" },
    {
      key: "role",
      label: "角色",
      render: (p) => (
        <span className="inline-flex gap-1">
          {p.isDefault && <Badge tone="primary">默认</Badge>}
          {p.isFallback && <Badge tone="neutral">兜底</Badge>}
          {!p.isDefault && !p.isFallback && <span className="text-mgr-muted-fg">—</span>}
        </span>
      ),
    },
    {
      key: "balance",
      label: "余额",
      render: (p) => {
        const low = p.balance != null && p.balanceThreshold != null && p.balance <= p.balanceThreshold;
        return p.balance != null ? (
          <span className={low ? "font-medium text-mgr-danger" : undefined} title={low ? "低于提醒阈值" : undefined}>
            {p.balance}
            {low ? "（偏低）" : ""}
          </span>
        ) : (
          <span className="text-mgr-muted-fg">未填报</span>
        );
      },
    },
    { key: "status", label: "状态", render: (p) => <StatusBadge tone={p.status === "active" ? "success" : "muted"}>{p.status === "active" ? "启用" : "停用"}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader
        title="模型供应商"
        description="路由规则：默认模型 → 失败按优先级升序 → 全败走兜底模型。"
        actions={
          <>
            <Tabs
              items={[
                { key: "providers", label: "供应商" },
                { key: "usage", label: "用量统计" },
              ]}
              value={tab}
              onChange={setTab}
              label="模型运营视图"
              className="border-b-0"
            />
            {tab === "providers" && (
              <Button type="button" onClick={create} variant="primary" data-testid="llm-create">
                <Plus aria-hidden="true" />
                新建供应商
              </Button>
            )}
          </>
        }
      />

      {tab === "providers" && (
        <>
          {/* E-10：优先级排序面板——拖拽（HTML5 DnD）+ 键盘上/下移按钮（a11y 可替代）；一次保存，失败回滚 */}
          {current.length > 0 && (
            <div className={cardCls} data-testid="llm-order-panel">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">优先级排序（拖拽或用键盘按钮，小值优先）</p>
                  <Button type="button" onClick={() => void saveOrder()} disabled={!orderDirty || savingOrder} variant="primary" data-testid="llm-order-save">
                  {savingOrder ? "保存中…" : orderDirty ? "保存排序" : "已是最新"}
                </Button>
              </div>
              <ul className="flex flex-col gap-1">
                {current.map((p, i) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== i) moveOrder(dragIndex, i);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`flex items-center gap-2 rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 py-2 ${dragIndex === i ? "opacity-50" : ""}`}
                    data-testid={`llm-order-row-${p.name}`}
                  >
                    <GripVertical aria-hidden="true" className="h-4 w-4 cursor-grab text-mgr-muted-fg" />
                    <span className="w-6 text-center text-[12px] tabular-nums text-mgr-muted-fg">{i + 1}</span>
                    <span className="flex-1 truncate text-[13px] font-medium">{p.name}</span>
                    <span className="text-[12px] text-mgr-muted-fg">优先级 {p.priority}</span>
                    <IconButton label={`上移 ${p.name}`} size="sm" disabled={i === 0} onClick={() => moveOrder(i, i - 1)}>
                      <ArrowUp aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`下移 ${p.name}`} size="sm" disabled={i === current.length - 1} onClick={() => moveOrder(i, i + 1)}>
                      <ArrowDown aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DataTable<Provider>
        caption="模型供应商"
        rows={list}
        columns={columns}
        rowKey={(p) => String(p.id)}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={reload}
        emptyTitle="尚未配置模型供应商"
        emptyDescription="AI 客服需要至少一个启用的供应商才能回复访客。"
        emptyAction={
          <Button type="button" onClick={create} variant="primary">
            <Plus aria-hidden="true" />
            新建供应商
          </Button>
        }
        rowName={(p) => p.name}
        rowActions={(p) => [
          { key: "test", label: busy === p.id ? "处理中…" : "测试", tone: "primary", onClick: () => void test(p), disabled: busy === p.id },
          { key: "balance", label: "余额", tone: "muted", onClick: () => void fillBalance(p), disabled: busy === p.id },
          { key: "edit", label: "编辑", tone: "primary", ariaLabel: `编辑 ${p.name}`, onClick: () => begin(p.id, { ...p }) },
          { key: "delete", label: "删除", tone: "danger", ariaLabel: `删除 ${p.name}`, onClick: () => void remove(p), disabled: busy === p.id },
        ]}
        pagination={undefined}
        data-testid="llm-providers-table"
        />
        </>
      )}

      {tab === "usage" && <UsageTab />}

            <FormDialog
        open={editing !== null}
        title={editingId ? "编辑供应商" : "新建供应商"}
        onClose={() => setEditing(null)}
        onSubmit={save}
        saving={saving}
        dirty={editing !== null && JSON.stringify(editing) !== initial}
        serverError={serverError}
      >
        {editing && (
          <SchemaForm
            fields={FIELDS}
            values={editing}
            onChange={setEditing}
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

/** E-10 用量统计 Tab（GET /api/llm/usage，C-11 未合并前错误态；DataTable + 简单柱状，无新图表依赖） */
function UsageTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState<"provider" | "day">("provider");
  // 默认区间（最近 7 天）：Date.now 只在 effect 中调用（render 纯度）
  /* eslint-disable react-hooks/set-state-in-effect -- 挂载后一次性初始化默认区间（与 settings 页同款先例） */
  useEffect(() => {
    const t = new Date().toISOString().slice(0, 10);
    const w = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    setFrom(w);
    setTo(t);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const usageQ = useManagerQuery<{ list: LlmUsageRow[] }>(`/api/llm/usage?groupBy=${groupBy}&from=${from}&to=${to}`);
  const rows = usageQ.data?.list ?? [];
  const maxCalls = rows.length > 0 ? Math.max(...rows.map((r) => r.calls), 1) : 1;

  const columns: DataColumn<LlmUsageRow>[] = [
    { key: "key", label: "模型供应商", primary: true },
    { key: "calls", label: "调用数", align: "right" },
    { key: "tokensIn", label: "输入 tokens", align: "right" },
    { key: "tokensOut", label: "输出 tokens", align: "right" },
    { key: "failures", label: "失败", align: "right" },
    {
      key: "share",
      label: "调用数占比",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-mgr-subtle" aria-hidden="true">
            <div className="h-full rounded-full bg-mgr-primary" style={{ width: `${Math.round((r.calls / maxCalls) * 100)}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-mgr-muted-fg">{Math.round((r.calls / maxCalls) * 100)}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="usage-from" className="mb-1 block text-[13px] font-medium">开始日期</label>
          <Input id="usage-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" data-testid="usage-from" />
        </div>
        <div>
          <label htmlFor="usage-to" className="mb-1 block text-[13px] font-medium">结束日期</label>
          <Input id="usage-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" data-testid="usage-to" />
        </div>
        <div>
          <label htmlFor="usage-group" className="mb-1 block text-[13px] font-medium">聚合方式</label>
          <Select
            id="usage-group"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "provider" | "day")}
            options={[
              { label: "按模型", value: "provider" },
              { label: "按日", value: "day" },
            ]}
          />
        </div>
      </div>

      {usageQ.error && !isForbidden(usageQ.error) && (
        <ErrorState message={usageQ.error.message} onRetry={() => void usageQ.reload()} />
      )}
      {!usageQ.error && (
        <DataTable<LlmUsageRow>
          caption="模型用量统计"
          rows={rows}
          columns={columns}
          rowKey={(r) => r.key}
          loading={usageQ.loading}
          refreshing={usageQ.refreshing}
          onRetry={() => void usageQ.reload()}
          emptyTitle="区间内暂无调用记录"
          emptyDescription="AI 客服处理访客会话后，用量会按模型/按日聚合显示。"
          pagination={undefined}
          data-testid="usage-table"
        />
      )}
    </div>
  );
}
