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
  | "select";

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
    key: "cards",
    label: "卡片配置",
    icon: "Award",
    description: "自学考试、成人高考、开放大学卡片配置",
    order: 8,
  },
  {
    key: "footer",
    label: "底部信息栏",
    icon: "Building2",
    description: "页脚Logo、描述、联系方式等配置",
    order: 9,
  },
  {
    key: "display",
    label: "显示控制",
    icon: "Eye",
    description: "全局显示/隐藏控制开关",
    order: 10,
  },
  {
    key: "other",
    label: "其他设置",
    icon: "Settings",
    description: "ICP备案等杂项配置",
    order: 11,
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
    defaultValue: "弘道经理学院",
    placeholder: "弘道经理学院",
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
    description: "用于Header和Footer的主品牌Logo（默认 /images/logo.png）",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "schoolFullName",
    label: "学校全称",
    type: "text",
    group: "site",
    defaultValue: "弘道经理学院",
    placeholder: "弘道经理学院",
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
    defaultValue: "弘道经理学院",
    placeholder: "弘道经理学院",
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
    defaultValue: "弘道经理学院 欢迎您!",
    placeholder: "弘道经理学院 欢迎您!",
    description: "显示在首页顶部的欢迎文字",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  // ── 默认占位符设置 ──
  {
    key: "defaultPlaceholderImage",
    label: "默认占位图",
    type: "image",
    group: "site",
    defaultValue: "/images/logo_card.png",
    placeholder: "点击上传默认占位图",
    description: "证书风采/学院风采等无图片时的默认占位图",
    isPublic: true,
    isEncrypted: false,
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
    defaultValue: "",
    placeholder: "点击上传Favicon（16x16 或 32x32）",
    description: "浏览器标签页的小图标",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 顶部横幅 ──
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
    defaultValue: "139-0809-1091",
    placeholder: "139-0809-1091",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "topbarShowContent",
    label: "显示顶部横幅",
    type: "boolean",
    group: "topbar",
    defaultValue: "true",
    description: "控制首页顶部横幅整段是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "topbarBgImage",
    label: "顶部横幅背景图",
    type: "image",
    group: "topbar",
    defaultValue: "",
    placeholder: "点击上传顶部横幅背景图",
    description: "顶部横幅区块背景图，留空时使用默认渐变背景",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "topbarShowOverlay",
    label: "显示顶部横幅上层元素",
    type: "boolean",
    group: "topbar",
    defaultValue: "true",
    description: "控制顶部横幅上的文案、图标、电话等上层元素是否显示",
    isPublic: true,
    isEncrypted: false,
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
    key: "bannerTitle",
    label: "Banner主标题",
    type: "text",
    group: "banner",
    defaultValue: "弘道经理学院",
    placeholder: "弘道经理学院",
    description: "Banner上的主标题文字",
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
    key: "bannerBtnText",
    label: "Banner按钮文字",
    type: "text",
    group: "banner",
    defaultValue: "立即咨询",
    placeholder: "立即咨询",
    description: "Banner上CTA按钮文字",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerBtnLink",
    label: "Banner按钮链接",
    type: "url",
    group: "banner",
    defaultValue: "/apply",
    placeholder: "/apply",
    description: "Banner按钮点击跳转地址",
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

  // ── 轮播图显示开关 ──
  {
    key: "bannerShowContent",
    label: "显示Banner内容层",
    type: "boolean",
    group: "banner",
    defaultValue: "true",
    description: "一键控制Banner文字+按钮的显示，关闭后仅显示图片",
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
    key: "bannerShowBtn",
    label: "显示按钮",
    type: "boolean",
    group: "banner",
    defaultValue: "true",
    description: "控制Banner按钮是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerShowExtraBtn",
    label: "显示第二按钮",
    type: "boolean",
    group: "banner",
    defaultValue: "false",
    description: "控制 Banner 第二个 CTA 按钮是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerExtraBtnText",
    label: "第二按钮文字",
    type: "text",
    group: "banner",
    defaultValue: "了解更多",
    placeholder: "了解更多",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "bannerExtraBtnLink",
    label: "第二按钮链接",
    type: "url",
    group: "banner",
    defaultValue: "/courses",
    placeholder: "/courses",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 统计横幅 ──
  {
    key: "statsText",
    label: "统计文案",
    type: "text",
    group: "stats",
    defaultValue: "办学26年培养输送各类人才11万余人",
    placeholder: "办学26年培养输送各类人才11万余人",
    description: "首页统计横幅的完整文案，直接输入最终显示的文字",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "statsShowContent",
    label: "显示统计横幅",
    type: "boolean",
    group: "stats",
    defaultValue: "true",
    description: "控制首页统计横幅整段是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "statsBgImage",
    label: "统计横幅背景图",
    type: "image",
    group: "stats",
    defaultValue: "",
    placeholder: "点击上传统计横幅背景图",
    description: "统计横幅区块背景图，留空时使用默认渐变背景",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "statsShowOverlay",
    label: "显示统计横幅上层元素",
    type: "boolean",
    group: "stats",
    defaultValue: "true",
    description: "控制统计横幅上的数字、文案、优势标签等上层元素是否显示",
    isPublic: true,
    isEncrypted: false,
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

  // ── 卡片配置 ──
  {
    key: "cardShowOverlay",
    label: "显示卡片上层元素",
    type: "boolean",
    group: "cards",
    defaultValue: "true",
    description: "控制卡片上的文字/图标等上层元素是否显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsShowSection",
    label: "显示卡片区块",
    type: "boolean",
    group: "cards",
    defaultValue: "true",
    description: "控制首页三卡片区块整体显示",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsBgColor",
    label: "卡片区块背景色",
    type: "color",
    group: "cards",
    defaultValue: "#f9fafb",
    placeholder: "#f9fafb",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsBgImage",
    label: "卡片区块背景图",
    type: "image",
    group: "cards",
    defaultValue: "",
    placeholder: "点击上传卡片区块背景图",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "fourCardsContainerAlign",
    label: "卡片区块对齐",
    type: "select",
    group: "cards",
    defaultValue: "center",
    description: "控制三卡片容器在区块中的对齐方式",
    isPublic: true,
    isEncrypted: false,
    options: [
      { label: "靠左", value: "left" },
      { label: "居中", value: "center" },
      { label: "靠右", value: "right" },
    ],
  },
  {
    key: "cardZikaoTitle",
    label: "自学考试-标题",
    type: "text",
    group: "cards",
    defaultValue: "自学考试",
    placeholder: "自学考试",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardZikaoSubtitle",
    label: "自学考试-副标题",
    type: "text",
    group: "cards",
    defaultValue: "自助者天助之",
    placeholder: "自助者天助之",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardZikaoLink",
    label: "自学考试-链接",
    type: "url",
    group: "cards",
    defaultValue: "/courses?cat=zikao",
    placeholder: "/courses?cat=zikao",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardChengkaoTitle",
    label: "成人高考-标题",
    type: "text",
    group: "cards",
    defaultValue: "成人高考",
    placeholder: "成人高考",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardChengkaoSubtitle",
    label: "成人高考-副标题",
    type: "text",
    group: "cards",
    defaultValue: "成就学员梦想",
    placeholder: "成就学员梦想",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardChengkaoLink",
    label: "成人高考-链接",
    type: "url",
    group: "cards",
    defaultValue: "/courses?cat=chengkao",
    placeholder: "/courses?cat=chengkao",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardKaifangTitle",
    label: "开放大学-标题",
    type: "text",
    group: "cards",
    defaultValue: "开放大学",
    placeholder: "开放大学",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardKaifangSubtitle",
    label: "开放大学-副标题",
    type: "text",
    group: "cards",
    defaultValue: "终身学习伙伴",
    placeholder: "终身学习伙伴",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "cardKaifangLink",
    label: "开放大学-链接",
    type: "url",
    group: "cards",
    defaultValue: "/courses?cat=kaifang",
    placeholder: "/courses?cat=kaifang",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 底部信息栏 ──
  {
    key: "footerLogo",
    label: "底部独立Logo",
    type: "image",
    group: "footer",
    defaultValue: "",
    placeholder: "点击上传底部独立Logo（留空则使用网站主Logo）",
    description: "页脚区域专用Logo，留空时回退使用网站主Logo",
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
  },
  {
    key: "footerDescription",
    label: "页脚描述",
    type: "textarea",
    group: "footer",
    defaultValue: "弘道经理学院致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。",
    placeholder: "请输入页脚描述...",
    description: "页脚品牌详细介绍",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "workHours",
    label: "工作时间",
    type: "text",
    group: "footer",
    defaultValue: "周一至周日 9:00-18:00",
    placeholder: "周一至周日 9:00-18:00",
    isPublic: true,
    isEncrypted: false,
  },

  // ── 公司简介 ──
  {
    key: "companySlogan",
    label: "公司标语",
    type: "text",
    group: "company",
    defaultValue: "弘道经理学院，百年大计，教育为本！",
    placeholder: "弘道经理学院，百年大计，教育为本！",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "companyIntro",
    label: "公司简介",
    type: "textarea",
    group: "company",
    defaultValue:
      "弘道经理学院成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。",
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
    defaultValue: "139-0809-1091",
    placeholder: "139-0809-1091",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },
  {
    key: "contactPhone1",
    label: "校长热线1",
    type: "phone",
    group: "contact",
    defaultValue: "139-0809-1091",
    placeholder: "139-0809-1091",
    description: "Header右侧校长热线第一行号码",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "contactPhone2",
    label: "校长热线2",
    type: "phone",
    group: "contact",
    defaultValue: "028-8532-9903",
    placeholder: "028-8532-9903",
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
    placeholder: "2360618023@qq.com",
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
    defaultValue: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    placeholder: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    isPublic: true,
    isEncrypted: false,
  },
  {
    key: "wechatQrCode",
    label: "微信二维码",
    type: "image",
    group: "contact",
    defaultValue: "",
    placeholder: "上传微信二维码图片",
    description: "右下角悬浮窗【官方微信】按钮点击后显示的二维码，不配置则跳转到联系页面",
    isPublic: true,
    isEncrypted: false,
    colSpan: 2,
  },

  // ── 显示控制 ──
  {
    key: "showImageOverlays",
    label: "显示图片上层元素",
    type: "boolean",
    group: "display",
    defaultValue: "true",
    description: "总控开关：控制所有图片上的文字、图标、按钮等上层元素的显示/隐藏（Banner、卡片、证书风采等）",
    isPublic: true,
    isEncrypted: false,
  },

  // ── SEO设置 ──
  {
    key: "seoTitle",
    label: "SEO标题",
    type: "text",
    group: "seo",
    defaultValue: "弘道经理学院 - 专注专升本学历提升",
    placeholder: "弘道经理学院 - 专注专升本学历提升",
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
    defaultValue: "弘道经理学院专注专升本学历提升，提供自考、成考等多种学历提升方案。",
    placeholder: "弘道经理学院专注专升本学历提升...",
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
    placeholder: "蜀ICP备14008479号-2",
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
