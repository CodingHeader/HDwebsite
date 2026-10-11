/**
 * 资源契约（R0 全资源 CRUD 的请求 Schema 唯一源）
 * 命名：xxxCreate / xxxUpdate；Update 一律由 Create.partial() 派生（除非需要收窄）。
 */
import { z } from "zod";

const sortStatus = {
  sort: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "draft", "archived", "hidden"]).default("active"),
};

// ── 分类 / 标签 ──────────────────────────────────────────────
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/, "slug 仅允许小写字母、数字与连字符").optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(["article", "course", "partner"]).default("article"),
  sort: sortStatus.sort,
  isNav: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/).optional(),
});
export type TagCreate = z.infer<typeof tagCreateSchema>;

// ── 课程 / 专业 / 招生计划 ────────────────────────────────────
export const courseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().min(0).default(0),
  priceText: z.string().max(50).optional().nullable(),
  duration: z.string().max(50).optional().nullable(),
  outline: z.string().max(10000).optional().nullable(),
  cover: z.string().max(500).optional().nullable(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  majorId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const majorCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/).optional(),
  description: z.string().max(1000).optional().nullable(),
  duration: z.string().max(50).optional().nullable(),
  cover: z.string().max(500).optional().nullable(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const offeringCreateSchema = z.object({
  majorId: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
  sourceBatch: z.string().max(20).default("26春"),
  educationType: z.string().max(20).default("自考"),
  level: z.string().max(50).optional().nullable(),
  majorCode: z.string().max(50).optional().nullable(),
  studyForm: z.string().max(50).optional().nullable(),
  yearTuition: z.coerce.number().min(0).nullable().optional(),
  totalTuition: z.coerce.number().min(0).nullable().optional(),
  feeDetail: z.string().max(2000).optional().nullable(),
  extraFeeNote: z.string().max(500).optional().nullable(),
  hasPrice: z.boolean().default(false),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 报名线索 ─────────────────────────────────────────────────
export const studentCreateSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(5).max(20),
  courseId: z.coerce.number().int().positive().nullable().optional(),
  message: z.string().max(1000).optional().nullable(),
  status: z.enum(["pending", "contacted", "converted", "invalid"]).default("pending"),
});

// ── 院校 / 校区 / 图库 / 轮播 ─────────────────────────────────
export const partnerCreateSchema = z.object({
  name: z.string().min(1).max(100),
  logo: z.string().max(500).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const campusCreateSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(300).optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const campusImageCreateSchema = z.object({
  campusId: z.coerce.number().int().positive(),
  image: z.string().min(1).max(500),
  caption: z.string().max(200).optional().nullable(),
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
  link: z.string().max(500).optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 首页卡片 / 热门专业 / 服务指南 ────────────────────────────
export const homeCardCreateSchema = z.object({
  title: z.string().min(1).max(50),
  subtitle: z.string().max(100).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  href: z.string().max(300).optional().nullable(),
  gradient: z.string().max(200).optional().nullable(),
  hoverGradient: z.string().max(200).optional().nullable(),
  shadow: z.string().max(200).optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const hotMajorCreateSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(50).default("专升本"),
  description: z.string().max(500).optional().nullable(),
  duration: z.string().max(50).default("2年"),
  iconType: z.enum(["text", "image"]).default("text"),
  iconImage: z.string().max(500).optional().nullable(),
  iconColor: z.string().max(50).optional().nullable(),
  backgroundImage: z.string().max(500).optional().nullable(),
  link: z.string().max(300).default("/apply"),
  majorId: z.coerce.number().int().positive().nullable().optional(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const serviceGuideCreateSchema = z.object({
  title: z.string().min(1).max(100),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/).optional(),
  subtitle: z.string().max(200).optional().nullable(),
  content: z.string().max(100000).optional().nullable(),
  contentType: z.enum(["html", "markdown"]).default("html"),
  icon: z.string().max(50).optional().nullable(),
  link: z.string().max(300).optional().nullable(),
  sort: sortStatus.sort,
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// ── 导航 ─────────────────────────────────────────────────────
export const navigationCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/).optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  level: z.coerce.number().int().min(1).max(5).default(1),
  icon: z.string().max(50).optional().nullable(),
  link: z.string().max(300).optional().nullable(),
  linkType: z.enum(["internal", "external", "dropdown"]).default("internal"),
  target: z.string().max(20).default("_self"),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  contentType: z.string().max(50).optional().nullable(),
  sort: sortStatus.sort,
  isVisible: z.boolean().default(true),
  isNav: z.boolean().default(true),
});

// ── 用户 / 角色（管理端账号体系） ─────────────────────────────
export const userCreateSchema = z.object({
  username: z.string().min(3, "用户名至少 3 位").max(64),
  password: z.string().min(6, "密码至少 6 位").max(128),
  nickname: z.string().max(50).optional().nullable(),
  email: z.string().email("邮箱格式不正确").optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  roleId: z.coerce.number().int().positive(),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  nickname: z.string().max(50).optional().nullable(),
  email: z.string().email("邮箱格式不正确").optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(128).nullable().optional(), // 传入则重置密码（null=不改）
});

export const roleCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(50).regex(/^[a-z0-9-]*$/).nullable().optional(),
  description: z.string().max(200).optional().nullable(),
  permissions: z.array(z.string()).default([]),
  isSuper: z.boolean().default(false),
  status: z.enum(["active", "archived"]).default("active"),
});

// ── AI 场景 / 本地知识库 ─────────────────────────────────────
export const chatSceneCreateSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]*$/, "code 仅允许小写字母数字与连字符"),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional().nullable(),
  greeting: z.string().min(1).max(500),
  systemPrompt: z.string().min(1).max(5000),
  knowledgeTags: z.string().max(500).optional().nullable(),
  baseIds: z.string().max(500).optional().nullable(),
  starters: z.string().max(2000).optional().nullable(),
  useKnowledgeBase: z.boolean().default(true),
  sort: sortStatus.sort,
  status: z.enum(["active", "archived"]).default("active"),
});

export const knowledgeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100000),
  tags: z.string().max(500).optional().nullable(),
  source: z.enum(["local", "notion", "feishu", "web", "collect"]).default("local"),
  externalUrl: z.string().max(500).optional().nullable(),
  priority: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const contentItemCreateSchema = z.object({
  title: z.string().min(1).max(300),
  contentType: z.enum(["markdown", "html"]).default("markdown"),
  content: z.string().min(1).max(200000),
  excerpt: z.string().max(500).optional().nullable(),
  coverImage: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  source: z.enum(["manual", "collect"]).default("manual"),
  status: z.enum(["draft", "pending_review", "approved", "published", "offline"]).default("draft"),
});

// ── 通知（SOL-005） ─────────────────────────────────────────
export const recipientCreateSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email("邮箱格式不正确"),
  groups: z.array(z.string()).default(["publish"]),
  enabled: z.boolean().default(true),
});

export const notifyRuleUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  templateId: z.coerce.number().int().positive().nullable().optional(),
  recipientGroups: z.array(z.string()).optional(),
});

export const notifyTemplateCreateSchema = z.object({
  name: z.string().min(1).max(50),
  event: z.string().max(50).optional().nullable(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  isDefault: z.boolean().default(false),
});

// ── 采集源（SOL-004） ────────────────────────────────────────
export const collectSourceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["html", "rss"]).default("html"),
  url: z.string().url("URL 格式不正确"),
  parser: z.string().max(2000).optional().nullable(),
  cron: z.string().min(5).max(50).default("0 4 * * *"),
  autoTags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const collectItemUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "imported"]).optional(),
  title: z.string().max(300).optional(),
  contentMd: z.string().max(200000).optional(),
  summary: z.string().max(1000).optional().nullable(),
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
  verifyToken: z.string().max(128).optional().nullable(),
  encodingAESKey: z.string().max(128).optional().nullable(),
  aiEnabled: z.boolean().default(true),
  freepublishEnabled: z.boolean().default(true),
  sceneId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
});

export const wechatAccountUpdateSchema = wechatAccountCreateSchema.partial().extend({
  appSecret: z.string().max(128).optional(), // 更新时可不传（掩码保护）
});

// ── LLM Provider（SOL-003） ──────────────────────────────────
export const llmProviderCreateSchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(["openai", "coze"]).default("openai"),
  endpoint: z.string().url("端点必须是 URL"),
  apiKey: z.string().min(1).max(500),
  botId: z.string().max(64).optional().nullable(),
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
  apiKey: z.string().max(500).optional(), // 掩码保护：含 **** 跳过
  balance: z.coerce.number().min(0).nullable().optional(),
});

export const providerBalanceSchema = z.object({
  balance: z.coerce.number().min(0),
  balanceCurrency: z.string().max(10).default("CNY"),
});

export const providerTestSchema = z.object({
  prompt: z.string().max(500).default("你好，请回复“连通正常”四个字。"),
});
