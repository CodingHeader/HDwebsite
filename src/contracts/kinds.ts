/**
 * 契约：领域枚举与中文标签（`parallel-w1/02-契约冻结包.md` §W0-05 目标形态；ADR-027 冻结面）
 *
 * 唯一源约定：
 * - 数组常量是唯一真相源；`z.enum` **必须**由数组派生（形如 `z.enum(CHANNEL_KINDS)`），
 *   禁止在路由/组件/其他契约里就地写渠道、供应商、采集类型的枚举字面量。
 * - 新增取值只改数组，派生 schema 与类型自动跟随。
 * - 本模块只依赖 zod，无运行时副作用（可被客户端组件安全导入）。
 */
import { z } from "zod";

/** 发布/会话渠道（`PublishJob.channel`、`AIChatHistory.channel`） */
export const CHANNEL_KINDS = ["website", "wechat"] as const;
/** LLM 供应商类型（`LLMProvider.kind`） */
export const LLM_KINDS = ["openai", "coze"] as const;
/** 采集源类型（`CollectSource.type`） */
export const COLLECT_TYPES = ["html", "rss"] as const;
/** 知识库后端（`KnowledgeBase.backend`） */
export const KB_BACKENDS = ["local", "coze"] as const;

/** 枚举中文标签（后台下拉/徽标；键集合 = 上述四数组并集） */
export const KIND_LABELS = {
  website: "官网",
  wechat: "公众号",
  openai: "OpenAI 兼容",
  coze: "Coze",
  html: "网页（CSS 选择器）",
  rss: "RSS",
  local: "本地",
} as const;

// ── 由数组派生的 zod 枚举（供 resources.ts / 路由 / 表单复用）────────────
export const channelKindSchema = z.enum(CHANNEL_KINDS);
export const llmKindSchema = z.enum(LLM_KINDS);
export const collectTypeSchema = z.enum(COLLECT_TYPES);
export const kbBackendSchema = z.enum(KB_BACKENDS);

export type ChannelKind = (typeof CHANNEL_KINDS)[number];
export type LlmKind = (typeof LLM_KINDS)[number];
export type CollectType = (typeof COLLECT_TYPES)[number];
export type KbBackend = (typeof KB_BACKENDS)[number];
export type KindLabelKey = keyof typeof KIND_LABELS;

/** 取中文标签（未知取值回落原值，保证 UI 不会渲染出空串） */
export function kindLabel(kind: string): string {
  return (KIND_LABELS as Record<string, string>)[kind] ?? kind;
}

/**
 * 数组型 ID 字段去重（保序）。
 * 说明：**加法扩展**，不属于 `02-契约冻结包.md` 的目标形态——
 * 冻结包把 `providerIds`/`baseIds` 的「统一存 JSON 数组串」交给 `crud-resources` 的
 * `jsonifyFields`（C-07 接线），但未定义重复项语义；本函数为 C-07/E-01 提供显式、可测的
 * 归一入口，避免"同一 provider 被路由两次"。契约层 schema 保持冻结包原样（不在 schema 内做 transform）。
 */
export function dedupeIds(ids: readonly number[]): number[] {
  return [...new Set(ids)];
}
