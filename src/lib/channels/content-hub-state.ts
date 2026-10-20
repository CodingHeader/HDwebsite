/**
 * 内容中枢渠道状态组装（B-07，ADR-034 §派生字段）
 *
 * 契约 `contentHubItemSchema.channels` 的字段来源：
 * - `status` / `accountId` / `externalUrl` / `errMsg` ← `ContentChannel`（每渠道一行）
 * - `scheduledAt` / `publishedAt` ← 派生：该渠道最近一条 `PublishJob.scheduledAt` / `.publishedAt`
 *
 * 组装方：B-07（本模块）；消费方：/api/content-items（列表/详情）。
 * 不在契约内重复定义 DTO；只用 contracts/content-hub.ts 的 `channelStateSchema` / `CONTENT_HUB_CHANNELS`。
 */
import { prisma } from "@/lib/prisma";
import { channelStateSchema, CONTENT_HUB_CHANNELS, type ChannelState } from "@/contracts/content-hub";

/** 内容行最小输入（id 已足够；其余由调用方透传） */
type RowLike = { id: number };

/** 比较两个 job 谁更新：scheduledAt 优先，均空则 createdAt，再空按 id */
function newer(j1: { scheduledAt: Date | null; createdAt: Date; id: number }, j2: { scheduledAt: Date | null; createdAt: Date; id: number }): boolean {
  const t1 = j1.scheduledAt?.getTime() ?? j1.createdAt.getTime();
  const t2 = j2.scheduledAt?.getTime() ?? j2.createdAt.getTime();
  if (t1 !== t2) return t1 > t2;
  return j1.id > j2.id;
}

/**
 * 组装一组内容条目的渠道状态。
 * 输入为任意含 id 的行数组（路由层在 mapList / 详情组装时透传），
 * 返回 `Map<itemId, ChannelState[]>`，供调用方浅合并到行对象。
 */
export async function buildItemChannels(rows: RowLike[]): Promise<Map<number, ChannelState[]>> {
  const ids = rows.map((r) => r.id).filter((id) => Number.isInteger(id));
  const map = new Map<number, ChannelState[]>();
  for (const id of ids) map.set(id, []);
  if (ids.length === 0) return map;

  const [channels, jobs] = await Promise.all([
    prisma.contentChannel.findMany({ where: { itemId: { in: ids } } }),
    prisma.publishJob.findMany({ where: { itemId: { in: ids } } }),
  ]);
  const byItemCh = new Map<number, (typeof channels)[number][]>();
  for (const c of channels) {
    const arr = byItemCh.get(c.itemId) ?? [];
    arr.push(c);
    byItemCh.set(c.itemId, arr);
  }
  const byItemJob = new Map<number, (typeof jobs)[number][]>();
  for (const j of jobs) {
    if (j.itemId == null) continue;
    const arr = byItemJob.get(j.itemId) ?? [];
    arr.push(j);
    byItemJob.set(j.itemId, arr);
  }

  for (const id of ids) {
    // 每渠道最近一条 PublishJob（scheduledAt 优先；同刻比 id）
    const latestJob = new Map<string, (typeof jobs)[number]>();
    for (const j of byItemJob.get(id) ?? []) {
      const cur = latestJob.get(j.channel);
      if (!cur || newer(j, cur)) latestJob.set(j.channel, j);
    }
    // 每渠道最新 ContentChannel（id 最大）
    const latestCh = new Map<string, (typeof channels)[number]>();
    for (const c of byItemCh.get(id) ?? []) {
      const cur = latestCh.get(c.channel);
      if (!cur || c.id > cur.id) latestCh.set(c.channel, c);
    }
    const states: ChannelState[] = [];
    for (const kind of CONTENT_HUB_CHANNELS) {
      const job = latestJob.get(kind);
      const ch = latestCh.get(kind);
      // ADR-034 §3：`publishedAt` ← `ContentChannel.publishedAt`（真实存在；§3 表笔误写成 PublishJob），
      // `scheduledAt` ← `PublishJob.scheduledAt`（正解）。ContentChannel.publishedAt 为空时回退
      // job.finishedAt（发布完成时刻）保证渠道态有发布时刻可读。
      const publishedAt = ch?.publishedAt ?? job?.finishedAt ?? null;
      states.push(
        channelStateSchema.parse({
          channel: kind,
          accountId: ch?.accountId ?? null,
          status: (ch?.status ?? "unsent") as ChannelState["status"],
          scheduledAt: job?.scheduledAt?.toISOString() ?? null,
          publishedAt: publishedAt?.toISOString() ?? null,
          externalUrl: ch?.externalUrl ?? null,
          errMsg: ch?.errMsg ?? null,
        })
      );
    }
    map.set(id, states);
  }
  return map;
}

/** 单条内容详情渠道状态（`buildItemChannels` 的单行快捷） */
export async function buildItemChannelsFor(itemId: number): Promise<ChannelState[]> {
  const m = await buildItemChannels([{ id: itemId }]);
  return m.get(itemId) ?? [];
}
