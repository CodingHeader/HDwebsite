/**
 * Settings Registry - 配置注册中心
 *
 * 平台化核心：所有设置项的"唯一真相源"。
 * 定义每个设置项的：分组、类型、校验规则、默认值、可见性、UI控件类型。
 *
 * 执行逻辑6步：
 * 1. 触发：管理端设置页加载 / API请求
 * 2. 路由：通过 getRegistry() 获取完整注册表
 * 3. 处理：按group分组，注入默认值和校验
 * 4. 请求：前端读取registry渲染动态表单
 * 5. 数据库：Setting表存储实际值，Registry提供元数据
 * 6. 响应：分组配置+当前值+元数据 → 前端渲染
 */

import { z } from "zod";

// ─── 类型定义 ──────────────────────────────────────────

export type SettingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "image"
  | "email"
  | "phone"
  | "boolean"
  | "json"
  | "color"
  | "select"
  | "home-cards";

export interface SettingDefinition {
  key: string;
  label: string;
  type: SettingFieldType;
  group: string;
  defaultValue: string;
  placeholder?: string;
  description?: string;
  isPublic: boolean;
  isEncrypted: boolean;
  required?: boolean;
  validation?: z.ZodType;
  options?: { label: string; value: string }[];
  colSpan?: 1 | 2;
}

export interface SettingGroup {
  key: string;
  label: string;
  icon: string;
  description: string;
  order: number;
}

// ─── 分组定义 ──────────────────────────────────────────

export const SETTING_GROUPS: SettingGroup[] = [
  {
    key: "site",
    label: "站点信息",
    icon: "Globe",
    description: "网站名称、Logo、品牌等基础信息",
    order: 1,
  },
  {
    key: "topbar",
    label: "顶部横幅",
    icon: "TrendingUp",
    description: "顶部通知栏文案和联系电话",
    order: 2,
  },
  {
    key: "banner",
    label: "轮播图设置",
    icon: "Image",
    description: "首页Banner背景、文字、位置等配置",
    order: 3,
  },
  {
    key: "stats",
    label: "统计横幅",
    icon: "Award",
    description: "首页统计数据展示配置",
    order: 4,
  },
  {
    key: "company",
    label: "公司简介",
    icon: "Building2",
    description: "公司介绍、标语、视频等",
    order: 5,
  },
  {
    key: "contact",
    label: "联系方式",
    icon: "Phone",
    description: "电话、邮箱、地址等联系信息",
    order: 6,
  },
  {
    key: "seo",
    label: "SEO设置",
    icon: "Search",
    description: "搜索引擎优化相关配置",
    order: 7,
  },
  {
    key: "other",
    label: "其他设置",
    icon: "Settings",
    description: "ICP备案等杂项配置",
    order: 8,
  },
  {
    key: "fourCards",
    label: "首页服务卡片",
    icon: "LayoutGrid",
    description: "首页四宫格服务卡片的区块级配置",
    order: 9,
  },
  {
    key: "footer",
    label: "底部信息区",
    icon: "PanelBottom",
    description: "页脚Logo、描述、联系方式、链接等配置",
    order: 10,
  },
];

// ─── 设置项注册表（SSOT） ──────────────────────────────

export const SETTINGS_REGISTRY: SettingDefinition[] = [
  // ── 站点信息 ──
  {
    key: "siteName",
    label: "网站名称",
    type: "text",
    group: "site",
    defaultValue: "弘道教育",
    placeholder: "弘道教育",
    isPublic: true,
    isEncrypted: false,
    required: true,
    validation: z.string().min(1, "网站名称不能为空"),
  },
  {
    key: "siteDescription",
    label: "网站描述",
    type: "textarea",
    group: "site",
    defaultValue: "专注专升本教育，助力学历提升",
    placeholder: "专注专升本教育，助力学历提升",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "siteLogo",
    label: "网站主Logo",
    type: "image",
    group: "site",
    defaultValue: "/images/logo.png",
    placeholder: "点击上传网站主Logo",
    description: "用于Header的主品牌Logo（默认 /images/logo.png）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "schoolFullName",
    label: "学校全称",
    type: "text",
    group: "site",
    defaultValue: "弘道教育",
    placeholder: "弘道教育",
    isPublic: true,
    isEncrypted: false,
    required: true,
    colSpan: 2,
  },
  {
    key: "schoolShortName",
    label: "学校简称",
    type: "text",
    group: "site",
    defaultValue: "弘道教育",
    placeholder: "弘道教育",
    isPublic: true,
    isEncrypted: false,
    required: true,
    colSpan: 2,
  },
  {
    key: "welcomeText",
    label: "首页欢迎语",
    type: "text",
    group: "site",
    defaultValue: "弘道教育 欢迎您!",
    placeholder: "弘道教育 欢迎您!",
    description: "显示在首页顶部的欢迎文字",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },

  // ── 底部信息区 ──
  {
    key: "footerLogo",
    label: "页脚Logo",
    type: "image",
    group: "footer",
    defaultValue: "",
    placeholder: "点击上传页脚专用Logo（建议200×60）",
    description: "Footer区域显示的Logo，留空则使用网站主Logo",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "footerSlogan",
    label: "页脚标语",
    type: "text",
    group: "footer",
    defaultValue: "专注学历提升教育",
    placeholder: "专注学历提升教育",
    description: "页脚品牌标语",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "footerDescription",
    label: "页脚描述",
    type: "textarea",
    group: "footer",
    defaultValue: "弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。",
    placeholder: "请输入页脚描述...",
    description: "页脚品牌详细介绍",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },

  // ── 站点Logo/导航图标 ──
  {
    key: "siteLogoIcon",
    label: "Header左侧图标",
    type: "image",
    group: "site",
    defaultValue: "/images/logo_card.png",
    placeholder: "点击上传Header左侧图标（建议正方形）",
    description: "显示在Header最左侧的小图标（默认 /images/logo_card.png）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "siteFavicon",
    label: "网站Favicon",
    type: "image",
    group: "site",
    defaultValue: "/favicon.png",
    placeholder: "点击上传Favicon（16x16 或 32x32）",
    description: "浏览器标签页的小图标",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 顶部横幅 ──
  {
    key: "topbarShowContent",
    label: "显示顶部横幅内容层",
    type: "boolean",
    group: "topbar",
    defaultValue: "true",
    description: "一键控制顶部横幅是否显示所有内容（通知文案+报名电话）；关闭后顶部横幅整段消失",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "topNoticeText",
    label: "横幅文案",
    type: "text",
    group: "topbar",
    defaultValue: "2026成人高考火热报名中",
    placeholder: "2026成人高考火热报名中",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "topNoticePhone",
    label: "报名电话",
    type: "phone",
    group: "topbar",
    defaultValue: "132-1945-5550",
    placeholder: "132-1945-5550",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },

  // ── 轮播图设置 ──
  {
    key: "bannerBgImage",
    label: "Banner背景图",
    type: "image",
    group: "banner",
    defaultValue: "",
    placeholder: "点击上传Banner背景图片",
    description: "首页轮播图默认背景（建议1920x600）",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "bannerOverlayColor",
    label: "遮罩层颜色",
    type: "color",
    group: "banner",
    defaultValue: "#000000",
    placeholder: "#000000",
    description: "Banner背景遮罩层颜色（配合透明度）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerOverlayOpacity",
    label: "遮罩层透明度",
    type: "number",
    group: "banner",
    defaultValue: "40",
    placeholder: "40",
    description: "遮罩层透明度 0-100（100为完全不透明）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerShowContent",
    label: "显示Banner内容层",
    type: "boolean",
    group: "banner",
    defaultValue: "true",
    description: "一键控制Banner轮播图上是否显示所有文字和按钮元素；关闭后Banner仅显示图片/背景，没有任何内容",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerShowTitle",
    label: "显示主标题",
    type: "boolean",
    group: "banner",
    defaultValue: "true",
    description: "控制Banner主标题是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerTitle",
    label: "Banner主标题",
    type: "text",
    group: "banner",
    defaultValue: "弘道教育",
    placeholder: "弘道教育",
    description: "Banner上的主标题文字",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerShowSubtitle",
    label: "显示副标题",
    type: "boolean",
    group: "banner",
    defaultValue: "true",
    description: "控制Banner副标题是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerSubtitle",
    label: "Banner副标题",
    type: "text",
    group: "banner",
    defaultValue: "专注专升本教育，助力学历提升",
    placeholder: "专注专升本教育，助力学历提升",
    description: "Banner上的副标题文字",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerTextAlign",
    label: "文字水平位置",
    type: "select",
    group: "banner",
    defaultValue: "center",
    description: "Banner 文字的水平对齐位置",
    isPublic: true,
    isEncrypted: false,
    options: [
      { label: "靠左", value: "left" },
      { label: "居中", value: "center" },
      { label: "靠右", value: "right" },
    ],
  },
  {
    key: "bannerTextVerticalAlign",
    label: "文字垂直位置",
    type: "select",
    group: "banner",
    defaultValue: "middle",
    description: "Banner 文字的垂直对齐位置",
    isPublic: true,
    isEncrypted: false,
    options: [
      { label: "靠上", value: "top" },
      { label: "居中", value: "middle" },
      { label: "靠下", value: "bottom" },
    ],
  },
  {
    key: "bannerBtnText",
    label: "立即咨询按钮文字",
    type: "text",
    group: "banner",
    defaultValue: "立即咨询",
    placeholder: "立即咨询",
    description: "Banner上立即咨询按钮文字（可通过关闭'显示Banner内容层'开关隐藏）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerBtnLink",
    label: "立即咨询按钮链接",
    type: "url",
    group: "banner",
    defaultValue: "/apply",
    placeholder: "/apply",
    description: "立即咨询按钮点击跳转地址",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerShowExtraBtn",
    label: "显示附加按钮",
    type: "boolean",
    group: "banner",
    defaultValue: "false",
    description: "控制Banner附加按钮（第二个按钮）是否显示；所有按钮均可通过'显示Banner内容层'总开关统一隐藏",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerExtraBtnText",
    label: "附加按钮文字",
    type: "text",
    group: "banner",
    defaultValue: "了解更多",
    placeholder: "了解更多",
    description: "Banner附加按钮上显示的文字",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerExtraBtnLink",
    label: "附加按钮链接",
    type: "url",
    group: "banner",
    defaultValue: "/courses",
    placeholder: "/courses",
    description: "Banner附加按钮点击后的跳转链接",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 统计横幅 ──
  {
    key: "statsShowContent",
    label: "显示统计横幅内容层",
    type: "boolean",
    group: "stats",
    defaultValue: "true",
    description: "一键控制统计横幅是否显示所有内容（办学年限+毕业人数+优势标签）；关闭后统计横幅整段消失",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "yearsOfEstablishment",
    label: "办学年限",
    type: "text",
    group: "stats",
    defaultValue: "26",
    placeholder: "26",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "totalGraduates",
    label: "毕业人数",
    type: "text",
    group: "stats",
    defaultValue: "11万",
    placeholder: "11万",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "statsLabel",
    label: "统计标题",
    type: "text",
    group: "stats",
    defaultValue: "年培养输送各类人才",
    placeholder: "年培养输送各类人才",
    description: "显示在年限和人数之间的连接文字",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  // 首页服务卡片已迁移至独立的HomeCard数据表
  // 四卡片现在通过 /api/homecards 接口管理
  // {
  //   key: "homeCards",
  //   label: "首页服务卡片",
  //   type: "json",
  //   ...
  // },
  // 保留旧字段兼容（标记为deprecated）
  {
    key: "advantage1",
    label: "优势1（旧）",
    type: "text",
    group: "stats",
    defaultValue: "正规可靠",
    placeholder: "正规可靠",
    description: "已废弃，请使用首页服务卡片JSON配置",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "advantage2",
    label: "优势2（旧）",
    type: "text",
    group: "stats",
    defaultValue: "国家承认",
    placeholder: "国家承认",
    description: "已废弃，请使用首页服务卡片JSON配置",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "advantage3",
    label: "优势3（旧）",
    type: "text",
    group: "stats",
    defaultValue: "管家服务",
    placeholder: "管家服务",
    description: "已废弃，请使用首页服务卡片JSON配置",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "advantage4",
    label: "优势4（旧）",
    type: "text",
    group: "stats",
    defaultValue: "终生可查",
    placeholder: "终生可查",
    description: "已废弃，请使用首页服务卡片JSON配置",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },

  // ── 公司简介 ──
  {
    key: "companySlogan",
    label: "公司标语",
    type: "text",
    group: "company",
    defaultValue: "弘道教育，百年大计，教育为本！",
    placeholder: "弘道教育，百年大计，教育为本！",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "companyIntro",
    label: "公司简介",
    type: "textarea",
    group: "company",
    defaultValue:
      "弘道教育成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。",
    placeholder: "请输入公司简介内容...",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "companyVideoUrl",
    label: "宣传视频URL",
    type: "url",
    group: "company",
    defaultValue: "",
    placeholder: "https://example.com/video.mp4",
    isPublic: true,
    isEncrypted: false,
    validation: z.string().url("请输入有效的URL").or(z.literal("")),
  },

  // ── 联系方式 ──
  {
    key: "contactPhone",
    label: "联系电话(主)",
    type: "phone",
    group: "contact",
    defaultValue: "400-001-5729",
    placeholder: "400-001-5729",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "contactPhone1",
    label: "校长热线1",
    type: "phone",
    group: "contact",
    defaultValue: "132-1945-5550",
    placeholder: "132-1945-5550",
    description: "Header右侧校长热线第一行号码",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "contactPhone2",
    label: "校长热线2",
    type: "phone",
    group: "contact",
    defaultValue: "028-6167-5329",
    placeholder: "028-6167-5329",
    description: "Header右侧校长热线第二行号码",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "contactEmail",
    label: "联系邮箱",
    type: "email",
    group: "contact",
    defaultValue: "",
    placeholder: "contact@hongdao.com",
    isPublic: true,
    isEncrypted: false,
    validation: z.string().email("请输入有效的邮箱").or(z.literal("")),
    colSpan: 2,
  },
  {
    key: "address",
    label: "地址",
    type: "text",
    group: "contact",
    defaultValue: "成都市青羊区大石西路12号",
    placeholder: "成都市青羊区大石西路12号",
    isPublic: true,
    isEncrypted: false,
  },

  // ── SEO设置 ──
  {
    key: "seoTitle",
    label: "SEO标题",
    type: "text",
    group: "seo",
    defaultValue: "弘道教育 - 专注专升本学历提升",
    placeholder: "弘道教育 - 专注专升本学历提升",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "seoKeywords",
    label: "SEO关键词",
    type: "text",
    group: "seo",
    defaultValue: "专升本,学历提升,成人教育,自考,成考",
    placeholder: "专升本,学历提升,成人教育,自考,成考",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "seoDescription",
    label: "SEO描述",
    type: "textarea",
    group: "seo",
    defaultValue: "弘道教育专注专升本学历提升，提供自考、成考等多种学历提升方案。",
    placeholder: "弘道教育专注专升本学历提升...",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 其他设置 ──
  {
    key: "icp",
    label: "ICP备案号",
    type: "text",
    group: "other",
    defaultValue: "",
    placeholder: "京ICP备XXXXXXXX号",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 首页服务卡片 ──
  {
    key: "fourCardsShowSection",
    label: "显示服务卡片区块",
    type: "boolean",
    group: "fourCards",
    defaultValue: "true",
    description: "一键控制首页四宫格服务卡片区块是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsBgColor",
    label: "区块背景色",
    type: "color",
    group: "fourCards",
    defaultValue: "#f8fafc",
    placeholder: "#f8fafc",
    description: "服务卡片区块的背景颜色（十六进制颜色码）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsBgImage",
    label: "区块背景图",
    type: "image",
    group: "fourCards",
    defaultValue: "",
    placeholder: "点击上传背景图",
    description: "服务卡片区块的背景图片（可选，设置后将覆盖背景色）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsContainerAlign",
    label: "卡片容器对齐",
    type: "select",
    group: "fourCards",
    defaultValue: "center",
    options: [
      { label: "居左", value: "left" },
      { label: "居中", value: "center" },
      { label: "居右", value: "right" },
    ],
    description: "服务卡片容器的整体对齐方式",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsData",
    label: "卡片内容管理",
    type: "home-cards",
    group: "fourCards",
    defaultValue: "[{\"id\":\"card_1\",\"title\":\"自学考试\",\"subtitle\":\"自助者天助之\",\"icon\":\"BookOpen\",\"href\":\"/courses?type=zikao\",\"gradient\":\"from-blue-500 to-blue-600\",\"hoverGradient\":\"from-blue-400 to-blue-500\",\"shadow\":\"shadow-blue-200\",\"showIcon\":true,\"showTitle\":true,\"showSubtitle\":true,\"showArrow\":true,\"showDecoration\":true,\"textAlign\":\"left\",\"backgroundImage\":null,\"backgroundType\":\"gradient\",\"description\":null,\"badge\":null},{\"id\":\"card_2\",\"title\":\"成人高考\",\"subtitle\":\"成就学员梦想\",\"icon\":\"GraduationCap\",\"href\":\"/courses?type=chengkao\",\"gradient\":\"from-green-500 to-green-600\",\"hoverGradient\":\"from-green-400 to-green-500\",\"shadow\":\"shadow-green-200\",\"showIcon\":true,\"showTitle\":true,\"showSubtitle\":true,\"showArrow\":true,\"showDecoration\":true,\"textAlign\":\"left\",\"backgroundImage\":null,\"backgroundType\":\"gradient\",\"description\":null,\"badge\":null},{\"id\":\"card_3\",\"title\":\"开放大学\",\"subtitle\":\"构建终身学堂\",\"icon\":\"Globe\",\"href\":\"/courses?type=kaifang\",\"gradient\":\"from-orange-500 to-orange-600\",\"hoverGradient\":\"from-orange-400 to-orange-500\",\"shadow\":\"shadow-orange-200\",\"showIcon\":true,\"showTitle\":true,\"showSubtitle\":true,\"showArrow\":true,\"showDecoration\":true,\"textAlign\":\"left\",\"backgroundImage\":null,\"backgroundType\":\"gradient\",\"description\":null,\"badge\":null}]",
    description: "管理首页三张卡片的内容、样式和显示设置",
    isPublic: true,
    isEncrypted: false,
  },
];

// ─── 工具函数 ──────────────────────────────────────────

/** 获取完整注册表（按分组排序） */
export function getRegistry(): SettingDefinition[] {
  return SETTINGS_REGISTRY;
}

/** 获取分组列表（按order排序） */
export function getGroups(): SettingGroup[] {
  return [...SETTING_GROUPS].sort((a, b) => a.order - b.order);
}

/** 按分组获取设置项 */
export function getSettingsByGroup(group: string): SettingDefinition[] {
  return SETTINGS_REGISTRY.filter((s) => s.group === group);
}

/** 获取单个设置项定义 */
export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTINGS_REGISTRY.find((s) => s.key === key);
}

/** 获取所有默认值映射 */
export function getDefaultValues(): Record<string, string> {
  return SETTINGS_REGISTRY.reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.defaultValue;
    return acc;
  }, {});
}

/** 校验设置值 */
export function validateSetting(
  key: string,
  value: string
): { valid: boolean; error?: string } {
  const def = getSettingDefinition(key);
  if (!def) return { valid: false, error: `未知设置项: ${key}` };
  if (def.required && !value) return { valid: false, error: `${def.label}不能为空` };
  if (def.validation) {
    const result = def.validation.safeParse(value);
    if (!result.success) {
      return { valid: false, error: result.error.issues[0]?.message || "校验失败" };
    }
  }
  return { valid: true };
}

/** 批量校验 */
export function validateSettings(
  values: Record<string, string>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const result = validateSetting(key, value);
    if (!result.valid && result.error) {
      errors[key] = result.error;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** 获取公开设置项key列表 */
export function getPublicSettingKeys(): string[] {
  return SETTINGS_REGISTRY.filter((s) => s.isPublic).map((s) => s.key);
}
