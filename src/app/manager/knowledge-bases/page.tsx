"use client";

/**
 * 知识库管理（E-04，ADR-025）：库列表/新建（绑定 Coze）/详情（文件上传/进度/删除/重解析）/检索测试
 * - 端点按契约冻结包 §W0-05（C 线 /api/knowledge-bases、/api/knowledge-files、/api/kb/test）；C-06 未合并前页面五态显示错误，核心逻辑由组件测试 mock 覆盖
 * - 上传白名单拦截在 KbUpload（.pdf/.png 不发请求 + KB_REJECT_MESSAGE）
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FlaskConical, PencilLine, RefreshCw, Trash2 } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { FormField } from "@/components/manager/ui/form-field";
import { Input, Select, Switch, Textarea } from "@/components/manager/ui";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { ErrorState, Forbidden, PageSkeleton, btnCls, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge } from "@/components/manager/ui/misc";
import { KbUpload } from "./kb-upload";
import type { KbSearchRequest } from "@/contracts/kb";

type KnowledgeBase = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  cozeDatasetId: string | null;
  isDefault: boolean;
  status: string;
  sort: number;
};

type KnowledgeFile = {
  id: number;
  baseId: number;
  filename: string;
  size: number;
  chunkCount: number | null;
  cozeDocumentId: string | null;
  tags: string | null;
  deletedAt: string | null;
  createdAt: string;
};

type Stats = { baseId: number; files: number; chunks: number; trash: number; cozeOk: number; cozeFailed: number; lastSyncAt: string | null };

type Draft = { name: string; code: string; description: string; cozeDatasetId: string; isDefault: boolean; status: string };

const emptyDraft: Draft = { name: "", code: "", description: "", cozeDatasetId: "", isDefault: false, status: "active" };

export default function KnowledgeBasesPage() {
  const basesQ = useManagerQuery<{ list: KnowledgeBase[] }>("/api/knowledge-bases?limit=50");
  const [selected, setSelected] = useState<KnowledgeBase | null>(null);
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testHits, setTestHits] = useState<{ title: string; snippet?: string }[] | null>(null);

  const filesQ = useManagerQuery<{ list: KnowledgeFile[] }>(selected ? `/api/knowledge-files?baseId=${selected.id}&limit=50` : null);
  const statsQ = useManagerQuery<Stats>(selected ? `/api/knowledge-bases/${selected.id}/stats` : null);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setCreating(true);
    setServerError("");
  }

  function openEdit(base: KnowledgeBase) {
    setCreating(false);
    setEditing(base);
    setDraft({
      name: base.name,
      code: base.code,
      description: base.description ?? "",
      cozeDatasetId: base.cozeDatasetId ?? "",
      isDefault: base.isDefault,
      status: base.status,
    });
    setServerError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setDraft(emptyDraft);
    setServerError("");
  }

  const dirty = editing !== null && JSON.stringify(draft) !== JSON.stringify({
    name: editing.name,
    code: editing.code,
    description: editing.description ?? "",
    cozeDatasetId: editing.cozeDatasetId ?? "",
    isDefault: editing.isDefault,
    status: editing.status,
  });

  async function save() {
    if (saving || (!creating && !editing)) return;
    setSaving(true);
    setServerError("");
    try {
      const payload: Record<string, unknown> = {
        name: draft.name,
        code: draft.code,
        description: draft.description || null,
        cozeDatasetId: draft.cozeDatasetId || null,
        isDefault: draft.isDefault,
        status: draft.status,
      };
      if (creating) {
        await managerFetch("/api/knowledge-bases", { method: "POST", body: JSON.stringify(payload) });
        toast.success(toastCopy.saved, `知识库「${draft.name}」已创建`);
      } else {
        await managerFetch(`/api/knowledge-bases/${editing!.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success(toastCopy.saved, `知识库「${draft.name}」已更新`);
      }
      closeForm();
      void basesQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeBase(base: KnowledgeBase) {
    const ok = await confirmDialog({
      title: "删除知识库？",
      description: `将删除「${base.name}」及其全部文件条目、本地存储与 Coze 远端数据（级联清理），不可恢复。`,
      confirmText: "删除",
      cancelText: "取消",
      danger: true,
    });
    if (!ok) return;
    try {
      await managerFetch(`/api/knowledge-bases/${base.id}`, { method: "DELETE" });
      toast.success("已删除", `「${base.name}」已删除`);
      if (selected?.id === base.id) setSelected(null);
      void basesQ.reload();
    } catch (e) {
      toast.error("删除失败", errorMessage(e));
    }
  }

  async function reparse(file: KnowledgeFile) {
    try {
      await managerFetch(`/api/knowledge-files/${file.id}/reparse`, { method: "POST", body: "{}" });
      toast.success("已提交重解析", file.filename);
      void filesQ.reload();
    } catch (e) {
      toast.error("重解析失败", errorMessage(e));
    }
  }

  async function removeFile(file: KnowledgeFile) {
    const ok = await confirmDialog({
      title: "删除文件？",
      description: `将删除「${file.filename}」的本地条目、磁盘文件并请求 Coze 删除。`,
      confirmText: "删除",
      cancelText: "取消",
      danger: true,
    });
    if (!ok) return;
    try {
      await managerFetch(`/api/knowledge-files/${file.id}`, { method: "DELETE" });
      toast.success("已删除", file.filename);
      void filesQ.reload();
    } catch (e) {
      toast.error("删除失败", errorMessage(e));
    }
  }

  async function runTest() {
    if (!testQuery.trim() || testing) return;
    setTesting(true);
    setTestHits(null);
    try {
      const input: KbSearchRequest = { query: testQuery.trim(), baseIds: selected ? [selected.id] : undefined, topK: 5 };
      const res = await managerFetch<{ hits: { title: string; snippet?: string }[]; source: string }>("/api/kb/test", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setTestHits(res.hits);
      toast.success("检索完成", `命中 ${res.hits.length} 条（${res.source}）`);
    } catch (e) {
      toast.error("检索失败", errorMessage(e));
    } finally {
      setTesting(false);
    }
  }

  const error = basesQ.error;
  if (isForbidden(error)) return <Forbidden message={error.message} />;

  // ── 详情视图 ──
  if (selected) {
    const fileColumns: DataColumn<KnowledgeFile>[] = [
      { key: "filename", label: "文件名", primary: true },
      { key: "size", label: "大小", render: (f) => `${(f.size / 1024).toFixed(1)} KB` },
      { key: "chunkCount", label: "分块", render: (f) => String(f.chunkCount ?? "—") },
      {
        key: "cozeDocumentId",
        label: "Coze",
        render: (f) => (f.cozeDocumentId ? <Badge tone="success" dot>已同步</Badge> : <Badge tone="neutral" dot>未同步</Badge>),
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={`知识库：${selected.name}`}
          description={selected.description ?? selected.code}
          actions={
            <button type="button" onClick={() => setSelected(null)} className={btnCls("secondary")} data-testid="kb-back">
              <ArrowLeft aria-hidden="true" />
              返回库列表
            </button>
          }
        />
        <div className={cardCls}>
          <p className="mb-3 text-sm font-medium">上传文件</p>
          <KbUpload baseId={selected.id} onUploaded={() => void filesQ.reload()} />
        </div>

        {statsQ.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "文件数", value: statsQ.data.files },
              { label: "分块数", value: statsQ.data.chunks },
              { label: "回收站", value: statsQ.data.trash },
              { label: "Coze 成功", value: statsQ.data.cozeOk },
              { label: "Coze 失败", value: statsQ.data.cozeFailed },
            ].map((s) => (
              <div key={s.label} className={cardCls}>
                <p className="text-xs text-mgr-muted-fg">{s.label}</p>
                <p className="text-lg font-semibold" data-testid={`kb-stat-${s.label}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className={cardCls}>
          <p className="mb-3 text-sm font-medium">文件列表</p>
          <DataTable<KnowledgeFile>
            caption="知识库文件"
            rows={filesQ.data?.list ?? []}
            columns={fileColumns}
            rowKey={(f) => String(f.id)}
            loading={filesQ.loading}
            refreshing={filesQ.refreshing}
            error={filesQ.error && !isForbidden(filesQ.error) ? undefined : null}
            onRetry={() => void filesQ.reload()}
            emptyTitle="暂无文件"
            emptyDescription="上传 Word/Markdown/TXT 文件后显示。"
            rowName={(f) => f.filename}
            rowActions={(f) => [
              { key: "reparse", label: "重解析", icon: <RefreshCw aria-hidden="true" />, onClick: () => void reparse(f) },
              { key: "delete", label: "删除", icon: <Trash2 aria-hidden="true" />, tone: "danger", onClick: () => void removeFile(f) },
            ]}
            pagination={undefined}
            data-testid="kb-files-table"
          />
        </div>

        <div className={cardCls}>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
            检索测试
          </p>
          <div className="flex gap-2">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="输入检索问题…"
              data-testid="kb-test-query"
              onKeyDown={(e) => {
                if (e.key === "Enter") void runTest();
              }}
            />
            <button type="button" onClick={() => void runTest()} className={btnCls("primary")} disabled={testing || !testQuery.trim()} data-testid="kb-test-run">
              {testing ? "检索中…" : "检索"}
            </button>
          </div>
          {testHits && (
            <ul className="mt-3 flex flex-col gap-2" data-testid="kb-test-hits">
              {testHits.length === 0 && <li className="text-sm text-mgr-muted-fg">无命中</li>}
              {testHits.map((h, i) => (
                <li key={i} className="rounded-mgr-control border border-mgr-border px-3 py-2 text-sm">
                  <span className="font-medium">{h.title}</span>
                  {h.snippet && <span className="ml-2 text-mgr-muted-fg">{h.snippet}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── 库列表视图 ──
  const columns: DataColumn<KnowledgeBase>[] = [
    { key: "name", label: "名称", primary: true },
    { key: "code", label: "Code" },
    { key: "cozeDatasetId", label: "Coze", render: (b) => (b.cozeDatasetId ? <Badge tone="success" dot>已绑定</Badge> : <Badge tone="neutral" dot>新建同步</Badge>) },
    { key: "isDefault", label: "默认", render: (b) => (b.isDefault ? "是" : "—") },
    { key: "status", label: "状态", render: (b) => (b.status === "active" ? <Badge tone="success" dot>启用</Badge> : <Badge tone="neutral" dot>停用</Badge>) },
  ];

  if (basesQ.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="知识库"
        description="Coze 知识库管理：新建/绑定库、上传 Word/Markdown/TXT、查看同步进度与检索测试。"
        actions={
          <button type="button" onClick={openCreate} className={btnCls("primary")} data-testid="kb-create">
            新建知识库
          </button>
        }
      />
      <div className={cardCls}>
        <DataTable<KnowledgeBase>
          caption="知识库"
          rows={basesQ.data?.list ?? []}
          columns={columns}
          rowKey={(b) => String(b.id)}
          loading={basesQ.loading}
          refreshing={basesQ.refreshing}
          error={null}
          onRetry={() => void basesQ.reload()}
          emptyTitle="暂无知识库"
          emptyDescription="点击「新建知识库」创建（可绑定已有 Coze dataset 或新建并同步）。"
          rowName={(b) => b.name}
          rowActions={(b) => [
            { key: "detail", label: "详情", onClick: () => setSelected(b) },
            { key: "edit", label: "编辑", icon: <PencilLine aria-hidden="true" />, onClick: () => openEdit(b) },
            { key: "delete", label: "删除", icon: <Trash2 aria-hidden="true" />, tone: "danger", onClick: () => void removeBase(b) },
          ]}
          pagination={undefined}
          data-testid="kb-bases-table"
        />
      </div>

      {(creating || editing) && (
        <FormDialog
          open
          title={creating ? "新建知识库" : `编辑知识库：${editing!.name}`}
          description="绑定已有 Coze dataset 留空表示新建并同步到 Coze（需 Coze 凭证）。"
          onClose={closeForm}
          onSubmit={() => void save()}
          saving={saving}
          dirty={creating ? draft !== emptyDraft : dirty}
          serverError={serverError}
        >
          <div className="flex flex-col gap-4">
            <FormField label="名称" required>
              {(a11y) => <Input {...a11y} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />}
            </FormField>
            <FormField label="Code" required help="小写字母/数字/下划线/连字符，如 product-faq">
              {(a11y) => <Input {...a11y} value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} placeholder="product-faq" />}
            </FormField>
            <FormField label="描述">
              {(a11y) => <Textarea {...a11y} rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />}
            </FormField>
            <FormField label="Coze dataset ID" help="留空 = 新建并同步到 Coze（需 Coze 凭证，缺失时标 UNKNOWN）">
              {(a11y) => <Input {...a11y} value={draft.cozeDatasetId} onChange={(e) => setDraft((d) => ({ ...d, cozeDatasetId: e.target.value }))} />}
            </FormField>
            <FormField label="设为默认库" inline>
              {(a11y) => (
                <Switch {...a11y} checked={draft.isDefault} onCheckedChange={(checked) => setDraft((d) => ({ ...d, isDefault: checked }))} />
              )}
            </FormField>
            <FormField label="状态">
              {(a11y) => (
                <Select
                  {...a11y}
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  options={[
                    { label: "启用", value: "active" },
                    { label: "停用", value: "inactive" },
                  ]}
                />
              )}
            </FormField>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
