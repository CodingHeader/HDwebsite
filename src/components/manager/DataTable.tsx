"use client";

/**
 * DataTable（P07 管理端业务件）：所有列表页的统一表格。
 * - 列：排序（当前页内，点击表头切换 升序/降序/默认）、渲染类型 text/image/boolean/date/datetime/relative-time/money/badge/link/mono/number 或自定义函数
 * - 工具栏：左侧搜索/筛选（调用方传入）+ 已选筛选 chips 由调用方渲染；右侧 列显隐、密度切换、刷新
 * - 行选择 + 批量操作栏（选中 N 项 → 批量动作；跨页不保留，翻页自动清空）
 * - 行操作：统一渲染为行内文字按钮（≥ md）/ 卡片底部按钮（< md），aria-label 带对象名
 * - 五态：加载骨架 / 空（带下一步操作）/ 错误 + 重试；refreshing 时半透明
 * - 分页：总数 + 每页 10/20/50/100 + 页码省略号
 * - 响应式：< 768px 切换为堆叠卡片（主列作标题，其余列 label: value），操作按钮在卡片底部，永不横向溢出；
 *   ≥ 768px 为表格，宽表在容器内横向滚动，操作列 sticky 固定在右侧。
 */
import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, RefreshCw, Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePref } from "@/components/manager/shell/usePref";
import { Badge, type BadgeTone } from "@/components/manager/ui/misc";
import { Button, IconButton } from "@/components/manager/ui/button";
import { Checkbox, Select } from "@/components/manager/ui/input";
import { EmptyState } from "@/components/manager/feedback/EmptyState";
import { ErrorState } from "@/components/manager/feedback/ErrorState";
import { Bone } from "@/components/manager/feedback/PageSkeleton";
import { Pagination } from "@/components/manager/Pagination";

export type CellRender =
  | "text" | "image" | "boolean" | "date" | "datetime" | "relative-time" | "money" | "badge" | "link" | "mono" | "number";

export type BadgeMap = Record<string, { label: string; tone: BadgeTone }>;

export type DataColumn<T> = {
  key: string;
  label: string;
  render?: CellRender | ((row: T) => ReactNode);
  /** render=badge 时的取值映射 */
  badges?: BadgeMap;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right";
  width?: string;
  /** 移动端卡片标题列（缺省取第一列） */
  primary?: boolean;
  /** 移动端卡片中隐藏 */
  hideOnMobile?: boolean;
  /** 默认隐藏（可在"列"菜单中打开） */
  defaultHidden?: boolean;
  className?: string;
};

export type RowActionItem = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
  tone?: "primary" | "muted" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
};

export type BulkAction<T> = {
  key: string;
  label: string;
  danger?: boolean;
  icon?: ReactNode;
  run: (rows: T[]) => void | Promise<void>;
};

export type DataTablePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
};

export type SortState = { key: string; dir: "asc" | "desc" };

export interface DataTableProps<T> {
  /** 表格可读名称（读屏 caption） */
  caption: string;
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  refreshing?: boolean;
  error?: Error | null;
  onRetry?: () => void | Promise<void>;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  rowActions?: (row: T) => RowActionItem[];
  bulkActions?: BulkAction<T>[];
  pagination?: DataTablePagination;
  /** 工具栏左侧：搜索框、筛选下拉、筛选 chips */
  toolbar?: ReactNode;
  onRefresh?: () => void | Promise<void>;
  /** 行名称（批量与 aria 文案） */
  rowName?: (row: T) => string;
  /** A-02：服务端排序回调——提供后点击表头触发回调（rows 由调用方重查），跳过客户端当前页排序 */
  onSortChange?: (sort: SortState | null) => void;
  /** A-02：受控排序态（与 onSortChange 配对；缺省用内部态渲染箭头） */
  sort?: SortState | null;
  /** A-02：分页/排序变化写入 URL 查询参数（?page&limit&sort；router.replace, scroll:false）。缺省关闭（既有调用方行为不变） */
  syncUrl?: boolean;
  "data-testid"?: string;
}

const DENSITIES = ["comfortable", "compact"] as const;
const PAGE_SIZES = [10, 20, 50, 100];

function get(row: unknown, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function fmtDateTime(v: unknown, withTime = true): string {
  if (v === null || v === undefined || v === "") return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  const s = d.toLocaleString("zh-CN", { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return withTime ? s : s.slice(0, 10);
}

export function relativeTime(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v)).getTime();
  if (Number.isNaN(d)) return String(v);
  const diff = (Date.now() - d) / 1000;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "前" : "后";
  if (abs < 60) return "刚刚";
  if (abs < 3600) return `${Math.floor(abs / 60)} 分钟${suffix}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)} 小时${suffix}`;
  if (abs < 86400 * 30) return `${Math.floor(abs / 86400)} 天${suffix}`;
  return fmtDateTime(v, false);
}

/** 关联对象（{ name } / { title }）取显示名 */
function objectLabel(v: unknown): string | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const label = o.name ?? o.title ?? o.label ?? o.username;
    if (typeof label === "string") return label;
  }
  return null;
}

export function renderCell<T>(col: DataColumn<T>, row: T): ReactNode {
  if (typeof col.render === "function") return col.render(row);
  const value = get(row, col.key);
  const muted = <span className="text-mgr-muted-fg">—</span>;
  switch (col.render) {
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return typeof value === "string" && value ? <img src={value} alt="" className="h-10 w-16 rounded-mgr-control border border-mgr-border bg-mgr-subtle object-cover" /> : muted;
    case "boolean":
      return value ? <Badge tone="success" dot>是</Badge> : <Badge tone="neutral" dot>否</Badge>;
    case "badge": {
      if (value === null || value === undefined || value === "") return muted;
      const m = col.badges?.[String(value)];
      return <Badge tone={m?.tone ?? "neutral"} dot>{m?.label ?? String(value)}</Badge>;
    }
    case "date":
    case "datetime": {
      const s = fmtDateTime(value, col.render === "datetime");
      return s ? <span className="whitespace-nowrap tabular-nums text-mgr-muted-fg">{s}</span> : muted;
    }
    case "relative-time": {
      const s = relativeTime(value);
      return s ? <span className="whitespace-nowrap text-mgr-muted-fg" title={fmtDateTime(value)}>{s}</span> : muted;
    }
    case "money":
      return value === null || value === undefined || value === "" ? muted : <span className="tabular-nums">¥{Number(value).toLocaleString("zh-CN")}</span>;
    case "number":
      return value === null || value === undefined || value === "" ? muted : <span className="tabular-nums">{String(value)}</span>;
    case "link":
      return typeof value === "string" && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="break-all text-mgr-primary underline-offset-4 hover:underline">{value}</a>
      ) : muted;
    case "mono":
      return value ? <span className="font-mono text-[12px]">{String(value)}</span> : muted;
    default: {
      if (value === null || value === undefined || value === "") return muted;
      const label = objectLabel(value);
      if (label !== null) return <span>{label}</span>;
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return <span title={text.length > 60 ? text : undefined}>{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>;
    }
  }
}

function sortKey<T>(col: DataColumn<T>, row: T): string | number {
  const v = col.sortValue ? col.sortValue(row) : get(row, col.key);
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const label = objectLabel(v);
  return label ?? String(v);
}

const actionTone = {
  primary: "text-mgr-primary",
  muted: "text-[oklch(0.44_0_0)] hover:text-mgr-fg",
  danger: "text-mgr-danger",
} as const;

function ActionLink({ a, block }: { a: RowActionItem; block?: boolean }) {
  const cls = cn(
    "inline-flex items-center gap-1 rounded-sm text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5",
    block ? "h-11 justify-center rounded-mgr-control border border-mgr-border bg-mgr-surface px-3" : "px-1 underline-offset-4 hover:underline",
    actionTone[a.tone ?? "primary"]
  );
  if (a.href) {
    return (
      <a href={a.href} target="_blank" rel="noreferrer" className={cls} aria-label={a.ariaLabel}>
        {a.icon}
        {a.label}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={a.onClick} disabled={a.disabled} aria-label={a.ariaLabel}>
      {a.icon}
      {a.label}
    </button>
  );
}

export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  loading,
  refreshing,
  error,
  onRetry,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  rowActions,
  bulkActions,
  pagination,
  toolbar,
  onRefresh,
  rowName,
  onSortChange,
  sort: sortProp,
  syncUrl = false,
  ...rest
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState | null>(null);
  // A-02：受控排序态优先（onSortChange 配对），否则内部态（纯客户端排序，向后兼容）
  const sort = sortProp !== undefined ? sortProp : sortState;
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)));
  const [colMenu, setColMenu] = useState(false);
  const [density, setDensity] = usePref("hd-mgr-density", "comfortable", DENSITIES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // 数据集变化（翻页/筛选/刷新）时清空选择：以行 key 串为依据，在渲染期同步（避免 effect 级联）
  const dataSig = rows.map(rowKey).join("|");
  const [prevSig, setPrevSig] = useState(dataSig);
  if (prevSig !== dataSig) {
    setPrevSig(dataSig);
    if (selected.size) setSelected(new Set());
  }

  const visibleCols = columns.filter((c) => !hidden.has(c.key));
  const sorted = useMemo(() => {
    // A-02：服务端排序模式（onSortChange 提供）时 rows 已由调用方重查排好，跳过客户端当前页排序
    if (!sort || onSortChange) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const x = sortKey(col, a);
      const y = sortKey(col, b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "zh-CN", { numeric: true });
      return sort.dir === "asc" ? r : -r;
    });
    return copy;
  }, [rows, sort, columns, onSortChange]);

  const selectable = !!bulkActions?.length;
  const hasActions = !!rowActions;
  const allKeys = sorted.map(rowKey);
  const allChecked = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someChecked = !allChecked && allKeys.some((k) => selected.has(k));
  const selectedRows = sorted.filter((r) => selected.has(rowKey(r)));
  const showData = !loading && !error && sorted.length > 0;
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];

  /** A-02：把键值写进 URL 查询参数（syncUrl 开启时；scroll:false 不打断滚动位置） */
  function syncParams(next: Record<string, string | null>) {
    if (!syncUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleSort(key: string) {
    const next: SortState | null = !sort || sort.key !== key ? { key, dir: "asc" } : sort.dir === "asc" ? { key, dir: "desc" } : null;
    if (sortProp === undefined) setSortState(next);
    onSortChange?.(next);
    syncParams({ sort: next ? `${next.key}.${next.dir}` : null });
  }

  function toggleRow(k: string, on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(k);
      else n.delete(k);
      return n;
    });
  }

  async function runBulk(b: BulkAction<T>) {
    setBulkBusy(b.key);
    try {
      await b.run(selectedRows);
      setSelected(new Set());
    } finally {
      setBulkBusy(null);
    }
  }

  const stateBlock = error ? (
    <ErrorState compact message={error.message} onRetry={onRetry} />
  ) : !loading && sorted.length === 0 ? (
    <EmptyState compact title={emptyTitle} description={emptyDescription} action={emptyAction} />
  ) : null;

  return (
    <div data-testid={rest["data-testid"] ?? "data-table"} data-density={density}>
      {/* 工具栏 */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        <div className="relative flex shrink-0 items-center gap-1 self-end md:self-auto">
          <IconButton
            label={density === "compact" ? "切换为舒适密度" : "切换为紧凑密度"}
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            className="hidden md:inline-flex"
          >
            {density === "compact" ? <Rows3 /> : <Rows4 />}
          </IconButton>
          <IconButton label="显示/隐藏列" aria-expanded={colMenu} onClick={() => setColMenu((v) => !v)} className="hidden md:inline-flex">
            <Columns3 />
          </IconButton>
          {onRefresh && (
            <IconButton label="刷新" onClick={() => void onRefresh()} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            </IconButton>
          )}
          {colMenu && (
            <div
              role="group"
              aria-label="显示的列"
              className="absolute right-0 top-10 z-20 w-48 rounded-mgr-card border border-mgr-border bg-mgr-surface p-2 shadow-mgr-lg"
              onKeyDown={(e) => e.key === "Escape" && setColMenu(false)}
            >
              <p className="px-2 pb-1 text-[12px] text-[oklch(0.44_0_0)]">显示的列</p>
              {columns.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-mgr-subtle">
                  <Checkbox
                    checked={!hidden.has(c.key)}
                    disabled={!hidden.has(c.key) && visibleCols.length === 1}
                    onChange={(e) =>
                      setHidden((prev) => {
                        const n = new Set(prev);
                        if (e.target.checked) n.delete(c.key);
                        else n.add(c.key);
                        return n;
                      })
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectable && selected.size > 0 && (
        <div
          role="region"
          aria-label="批量操作"
          data-testid="bulk-bar"
          className="mb-3 flex flex-wrap items-center gap-2 rounded-mgr-card border border-mgr-primary/30 bg-mgr-primary-soft px-3 py-2 text-[13px]"
        >
          <span className="font-medium text-mgr-fg">已选择 {selected.size} 项</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            取消选择
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            {bulkActions!.map((b) => (
              <Button key={b.key} size="sm" variant={b.danger ? "danger" : "secondary"} icon={b.icon} loading={bulkBusy === b.key} disabled={bulkBusy !== null} onClick={() => void runBulk(b)}>
                {b.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ≥ md：表格 */}
      <div
        className="hidden overflow-hidden rounded-mgr-card border border-mgr-border bg-mgr-surface shadow-mgr-sm md:block"
        aria-busy={loading || refreshing || undefined}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-mgr-subtle/60">
              <tr className="border-b border-mgr-border">
                {selectable && (
                  <th scope="col" className="w-10 px-3">
                    <Checkbox
                      aria-label="全选本页"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={(e) => setSelected(e.target.checked ? new Set(allKeys) : new Set())}
                      disabled={!showData}
                    />
                  </th>
                )}
                {visibleCols.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      style={{ width: c.width }}
                      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined}
                      className={cn("h-10 whitespace-nowrap px-4 text-[12px] font-medium text-[oklch(0.44_0_0)]", c.align === "right" && "text-right")}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={cn("inline-flex items-center gap-1 rounded-sm hover:text-mgr-fg", active && "text-mgr-fg")}
                          aria-label={`按「${c.label}」排序`}
                        >
                          {c.label}
                          {active ? sort!.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
                {hasActions && (
                  <th scope="col" className="sticky right-0 h-10 whitespace-nowrap bg-mgr-subtle px-4 text-right text-[12px] font-medium text-[oklch(0.44_0_0)] shadow-[-1px_0_0_var(--mgr-border)]">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={refreshing ? "opacity-60 transition-opacity" : undefined}>
              {loading &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-mgr-border last:border-0" style={{ height: "var(--mgr-row-h)" }} data-testid="table-skeleton">
                    {Array.from({ length: visibleCols.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0) }, (_, j) => (
                      <td key={j} className="px-4">
                        <Bone className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))}
              {stateBlock && (
                <tr>
                  <td colSpan={visibleCols.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}>{stateBlock}</td>
                </tr>
              )}
              {showData &&
                sorted.map((row) => {
                  const k = rowKey(row);
                  const checked = selected.has(k);
                  const actions = rowActions?.(row) ?? [];
                  return (
                    <tr
                      key={k}
                      className={cn("group border-b border-mgr-border transition-colors last:border-0 hover:bg-mgr-subtle/50", checked && "bg-mgr-primary-soft/60")}
                      style={{ height: "var(--mgr-row-h)" }}
                    >
                      {selectable && (
                        <td className="w-10 px-3">
                          <Checkbox aria-label={`选择 ${rowName?.(row) ?? k}`} checked={checked} onChange={(e) => toggleRow(k, e.target.checked)} />
                        </td>
                      )}
                      {visibleCols.map((c) => (
                        <td key={c.key} className={cn("max-w-[360px] px-4 py-2 align-middle text-mgr-fg", c.align === "right" && "text-right", c.className)}>
                          {renderCell(c, row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="sticky right-0 whitespace-nowrap bg-mgr-surface px-4 py-2 text-right shadow-[-1px_0_0_var(--mgr-border)] group-hover:bg-mgr-subtle">
                          <div className="inline-flex items-center gap-2">
                            {actions.length ? actions.map((a) => <ActionLink key={a.key} a={a} />) : <span className="text-mgr-muted-fg">—</span>}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* < md：堆叠卡片 */}
      <div className="md:hidden" aria-busy={loading || refreshing || undefined}>
        {loading && (
          <ul className="space-y-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="rounded-mgr-card border border-mgr-border bg-mgr-surface p-4">
                <Bone className="h-4 w-2/3" />
                <Bone className="mt-3 h-3 w-full" />
                <Bone className="mt-2 h-3 w-1/2" />
              </li>
            ))}
          </ul>
        )}
        {stateBlock && <div className="rounded-mgr-card border border-mgr-border bg-mgr-surface">{stateBlock}</div>}
        {showData && (
          <ul className={cn("space-y-3", refreshing && "opacity-60")} aria-label={caption}>
            {sorted.map((row) => {
              const k = rowKey(row);
              const actions = rowActions?.(row) ?? [];
              return (
                <li key={k} className="min-w-0 rounded-mgr-card border border-mgr-border bg-mgr-surface p-4 shadow-mgr-sm">
                  <div className="flex items-start gap-3">
                    {selectable && <Checkbox className="mt-0.5" aria-label={`选择 ${rowName?.(row) ?? k}`} checked={selected.has(k)} onChange={(e) => toggleRow(k, e.target.checked)} />}
                    <div className="min-w-0 flex-1 break-words text-[14px] font-medium text-mgr-fg">{renderCell(primaryCol, row)}</div>
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
                    {visibleCols
                      .filter((c) => c !== primaryCol && !c.hideOnMobile)
                      .map((c) => (
                        <div key={c.key} className="contents">
                          <dt className="whitespace-nowrap text-mgr-muted-fg">{c.label}</dt>
                          <dd className="min-w-0 break-words text-mgr-fg">{renderCell(c, row)}</dd>
                        </div>
                      ))}
                  </dl>
                  {actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-mgr-border pt-3">
                      {actions.map((a) => (
                        <ActionLink key={a.key} a={a} block />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination && !error && !loading && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {pagination.onLimitChange ? (
            <label className="flex items-center gap-2 text-[13px] text-[oklch(0.44_0_0)]">
              每页
              <Select
                aria-label="每页条数"
                className="w-20"
                value={String(pagination.limit)}
                onChange={(e) => {
                  const limit = Number(e.target.value);
                  // A-02：每页条数变化回到第 1 页（调用方语义），URL 同步 limit
                  syncParams({ limit: String(limit) });
                  pagination.onLimitChange!(limit);
                }}
                options={PAGE_SIZES.map((n) => ({ label: String(n), value: n }))}
              />
              条
            </label>
          ) : (
            <span />
          )}
          <div className="min-w-0 sm:flex-1">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={(p) => { syncParams({ page: p > 1 ? String(p) : null }); pagination.onPageChange(p); }} className="" />
          </div>
        </div>
      )}
    </div>
  );
}
