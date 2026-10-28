/**
 * 契约：站点设置（Setting，Registry 扁平键体系，ADR-009）
 * - GET /api/settings 返回单一对象形态 Record<string,string>（13-响应设计 §7 收紧口径）
 * - 未登录仅返回 isPublic 项；PUT/POST 需 setting:edit 权限（安全欠账修复）
 */
import { z } from "zod";

export const settingsPublicSchema = z.record(z.string(), z.string());
export type SettingsPublic = z.infer<typeof settingsPublicSchema>;

export const settingsUpdateSchema = z.record(
  z.string().min(1).max(120),
  z.string().max(10000)
);
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/** Registry 分组（后台设置页按分组渲染 SchemaForm；W0-05 新增 "kb"） */
export const settingGroups = [
  "site",
  "topbar",
  "banner",
  "stats",
  "cards",
  "footer",
  "company",
  "contact",
  "seo",
  "other",
  "display",
  "email",
  "wechat-mp",
  "collect",
  "kb",
  "llm",
  "notify",
  "publish",
] as const;

export type SettingGroup = (typeof settingGroups)[number];

export const settingDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "json", "text", "image"]),
  group: z.string(),
  defaultValue: z.string(),
  isPublic: z.boolean().default(true),
  isEncrypted: z.boolean().default(false),
  description: z.string().optional(),
});

export type SettingDefinition = z.infer<typeof settingDefinitionSchema>;
