"use client";

/**
 * 内容中枢·渠道状态列（V7-UI-01，ADR-036）
 *
 * 输入是 B-07 服务端组装的 `ChannelState[]`（`/api/content-items` 返回的 `channels`，
 * 契约 `src/contracts/content-hub.ts`；本组件不重复定义 DTO）。
 * 职责：状态 Badge + 已发布外链（官网/公众号）+ 失败态"重试"按钮 + 空态"—"。
 *
 * 契约 `channelStateSchema` 不含 jobId（冻结不可改），重试所需 `PublishJob.id`
 * 由父级 `resolveJobId(itemId, channel)` 从 `/api/publish-jobs` 列表解析后传入。
 * 本组件只做渲染 + 触发重试，不新增数据请求。
 */
import { useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import { CHANNEL_STATUSES, type ChannelState } from "@/contracts/content-hub";
import { managerFetch, errorMessage } from "@/lib/manager-fetch";
import { Badge } from "@/components/manager/ui/misc";
import { toast } from "@/components/manager/feedback";

/** 五态（契约 CHANNEL_STATUSES 派生）→ 视觉色 */
const STATUS_TONE: Record<(typeof CHANNEL_STATUSES)[number], "neutral" | "primary" | "success" | "warning" | "danger" | "info"> = {
  unsent: "neutral",
  scheduled: "warning",
  publishing: "info",
  published: "success",
  failed: "danger",
};

const STATUS_LABEL: Record<(typeof CHANNEL_STATUSES)[number], string> = {
  unsent: "未发布",
  scheduled: "已排期",
  publishing: "发布中",
  published: "已发布",
  failed: "失败",
};

const CHANNEL_LABEL: Record<string, string> = { website: "官网", wechat: "公众号" };

/** 外链安全过滤：仅允许 http(s) 绝对地址或站点内路径（防 javascript: 等注入） */
function safeUrl(u: string | null): string | null {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return null;
}

export function ChannelStates({
  itemId,
  channels,
  canRetry,
  resolveJobId,
  onRetried,
}: {
  itemId: number;
  channels: ChannelState[];
  /** 是否可重试（publish:edit 权限 + 非超管） */
  canRetry: boolean;
  /** 解析该渠道失败任务的 PublishJob.id（父级从列表数据取；查不到返回 null） */
  resolveJobId: (itemId: number, channel: string) => number | null;
  /** 重试完成后由父级刷新列表 */
  onRetried: () => void;
}) {
  const [retrying, setRetrying] = useState<number | null>(null);

  if (channels.length === 0) return <span className="text-mgr-muted-fg">—</span>;

  async function retry(channel: string) {
    const jobId = resolveJobId(itemId, channel);
    if (jobId == null) {
      toast.error("重试失败", "未找到该渠道的失败任务，请刷新列表后重试");
      return;
    }
    setRetrying(itemId);
    try {
      const res = await managerFetch<{ result: string; message?: string }>(`/api/publish-jobs/${jobId}/retry`, { method: "POST" });
      if (res.result === "published") toast.success("重试成功", res.message ?? "");
      else toast.info("重试已排期", res.message ?? "");
      onRetried();
    } catch (e) {
      toast.error("重试失败", errorMessage(e));
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5" data-testid="channel-states">
      {channels.map((c) => {
        const label = CHANNEL_LABEL[c.channel] ?? c.channel;
        const st = c.status;
        const url = safeUrl(c.externalUrl);
        const isAbs = (url ?? "").startsWith("http");
        const title = c.errMsg ? `${label}：${STATUS_LABEL[st]}｜${c.errMsg}` : `${label}：${STATUS_LABEL[st]}`;
        return (
          <span
            key={`${c.channel}-${st}`}
            className="inline-flex items-center gap-1"
            title={title}
            data-testid={`channel-state-${c.channel}`}
          >
            <Badge tone={STATUS_TONE[st]}>{label}·{STATUS_LABEL[st]}</Badge>
            {st === "published" && url && (
              <a
                href={url}
                target={isAbs ? "_blank" : undefined}
                rel={isAbs ? "noreferrer" : undefined}
                className="inline-flex items-center gap-0.5 text-xs text-mgr-primary underline-offset-2 hover:underline"
                aria-label={`${label}外链`}
                data-testid={`channel-link-${c.channel}`}
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                外链
              </a>
            )}
            {st === "failed" && canRetry && (
              <button
                type="button"
                onClick={() => void retry(c.channel)}
                disabled={retrying === itemId}
                className="inline-flex items-center gap-0.5 rounded-mgr-control border border-mgr-border px-1.5 py-0.5 text-xs text-mgr-fg hover:bg-mgr-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`重试${label}发布`}
                data-testid={`channel-retry-${c.channel}`}
              >
                <RotateCw className={`h-3 w-3 ${retrying === itemId ? "animate-spin" : ""}`} aria-hidden="true" />
                重试
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}