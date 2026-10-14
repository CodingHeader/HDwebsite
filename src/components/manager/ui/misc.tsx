"use client";

/**
 * Badge / Card / Kbd / Tabs / Separator / SectionTitle（P07 管理端基础件）
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const toneCls: Record<BadgeTone, string> = {
  neutral: "bg-mgr-subtle text-mgr-muted-fg ring-mgr-border",
  primary: "bg-mgr-primary-soft text-mgr-primary ring-mgr-primary/20",
  success: "text-mgr-success ring-mgr-success/25 [background:color-mix(in_oklch,var(--mgr-success)_10%,white)]",
  warning: "text-[oklch(0.55_0.15_60)] ring-mgr-warning/30 [background:color-mix(in_oklch,var(--mgr-warning)_14%,white)]",
  danger: "text-mgr-danger ring-mgr-danger/25 [background:color-mix(in_oklch,var(--mgr-danger)_9%,white)]",
  info: "text-mgr-info ring-mgr-info/25 [background:color-mix(in_oklch,var(--mgr-info)_10%,white)]",
};

export function Badge({ tone = "neutral", dot, className, children, title }: { tone?: BadgeTone; dot?: boolean; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium leading-5 ring-1 ring-inset", toneCls[tone], className)}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-mgr-card border border-mgr-border bg-mgr-surface shadow-mgr-sm", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 border-b border-mgr-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-mgr-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] leading-[18px] text-mgr-muted-fg">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans text-[11px] text-mgr-muted-fg">{children}</kbd>;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-mgr-border", className)} />;
}

/** 表单分区标题 */
export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="sm:col-span-2 border-b border-mgr-border pb-2 pt-1">
      <h3 className="text-[13px] font-semibold text-mgr-fg">{title}</h3>
      {description && <p className="mt-0.5 text-[12px] text-mgr-muted-fg">{description}</p>}
    </div>
  );
}

export type TabItem = { key: string; label: React.ReactNode; count?: number };

/** Tabs：WAI-ARIA tablist，左右方向键切换（受控；内容由调用方按 value 渲染） */
export function Tabs({ items, value, onChange, className, label }: { items: TabItem[]; value: string; onChange: (k: string) => void; className?: string; label: string }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className={cn("flex max-w-full gap-1 overflow-x-auto border-b border-mgr-border", className)}>
      {items.map((t, i) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
              refs.current[next]?.focus();
              onChange(items[next].key);
            }}
            className={cn(
              "-mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors",
              active ? "border-mgr-primary text-mgr-primary" : "border-transparent text-mgr-muted-fg hover:text-mgr-fg"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-mgr-subtle px-1.5 text-[11px] tabular-nums text-mgr-muted-fg">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** 帮助提示条（页面顶部"这页是做什么的/怎么用"） */
export function HelpCallout({ children, tone = "info", className }: { children: React.ReactNode; tone?: "info" | "warning"; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-mgr-card border px-4 py-3 text-[13px] leading-5",
        tone === "info" ? "border-mgr-info/25 text-mgr-fg [background:color-mix(in_oklch,var(--mgr-info)_6%,white)]" : "border-mgr-warning/40 text-mgr-fg [background:color-mix(in_oklch,var(--mgr-warning)_10%,white)]",
        className
      )}
    >
      {children}
    </div>
  );
}
