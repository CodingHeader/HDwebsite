/**
 * GET /api/llm/usage：LLM 用量聚合（C-11 / G6：LLMUsage 只写不读）
 * ==========================================================
 * - 权限：llm:list
 * - 契约：llmUsageQuerySchema + llmUsageRowSchema（W0-10 冻结于 src/contracts/llm.ts）
 * - groupBy=provider：按 providerId 聚合（跨天累计）；groupBy=day：按日期聚合
 * - 日期按 **Asia/Shanghai** 归日（C-09 与 llm-gateway 同口径，ADR-029 §2 D4）
 * - 行字段只用 LLMUsage 现有列：calls / tokensIn / tokensOut / failures；
 *   **不含耗时与费用列**（REQ-F-010 AC6 记偏差 ADR-034，K8 未裁决前不加列）
 * - 实现：先按 [date, providerId] groupBy 求和（SQLite 聚合），再在内存按 groupBy 归并。
 *   避免 Prisma groupBy 在 SQLite 上的日期截断方言差异；时间窗由契约（≤92 天）保证数据量可控。
 */
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { parseQuery, withApi } from "@/lib/api-handler";
import { llmUsageQuerySchema, llmUsageRowSchema } from "@/contracts/llm";
import type { LlmUsageRow } from "@/contracts/llm";

export const dynamic = "force-dynamic";

/** GET /api/llm/usage */
export const GET = withApi(
  async ({ request }) => {
    const query = parseQuery(request, llmUsageQuerySchema);

    // 1. 从 LLMUsage 聚合：按 [date, providerId] 求和
    const rows = await prisma.lLMUsage.groupBy({
      by: ["date", "providerId"],
      _sum: { calls: true, tokensIn: true, tokensOut: true, failures: true },
      where: {
        date: { gte: query.from, lte: query.to },
        ...(query.providerId ? { providerId: query.providerId } : {}),
      },
      orderBy: { date: "asc" },
    });

    // 2. 归并为契约 DTO（内存聚合）
    const acc = new Map<string, { calls: number; tokensIn: number; tokensOut: number; failures: number }>();

    for (const r of rows) {
      const sum = r._sum;
      const row: { calls: number; tokensIn: number; tokensOut: number; failures: number } = {
        calls: sum.calls ?? 0,
        tokensIn: sum.tokensIn ?? 0,
        tokensOut: sum.tokensOut ?? 0,
        failures: sum.failures ?? 0,
      };
      if (query.groupBy === "day") {
        const k = r.date;
        const prev = acc.get(k) ?? { calls: 0, tokensIn: 0, tokensOut: 0, failures: 0 };
        acc.set(k, {
          calls: prev.calls + row.calls,
          tokensIn: prev.tokensIn + row.tokensIn,
          tokensOut: prev.tokensOut + row.tokensOut,
          failures: prev.failures + row.failures,
        });
      } else {
        const k = String(r.providerId);
        const prev = acc.get(k) ?? { calls: 0, tokensIn: 0, tokensOut: 0, failures: 0 };
        acc.set(k, {
          calls: prev.calls + row.calls,
          tokensIn: prev.tokensIn + row.tokensIn,
          tokensOut: prev.tokensOut + row.tokensOut,
          failures: prev.failures + row.failures,
        });
      }
    }

    // 3. 组装（groupBy=day 时补齐空日：区间内无用量也返回 0 行，便于 E-10 折线图）
    const out: LlmUsageRow[] = [];
    if (query.groupBy === "day") {
      const from = new Date(query.from + "T00:00:00Z");
      const to = new Date(query.to + "T00:00:00Z");
      for (let t = from.getTime(); t <= to.getTime(); t += 86_400_000) {
        const day = new Date(t).toISOString().slice(0, 10);
        const v = acc.get(day) ?? { calls: 0, tokensIn: 0, tokensOut: 0, failures: 0 };
        out.push({ key: day, ...v });
      }
    } else {
      for (const [k, v] of acc) out.push({ key: k, ...v });
    }

    // 4. 契约校验（确保响应体严格符合 W0-05 冻结 DTO；不合规抛 500 而非静默返错）
    const parsed = llmUsageRowSchema.array().safeParse(out);
    if (!parsed.success) {
      console.error("[llm/usage] 响应契约校验失败：", parsed.error.issues);
      throw new Error("用量聚合结果不符合契约");
    }

    return success(parsed.data, "获取用量成功");
  },
  { permission: "llm:list", route: "llm/usage", errorMessage: "获取用量失败" }
);