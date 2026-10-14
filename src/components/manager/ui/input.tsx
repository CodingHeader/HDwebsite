"use client";

/**
 * 表单控件（P07）：Input / Textarea / Select（原生 select 美化，键盘与读屏原生可用）/ Checkbox / Switch / SearchField
 * 统一高度 36px、圆角 6px、聚焦主色描边；aria-invalid 时红色描边。
 */
import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const controlClass =
  "w-full rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 text-[13px] text-mgr-fg shadow-mgr-sm transition-colors placeholder:text-mgr-muted-fg focus:border-mgr-primary focus:outline-none focus:ring-2 focus:ring-mgr-primary/20 aria-[invalid=true]:border-mgr-danger aria-[invalid=true]:ring-mgr-danger/20 disabled:cursor-not-allowed disabled:bg-mgr-subtle disabled:opacity-70";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type = "text", ...rest },
  ref
) {
  return <input ref={ref} type={type} className={cn(controlClass, "h-9", className)} {...rest} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(controlClass, "py-2 leading-5", className)} {...rest} />;
  }
);

export type SelectOption = { label: string; value: string | number; disabled?: boolean };

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  /** 首项占位（value=""） */
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, placeholder, ...rest },
  ref
) {
  return (
    <div className={cn("relative", className?.includes("w-") ? undefined : "w-full", className)}>
      <select ref={ref} className={cn(controlClass, "h-9 appearance-none pr-8")} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
    </div>
  );
});

export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  function Checkbox({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn("h-4 w-4 shrink-0 cursor-pointer rounded border-mgr-border accent-[var(--mgr-primary)] disabled:cursor-not-allowed", className)}
        {...rest}
      />
    );
  }
);

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** 开关：原生 checkbox + role=switch（label 关联、空格切换、Playwright check() 均可用） */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, disabled, ...rest },
  ref
) {
  return (
    <span className={cn("relative inline-flex h-5 w-9 shrink-0 items-center", className)}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        checked={checked}
        aria-checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="peer absolute inset-0 z-[1] m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...rest}
      />
      <span
        aria-hidden="true"
        className="h-5 w-9 rounded-full bg-mgr-border transition-colors peer-checked:bg-mgr-primary peer-focus-visible:ring-2 peer-focus-visible:ring-mgr-primary/40 peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"
      />
    </span>
  );
});

/** 搜索框：防抖 300ms 回调、Esc/× 清空、role=searchbox */
export function SearchField({
  value,
  onChange,
  placeholder = "搜索…",
  className,
  delay = 300,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
  label?: string;
}) {
  const [text, setText] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prev, setPrev] = React.useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }
  function emit(v: string, now = false) {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    if (now) onChange(v);
    else timer.current = setTimeout(() => onChange(v), delay);
  }
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <div className={cn("relative w-full sm:w-60", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
      <input
        type="search"
        role="searchbox"
        aria-label={label ?? placeholder}
        value={text}
        placeholder={placeholder}
        onChange={(e) => emit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") emit(text, true);
          if (e.key === "Escape" && text) {
            e.preventDefault();
            emit("", true);
          }
        }}
        className={cn(controlClass, "h-9 pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden")}
      />
      {text && (
        <button
          type="button"
          aria-label="清空搜索"
          onClick={() => emit("", true)}
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
