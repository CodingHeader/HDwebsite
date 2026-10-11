"use client";

/** 模型供应商：列表 + 优先级/默认/兜底 + 连通性测试 + 余额填报 */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm } from "@/components/manager/SchemaForm";
import type { FieldSpec } from "@/components/manager/SchemaForm";

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
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await managerFetch<ListData>(`/api/llm/providers?page=${page}&limit=20`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据加载发生在 await 之后，属外部系统订阅
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    setSavingGuard();
    try {
      const body = { ...editing };
      if (typeof body.balanceThreshold === "string") body.balanceThreshold = body.balanceThreshold === "" ? null : Number(body.balanceThreshold);
      if (typeof body.temperature === "string") body.temperature = Number(body.temperature);
      if (typeof body.maxTokens === "string") body.maxTokens = Number(body.maxTokens);
      if (typeof body.priority === "string") body.priority = Number(body.priority);
      if (editingId) {
        await managerFetch(`/api/llm/providers/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/llm/providers", { method: "POST", body: JSON.stringify(body) });
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setTesting(null);
    }
  }

  function setSavingGuard() {
    /* 占位：保存态由 testing 复用展示 */
  }

  async function test(p: Provider) {
    setTesting(p.id);
    setNotice("");
    setError("");
    try {
      const res = await managerFetch<{ ok: boolean; latencyMs: number; reply?: string; errMsg?: string }>(
        `/api/llm/providers/${p.id}/test`,
        { method: "POST", body: "{}" }
      );
      setNotice(res.ok ? `「${p.name}」连通正常（${res.latencyMs}ms）：${res.reply ?? ""}` : `「${p.name}」测试失败：${res.errMsg ?? "未知错误"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "测试失败");
    } finally {
      setTesting(null);
    }
  }

  async function fillBalance(p: Provider) {
    const raw = window.prompt(`填报「${p.name}」当前余额（${p.balance ?? "暂无"}）：`, p.balance != null ? String(p.balance) : "");
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setError("余额必须是 ≥0 的数字");
      return;
    }
    try {
      await managerFetch(`/api/llm/providers/${p.id}/balance`, {
        method: "POST",
        body: JSON.stringify({ balance: value }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "填报失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">模型供应商</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setEditing({ kind: "openai", endpoint: "https://api.coze.cn", temperature: 0.7, maxTokens: 2048, priority: 10, status: "active", isDefault: false, isFallback: false });
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          新建
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">路由规则：默认模型 → 失败按优先级升序 → 全败走兜底模型。类型说明见 ADR-023（Coze）与 SOL-003。</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">模型/bot</th>
              <th className="px-4 py-3">优先级</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">余额</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.kind === "coze" ? "Coze" : "OpenAI 兼容"}</td>
                <td className="px-4 py-3">{p.kind === "coze" ? `bot ${p.botId ?? "—"}` : p.model}</td>
                <td className="px-4 py-3">{p.priority}</td>
                <td className="px-4 py-3">
                  {p.isDefault && <span className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">默认</span>}
                  {p.isFallback && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">兜底</span>}
                </td>
                <td className="px-4 py-3">
                  {p.balance != null ? `${p.balance}${p.balanceThreshold != null && p.balance <= p.balanceThreshold ? " ⚠" : ""}` : "未填报"}
                </td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button onClick={() => test(p)} className="text-primary hover:underline">{testing === p.id ? "测试中…" : "测试"}</button>
                  <button onClick={() => fillBalance(p)} className="ml-3 text-muted hover:underline">余额</button>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditing({ ...p });
                    }}
                    className="ml-3 hover:underline"
                  >
                    编辑
                  </button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">尚未配置模型供应商，点右上角新建。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editingId ? "编辑供应商" : "新建供应商"}</h2>
            <div><SchemaForm fields={FIELDS} values={editing} onChange={setEditing} /><div className="mt-6 flex justify-end gap-3"><button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">取消</button><button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">保存</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}

