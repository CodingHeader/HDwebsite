"use client";

/**
 * 搜索框（P05）：300ms 防抖；按 "/" 聚焦（输入框/文本域内不触发）；Esc 清空
 */
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { inputCls } from "@/components/manager/feedback/styles";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export function SearchInput({ value, onChange, placeholder = "搜索…", delay = 300 }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChangeRef.current(draft), delay);
    return () => clearTimeout(t);
  }, [draft, value, delay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        aria-label={placeholder}
        className={`${inputCls} pl-8 pr-14 [&::-webkit-search-cancel-button]:hidden`}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && draft) {
            e.stopPropagation();
            setDraft("");
            onChange("");
          }
        }}
      />
      {draft ? (
        <button
          type="button"
          aria-label="清空搜索"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle"
          onClick={() => {
            setDraft("");
            onChange("");
            ref.current?.focus();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-mgr-border bg-mgr-subtle px-1.5 text-[11px] text-mgr-muted-fg">/</kbd>
      )}
    </div>
  );
}
