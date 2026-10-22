"use client";

/**
 * 站点设置：SETTINGS_REGISTRY 分组驱动的 SchemaForm（email 等非公开分组需 setting:list）
 * P05：五态接入（骨架/错误+重试/无权限）；保存 Toast；未保存修改提示；Ctrl/⌘+S 保存当前分组；切换分组前确认未保存修改。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Save } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import type { FormValues } from "@/components/manager/SchemaForm";
import dynamic from "next/dynamic";

// W2-04 减包：SchemaForm 仅在实际渲染表单时需要，改为懒加载
const SchemaForm = dynamic(
  () => import("@/components/manager/SchemaForm").then((m) => m.SchemaForm),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-md bg-mgr-muted" /> }
);
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { ErrorState, Forbidden, PageSkeleton, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";
import { Button } from "@/components/manager/ui";

type Defs = { groups: { group: string; label: string; isPublic: boolean; items: { key: string; label: string; type: string; isEncrypted: boolean }[] }[] };

export default function ManagerSettingsPage() {
  const defsQ = useManagerQuery<Defs>("/api/settings/definitions");
  const valuesQ = useManagerQuery<Record<string, string>>("/api/settings");
  const [values, setValues] = useState<FormValues | null>(null);
  const [baseline, setBaseline] = useState<FormValues>({});
  const [group, setGroup] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 远端数据到达后初始化本地表单（仅首次/重试成功后）
  useEffect(() => {
    if (valuesQ.data && values === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部数据到达后一次性初始化受控表单
      setValues(valuesQ.data);
      setBaseline(valuesQ.data);
    }
  }, [valuesQ.data, values]);

  const groups = useMemo(() => defsQ.data?.groups ?? [], [defsQ.data]);
  const activeGroup = group || groups[0]?.group || "";
  const current = useMemo(() => groups.find((g) => g.group === activeGroup), [groups, activeGroup]);

  const dirtyKeys = useMemo(
    () => (current && values ? current.items.filter((i) => String(values[i.key] ?? "") !== String(baseline[i.key] ?? "")).map((i) => i.key) : []),
    [current, values, baseline]
  );

  const save = useCallback(async () => {
    if (!current || !values || saving) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const item of current.items) {
        const v = values[item.key];
        if (v === undefined || v === null) continue;
        updates[item.key] = String(v);
      }
      await managerFetch("/api/settings", { method: "PUT", body: JSON.stringify(updates) });
      setBaseline((b) => ({ ...b, ...updates }));
      toast.success(toastCopy.saved, `「${current.label}」分组已更新`);
    } catch (e) {
      toast.error("保存失败", errorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [current, values, saving]);

  // Ctrl/⌘ + S 保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function switchGroup(next: string) {
    if (next === activeGroup) return;
    if (dirtyKeys.length > 0) {
      const ok = await confirmDialog({
        title: "当前分组有未保存的修改",
        description: `「${current?.label}」中 ${dirtyKeys.length} 项修改尚未保存，切换后修改仍保留在页面上，但需要回到该分组保存。`,
        confirmText: "仍然切换",
        cancelText: "留在此处",
      });
      if (!ok) return;
    }
    setGroup(next);
  }

  const error = defsQ.error ?? valuesQ.error;
  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const header = (
    <PageHeader
      title="站点设置"
      description="前台展示的站点信息、联系方式与系统参数；带锁图标的分组为非公开配置。"
      actions={
        <Button type="button" onClick={() => void save()} disabled={saving || !current || dirtyKeys.length === 0} variant="primary" data-testid="settings-save">
          <Save aria-hidden="true" />
          {saving ? "保存中…" : dirtyKeys.length ? `保存修改（${dirtyKeys.length}）` : "已是最新"}
        </Button>
      }
    />
  );

  if (error) {
    return (
      <div>
        {header}
        <div className={cardCls}>
          <ErrorState
            message={error.message}
            onRetry={async () => {
              await Promise.all([defsQ.reload(), valuesQ.reload()]);
            }}
          />
        </div>
      </div>
    );
  }

  if (!defsQ.data || values === null) {
    return (
      <div>
        {header}
        <PageSkeleton lines={6} />
      </div>
    );
  }

  const fields = (current?.items ?? []).map((item) => ({
    key: item.key,
    label: item.label + (item.isEncrypted ? "（加密存储）" : ""),
    type: (item.type === "number" ? "number" : item.type === "boolean" ? "switch" : item.type === "json" ? "textarea" : "text") as
      | "number" | "switch" | "textarea" | "text",
  }));

  return (
    <div>
      {header}
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="设置分组" className="lg:w-52 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {groups.map((g) => {
              const active = g.group === activeGroup;
              return (
                <li key={g.group}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-current={active ? "true" : undefined}
                    onClick={() => void switchGroup(g.group)}
                    className={`w-full justify-between gap-2 whitespace-nowrap rounded-mgr-control px-3 py-2 text-left text-[13px] ${active ? "bg-mgr-primary-soft font-medium text-mgr-primary" : "text-mgr-fg hover:bg-mgr-subtle"}`}
                  >
                    {g.label}
                    {!g.isPublic && <Lock className="h-3.5 w-3.5 text-mgr-muted-fg" aria-label="非公开" />}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
        <section className={`${cardCls} min-w-0 flex-1 p-6`} aria-label={current?.label}>
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-mgr-border pb-4">
            <h2 className="text-[16px] font-semibold">{current?.label}</h2>
            <span className="text-[12px] text-mgr-muted-fg">
              <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans">S</kbd> 保存
            </span>
          </div>
          {fields.length > 0 ? <SchemaForm fields={fields} values={values} onChange={setValues} /> : <p className="text-[13px] text-mgr-muted-fg">该分组暂无可配置项。</p>}
        </section>
      </div>
    </div>
  );
}
