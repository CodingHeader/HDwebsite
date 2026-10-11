"use client";

/** 站点设置：SETTINGS_REGISTRY 分组驱动的 SchemaForm（email 等非公开分组需 setting:list） */
import { useEffect, useMemo, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm } from "@/components/manager/SchemaForm";
import type { FormValues } from "@/components/manager/SchemaForm";
import type { SettingGroup } from "@/contracts";

type Defs = { groups: { group: string; label: string; isPublic: boolean; items: { key: string; label: string; type: string; isEncrypted: boolean }[] }[] };

export default function ManagerSettingsPage() {
  const [defs, setDefs] = useState<Defs | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [group, setGroup] = useState<string>("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [defsRes, valuesRes] = await Promise.all([
          managerFetch<Defs>("/api/settings/definitions"),
          managerFetch<Record<string, string>>("/api/settings"),
        ]);
        setDefs(defsRes);
        setValues(valuesRes);
        setGroup(defsRes.groups[0]?.group ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
  }, []);

  const current = useMemo(() => defs?.groups.find((g) => g.group === group), [defs, group]);

  async function save() {
    if (!current) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updates: Record<string, string> = {};
      for (const item of current.items) {
        const v = values[item.key];
        if (v === undefined || v === null) continue;
        updates[item.key] = String(v);
      }
      await managerFetch("/api/settings", { method: "PUT", body: JSON.stringify(updates) });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!defs) return <p className="text-muted">{error || "加载中…"}</p>;

  const fields = (current?.items ?? []).map((item) => ({
    key: item.key,
    label: item.label + (item.isEncrypted ? "（加密存储）" : ""),
    type: (item.type === "number" ? "number" : item.type === "boolean" ? "switch" : item.type === "json" ? "textarea" : "text") as
      | "number" | "switch" | "textarea" | "text",
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">站点设置</h1>
        <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "保存中…" : "保存当前分组"}
        </button>
      </div>
      {saved && <p className="mt-3 text-sm text-green-600">已保存。</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {defs.groups.map((g) => (
          <button
            key={g.group}
            onClick={() => setGroup(g.group)}
            className={`rounded-md border px-3 py-1.5 text-sm ${g.group === group ? "border-primary text-primary" : "border-border text-muted"}`}
          >
            {g.label}
            {!g.isPublic && <span className="ml-1 text-xs">🔒</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <SchemaForm fields={fields} values={values} onChange={setValues} />
      </div>
    </div>
  );
}
