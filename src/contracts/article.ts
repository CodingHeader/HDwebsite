/**
 * 契约：文章（Article，官网渠道内容；channel=news|info，ADR-001）
 */
import { z } from "zod";
import { listQuerySchema } from "./common";

export const articleChannelSchema = z.enum(["news", "info"]);
export const articleContentTypeSchema = z.enum(["html", "markdown"]);
export const articleStatusSchema = z.enum(["draft", "published", "archived"]);

export const articleListQuerySchema = listQuerySchema.extend({
  channel: articleChannelSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: articleStatusSchema.optional(),
  tagId: z.coerce.number().int().positive().optional(),
});

export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

export const articleCreateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9\u4e00-\u9fa5-]*$/, "slug 仅允许小写字母、数字、中文与连字符")
    .optional(),
  content: z.string().min(1, "正文不能为空"),
  contentType: articleContentTypeSchema.default("html"),
  channel: articleChannelSchema.default("info"),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().max(500).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
  status: articleStatusSchema.default("draft"),
  isTop: z.boolean().default(false),
  isRecommend: z.boolean().default(false),
  isHot: z.boolean().default(false),
  seoTitle: z.string().max(200).optional(),
  seoKeywords: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

export const articleUpdateSchema = articleCreateSchema.partial();
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const articleSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  coverImage: z.string().nullable(),
  channel: articleChannelSchema,
  contentType: articleContentTypeSchema,
  status: articleStatusSchema,
  isTop: z.boolean(),
  viewCount: z.number(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type ArticleSummary = z.infer<typeof articleSummarySchema>;
