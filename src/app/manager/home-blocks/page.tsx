"use client";

/**
 * 首页区块配置（E-03，ADR-024）：home 模板的 TemplateBlock 管理
 * - 列表按注册表默认顺序展示；启用判定 ContentBlock.status + TemplateBlock.config.enabled（block-registry.ts）
 * - 编辑：启停开关 + 按 block-defs fields（registry 端点下发）编辑覆盖配置
 * - 排序：上移/下移按钮（键盘可替代的拖拽）；新增：注册表中尚未加入首页的区块
 * - 恢复默认：POST /api/home-blocks/reset（破坏性操作，二次确认）= main 原样
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, PencilLine, Plus, RotateCcw } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { FormField } from "@/components/manager/ui/form-field";
import { Button, Input, Switch, Textarea } from "@/components/manager/ui";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { ErrorState, Forbidden, PageSkeleton, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge } from "@/components/manager/ui/misc";

type RegistryField = { key: string; label: string; type: string };
type RegistryItem = { code: string; name: string; defaultOrder: number; fields: RegistryField[] };
type TemplateBlockRow = {
  id: number;
  templateId: number;
  blockId: number;
  sort: number;
  config: string | null;
  block: { id: number; code: string; name: string; status: string };
};
type TemplateRow = { id: number; code: string; name: string };
type ContentBlockRow = { id: number; code: string; name: string; type: string };

type Draft = { enabled: boolean; fields: Record<string, string>; sort: number };

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default function HomeBlocksPage() {
  const registryQ = useManagerQuery<{ data: RegistryItem[] }>("/api/home-blocks/registry");
  const templatesQ = useManagerQuery<{ list: TemplateRow[] }>("/api/page-templates");
  const blocksQ = useManagerQuery<{ list: ContentBlockRow[] }>("/api/content-blocks?limit=50");

  const homeId = useMemo(() => templatesQ.data?.list.find((t) => t.code === "home")?.id ?? null, [templatesQ.data]);
  const tbQ = useManagerQuery<TemplateBlockRow[] | { list: TemplateBlockRow[] }>(homeId ? `/api/template-blocks?templateId=${homeId}&limit=50` : null);

  const [editing, setEditing] = useState<TemplateBlockRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const registry = useMemo(() => registryQ.data?.data ?? [], [registryQ.data]);
  const tbs = useMemo(() => {
    const raw = tbQ.data;
    const list = Array.isArray(raw) ? raw : raw?.list ?? [];
    return [...list].sort((a, b) => a.sort - b.sort || a.id - b.id);
  }, [tbQ.data]);

  const fieldsOf = (code: string): RegistryField[] => registry.find((r) => r.code === code)?.fields ?? [];
  const nameOf = (code: string): string => registry.find((r) => r.code === code)?.name ?? code;

  function openEdit(tb: TemplateBlockRow) {
    const config = parseJsonObject(tb.config);
    const d: Draft = {
      enabled: config.enabled !== false,
      sort: tb.sort,
      fields: Object.fromEntries(fieldsOf(tb.block.code).map((f) => [f.key, config[f.key] == null ? "" : String(config[f.key])])),
    };
    setEditing(tb);
    setDraft(d);
    setBaseline(d);
    setServerError("");
  }

  function closeEdit() {
    setEditing(null);
    setDraft(null);
    setBaseline(null);
    setServerError("");
  }

  const dirty = editing !== null && draft !== null && baseline !== null && JSON.stringify(draft) !== JSON.stringify(baseline);

  async function save() {
    if (!editing || !draft || saving) return;
    setSaving(true);
    setServerError("");
    try {
      const config: Record<string, unknown> = { enabled: draft.enabled };
      for (const [k, v] of Object.entries(draft.fields)) {
        if (v !== "") config[k] = v;
      }
      await managerFetch(`/api/template-blocks/${editing.id}`, { method: "PUT", body: JSON.stringify({ config: JSON.stringify(config), sort: draft.sort }) });
      toast.success(toastCopy.saved, `「${nameOf(editing.block.code)}」区块已更新`);
      closeEdit();
      void tbQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function move(tb: TemplateBlockRow, dir: -1 | 1) {
    const idx = tbs.findIndex((t) => t.id === tb.id);
    const neighbor = tbs[idx + dir];
    if (!neighbor) return;
    try {
      await managerFetch(`/api/template-blocks/${tb.id}`, { method: "PUT", body: JSON.stringify({ sort: neighbor.sort }) });
      await managerFetch(`/api/template-blocks/${neighbor.id}`, { method: "PUT", body: JSON.stringify({ sort: tb.sort }) });
      toast.success("排序已更新", `「${nameOf(tb.block.code)}」${dir === -1 ? "上移" : "下移"}成功`);
      void tbQ.reload();
    } catch (e) {
      toast.error("排序失败", errorMessage(e));
    }
  }

  async function addBlock(item: RegistryItem) {
    if (!homeId) return;
    const block = blocksQ.data?.list.find((b) => b.code === item.code);
    if (!block) {
      toast.error("无法新增", "内容块不存在，请先运行 prisma/seed.ts");
      return;
    }
    const maxSort = tbs.length > 0 ? Math.max(...tbs.map((t) => t.sort)) : 0;
    try {
      await managerFetch("/api/template-blocks", { method: "POST", body: JSON.stringify({ templateId: homeId, blockId: block.id, sort: maxSort + 10, config: JSON.stringify({ enabled: true }) }) });
      toast.success("已加入首页", `「${item.name}」已添加到末位`);
      void tbQ.reload();
    } catch (e) {
      toast.error("新增失败", errorMessage(e));
    }
  }

  async function resetDefaults() {
    const ok = await confirmDialog({
      title: "恢复默认区块配置？",
      description: "将删除当前首页全部区块排序与覆盖配置，按 main 原样默认顺序重建（全部启用）。前台立即回默认外观。",
      confirmText: "恢复默认",
      cancelText: "取消",
      danger: true,
    });
    if (!ok) return;
    try {
      await managerFetch("/api/home-blocks/reset", { method: "POST", body: JSON.stringify({ templateCode: "home", confirm: true }) });
      toast.success("已恢复默认", "首页区块已回 main 原样");
      void tbQ.reload();
    } catch (e) {
      toast.error("恢复默认失败", errorMessage(e));
    }
  }

  const error = registryQ.error ?? templatesQ.error ?? tbQ.error;
  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const addedCodes = new Set(tbs.map((t) => t.block.code));
  const addable = registry.filter((r) => !addedCodes.has(r.code));

  const columns: DataColumn<TemplateBlockRow>[] = [
    {
      key: "name",
      label: "区块",
      primary: true,
      render: (tb) => (
        <span className="inline-flex flex-col">
          <span className="font-medium">{nameOf(tb.block.code)}</span>
          <span className="text-xs text-mgr-muted">{tb.block.code}</span>
        </span>
      ),
    },
    { key: "sort", label: "顺序", render: (tb) => String(tb.sort) },
    {
      key: "enabled",
      label: "启用",
      render: (tb) => {
        const disabled = parseJsonObject(tb.config).enabled === false;
        return tb.block.status === "active" && !disabled ? (
          <Badge tone="success" dot>启用</Badge>
        ) : (
          <Badge tone="neutral" dot>{tb.block.status !== "active" ? "区块停用" : "已隐藏"}</Badge>
        );
      },
    },
    {
      key: "config",
      label: "覆盖配置",
      hideOnMobile: true,
      render: (tb) => {
        const { enabled: _e, ...rest } = parseJsonObject(tb.config);
        const keys = Object.keys(rest);
        return keys.length > 0 ? keys.join(", ") : "—";
      },
    },
  ];

  if (registryQ.loading || templatesQ.loading || (homeId !== null && tbQ.loading)) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="首页区块"
        description="首页区块的顺序、启用与覆盖配置（ADR-024）；顺序决定前台渲染，恢复默认回 main 原样。"
        actions={
          <Button type="button" variant="danger" onClick={() => void resetDefaults()} data-testid="home-blocks-reset">
            <RotateCcw aria-hidden="true" />
            恢复默认
          </Button>
        }
      />
      {error && !isForbidden(error) && <ErrorState message={error.message} onRetry={() => void tbQ.reload()} />}
      <div className={cardCls}>
        <DataTable<TemplateBlockRow>
          caption="首页区块"
          rows={tbs}
          columns={columns}
          rowKey={(tb) => String(tb.id)}
          loading={tbQ.loading}
          refreshing={tbQ.refreshing}
          onRetry={() => void tbQ.reload()}
          emptyTitle="首页暂无区块"
          emptyDescription="点击「恢复默认」按 main 原样重建，或从注册表新增区块。"
          rowName={(tb) => nameOf(tb.block.code)}
          rowActions={(tb) => [
            { key: "up", label: "上移", icon: <ArrowUp aria-hidden="true" />, onClick: () => void move(tb, -1), disabled: tbs[0]?.id === tb.id },
            { key: "down", label: "下移", icon: <ArrowDown aria-hidden="true" />, onClick: () => void move(tb, 1), disabled: tbs[tbs.length - 1]?.id === tb.id },
            { key: "edit", label: "编辑", icon: <PencilLine aria-hidden="true" />, onClick: () => openEdit(tb) },
          ]}
          pagination={undefined}
          data-testid="home-blocks-table"
        />
      </div>

      {addable.length > 0 && (
        <div className={cardCls}>
          <p className="mb-2 text-sm font-medium">注册表中未加入首页的区块</p>
          <div className="flex flex-wrap gap-2">
            {addable.map((item) => (
              <Button key={item.code} type="button" variant="ghost" onClick={() => void addBlock(item)} data-testid={`home-blocks-add-${item.code}`}>
                <Plus aria-hidden="true" />
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {editing && draft && (
        <FormDialog
          open
          title={`编辑区块：${nameOf(editing.block.code)}`}
          description="启停立即影响前台渲染；覆盖字段留空使用默认值。"
          onClose={closeEdit}
          onSubmit={() => void save()}
          saving={saving}
          dirty={dirty}
          serverError={serverError}
        >
          <div className="flex flex-col gap-4">
            <FormField label="启用" inline>
              {(a11y) => (
                <span className="flex items-center gap-2">
                  <Switch
                    {...a11y}
                    checked={draft.enabled}
                    onCheckedChange={(checked) => setDraft((d) => (d ? { ...d, enabled: checked } : d))}
                    data-testid="home-block-enabled"
                  />
                  <span className="text-sm text-mgr-muted">{draft.enabled ? "前台渲染该区块" : "隐藏后前台不渲染该 data-block"}</span>
                </span>
              )}
            </FormField>

            <FormField label="顺序（sort）" help="数值越小越靠前；也可用列表中的上移/下移按钮">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  min={0}
                  value={String(draft.sort)}
                  onChange={(e) => setDraft((d) => (d ? { ...d, sort: Number(e.target.value) } : d))}
                />
              )}
            </FormField>

            {fieldsOf(editing.block.code).map((f) => (
              <FormField key={f.key} label={f.label} help={f.type === "json" ? "JSON 格式" : undefined}>
                {(a11y) =>
                  f.type === "textarea" || f.type === "json" ? (
                    <Textarea
                      {...a11y}
                      rows={f.type === "json" ? 4 : 3}
                      value={draft.fields[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => (d ? { ...d, fields: { ...d.fields, [f.key]: e.target.value } } : d))}
                    />
                  ) : (
                    <Input
                      {...a11y}
                      type={f.type === "number" ? "number" : "text"}
                      value={draft.fields[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => (d ? { ...d, fields: { ...d.fields, [f.key]: e.target.value } } : d))}
                    />
                  )
                }
              </FormField>
            ))}
          </div>
        </FormDialog>
      )}
    </div>
  );
}
