/** PageSkeleton（契约⑥ loading）：页面级骨架（标题 + 若干卡片/行），aria-busy 播报 */
interface PageSkeletonProps {
  /** 卡片网格数量（仪表盘类页面） */
  cards?: number;
  /** 段落行数（表单/详情类页面） */
  lines?: number;
}

export function Bone({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-mgr-control bg-mgr-subtle ${className}`} />;
}

export function PageSkeleton({ cards = 0, lines = 6 }: PageSkeletonProps) {
  return (
    <div data-testid="page-skeleton" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">加载中…</span>
      {cards > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="rounded-mgr-card border border-mgr-border bg-mgr-surface p-5">
              <Bone className="h-3 w-20" />
              <Bone className="mt-4 h-7 w-16" />
            </div>
          ))}
        </div>
      )}
      {lines > 0 && (
        <div className={`${cards > 0 ? "mt-6 " : ""}space-y-4 rounded-mgr-card border border-mgr-border bg-mgr-surface p-6`}>
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
