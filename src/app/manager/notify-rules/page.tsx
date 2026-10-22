"use client";

/**
 * 通知规则（E-02）：7 类事件规则（事件唯一，不提供创建/删除）
 * - 列表：DataTable 展示事件/启用/模板/收件人分组/静默时段
 * - 编辑：FormDialog 启用开关 + 模板下拉 + 收件人分组（逗号分隔 tags，与 notify-recipients 约定一致）+ 静默时段（HH:mm，跨零点允许）
 * - 保存 PATCH /api/notify-rules/[id] 后 refresh() 回读
 * - quietHours 契约（CCR-1）：start/end 均 0..23:0..59；规则级优先于全局 notifyQuietHours（B-06 生效逻辑）
 */
import { useMemo, useState } from "react";
import { BellOff, BellRing, PencilLine } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { FormDialog } from "@/components/manager/FormDialog";
import { FormField, Label } from "@/components/manager/ui/form-field";
import { Button, Input, Select, Switch } from "@/components/manager/ui";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { Forbidden, cardCls, toast, useManagerQuery } from "@/components/manager/feedback";
import { Badge } from "@/components/manager/ui/misc";

type Rule = {
  id: number;
  event: string;
  enabled: boolean;
  templateId: number | null;
  template: { id: number; subject: string } | null;
  recipientGroups: string;
  quietHours: string | null;
  updatedAt: string;
};

type Template = { id: number; subject: string };

const EVENT_LABELS: Record<string, string> = {
  before_publish_news: "新闻发布前提醒",
  before_publish_info: "资讯发布前提醒",
  before_publish_wechat: "公众号发布前提醒",
  llm_balance_low: "模型余额不足",
  job_failed: "任务失败",
  system_error: "系统错误",
  collect_failed: "采集失败",
};

type Draft = {
  enabled: boolean;
  templateId: string; // "" = 不指定（用默认模板）
  groupsText: string;
  quietStart: string;
  quietEnd: string;
};

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function toDraft(rule: Rule): Draft {
  const quiet = parseJsonObject(rule.quietHours);
  return {
    enabled: rule.enabled,
    templateId: rule.templateId != null ? String(rule.templateId) : "",
    groupsText: parseJsonArray(rule.recipientGroups).join(","),
    quietStart: quiet.start ?? "",
    quietEnd: quiet.end ?? "",
  };
}

function parseJsonObject(raw: string | null | undefined): { start?: string; end?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function NotifyRulesPage() {
  const rulesQ = useManagerQuery<{ list: Rule[] }>("/api/notify-rules");
  const templatesQ = useManagerQuery<{ list: Template[] }>("/api/notify-templates");
  const [editing, setEditing] = useState<Rule | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const rules = useMemo(() => rulesQ.data?.list ?? [], [rulesQ.data]);
  const templates = useMemo(() => templatesQ.data?.list ?? [], [templatesQ.data]);

  function openEdit(rule: Rule) {
    const d = toDraft(rule);
    setEditing(rule);
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

  const dirty = useMemo(
    () => editing !== null && draft !== null && baseline !== null && JSON.stringify(draft) !== JSON.stringify(baseline),
    [editing, draft, baseline]
  );

  async function save() {
    if (!editing || !draft || saving) return;
    setSaving(true);
    setServerError("");
    try {
      const body: Record<string, unknown> = {
        enabled: draft.enabled,
        templateId: draft.templateId === "" ? null : Number(draft.templateId),
        recipientGroups: draft.groupsText.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (draft.quietStart && draft.quietEnd) {
        body.quietHours = { start: draft.quietStart, end: draft.quietEnd };
      } else {
        body.quietHours = null;
      }
      await managerFetch(`/api/notify-rules/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success(toastCopy.saved, `「${EVENT_LABELS[editing.event] ?? editing.event}」规则已更新`);
      closeEdit();
      void rulesQ.reload();
    } catch (e) {
      const msg = errorMessage(e);
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  const error = rulesQ.error ?? templatesQ.error;
  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const columns: DataColumn<Rule>[] = [
    {
      key: "event",
      label: "事件",
      render: (row) => (
        <span className="inline-flex flex-col">
          <span className="font-medium">{EVENT_LABELS[row.event] ?? row.event}</span>
          <span className="text-xs text-mgr-muted">{row.event}</span>
        </span>
      ),
    },
    {
      key: "enabled",
      label: "启用",
      render: (row) =>
        row.enabled ? (
          <Badge tone="success" dot>启用</Badge>
        ) : (
          <Badge tone="neutral" dot>停用</Badge>
        ),
    },
    { key: "template", label: "邮件模板", render: (row) => row.template?.subject ?? "默认模板" },
    { key: "recipientGroups", label: "收件人分组", render: (row) => parseJsonArray(row.recipientGroups).join(", ") || "—" },
    {
      key: "quietHours",
      label: "静默时段",
      render: (row) => {
        const q = parseJsonObject(row.quietHours);
        return q.start && q.end ? `${q.start} – ${q.end}` : "—";
      },
    },
  ];

  const header = (
    <PageHeader
      title="通知规则"
      description="7 类事件的邮件通知规则：启用开关、邮件模板、收件人分组与静默时段（跨零点允许，规则级静默优先于全局设置）。"
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {header}
      <div className={cardCls}>
        <DataTable<Rule>
          caption="通知规则"
          rows={rules}
          columns={columns}
          rowKey={(row) => String(row.id)}
          loading={rulesQ.loading}
          refreshing={rulesQ.refreshing}
          error={rulesQ.error}
          onRetry={() => void rulesQ.reload()}
          emptyTitle="暂无通知规则"
          emptyDescription="种子数据未初始化，请运行 prisma/seed.ts。"
          rowName={(row) => EVENT_LABELS[row.event] ?? row.event}
          rowActions={(row) => [
            { key: "edit", label: "编辑", icon: <PencilLine aria-hidden="true" />, onClick: () => openEdit(row) },
          ]}
          pagination={undefined}
          data-testid="notify-rules-table"
        />
      </div>

      {editing && draft && (
        <FormDialog
          open
          title={`编辑规则：${EVENT_LABELS[editing.event] ?? editing.event}`}
          description="事件唯一，不支持新建与删除；保存后立即生效。"
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
                    data-testid="notify-rule-enabled"
                  />
                  <span className="text-sm text-mgr-muted">{draft.enabled ? "该事件触发时发送邮件" : "停用后不发送"}</span>
                </span>
              )}
            </FormField>

            <FormField label="邮件模板">
              {(a11y) => (
                <Select
                  {...a11y}
                  value={draft.templateId}
                  onChange={(e) => setDraft((d) => (d ? { ...d, templateId: e.target.value } : d))}
                  options={[
                    { label: "不指定（用默认模板）", value: "" },
                    ...templates.map((t) => ({ label: t.subject, value: String(t.id) })),
                  ]}
                />
              )}
            </FormField>

            <FormField
              label="收件人分组"
              help="逗号分隔；仅发送给所属分组命中的启用收件人（与「提醒接收人」的通知组一致）"
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  value={draft.groupsText}
                  onChange={(e) => setDraft((d) => (d ? { ...d, groupsText: e.target.value } : d))}
                  placeholder="publish,ops"
                  data-testid="notify-rule-groups"
                />
              )}
            </FormField>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <BellOff aria-hidden="true" className="h-4 w-4" />
                静默时段（可选）
              </legend>
              <p className="text-xs text-mgr-muted">
                <BellRing aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                时段内触发的事件暂缓发送；跨零点允许（如 22:00 – 07:00）。留空表示不静默。
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="notify-rule-quiet-start" className="sr-only">静默开始</Label>
                <Input
                  id="notify-rule-quiet-start"
                  type="time"
                  value={draft.quietStart}
                  onChange={(e) => setDraft((d) => (d ? { ...d, quietStart: e.target.value } : d))}
                  data-testid="notify-rule-quiet-start"
                />
                <span aria-hidden="true">–</span>
                <Label htmlFor="notify-rule-quiet-end" className="sr-only">静默结束</Label>
                <Input
                  id="notify-rule-quiet-end"
                  type="time"
                  value={draft.quietEnd}
                  onChange={(e) => setDraft((d) => (d ? { ...d, quietEnd: e.target.value } : d))}
                  data-testid="notify-rule-quiet-end"
                />
                {(draft.quietStart || draft.quietEnd) && (
                  <Button type="button" variant="ghost" onClick={() => setDraft((d) => (d ? { ...d, quietStart: "", quietEnd: "" } : d))} data-testid="notify-rule-quiet-clear">
                    清除
                  </Button>
                )}
              </div>
            </fieldset>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
