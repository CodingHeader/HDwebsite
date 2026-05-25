/**
 * Block Registry - 主页区块配置注册中心
 *
 * 定义首页各区块的配置元数据，实现"配置驱动"渲染。
 * 每个区块对应一个code，定义其：类型、数据源、默认配置、可配置字段。
 *
 * 执行逻辑6步：
 * 1. 触发：首页加载 / 管理端区块配置页
 * 2. 路由：通过 getBlockRegistry() 获取区块定义
 * 3. 处理：合并DB配置 + Registry默认值
 * 4. 请求：前端读取区块配置渲染组件
 * 5. 数据库：ContentBlock表 + Setting表
 * 6. 响应：区块配置+当前值+元数据
 */

export type BlockType = "hero" | "banner" | "stats" | "intro" | "list" | "grid" | "cta" | "sidebar";
export type DataSourceType = "static" | "query" | "api" | "settings";

export interface BlockFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "url" | "number" | "boolean" | "json";
  defaultValue: string;
  placeholder?: string;
  description?: string;
  group?: string;
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

// ─── 首页区块注册表 ────────────────────────────────────

export const BLOCK_REGISTRY: BlockDefinition[] = [
  {
    code: "home-banner",
    name: "轮播横幅",
    type: "hero",
    description: "首页顶部轮播图区域",
    dataSource: "query",
    order: 1,
    fields: [
      {
        key: "autoplay",
        label: "自动播放",
        type: "boolean",
        defaultValue: "true",
        description: "是否自动轮播",
      },
      {
        key: "interval",
        label: "轮播间隔(ms)",
        type: "number",
        defaultValue: "5000",
        description: "自动轮播间隔时间",
      },
    ],
    defaultProps: { autoplay: true, interval: 5000 },
  },
  {
    code: "home-topbar",
    name: "顶部通知栏",
    type: "banner",
    description: "顶部通知文案和联系电话",
    dataSource: "settings",
    order: 2,
    fields: [
      {
        key: "topNoticeText",
        label: "通知文案",
        type: "text",
        defaultValue: "2026成人高考火热报名中",
        group: "topbar",
      },
      {
        key: "topNoticePhone",
        label: "联系电话",
        type: "text",
        defaultValue: "139-0809-1091",
        group: "topbar",
      },
    ],
    defaultProps: {},
  },
  {
    code: "home-stats",
    name: "统计横幅",
    type: "stats",
    description: "首页统计数据展示区",
    dataSource: "settings",
    order: 3,
    fields: [
      { key: "statsText", label: "统计文案", type: "text", defaultValue: "办学26年培养输送各类人才11万余人", group: "stats" },
      { key: "advantage1", label: "优势1", type: "text", defaultValue: "正规可靠", group: "stats" },
      { key: "advantage2", label: "优势2", type: "text", defaultValue: "国家承认", group: "stats" },
      { key: "advantage3", label: "优势3", type: "text", defaultValue: "管家服务", group: "stats" },
      { key: "advantage4", label: "优势4", type: "text", defaultValue: "终生可查", group: "stats" },
    ],
    defaultProps: {},
  },
  {
    code: "home-intro",
    name: "公司简介",
    type: "intro",
    description: "公司介绍、标语、视频",
    dataSource: "settings",
    order: 4,
    fields: [
      { key: "companySlogan", label: "公司标语", type: "text", defaultValue: "弘道经理学院，百年大计，教育为本！", group: "company" },
      { key: "companyIntro", label: "公司简介", type: "textarea", defaultValue: "", group: "company" },
      { key: "companyVideoUrl", label: "宣传视频URL", type: "url", defaultValue: "", group: "company" },
    ],
    defaultProps: {},
  },
  {
    code: "home-courses",
    name: "热门课程",
    type: "list",
    description: "首页课程推荐列表",
    dataSource: "query",
    order: 5,
    fields: [
      { key: "title", label: "区块标题", type: "text", defaultValue: "热门课程" },
      { key: "limit", label: "显示数量", type: "number", defaultValue: "6" },
    ],
    defaultProps: { title: "热门课程", limit: 6 },
  },
  {
    code: "home-news",
    name: "最新资讯",
    type: "list",
    description: "首页新闻资讯列表",
    dataSource: "query",
    order: 6,
    fields: [
      { key: "title", label: "区块标题", type: "text", defaultValue: "最新资讯" },
      { key: "limit", label: "显示数量", type: "number", defaultValue: "4" },
    ],
    defaultProps: { title: "最新资讯", limit: 4 },
  },
  {
    code: "home-cta",
    name: "报名行动号召",
    type: "cta",
    description: "首页CTA报名区域",
    dataSource: "static",
    order: 7,
    fields: [
      { key: "title", label: "标题", type: "text", defaultValue: "立即报名" },
      { key: "subtitle", label: "副标题", type: "text", defaultValue: "专业团队为您服务" },
      { key: "buttonText", label: "按钮文字", type: "text", defaultValue: "免费咨询" },
    ],
    defaultProps: { title: "立即报名", subtitle: "专业团队为您服务", buttonText: "免费咨询" },
  },
  {
    code: "home-partners",
    name: "合作院校",
    type: "grid",
    description: "合作院校Logo展示",
    dataSource: "query",
    order: 8,
    fields: [
      { key: "title", label: "区块标题", type: "text", defaultValue: "合作院校" },
      { key: "limit", label: "显示数量", type: "number", defaultValue: "12" },
    ],
    defaultProps: { title: "合作院校", limit: 12 },
  },
];

// ─── 工具函数 ──────────────────────────────────────────

export function getBlockRegistry(): BlockDefinition[] {
  return BLOCK_REGISTRY;
}

export function getBlockDefinition(code: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY.find((b) => b.code === code);
}

export function getBlockDefaultProps(code: string): Record<string, unknown> {
  const def = getBlockDefinition(code);
  return def?.defaultProps ?? {};
}
