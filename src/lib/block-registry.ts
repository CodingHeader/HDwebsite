/**
 * Block Registry —— 首页区块配置解析中心（ADR-024）。
 *
 * - 纯数据（注册表/字段/默认顺序/只读查询）已迁至 `src/lib/block-registry-defs.ts`（P07 拆出；与 W0-02 的 `src/config/block-defs.ts` 内容一致），
 *   本文件只保留需要 prisma 的 `resolveHomeBlocks()` 与配套工具，并 `export *` 保持既有导出面不变。
 * - resolveHomeBlocks()：读 `home` 页面模板的 TemplateBlock（启用/顺序/特有配置）合并注册表默认值；
 *   DB 无模板/模板停用/模板下无已知区块 → 回落 main 默认顺序（公开页外观不变）。
 * - 启用判定：ContentBlock.status === "active" 且 TemplateBlock.config.enabled !== false；未知 code 忽略。
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { WEB_TAGS, withWebCacheFallback } from "@/lib/cache-tags";
import {
  DEFAULT_HOME_BLOCK_ORDER,
  getBlockDefinition,
  getBlockDefaultProps,
  type BlockDefinition,
} from "@/lib/block-registry-defs";

export * from "@/lib/block-registry-defs";

export type ResolvedBlock = { code: string; definition: BlockDefinition; props: Record<string, unknown> };

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function defaults(): ResolvedBlock[] {
  return DEFAULT_HOME_BLOCK_ORDER.map((code) => ({ code, definition: getBlockDefinition(code)!, props: getBlockDefaultProps(code) }));
}

/**
 * 首页区块解析：模板（code=home, status=active）→ TemplateBlock 按 sort 升序 → 过滤停用/未知 → 合并默认 props。
 * 读库失败也回落默认（公开页不能因配置读失败而白屏）。
 */
async function resolveHomeBlocksUncached(templateCode = "home"): Promise<ResolvedBlock[]> {
  try {
    const template = await prisma.pageTemplate.findUnique({
      where: { code: templateCode },
      include: { blocks: { include: { block: true }, orderBy: [{ sort: "asc" }, { id: "asc" }] } },
    });
    if (!template || template.status !== "active") return defaults();
    const known = template.blocks.filter((tb) => getBlockDefinition(tb.block.code));
    if (known.length === 0) return defaults();
    const seen = new Set<string>();
    const out: ResolvedBlock[] = [];
    for (const tb of known) {
      const code = tb.block.code;
      if (seen.has(code)) continue;
      seen.add(code);
      const config = parseJsonObject(tb.config);
      if (tb.block.status !== "active" || config.enabled === false) continue;
      const { enabled: _enabled, ...rest } = config; // eslint-disable-line @typescript-eslint/no-unused-vars
      out.push({ code, definition: getBlockDefinition(code)!, props: { ...getBlockDefaultProps(code), ...rest } });
    }
    return out;
  } catch (err) {
    console.error("[block-registry] 读取首页区块配置失败，回落默认顺序：", err);
    return defaults();
  }
}

/**
 * resolveHomeBlocks（D-06）：以 WEB_TAGS.home 缓存区块配置。
 * 生产/请求上下文命中缓存；非 Next 请求上下文（单测/脚本）下 unstable_cache 抛 Invariant，
 * 由 withWebCacheFallback 识别后回退未缓存实现，不影响直读。
 */
const resolveHomeBlocksCached: (templateCode?: string) => Promise<ResolvedBlock[]> = unstable_cache(
  resolveHomeBlocksUncached,
  ["web:home-blocks"],
  { tags: [WEB_TAGS.home], revalidate: false }
);

export function resolveHomeBlocks(templateCode = "home"): Promise<ResolvedBlock[]> {
  return withWebCacheFallback(() => resolveHomeBlocksCached(templateCode), () => resolveHomeBlocksUncached(templateCode));
}
