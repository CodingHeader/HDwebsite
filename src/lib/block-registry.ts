/**
 * Block Registry —— 首页区块配置注册中心（ADR-024，以 main@94dbbbb src/lib/block-registry.ts 为起点）
 *
 * - 注册表：首页 12 个区块（code 与 `src/app/(web)/page.tsx` 的 `data-block` 锚点一一对应），
 *   order 即 main 原始渲染顺序；字段定义供管理端区块配置页使用（P07 UI）。
 * - resolveHomeBlocks()：读 `home` 页面模板的 TemplateBlock（启用/顺序/特有配置）合并注册表默认值；
 *   DB 无模板/模板停用/模板下无已知区块 → 回落 main 默认顺序（公开页外观不变）。
 * - 启用判定：ContentBlock.status === "active" 且 TemplateBlock.config.enabled !== false；未知 code 忽略。
 */
import { prisma } from "@/lib/prisma";

export type BlockType = "hero" | "banner" | "stats" | "intro" | "list" | "grid" | "cta" | "sidebar";
export type DataSourceType = "static" | "query" | "api" | "settings";

export interface BlockFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "url" | "number" | "boolean" | "json";
  defaultValue: string;
  description?: string;
}

export interface BlockDefinition {
  code: string;
  name: string;
  type: BlockType;
  description: string;
  dataSource: DataSourceType;
  fields: BlockFieldDef[];
  defaultProps: Record<string, unknown>;
  order: number;
}

/** 区块数据多数来自 Setting/业务表；fields 中 settings 型字段以 Setting key 命名（与 settings-registry 对齐） */
export const BLOCK_REGISTRY: BlockDefinition[] = [
  {
    code: "home-banner", name: "轮播横幅", type: "hero", description: "首页顶部轮播图（Banner 表 + banner 分组设置）",
    dataSource: "query", order: 1,
    fields: [
      { key: "autoplay", label: "自动播放", type: "boolean", defaultValue: "true" },
      { key: "interval", label: "轮播间隔(ms)", type: "number", defaultValue: "5000" },
    ],
    defaultProps: { autoplay: true, interval: 5000 },
  },
  {
    code: "home-cards", name: "四宫格入口", type: "grid", description: "首页卡片（HomeCard 表）",
    dataSource: "query", order: 2,
    fields: [{ key: "cardShowOverlay", label: "显示遮罩", type: "boolean", defaultValue: "true" }],
    defaultProps: { showOverlay: true },
  },
  {
    code: "home-topbar", name: "顶部通知栏", type: "banner", description: "通知文案与电话（topbar 分组设置）",
    dataSource: "settings", order: 3,
    fields: [
      { key: "topNoticeText", label: "通知文案", type: "text", defaultValue: "" },
      { key: "topNoticePhone", label: "通知电话", type: "text", defaultValue: "" },
    ],
    defaultProps: {},
  },
  {
    code: "home-entrance", name: "三栏内容区", type: "list", description: "资讯 + 服务指南三栏入口",
    dataSource: "query", order: 4,
    fields: [{ key: "limit", label: "资讯条数", type: "number", defaultValue: "6" }],
    defaultProps: { limit: 6 },
  },
  {
    code: "home-stats", name: "统计横幅", type: "stats", description: "办学年限/毕业学员/优势（stats 分组设置）",
    dataSource: "settings", order: 5,
    fields: [
      { key: "yearsOfEstablishment", label: "办学年限", type: "number", defaultValue: "" },
      { key: "totalGraduates", label: "累计毕业学员", type: "text", defaultValue: "" },
    ],
    defaultProps: {},
  },
  {
    code: "home-partners", name: "合作院校", type: "grid", description: "招生院校（Partner 表）",
    dataSource: "query", order: 6, fields: [], defaultProps: {},
  },
  {
    code: "home-courses", name: "热门专业", type: "list", description: "热门专业（HotMajor 表）",
    dataSource: "query", order: 7, fields: [], defaultProps: {},
  },
  {
    code: "home-intro", name: "公司简介", type: "intro", description: "视频/简介/口号（company 分组设置）",
    dataSource: "settings", order: 8,
    fields: [
      { key: "companyVideoUrl", label: "视频地址", type: "url", defaultValue: "" },
      { key: "companyIntro", label: "简介", type: "textarea", defaultValue: "" },
      { key: "companySlogan", label: "口号", type: "text", defaultValue: "" },
    ],
    defaultProps: {},
  },
  {
    code: "home-news", name: "资讯中心", type: "list", description: "最新资讯（Article 表）",
    dataSource: "query", order: 9, fields: [], defaultProps: {},
  },
  {
    code: "home-certificates", name: "证书风采", type: "grid", description: "证书风采（Gallery 表）",
    dataSource: "query", order: 10, fields: [], defaultProps: {},
  },
  {
    code: "home-campus", name: "学院风采", type: "grid", description: "校区（Campus 表）",
    dataSource: "query", order: 11, fields: [], defaultProps: {},
  },
  {
    code: "home-cta", name: "报名行动号召", type: "cta", description: "底部咨询热线与报名按钮",
    dataSource: "static", order: 12, fields: [], defaultProps: {},
  },
];

/** main 原始首页顺序（无配置时的回落值） */
export const DEFAULT_HOME_BLOCK_ORDER = [...BLOCK_REGISTRY].sort((a, b) => a.order - b.order).map((b) => b.code);

export function getBlockRegistry(): BlockDefinition[] {
  return BLOCK_REGISTRY;
}

export function getBlockDefinition(code: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY.find((b) => b.code === code);
}

export function getBlockDefaultProps(code: string): Record<string, unknown> {
  return { ...(getBlockDefinition(code)?.defaultProps ?? {}) };
}

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
export async function resolveHomeBlocks(templateCode = "home"): Promise<ResolvedBlock[]> {
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
