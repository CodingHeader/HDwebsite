import { crudList } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { withApi } from "@/lib/api-handler";
import { created, error, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { publishJobCreateSchema } from "@/contracts/resources";
import { getChannel } from "@/lib/channels/registry";
import { invalidateWebContent } from "@/lib/cache-tags";
import { clientIp, logOperation } from "@/lib/log";

const spec = crudSpecs["publish-jobs"];
export const dynamic = "force-dynamic";

export const GET = crudList(spec);

/**
 * 创建发布任务（B-07 G1，ADR-034 多渠道映射）
 * - `channels` 数组 1~2 个（与旧单 `channel` 二选一；服务端把 `channel` 规范化为 `[channel]`）
 * - 一次事务创建多条 PublishJob：任一条校验失败整体回滚（不落半套任务）
 * - `scheduledAt` 可选；缺省视为立即（系统每分钟 scan）
 * - 权限 `publish:create`（与 E-09 前端 canPublish 一致）；审计按渠道各记一条
 */
export const POST = withApi(
  async ({ request, session }) => {
    const body = await request.json().catch(() => ({}));
    const input = publishJobCreateSchema.safeParse(body);
    if (!input.success) return validationError(input.error.issues);
    const v = input.data;
    const channels = v.channels ?? [v.channel];
    const uniq = [...new Set(channels)];
    if (uniq.length !== channels.length) return error("多渠道发布渠道重复", 400);
    if (!v.itemId) return error("发布任务必须关联内容条目", 400);

    const item = await prisma.contentItem.findUnique({ where: { id: v.itemId } });
    if (!item) return error("内容条目不存在", 404);
    if (item.status !== "approved" && item.status !== "published") {
      return error(`内容未通过审核（当前 ${item.status}），不能发布`, 400);
    }
    const scheduledAt = v.scheduledAt ? new Date(v.scheduledAt) : new Date();

    // 每渠道校验：公众号需可用账号；重复渠道去重后的账号一致性问题在事务内再校验
    const plans: { channel: string; contentType: string; accountId: number | null }[] = [];
    for (const kind of uniq) {
      const impl = getChannel(kind);
      let accountId: number | null = null;
      if (impl.requiresAccount) {
        const account = await prisma.wechatAccount.findFirst({ where: { status: "active", type: "service", freepublishEnabled: true } });
        if (!account) {
          return error(`未配置可用的公众号账号，无法创建公众号发布任务（凭证后补，ADR-002）`, 400);
        }
        accountId = account.id;
      }
      plans.push({ channel: kind, contentType: v.contentType, accountId });
    }

    // 事务：任一条创建失败整体回滚
    const jobs = await prisma.$transaction(
      plans.map((p) =>
        prisma.publishJob.create({
          data: {
            itemId: v.itemId!,
            channel: p.channel,
            accountId: p.accountId,
            contentType: p.contentType,
            action: v.action,
            status: "scheduled",
            scheduledAt,
            preNotify: v.preNotify,
          },
        })
      )
    );

    // 多渠道任务属内容级写入，使前台文章/首页缓存失效（与 crudCreate 同一纪律）
    invalidateWebContent(["web:articles", "web:home"]);

    await logOperation({
      userId: session.id,
      username: session.username,
      module: spec.logModule ?? spec.permission,
      action: "create",
      title: item.title,
      after: { channels: jobs.map((j) => ({ id: j.id, channel: j.channel, scheduledAt: j.scheduledAt?.toISOString() ?? null })) },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return created({ list: jobs }, `创建发布任务成功（${uniq.join("、")}）`);
  },
  {
    permission: "publish:create",
    errorMessage: "创建发布任务失败",
    route: "publish-jobs/POST",
    conflictMessage: { foreignKey: "关联内容不存在" },
  }
);
