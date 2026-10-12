/** 状态徽标（P05）：圆点 + 文案，色调映射到 mgr 语义色 */
export type Tone = "success" | "warning" | "danger" | "info" | "muted";

const TONE: Record<Tone, string> = {
  success: "text-mgr-success",
  warning: "text-mgr-warning",
  danger: "text-mgr-danger",
  info: "text-mgr-info",
  muted: "text-mgr-muted-fg",
};

export function StatusBadge({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium ${TONE[tone]}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
