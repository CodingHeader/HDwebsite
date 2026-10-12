/**
 * 按日浏览统计（ADR-026，P06 接入）：(contentType, contentId, viewDate=当天 00:00 Asia/Shanghai) upsert pageViews += 1。
 * uniqueVisitors 口径（匿名 cookie 去重）尚未写入需求，暂不计（保持 0）。写入失败只记日志，不影响页面渲染。
 */
import { prisma } from "@/lib/prisma";

/** Asia/Shanghai（UTC+8，无夏令时）当天 00:00 对应的 UTC 时刻 */
export function shanghaiDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + 8 * 3600_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 8 * 3600_000);
}

export async function recordView(contentType: string, contentId: number, opts: { referrer?: string | null } = {}): Promise<void> {
  try {
    const viewDate = shanghaiDay();
    await prisma.viewStats.upsert({
      where: { contentType_contentId_viewDate: { contentType, contentId, viewDate } },
      update: { pageViews: { increment: 1 } },
      create: { contentType, contentId, viewDate, pageViews: 1, referrer: opts.referrer ?? null },
    });
  } catch (err) {
    console.error("[view-stats] 记录浏览失败：", err);
  }
}
