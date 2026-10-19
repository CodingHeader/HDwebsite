"use client";

/**
 * 命令面板（P02）：Ctrl/⌘+K 打开，按名称/分组/路径模糊检索后台页面，↑↓ 选择、Enter 跳转、Esc 关闭。
 * 基于 Radix Dialog（焦点陷阱、Esc、遮罩点击关闭、aria-modal）。
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@/components/manager/ui/dialog-primitive";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./MenuIcon";
import type { FlatMenuItem } from "./types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: FlatMenuItem[];
}

export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div data-theme="manager">
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-mgr-dialog border border-mgr-border bg-mgr-surface shadow-mgr-lg"
          >
            <Dialog.Title className="sr-only">搜索后台页面</Dialog.Title>
            {/* 每次打开重新挂载，查询与选中项自然归零 */}
            {open && <PaletteBody items={items} onDone={() => onOpenChange(false)} />}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({ items, onDone }: { items: FlatMenuItem[]; onDone: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.label, i.group ?? "", i.path, i.code].some((s) => s.toLowerCase().includes(q))
    );
  }, [items, query]);

  const go = (item: FlatMenuItem | undefined) => {
    if (!item) return;
    onDone();
    router.push(item.path);
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          go(results[active]);
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-mgr-border px-4">
        <Search className="h-4 w-4 shrink-0 text-mgr-muted-fg" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="搜索页面，如“文章”“轮播图”“站点设置”…"
          aria-label="搜索后台页面"
          role="combobox"
          aria-expanded="true"
          aria-controls="mgr-command-list"
          aria-activedescendant={results[active] ? `mgr-cmd-${results[active].code}` : undefined}
          className="h-12 flex-1 bg-transparent text-[14px] text-mgr-fg outline-none placeholder:text-mgr-muted-fg"
        />
        <kbd className="rounded border border-mgr-border px-1.5 text-[11px] text-[oklch(0.44_0_0)]">Esc</kbd>
      </div>
      <ul id="mgr-command-list" role="listbox" aria-label="页面" className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-[13px] text-mgr-muted-fg">没有匹配的页面，换个关键词试试</li>
        )}
        {results.map((item, i) => (
          <li
            key={item.code}
            id={`mgr-cmd-${item.code}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(item)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-mgr-control px-3 py-2 text-[13px]",
              i === active ? "bg-mgr-primary-soft text-mgr-primary" : "text-mgr-fg"
            )}
          >
            <MenuIcon name={item.icon} className="h-4 w-4 shrink-0" />
            <span className="font-medium">{item.label}</span>
            {item.group && <span className="text-[12px] text-mgr-muted-fg">{item.group}</span>}
            {i === active && <CornerDownLeft className="ml-auto h-3.5 w-3.5" aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
