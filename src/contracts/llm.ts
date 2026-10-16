/**
 * 契约：LLM 用量查询与供应商排序（CCR-1 / W0-10 新增）
 * 来源：`18-V0.6-W0过闸复核与统一规划.md` §4 契约①；消费卡：C-11（用量与排序 API）、E-10（模型运营页）。
 *
 * 约定：
 * - `llmUsageRow` 字段名只用 `prisma/schema.prisma` 现有列：`calls/tokensIn/tokensOut/failures`；
 *   **不含费用与耗时列**（LLMUsage 表无对应列；REQ-F-010 AC6 耗时项记偏差，见 ADR-034 §K8）。
 * - `llmProviderOrder.ids` 语义 = 逐个尝试的优先级序列（先到先试，失败兜底），与 `ChatScene.providerIds` 同构。
 * - 本模块只依赖 zod，无运行时副作用（可被客户端组件安全导入）。
 */
import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 用量查询（GET `/api/llm/usage`，权限 llm:list） */
export const llmUsageQuerySchema = z
  .object({
    groupBy: z.enum(["provider", "day"]).default("provider"),
    from: z.string().regex(DATE_RE, "日期格式应为 YYYY-MM-DD"),
    to: z.string().regex(DATE_RE, "日期格式应为 YYYY-MM-DD"),
    providerId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine(
    (v) => {
      const from = new Date(`${v.from}T00:00:00Z`).getTime();
      const to = new Date(`${v.to}T00:00:00Z`).getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) return false;
      return to >= from && (to - from) / 86_400_000 <= 92;
    },
    { message: "查询区间最长 92 天，且 to 不得早于 from" }
  );
export type LlmUsageQuery = z.infer<typeof llmUsageQuerySchema>;

/** 用量行（= LLMUsage 列聚合；不含费用/耗时） */
export const llmUsageRowSchema = z.object({
  /** groupBy=provider 时为 providerId 字符串；groupBy=day 时为 YYYY-MM-DD */
  key: z.string(),
  calls: z.coerce.number().int().min(0),
  tokensIn: z.coerce.number().int().min(0),
  tokensOut: z.coerce.number().int().min(0),
  failures: z.coerce.number().int().min(0),
});
export type LlmUsageRow = z.infer<typeof llmUsageRowSchema>;

/** 供应商优先级排序（PUT `/api/llm/providers/order`，权限 llm:update） */
export const llmProviderOrderSchema = z
  .object({
    ids: z
      .array(z.coerce.number().int().positive())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, "优先级序列不得包含重复供应商"),
  });
export type LlmProviderOrder = z.infer<typeof llmProviderOrderSchema>;
