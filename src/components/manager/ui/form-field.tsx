"use client";

/**
 * Label / FormField（P07）：标签 + 必填标记 + 帮助说明 + 字段级错误（后端 data.fieldErrors 逐项映射）。
 * 用法：<FormField label="标题" required help="前台列表显示" error={errors.title}>{(a11y) => <Input {...a11y} />}</FormField>
 * a11y 含 id / aria-invalid / aria-describedby / aria-required，保证 getByLabel 与读屏可用。
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, children, required, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-[13px] font-medium text-mgr-fg", className)} {...rest}>
      {children}
      {required && (
        <span className="ml-0.5 text-mgr-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export type FieldA11y = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-required"?: true;
};

export function FormField({
  label,
  required,
  help,
  error,
  id: idProp,
  className,
  inline,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  error?: string;
  id?: string;
  className?: string;
  /** 开关类：标签与控件同行 */
  inline?: boolean;
  children: (a11y: FieldA11y) => React.ReactNode;
}) {
  const auto = React.useId();
  const id = idProp ?? `f-${auto}`;
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  const a11y: FieldA11y = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required ? true : undefined,
  };
  const helpNode = help ? (
    <p id={`${id}-help`} className="mt-1.5 text-[12px] leading-[18px] text-mgr-muted-fg">
      {help}
    </p>
  ) : null;
  const errNode = error ? (
    <p id={`${id}-err`} role="alert" className="mt-1.5 text-[12px] text-mgr-danger" data-testid="field-error">
      {error}
    </p>
  ) : null;
  if (inline) {
    return (
      <div className={className}>
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 py-2">
          <Label htmlFor={id} required={required} className="cursor-pointer">
            {label}
          </Label>
          {children(a11y)}
        </div>
        {helpNode}
        {errNode}
      </div>
    );
  }
  return (
    <div className={className}>
      <Label htmlFor={id} required={required} className="mb-1.5">
        {label}
      </Label>
      {children(a11y)}
      {helpNode}
      {errNode}
    </div>
  );
}
