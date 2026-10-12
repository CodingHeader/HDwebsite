/**
 * 资源契约（R0 全资源 CRUD 的请求 Schema 唯一源）
 * 命名：xxxCreate / xxxUpdate；Update 一律由 Create.partial() 派生（除非需要收窄）。
 */
import { z } from "zod";
import { articleStatusSchema } from "./article";

const sortStatus = {
  sort: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "draft", "archived", "hidden"]).default("active"),
};

// ── 分类 / 标签 ──────────────────────────────────────────────
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100),
  slug: z.string().max(120).regex(/^[a-z0-9一-龥-]*$/, "slug 仅允许小写字母、数字与连字符").nullable().optional(),
  description: z.string().max(500).nullable().optional().nullable(),
  image: z.string().max(500).nullable().optional().nullable(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(["article", "course", "partner"]).default("article"),
  sort: sortStatus.sort,
  isNav: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(120).regex(/^[a-z0-9一-龥-]*$/).nullable().optional(),
});
export type TagCreate = z.infer<typeof tagCreateSchema>;

// ── 课程 / 专业 / 招生计划 ────────────────────────────────────
export const courseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional().nullable(),
  price: z.coerce.number().min(0).default(0),
  priceText: z.string().max(50).nullable().optional().nullable(),
  duration: z.string().max(50).nullable().optional().nullable(),
  outline: z.string().max(10000).nullable().optional().nullable(),
  cover: z.string().max(500).nullable().optional().nullable(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  majorId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const majorCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(120).regex(/^[a-z0-9一-龥-]*$/).nullable().optional(),
  description: z.string().max(1000).nullable().optional().nullable(),
  duration: z.string().max(50).nullable().optional().nullable(),
  cover: z.string().max(500).nullable().optional().nullable(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const offeringCreateSchema = z.object({
  majorId: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
  sourceBatch: z.string().max(20).default("26春"),
  educationType: z.string().max(20).default("自考"),
  level: z.string().max(50).nullable().optional().nullable(),
  majorCode: z.string().max(50).nullable().optional().nullable(),
  studyForm: z.string().max(50).nullable().optional().nullable(),
  yearTuition: z.coerce.number().min(0).nullable().optional(),
  totalTuition: z.coerce.number().min(0).nullable().optional(),
  feeDetail: z.string().max(2000).nullable().optional().nullable(),
  extraFeeNote: z.string().max(500).nullable().optional().nullable(),
  hasPrice: z.boolean().default(false),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 报名线索 ─────────────────────────────────────────────────
export const studentCreateSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(5).max(20),
  courseId: z.coerce.number().int().positive().nullable().optional(),
  message: z.string().max(1000).nullable().optional().nullable(),
  status: z.enum(["pending", "contacted", "converted", "invalid"]).default("pending"),
});

// ── 院校 / 校区 / 图库 / 轮播 ─────────────────────────────────
export const partnerCreateSchema = z.object({
  name: z.string().min(1).max(100),
  logo: z.string().max(500).nullable().optional().nullable(),
  website: z.string().max(500).nullable().optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const campusCreateSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(300).nullable().optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const campusImageCreateSchema = z.object({
  campusId: z.coerce.number().int().positive(),
  image: z.string().min(1).max(500),
  caption: z.string().max(200).nullable().optional().nullable(),
  sort: sortStatus.sort,
});

export const galleryCreateSchema = z.object({
  title: z.string().min(1).max(100),
  image: z.string().min(1).max(500),
  category: z.enum(["certificate", "exam", "campus"]).default("certificate"),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const bannerCreateSchema = z.object({
  image: z.string().min(1).max(500),
  link: z.string().max(500).nullable().optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 首页卡片 / 热门专业 / 服务指南 ────────────────────────────
export const homeCardCreateSchema = z.object({
  title: z.string().min(1).max(50),
  subtitle: z.string().max(100).nullable().optional().nullable(),
  icon: z.string().max(50).nullable().optional().nullable(),
  href: z.string().max(300).nullable().optional().nullable(),
  gradient: z.string().max(200).nullable().optional().nullable(),
  hoverGradient: z.string().max(200).nullable().optional().nullable(),
  shadow: z.string().max(200).nullable().optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const hotMajorCreateSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(50).default("专升本"),
  description: z.string().max(500).nullable().optional().nullable(),
  duration: z.string().max(50).default("2年"),
  iconType: z.enum(["text", "image"]).default("text"),
  iconImage: z.string().max(500).nullable().optional().nullable(),
  iconColor: z.string().max(50).nullable().optional().nullable(),
  backgroundImage: z.string().max(500).nullable().optional().nullable(),
  link: z.string().max(300).default("/apply"),
  majorId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const serviceGuideCreateSchema = z.object({
  title: z.string().min(1).max(100),
  slug: z.string().max(120).regex(/^[a-z0-9一-龥-]*$/).nullable().optional(),
  subtitle: z.string().max(200).nullable().optional().nullable(),
  content: z.string().max(100000).nullable().optional().nullable(),
  contentType: z.enum(["html", "markdown"]).default("html"),
  icon: z.string().max(50).nullable().optional().nullable(),
  link: z.string().max(300).nullable().optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 导航 ─────────────────────────────────────────────────────
export const navigationCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(120).regex(/^[a-z0-9一-龥-]*$/).nullable().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  level: z.coerce.number().int().min(1).max(5).default(1),
  icon: z.string().max(50).nullable().optional().nullable(),
  link: z.string().max(300).nullable().optional().nullable(),
  linkType: z.enum(["internal", "external", "dropdown"]).default("internal"),
  target: z.string().max(20).default("_self"),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  contentType: z.string().max(50).nullable().optional().nullable(),
  sort: sortStatus.sort,
  isVisible: z.boolean().default(true),
  isNav: z.boolean().default(true),
});

// ── 用户 / 角色（管理端账号体系） ─────────────────────────────
export const userCreateSchema = z.object({
  username: z.string().min(3, "用户名至少 3 位").max(64),
  password: z.string().min(6, "密码至少 6 位").max(128),
  nickname: z.string().max(50).nullable().optional().nullable(),
  email: z.string().email("邮箱格式不正确").nullable().optional().nullable().or(z.literal("")),
  phone: z.string().max(20).nullable().optional().nullable(),
  roleId: z.coerce.number().int().positive(),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  nickname: z.string().max(50).nullable().optional().nullable(),
  email: z.string().email("邮箱格式不正确").nullable().optional().nullable().or(z.literal("")),
  phone: z.string().max(20).nullable().optional().nullable(),
  roleId: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  password: z.string().min(6).max(128).nullable().optional(), // 传入则重置密码（null=不改）
});

export const roleCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(50).regex(/^[a-z0-9一-龥-]*$/).nullable().optional(),
  description: z.string().max(200).nullable().optional().nullable(),
  permissions: z.array(z.string()).default([]),
  isSuper: z.boolean().default(false),
  status: z.enum(["active", "archived"]).default("active"),
});

// ── AI 场景 / 本地知识库 ─────────────────────────────────────
export const chatSceneCreateSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9一-龥-]*$/, "code 仅允许小写字母数字与连字符"),
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable().optional().nullable(),
  greeting: z.string().min(1).max(500),
  systemPrompt: z.string().min(1).max(5000),
  knowledgeTags: z.string().max(500).nullable().optional().nullable(),
  baseIds: z.string().max(500).nullable().optional().nullable(),
  starters: z.string().max(2000).nullable().optional().nullable(),
  useKnowledgeBase: z.boolean().default(true),
  // P06：场景专属模型（空 = 走网关默认路由：isDefault → priority → isFallback）
  llmProviderId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "archived"]).default("active"),
});

export const knowledgeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100000),
  tags: z.string().max(500).nullable().optional().nullable(),
  source: z.enum(["local", "notion", "feishu", "web", "collect"]).default("local"),
  externalUrl: z.string().max(500).nullable().optional().nullable(),
  priority: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const contentItemCreateSchema = z.object({
  title: z.string().min(1).max(300),
  contentType: z.enum(["markdown", "html"]).default("markdown"),
  content: z.string().min(1).max(200000),
  excerpt: z.string().max(500).nullable().optional().nullable(),
  coverImage: z.string().max(500).nullable().optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  source: z.enum(["manual", "collect"]).default("manual"),
  // P06 / ADR-017：通用 CRUD 只允许编辑态；approved/rejected 走 POST /api/content-items/[id]/review（review:edit），
  // published 只由发布执行器写入
  status: z
    .enum(["draft", "pending_review", "offline"], { message: "状态只能是 draft/pending_review/offline（审核与发布走专用端点）" })
    .default("draft"),
});

// ── 通知（SOL-005） ─────────────────────────────────────────
export const recipientCreateSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email("邮箱格式不正确"),
  groups: z.array(z.string()).default(["publish"]),
  enabled: z.boolean().default(true),
});

export const notifyRuleUpdateSchema = z.object({
  enabled: z.boolean().nullable().optional(),
  templateId: z.coerce.number().int().positive().nullable().optional(),
  recipientGroups: z.array(z.string()).nullable().optional(),
});

export const notifyTemplateCreateSchema = z.object({
  name: z.string().min(1).max(50),
  event: z.string().max(50).nullable().optional().nullable(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  isDefault: z.boolean().default(false),
});

// ── 采集源（SOL-004） ────────────────────────────────────────
export const collectSourceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["html", "rss"]).default("html"),
  url: z.string().url("URL 格式不正确"),
  parser: z.string().max(2000).nullable().optional().nullable(),
  // 空串 = 仅手动执行（P06：调度器跳过空 cron）
  cron: z
    .string()
    .max(50)
    .refine((v) => v.trim() === "" || v.trim().split(/\s+/).length >= 5, "Cron 表达式至少 5 段，或留空表示仅手动执行")
    .default("0 4 * * *"),
  autoTags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  // P06：新条目默认入知识库（M-8）；autoApprove=超管预授权直接通过（默认关闭，ADR-017 附注）
  autoToKb: z.boolean().default(true),
  autoApprove: z.boolean().default(false),
});

export const collectItemUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "imported"]).nullable().optional(),
  title: z.string().max(300).nullable().optional(),
  contentMd: z.string().max(200000).nullable().optional(),
  summary: z.string().max(1000).nullable().optional().nullable(),
});

// ── 发布任务（SOL-005） ──────────────────────────────────────
export const publishJobCreateSchema = z.object({
  itemId: z.coerce.number().int().positive().nullable().optional(),
  contentType: z.enum(["article", "info", "service_guide", "wechat"]).default("article"),
  channel: z.enum(["website", "wechat"]).default("website"),
  accountId: z.coerce.number().int().positive().nullable().optional(),
  action: z.enum(["publish", "update", "offline"]).default("publish"),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  preNotify: z.boolean().default(true),
});

// ── 公众号账号（SOL-006） ────────────────────────────────────
export const wechatAccountCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["service", "subscription"]).default("service"),
  appid: z.string().min(1).max(64),
  appSecret: z.string().min(1).max(128),
  verifyToken: z.string().max(128).nullable().optional().nullable(),
  encodingAESKey: z.string().max(128).nullable().optional().nullable(),
  aiEnabled: z.boolean().default(true),
  freepublishEnabled: z.boolean().default(true),
  sceneId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
});

export const wechatAccountUpdateSchema = wechatAccountCreateSchema.partial().extend({
  appSecret: z.string().max(128).nullable().optional(), // 更新时可不传（掩码保护）
});

// ── LLM Provider（SOL-003） ──────────────────────────────────
export const llmProviderCreateSchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(["openai", "coze"]).default("openai"),
  endpoint: z.string().url("端点必须是 URL"),
  apiKey: z.string().min(1).max(500),
  botId: z.string().max(64).nullable().optional().nullable(),
  model: z.string().min(1).max(100),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  maxTokens: z.coerce.number().int().min(1).max(100000).default(2048),
  priority: z.coerce.number().int().min(1).max(999).default(10),
  isDefault: z.boolean().default(false),
  isFallback: z.boolean().default(false),
  balanceThreshold: z.coerce.number().min(0).nullable().optional(),
  dailyQuota: z.coerce.number().int().min(1).default(1000),
  rateLimit: z.coerce.number().int().min(1).default(60),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const llmProviderUpdateSchema = llmProviderCreateSchema.partial().extend({
  apiKey: z.string().max(500).nullable().optional(), // 掩码保护：含 **** 跳过
  balance: z.coerce.number().min(0).nullable().optional(),
});

export const providerBalanceSchema = z.object({
  balance: z.coerce.number().min(0),
  balanceCurrency: z.string().max(10).default("CNY"),
});

export const providerTestSchema = z.object({
  prompt: z.string().max(500).default("你好，请回复“连通正常”四个字。"),
});

// ── P03：日志 / 对话日志 / 媒体编辑与批量 / 文章状态切换 ─────────────
const optionalDate = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.date().optional()
);
const optionalTrimmed = (max: number) =>
  z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(max).optional());

/** GET /api/logs 查询（操作日志；log:list） */
export const operationLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    keyword: optionalTrimmed(200),
    module: optionalTrimmed(64),
    action: optionalTrimmed(64),
    username: optionalTrimmed(64),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: "开始时间不能晚于结束时间",
    path: ["startDate"],
  });
export type OperationLogQuery = z.infer<typeof operationLogQuerySchema>;

/** 对话会话 ID（chat/stream 写入口径：8~64 位） */
export const chatSessionIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.:-]+$/, "非法的会话 ID");

/**
 * GET /api/chat-history 查询（按会话聚合；log:list）
 * 说明：main 的公开 POST /api/chat-history 不恢复——upgrade 由 /api/chat/stream 在服务端写入
 * AIChatHistory（replaced 行为，避免前台伪造对话记录）。
 */
export const chatHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    keyword: optionalTrimmed(200),
    channel: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["website", "wechat"]).optional()),
    sessionId: z.preprocess((v) => (v === "" ? undefined : v), chatSessionIdSchema.optional()),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: "开始时间不能晚于结束时间",
    path: ["startDate"],
  });
export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;

/** PATCH /api/media/[id]：改名 / 改分类（media:edit） */
export const mediaUpdateSchema = z
  .object({
    filename: z.string().trim().min(1, "文件名不能为空").max(255).optional(),
    category: z.string().trim().max(64).nullable().optional(),
    type: z.enum(["image", "video", "document"]).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个要修改的字段" });
export type MediaUpdate = z.infer<typeof mediaUpdateSchema>;

const mediaIds = z
  .array(z.coerce.number().int().positive())
  .min(1, "请选择至少 1 个媒体")
  .max(100, "单次最多操作 100 个媒体");

/** POST /api/media/batch：批量删除（media:delete）/ 批量移动分类（media:edit） */
export const mediaBatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: mediaIds }),
  z.object({
    action: z.literal("move-category"),
    ids: mediaIds,
    category: z.string().trim().max(64).nullable(),
  }),
]);
export type MediaBatch = z.infer<typeof mediaBatchSchema>;

/** PATCH /api/articles/[id]：一键上下线（article:publish） */
export const articleStatusPatchSchema = z
  .object({ status: articleStatusSchema })
  .strict();
export type ArticleStatusPatch = z.infer<typeof articleStatusPatchSchema>;

/** GET /api/navigations?tree=true 查询（前台公开树 / 管理端全量树） */
export const navigationTreeQuerySchema = z.object({
  tree: z.literal("true"),
  level: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(3).optional()),
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["active", "inactive"]).optional()),
  isVisible: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["true", "false"]).optional()),
});
export type NavigationTreeQuery = z.infer<typeof navigationTreeQuerySchema>;
