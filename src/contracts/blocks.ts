/**
 * 区块配置契约（ADR-024 / P06）：PageTemplate / ContentBlock / TemplateBlock / ElementConfig 的 create/update/query schema。
 * JSON-in-String 字段（config/query/content/style/interactions/position/*State）接受对象或 JSON 串，路由层统一序列化。
 */
import { z } from "zod";

const jsonField = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string().max(20000)])
  .nullable()
  .optional();

const code = z.string().min(1, "code 不能为空").max(100).regex(/^[a-z0-9][a-z0-9_-]*$/, "code 仅允许小写字母、数字、- 与 _");
const status = z.enum(["active", "inactive"]).default("active");

export const pageTemplateCreateSchema = z.object({
  code,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  layout: z.enum(["default", "sidebar", "fullwidth"]).default("default"),
  contentType: z.string().max(50).nullable().optional(),
  templateFile: z.string().min(1).max(300),
  thumbnail: z.string().max(500).nullable().optional(),
  config: jsonField,
  status,
  isDefault: z.boolean().default(false),
});
export const pageTemplateUpdateSchema = pageTemplateCreateSchema.partial();

export const contentBlockCreateSchema = z.object({
  code,
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(300).nullable().optional(),
  contentType: z.string().max(50).nullable().optional(),
  query: jsonField,
  limit: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  content: jsonField,
  style: jsonField,
  interactions: jsonField,
  status,
});
export const contentBlockUpdateSchema = contentBlockCreateSchema.partial();

/** TemplateBlock.config：{ enabled?: boolean, ...区块特有 props } */
export const templateBlockCreateSchema = z.object({
  templateId: z.coerce.number().int().positive("templateId 必须为正整数"),
  blockId: z.coerce.number().int().positive("blockId 必须为正整数"),
  sort: z.coerce.number().int().min(0).default(0),
  config: jsonField,
});
export const templateBlockUpdateSchema = templateBlockCreateSchema.partial();

export const elementConfigCreateSchema = z.object({
  elementId: z.string().min(1).max(50),
  elementName: z.string().min(1).max(100),
  layer: z.coerce.number().int().min(1, "layer 取值 1-14").max(14, "layer 取值 1-14"),
  layerName: z.string().min(1).max(50),
  navigationId: z.coerce.number().int().positive().nullable().optional(),
  elementType: z.string().max(50).nullable().optional(),
  selector: z.string().max(300).nullable().optional(),
  position: jsonField,
  interactions: jsonField,
  normalState: jsonField,
  hoverState: jsonField,
  activeState: jsonField,
  content: z.string().max(2000).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  status,
  sort: z.coerce.number().int().min(0).default(0),
});
export const elementConfigUpdateSchema = elementConfigCreateSchema.partial();

/** 列表查询附加过滤（与 crud-resources filters 对齐） */
export const blockListFilterSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  templateId: z.coerce.number().int().positive().optional(),
  layer: z.coerce.number().int().optional(),
});

// ── W0-05：区块注册表 DTO（E-03 首页区块配置页 ↔ GET /api/home-blocks/registry）────
/** 注册表一项 = 一个可插入首页的区块（`code` 来自 `src/lib/block-registry-defs.ts` 的 `BLOCK_REGISTRY`） */
export const blockRegistryItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  defaultOrder: z.number().int(),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
    })
  ),
});
export type BlockRegistryItem = z.infer<typeof blockRegistryItemSchema>;

/** GET /api/home-blocks/registry 响应 data */
export const blockRegistryResponseSchema = z.array(blockRegistryItemSchema);

/** POST /api/home-blocks/reset 请求体（`confirm: true` 为破坏性操作显式确认；block:edit） */
export const homeBlocksResetRequestSchema = z.object({
  templateCode: z.string().default("home"),
  confirm: z.literal(true),
});
export type HomeBlocksResetRequest = z.infer<typeof homeBlocksResetRequestSchema>;
