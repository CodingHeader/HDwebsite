/**
 * 契约：内容中枢（官网 + 公众号统一视图；CCR-1 / W0-10 新增）
 * 来源：`18-V0.6-W0过闸复核与统一规划.md` §4 契约①；消费卡：B-07（内容中枢 API）、E-09（内容中枢页）。
 *
 * 约定：
 * - CHANNEL_STATUSES 唯一源 = `prisma/schema.prisma` 的 `ContentChannel.status` 列取值，数组派生 zod（ADR-027 同款纪律）。
 * - `channelState.scheduledAt` / `publishedAt` 是**派生字段**（ContentChannel 无此列）：取该渠道最近一条
 *   PublishJob.scheduledAt / publishedAt，由 B-07 在服务端组装（见 ADR-034 §派生字段）。
 * - 本模块只依赖 zod 与 kinds.ts，无运行时副作用（可被客户端组件安全导入）。
 */
import { z } from "zod";
import { channelKindSchema, type ChannelKind } from "./kinds";

/** 渠道发布状态（= `ContentChannel.status` 列取值） */
export const CHANNEL_STATUSES = ["unsent", "scheduled", "publishing", "published", "failed"] as const;
export const channelStatusSchema = z.enum(CHANNEL_STATUSES);
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

/** 单渠道状态视图（B-07 组装、E-09 展示；scheduledAt/publishedAt 为派生字段，见 ADR-034） */
export const channelStateSchema = z.object({
  channel: channelKindSchema,
  /** 绑定的公众号账号；官网渠道为 null */
  accountId: z.coerce.number().int().positive().nullable(),
  status: channelStatusSchema,
  /** 派生：该渠道最近一条 PublishJob.scheduledAt（ContentChannel 无此列） */
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  /** 公众号文章外链 / 官网页面路径 */
  externalUrl: z.string().nullable(),
  /** 最近一次失败原因（B-07 写入；E-09 错误态展示） */
  errMsg: z.string().nullable(),
});
export type ChannelState = z.infer<typeof channelStateSchema>;

/** 内容中枢条目（跨 article/info/service_guide 聚合视图） */
export const contentHubItemSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string(),
  contentType: z.enum(["markdown", "html"]),
  source: z.enum(["manual", "collect"]),
  updatedAt: z.string().datetime({ offset: true }),
  channels: z.array(channelStateSchema),
});
export type ContentHubItem = z.infer<typeof contentHubItemSchema>;

/** 渠道列（E-09 表头 / B-07 排序用；加法常量） */
export const CONTENT_HUB_CHANNELS: readonly ChannelKind[] = ["website", "wechat"];
