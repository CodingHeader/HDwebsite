"use client";

/**
 * 模型供应商：列表 + 优先级/默认/兜底 + 连通性测试 + 余额填报 + 新建/编辑/删除
 * P05：五态接入；原生 prompt 余额填报 → promptDialog（行内校验）；删除走 ConfirmDialog（补齐 CRUD 的 D）；测试结果 Toast。
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { SchemaForm, validateRequired } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { StatusBadge } from "@/components/manager/StatusBadge";
import { tableCls } from "@/components/manager/Pagination";
import { Forbidden, TableState, btnCls, confirmDialog, linkCls, promptDialog, toast, useManagerQuery } from "@/components/manager/feedback";

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
  const create = () =>
    begin(null, { name: "", kind: "openai", endpoint: "", apiKey: "", model: "", temperature: 0.7, maxTokens: 2048, priority: 10, status: "active", isDefault: false, isFallback: false });

  return (
    <div>
      <PageHeader
        title="模型供应商"
        description="路由规则：默认模型 → 失败按优先级升序 → 全败走兜底模型。"
        actions={
          <button type="button" onClick={create} className={btnCls("primary")} data-testid="llm-create">
            <Plus aria-hidden="true" />
            新建供应商
          </button>
        }
      />
      <div className={tableCls.wrap} aria-busy={loading || refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>名称</th>
              <th scope="col" className={tableCls.th}>类型</th>
              <th scope="col" className={tableCls.th}>模型/bot</th>
              <th scope="col" className={`${tableCls.th} text-right`}>优先级</th>
              <th scope="col" className={tableCls.th}>角色</th>
              <th scope="col" className={tableCls.th}>余额</th>
              <th scope="col" className={tableCls.th}>状态</th>
              <th scope="col" className={`${tableCls.th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              columns={8}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle="尚未配置模型供应商"
              emptyDescription="AI 客服需要至少一个启用的供应商才能回复访客。"
              emptyAction={
                <button type="button" onClick={create} className={btnCls("primary")}>
                  <Plus aria-hidden="true" />
                  新建供应商
                </button>
              }
            />
            {!error &&
              list.map((p) => {
                const low = p.balance != null && p.balanceThreshold != null && p.balance <= p.balanceThreshold;
                return (
                  <tr key={p.id} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                    <td className={`${tableCls.td} font-medium`}>{p.name}</td>
                    <td className={tableCls.td}>{p.kind === "coze" ? "Coze" : "OpenAI 兼容"}</td>
                    <td className={`${tableCls.td} text-mgr-muted-fg`}>{p.kind === "coze" ? `bot ${p.botId ?? "—"}` : p.model}</td>
                    <td className={`${tableCls.td} text-right tabular-nums`}>{p.priority}</td>
                    <td className={tableCls.td}>
                      <span className="inline-flex gap-1">
                        {p.isDefault && <span className="rounded-full bg-mgr-primary-soft px-2 py-0.5 text-[11px] font-medium text-mgr-primary">默认</span>}
                        {p.isFallback && <span className="rounded-full bg-mgr-subtle px-2 py-0.5 text-[11px] font-medium text-mgr-fg">兜底</span>}
                        {!p.isDefault && !p.isFallback && <span className="text-mgr-muted-fg">—</span>}
                      </span>
                    </td>
                    <td className={`${tableCls.td} tabular-nums`}>
                      {p.balance != null ? <span className={low ? "font-medium text-mgr-danger" : undefined} title={low ? "低于提醒阈值" : undefined}>{p.balance}{low ? "（偏低）" : ""}</span> : <span className="text-mgr-muted-fg">未填报</span>}
                    </td>
                    <td className={tableCls.td}>
                      <StatusBadge tone={p.status === "active" ? "success" : "muted"}>{p.status === "active" ? "启用" : "停用"}</StatusBadge>
                    </td>
                    <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                      <div className="inline-flex items-center gap-2">
                        <button type="button" disabled={busy === p.id} onClick={() => void test(p)} className={linkCls("primary")}>
                          {busy === p.id ? "处理中…" : "测试"}
                        </button>
                        <button type="button" disabled={busy === p.id} onClick={() => void fillBalance(p)} className={linkCls("muted")}>
                          余额
                        </button>
                        <button type="button" onClick={() => begin(p.id, { ...p })} className={linkCls("primary")} aria-label={`编辑 ${p.name}`}>
                          编辑
                        </button>
                        <button type="button" disabled={busy === p.id} onClick={() => void remove(p)} className={linkCls("danger")} aria-label={`删除 ${p.name}`}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
