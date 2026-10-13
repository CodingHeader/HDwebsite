/**
 * Block Registry 定义（W0-02 自 src/lib/block-registry.ts 抽出）——首页 12 个区块的**纯数据**：
 * code/name/type/description/dataSource/fields/defaultProps/order，以及 main 原始顺序与只读查询函数。
 * 本文件不得引入任何数据库客户端依赖（保持可被客户端组件与管理端表单直接引用）；需要读库的解析逻辑留在 src/lib/block-registry.ts。
 */

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
