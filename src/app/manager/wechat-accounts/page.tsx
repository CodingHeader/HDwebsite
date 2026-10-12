"use client";

/**
 * 公众号账号：列表 + 凭证加密 + access_token 测试 + 新建/编辑/删除（凭证后补即插桩，ADR-002/013）
 * P05：五态接入；AI 场景改为下拉；删除走 ConfirmDialog（补齐 CRUD 的 D）；测试结果 Toast。
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
import { Forbidden, TableState, btnCls, confirmDialog, linkCls, toast, useManagerQuery } from "@/components/manager/feedback";

type Account = {
  id: number; name: string; type: string; appid: string; appSecret: string;
  aiEnabled: boolean; freepublishEnabled: boolean; status: string; tokenCache: string | null;
  scene?: { id: number; name: string } | null;
};
type ListData = { list: Account[]; pagination: { page: number; totalPages: number } };

export default function ManagerWechatAccountsPage() {
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(`/api/wechat/accounts?page=1&limit=50`);
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [initial, setInitial] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [scenes, setScenes] = useState<{ label: string; value: number }[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const fields: FieldSpec[] = [
    { key: "name", label: "账号名称", required: true },
    {
      key: "type", label: "类型", type: "select" as const, required: true,
      options: [{ label: "服务号（认证）", value: "service" }, { label: "订阅号（功能受限）", value: "subscription" }],
    },
    { key: "appid", label: "AppID", required: true },
    { key: "appSecret", label: editingId ? "AppSecret（留空则不修改）" : "AppSecret（保存后加密脱敏）", required: !editingId },
    { key: "verifyToken", label: "服务器校验 Token" },
    { key: "encodingAESKey", label: "EncodingAESKey（明文模式可空）" },
    { key: "sceneId", label: "AI 客服场景", type: "select", options: scenes },
    { key: "aiEnabled", label: "启用 AI 客服", type: "switch" },
    { key: "freepublishEnabled", label: "启用发布接口", type: "switch" },
  ];

  async function begin(id: number | null, values: FormValues) {
    setEditingId(id);
    setEditing(values);
    setInitial(JSON.stringify(values));
    setFieldErrors({});
    setServerError("");
    try {
      const res = await managerFetch<{ list: { id: number; name: string; code: string }[] }>("/api/chat-scenes?limit=100");
      setScenes(res.list.map((s) => ({ label: `${s.name}（${s.code}）`, value: s.id })));
    } catch {
      setScenes([]);
    }
  }

  async function save() {
    if (!editing) return;
    const errs = validateRequired(fields, editing);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setServerError("");
    try {
      const body: Record<string, unknown> = { ...editing };
      if (body.sceneId === "" || body.sceneId === undefined) body.sceneId = null;
      else if (typeof body.sceneId === "string") body.sceneId = Number(body.sceneId);
      if (editingId) {
        await managerFetch(`/api/wechat/accounts/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/wechat/accounts", { method: "POST", body: JSON.stringify(body) });
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

  async function test(a: Account) {
    setBusy(a.id);
    try {
      const res = await managerFetch<{ ok: boolean; message: string }>(`/api/wechat/accounts/${a.id}/test`, { method: "POST", body: "{}" });
      if (res.ok) toast.success(`「${a.name}」连通正常`, res.message);
      else toast.error(`「${a.name}」测试失败`, res.message);
    } catch (e) {
      toast.fromError(e, "测试失败");
    } finally {
      setBusy(null);
    }
  }

  async function remove(a: Account) {
    const ok = await confirmDialog({
      title: `删除公众号「${a.name}」？`,
      description: "删除后该公众号的 AI 客服与发布任务将停止工作，凭证不可恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setBusy(a.id);
    try {
      await managerFetch(`/api/wechat/accounts/${a.id}`, { method: "DELETE" });
      toast.success(toastCopy.deleted, a.name);
      void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setBusy(null);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];
  const create = () => void begin(null, { name: "", type: "service", appid: "", appSecret: "", sceneId: null, aiEnabled: true, freepublishEnabled: true });

  return (
    <div>
      <PageHeader
        title="公众号账号"
        description={
          <>
            未配置或失效时测试会明确报错；回调地址 <code className="rounded bg-mgr-subtle px-1">/api/wechat/callback</code>，启用前需在公众平台完成服务器配置与 IP 白名单。
          </>
        }
        actions={
          <button type="button" onClick={create} className={btnCls("primary")}>
            <Plus aria-hidden="true" />
            新建账号
          </button>
        }
      />
      <div className={tableCls.wrap} aria-busy={loading || refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>名称</th>
              <th scope="col" className={tableCls.th}>AppID</th>
              <th scope="col" className={tableCls.th}>类型</th>
              <th scope="col" className={tableCls.th}>AI 客服</th>
              <th scope="col" className={tableCls.th}>状态</th>
              <th scope="col" className={`${tableCls.th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              columns={6}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle="尚未配置公众号账号"
              emptyDescription="添加服务号后即可启用公众号 AI 客服与文章发布。"
              emptyAction={
                <button type="button" onClick={create} className={btnCls("primary")}>
                  <Plus aria-hidden="true" />
                  新建账号
                </button>
              }
            />
            {!error &&
              list.map((a) => (
                <tr key={a.id} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                  <td className={`${tableCls.td} font-medium`}>{a.name}</td>
                  <td className={`${tableCls.td} font-mono text-[12px]`}>{a.appid}</td>
                  <td className={tableCls.td}>{a.type === "service" ? "服务号" : "订阅号"}</td>
                  <td className={tableCls.td}>
                    <StatusBadge tone={a.aiEnabled ? "success" : "muted"}>{a.aiEnabled ? `开${a.scene ? ` · ${a.scene.name}` : ""}` : "关"}</StatusBadge>
                  </td>
                  <td className={tableCls.td}>
                    <StatusBadge tone={a.status === "active" ? "success" : "muted"}>{a.status === "active" ? "启用" : a.status}</StatusBadge>
                  </td>
                  <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                    <div className="inline-flex items-center gap-2">
                      <button type="button" disabled={busy === a.id} onClick={() => void test(a)} className={linkCls("primary")}>
                        {busy === a.id ? "处理中…" : "测试"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void begin(a.id, {
                            ...a,
                            sceneId: a.scene?.id ?? null,
                            appSecret: a.appSecret.includes("****") || a.appSecret.startsWith("v1:") ? "" : a.appSecret,
                          } as FormValues)
                        }
                        className={linkCls("primary")}
                      >
                        编辑
                      </button>
                      <button type="button" disabled={busy === a.id} onClick={() => void remove(a)} className={linkCls("danger")}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <FormDialog
        open={editing !== null}
        title={editingId ? "编辑公众号账号" : "新建公众号账号"}
        onClose={() => setEditing(null)}
        onSubmit={save}
        saving={saving}
        dirty={editing !== null && JSON.stringify(editing) !== initial}
        serverError={serverError}
      >
        {editing && (
          <SchemaForm
            fields={fields}
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
