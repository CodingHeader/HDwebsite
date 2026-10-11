"use client";

/** 公众号账号：列表 + 凭证加密 + access_token 测试（凭证后补即插桩，ADR-002/013） */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm } from "@/components/manager/SchemaForm";
import type { FieldSpec } from "@/components/manager/SchemaForm";
import type { FormValues } from "@/components/manager/SchemaForm";

type Account = {
  id: number; name: string; type: string; appid: string; appSecret: string;
  aiEnabled: boolean; freepublishEnabled: boolean; status: string; tokenCache: string | null;
  scene?: { id: number; name: string } | null;
};
type ListData = { list: Account[]; pagination: { page: number; totalPages: number } };

const FIELDS: FieldSpec[] = [
  { key: "name", label: "账号名称", required: true },
  {
    key: "type", label: "类型", type: "select" as const, required: true,
    options: [{ label: "服务号（认证）", value: "service" }, { label: "订阅号（功能受限）", value: "subscription" }],
  },
  { key: "appid", label: "AppID", required: true },
  { key: "appSecret", label: "AppSecret（保存后脱敏；留****不改）", required: true },
  { key: "verifyToken", label: "服务器校验 Token" },
  { key: "encodingAESKey", label: "EncodingAESKey（明文模式可空）" },
  { key: "sceneId", label: "AI 客服场景 ID（如 faq 的 id）", type: "number" },
  { key: "aiEnabled", label: "启用 AI 客服", type: "switch" },
  { key: "freepublishEnabled", label: "启用发布接口", type: "switch" },
];

export default function ManagerWechatAccountsPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await managerFetch<ListData>(`/api/wechat/accounts?page=${page}&limit=20`));
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
    setError("");
    try {
      const body: Record<string, unknown> = { ...editing };
      if (typeof body.sceneId === "string") body.sceneId = body.sceneId === "" ? null : Number(body.sceneId);
      if (editingId) {
        await managerFetch(`/api/wechat/accounts/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/wechat/accounts", { method: "POST", body: JSON.stringify(body) });
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function test(a: Account) {
    setNotice("");
    setError("");
    try {
      const res = await managerFetch<{ ok: boolean; message: string }>(`/api/wechat/accounts/${a.id}/test`, { method: "POST", body: "{}" });
      setNotice(`「${a.name}」${res.message}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "测试失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">公众号账号</h1>
        <button onClick={() => { setEditingId(null); setEditing({ type: "service", aiEnabled: true, freepublishEnabled: true }); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          新建
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">凭证后补即插桩（ADR-002）：未配置/失效时测试会明确报错；回调地址 <code>/api/wechat/callback</code>，启用前需在公众平台完成服务器配置与 IP 白名单。</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">AppID</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">AI 客服</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{a.name}</td>
                <td className="px-4 py-3">{a.appid}</td>
                <td className="px-4 py-3">{a.type === "service" ? "服务号" : "订阅号"}</td>
                <td className="px-4 py-3">{a.aiEnabled ? "开" : "关"}</td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button onClick={() => test(a)} className="text-primary hover:underline">测试</button>
                  <button onClick={() => { setEditingId(a.id); setEditing({ ...a, appSecret: a.appSecret.includes("****") || a.appSecret.startsWith("v1:") ? "" : a.appSecret } as FormValues); }} className="ml-3 hover:underline">
                    编辑
                  </button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">尚未配置公众号账号。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editingId ? "编辑账号" : "新建账号"}</h2>
            <div className="mt-4">
              <SchemaForm fields={FIELDS.map((f) => (f.key === "appSecret" && editingId ? { ...f, required: false } : f))} values={editing} onChange={setEditing} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
