"use client";

/** 状态筛选分段控件（P05）：aria-pressed 表达选中，←/→ 键切换 */
interface FilterTabsProps {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
}

export function FilterTabs({ tabs, value, onChange, label = "状态筛选" }: FilterTabsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-0.5 rounded-mgr-control border border-mgr-border bg-mgr-subtle p-0.5"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const idx = tabs.findIndex((t) => t.key === value);
        const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        onChange(next.key);
        const btn = (e.currentTarget.querySelector(`[data-key="${next.key}"]`) as HTMLButtonElement | null);
        btn?.focus();
      }}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            data-key={t.key}
            aria-pressed={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`h-7 rounded-[5px] px-3 text-[13px] font-medium transition-colors ${active ? "bg-mgr-surface text-mgr-fg shadow-mgr-sm" : "text-mgr-muted-fg hover:text-mgr-fg"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
