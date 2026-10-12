/** TableSkeleton（契约⑥ loading）：表格体骨架行，列数与真实表头一致避免跳动 */
import { Bone } from "./PageSkeleton";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 6 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} data-testid={r === 0 ? "table-skeleton" : undefined} aria-hidden="true" className="border-b border-mgr-border last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-4" style={{ height: "var(--mgr-row-h)" }}>
              <Bone className={`h-3.5 ${c === 0 ? "w-3/4" : c === columns - 1 ? "w-16" : "w-1/2"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
