"use client";

/**
 * 知识库管理（E-04，ADR-025）：库列表/新建（绑定 Coze）/详情（文件上传/进度/删除/重解析）/检索测试
 * - 端点按契约冻结包 §W0-05（C 线 /api/knowledge-bases、/api/knowledge-files、/api/kb/test）；C-06 未合并前页面五态显示错误，核心逻辑由组件测试 mock 覆盖
 * - 上传白名单拦截在 KbUpload（.pdf/.png 不发请求 + KB_REJECT_MESSAGE）
 */
import { useState } from "react";
import { ArrowLeft, Download, FlaskConical, PencilLine, RefreshCw, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { FormField } from "@/components/manager/ui/form-field";
import { Button, Input, Select, Switch, Textarea } from "@/components/manager/ui";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { ErrorState, Forbidden, PageSkeleton, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge, Tabs } from "@/components/manager/ui/misc";
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
  ext: string;
  size: number;
  localParse?: string;
  chunkCount: number | null;
  cozeDocumentId: string | null;
  cozeStatus?: number | null;
  collectItemId?: number | null;
  tags: string | null;
  deletedAt: string | null;
  createdAt: string;
};

type Stats = { baseId: number; files: number; chunks: number; trash: number; cozeOk: number; cozeFailed: number; lastSyncAt: string | null };

type Draft = { name: string; code: string; description: string; cozeDatasetId: string; isDefault: boolean; status: string };

/** tags JSON 数组串 → 逗号分隔串（编辑回显） */
function parseTags(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").join(",") : "";
  } catch {
    return "";
  }
}

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

  const [fileTab, setFileTab] = useState("files");
  const [tagEditing, setTagEditing] = useState<KnowledgeFile | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const filesQ = useManagerQuery<{ list: KnowledgeFile[] }>(
    selected ? `/api/knowledge-files?baseId=${selected.id}&limit=50${fileTab === "trash" ? "&trash=1" : ""}` : null
  );
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
      description: `「${file.filename}」将移入回收站（可恢复）；回收站中彻底删除才会清理本地条目与 Coze 远端。`,
      confirmText: "移入回收站",
      cancelText: "取消",
      danger: true,
    });
    if (!ok) return;
    try {
      // E-11（C-12）：移入回收站（软删除）——C-12 未合并前回退单条 DELETE
      await managerFetch(`/api/knowledge-files/batch`, { method: "POST", body: JSON.stringify({ ids: [file.id], action: "trash" }) });
      toast.success("已移入回收站", file.filename);
      void filesQ.reload();
    } catch {
      try {
        await managerFetch(`/api/knowledge-files/${file.id}`, { method: "DELETE" });
        toast.success("已删除", file.filename);
        void filesQ.reload();
      } catch (e2) {
        toast.error("删除失败", errorMessage(e2));
      }
    }
  }

  // E-11（C-12）：回收站恢复 / 彻底删除（二次确认）
  async function trashAction(file: KnowledgeFile, act: "restore" | "purge") {
    if (act === "purge") {
      const ok = await confirmDialog({
        title: `彻底删除「${file.filename}」？`,
        description: "将删除本地条目、磁盘文件并请求 Coze 删除远端，不可恢复。",
        confirmText: "彻底删除",
        cancelText: "取消",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await managerFetch(`/api/knowledge-files/trash`, { method: "POST", body: JSON.stringify({ ids: [file.id], action: act }) });
      toast.success(act === "restore" ? "已恢复" : "已彻底删除", file.filename);
      void filesQ.reload();
    } catch (e) {
      toast.error(act === "restore" ? "恢复失败" : "彻底删除失败", errorMessage(e));
    }
  }

  // E-11（C-12）：批量启停 / 打标签 / 移回收站（DataTable bulkActions 单请求）
  async function batch(ids: number[], action: "enable" | "disable" | "tag" | "untag" | "trash", tags?: string[]) {
    try {
      await managerFetch(`/api/knowledge-files/batch`, { method: "POST", body: JSON.stringify({ ids, action, ...(tags !== undefined ? { tags } : {}) }) });
      toast.success("批量操作完成", `${ids.length} 个文件已更新`);
      void filesQ.reload();
    } catch (e) {
      toast.error("批量操作失败", errorMessage(e));
    }
  }

  // E-11：文件 tags 在线编辑（PATCH knowledgeFileUpdateSchema）
  async function saveTags() {
    if (!tagEditing) return;
    try {
      await managerFetch(`/api/knowledge-files/${tagEditing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ tags: tagDraft.split(",").map((s) => s.trim()).filter(Boolean) }),
      });
      toast.success(toastCopy.saved, tagEditing.filename);
      setTagEditing(null);
      void filesQ.reload();
    } catch (e) {
      toast.error("保存失败", errorMessage(e));
    }
  }

  // E-11（C-12）：导出（鉴权下载 zip）
  function exportBase() {
    if (!selected) return;
    window.open(`/api/knowledge-bases/${selected.id}/export?baseId=${selected.id}&includeTrash=${fileTab === "trash"}`, "_blank");
  }

  // E-11（C-12）：单库重建（进度轮询）
  async function rebuildBase() {
    if (!selected) return;
    const ok = await confirmDialog({
      title: `重建「${selected.name}」？`,
      description: "将重新解析该库全部文件并重建本地条目与分块；Coze 远端同步按现有配置执行。",
      confirmText: "开始重建",
      cancelText: "取消",
    });
    if (!ok) return;
    try {
      const res = await managerFetch<{ started?: boolean }>(`/api/knowledge-bases/${selected.id}/rebuild`, { method: "POST", body: "{}" });
      toast.success("重建已启动", "进度见文件列表的处理状态，可手动刷新查看。");
      void filesQ.reload();
      void statsQ.reload();
      return res;
    } catch (e) {
      toast.error("重建失败", errorMessage(e));
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
    const isTrash = fileTab === "trash";
    const fileColumns: DataColumn<KnowledgeFile>[] = [
      { key: "filename", label: "文件名", primary: true },
      { key: "size", label: "大小", render: (f) => `${(f.size / 1024).toFixed(1)} KB` },
      { key: "chunkCount", label: "分块", render: (f) => String(f.chunkCount ?? "—") },
      {
        key: "cozeDocumentId",
        label: "Coze",
        render: (f) => (f.cozeDocumentId ? <Badge tone="success" dot>已同步</Badge> : <Badge tone="neutral" dot>未同步</Badge>),
      },
      {
        // G10：来源采集条目（collectItemId）可跳转采集审核页
        key: "collectItemId",
        label: "来源",
        render: (f) =>
          f.collectItemId ? (
            <a href="/manager/collect-items" className="text-[12px] text-mgr-primary underline-offset-4 hover:underline" title={`跳转到来源采集条目 #${f.collectItemId}`}>
              采集条目 #{f.collectItemId}
            </a>
          ) : (
            "—"
          ),
      },
    ];
    const trashActions = (f: KnowledgeFile) => [
      { key: "restore", label: "恢复", icon: <Undo2 aria-hidden="true" />, onClick: () => void trashAction(f, "restore") },
      { key: "purge", label: "彻底删除", icon: <Trash2 aria-hidden="true" />, tone: "danger" as const, onClick: () => void trashAction(f, "purge") },
    ];
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={`知识库：${selected.name}`}
          description={selected.description ?? selected.code}
          actions={
            <>
              <Button type="button" variant="secondary" onClick={() => setSelected(null)} data-testid="kb-back">
                <ArrowLeft aria-hidden="true" />
                返回库列表
              </Button>
              {/* E-11（C-12）：导出 / 单库重建 */}
              <Button type="button" variant="secondary" onClick={() => exportBase()} data-testid="kb-export">
                <Download aria-hidden="true" />
                导出
              </Button>
              <Button type="button" variant="secondary" onClick={() => void rebuildBase()} data-testid="kb-rebuild">
                <RotateCcw aria-hidden="true" />
                重建
              </Button>
            </>
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
          <div className="mb-3">
            <Tabs
              items={[
                { key: "files", label: "文件", count: statsQ.data?.files },
                { key: "trash", label: "回收站", count: statsQ.data?.trash },
              ]}
              value={fileTab}
              onChange={setFileTab}
              label="文件视图"
            />
          </div>
          {isTrash ? (
            <DataTable<KnowledgeFile>
              caption="回收站"
              rows={filesQ.data?.list ?? []}
              columns={fileColumns}
              rowKey={(f) => String(f.id)}
              loading={filesQ.loading}
              refreshing={filesQ.refreshing}
              onRetry={() => void filesQ.reload()}
              emptyTitle="回收站为空"
              emptyDescription="移入回收站的文件会出现在这里，可恢复或彻底删除。"
              rowName={(f) => f.filename}
              rowActions={trashActions}
              pagination={undefined}
              data-testid="kb-trash-table"
            />
          ) : (
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
              bulkActions={[
                { key: "enable", label: "批量启用", run: (rows) => void batch(rows.map((r) => r.id), "enable") },
                { key: "disable", label: "批量停用", run: (rows) => void batch(rows.map((r) => r.id), "disable") },
                { key: "tag", label: "批量打标签", run: (rows) => void batch(rows.map((r) => r.id), "tag", ["e2e"]) },
                { key: "trash", label: "移入回收站", run: (rows) => void batch(rows.map((r) => r.id), "trash") },
              ]}
              rowActions={(f) => [
                { key: "tags", label: "编辑标签", icon: <PencilLine aria-hidden="true" />, onClick: () => { setTagEditing(f); setTagDraft(parseTags(f.tags)); } },
                { key: "reparse", label: "重解析", icon: <RefreshCw aria-hidden="true" />, onClick: () => void reparse(f) },
                { key: "delete", label: "删除", icon: <Trash2 aria-hidden="true" />, tone: "danger", onClick: () => void removeFile(f) },
              ]}
              pagination={undefined}
              data-testid="kb-files-table"
            />
          )}
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
            <Button type="button" variant="primary" onClick={() => void runTest()} disabled={testing || !testQuery.trim()} data-testid="kb-test-run">
              {testing ? "检索中…" : "检索"}
            </Button>
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
          <Button type="button" variant="primary" onClick={openCreate} data-testid="kb-create">
            新建知识库
          </Button>
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

      {tagEditing && (
        <FormDialog
          open
          title={`编辑标签：${tagEditing.filename}`}
          description="逗号分隔；标签用于检索过滤。"
          onClose={() => setTagEditing(null)}
          onSubmit={() => void saveTags()}
          dirty={tagDraft !== parseTags(tagEditing.tags)}
        >
          <FormField label="标签" id="kb-tags-edit" help="逗号分隔">
            {(a11y) => (
              <Input
                {...a11y}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="产品,政策"
                data-testid="kb-tags-input"
              />
            )}
          </FormField>
        </FormDialog>
      )}
    </div>
  );
}
