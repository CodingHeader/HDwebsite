/**
 * 站点设置注册表（SETTINGS_REGISTRY，ADR-009 唯一真相源）
 * - 统一 Registry 扁平 key 体系；废弃旧点分 key（site.title / contact.phone1 等）
 * - 品牌基准：弘道教育（ADR-010）
 * - 新配置分组（email/wechat-mp/collect/llm/notify/publish）在此注册，后台 SchemaForm 自动生成
 * - 工具族：getRegistry / getGroups / getSettingsByGroup / getSettingDefinition / getDefaultValues / validateSetting
 */
import type { SettingDefinition } from "@/contracts";
import { BRAND_DEFAULTS, BRAND_SITE_URL } from "@/config/brand";
import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";

type RegistryItem = Omit<SettingDefinition, "group"> & { group: string };

function def(
  key: string,
  label: string,
  group: string,
  defaultValue: string,
  opts: Partial<RegistryItem> = {}
): RegistryItem {
  return {
    key,
    label,
    group,
    defaultValue,
    type: opts.type ?? "string",
    isPublic: opts.isPublic ?? true,
    isEncrypted: opts.isEncrypted ?? false,
    description: opts.description,
  };
}

export const SETTINGS_REGISTRY: RegistryItem[] = [
  // ── site 站点 ──
  def("siteName", "站点名称", "site", "弘道教育"),
  def("siteDescription", "站点描述", "site", "专注专升本教育，助力学历提升"),
  def("siteLogo", "站点 Logo", "site", "/images/logo.png"),
  def("schoolFullName", "学校全称", "site", "弘道教育"),
  def("schoolShortName", "学校简称", "site", "弘道教育"),
  def("welcomeText", "欢迎语", "site", "弘道教育 欢迎您!"),
  // D-04：默认占位图改为仓库内存在的 logo_card.png（原 placeholder.svg 不存在）；main 口径
  def("defaultPlaceholderImage", "默认占位图", "site", "/images/logo_card.png"),
  // D-04：Header 左侧图标（main 键对等，默认 logo_card.png）
  def("siteLogoIcon", "站点小图标", "site", "/images/logo_card.png"),
  // D-04：站点图标默认空（main 口径；浏览器标签图标由 Next 从 public/favicon-*.png 自动注入）
  def("siteFavicon", "站点图标", "site", "", { isPublic: false }),
  def("siteUrl", "站点地址", "site", BRAND_SITE_URL, {
    description: "对外链接（邮件、公众号回复、采集 UA）使用的站点根地址；环境变量 APP_ORIGIN 优先",
  }),
  // ── topbar 顶栏 ──
  def("topNoticeText", "顶栏公告", "topbar", "2026成人高考火热报名中"),
  def("topNoticePhone", "顶栏电话", "topbar", "132-1945-5550"),
  // ── banner 首页横幅 ──
  // D-04：banner-bg.jpg 在仓库与 main 均不存在，默认空（前台无背景图时走红色渐变）；main 口径
  def("bannerBgImage", "横幅背景图", "banner", ""),
  def("bannerTitle", "横幅标题", "banner", "弘道教育"),
  def("bannerSubtitle", "横幅副标题", "banner", "专注专升本教育，助力学历提升"),
  def("bannerBtnText", "横幅按钮文字", "banner", "立即咨询"),
  def("bannerBtnLink", "横幅按钮链接", "banner", "/apply"),
  def("bannerOverlayColor", "遮罩颜色", "banner", "#000000"),
  def("bannerOverlayOpacity", "遮罩透明度", "banner", "40", { type: "number" }),
  def("bannerTextAlign", "文字水平位置", "banner", "center"),
  def("bannerTextVerticalAlign", "文字垂直位置", "banner", "middle"),
  def("bannerShowContent", "显示横幅内容", "banner", "true", { type: "boolean" }),
  def("bannerShowTitle", "显示主标题", "banner", "true", { type: "boolean" }),
  def("bannerShowSubtitle", "显示副标题", "banner", "true", { type: "boolean" }),
  def("bannerShowBtn", "显示按钮", "banner", "true", { type: "boolean" }),
  // ── stats 统计 ──
  def("yearsOfEstablishment", "办学年限", "stats", "26", { type: "number" }),
  def("totalGraduates", "累计毕业学员", "stats", "11万"),
  def("statsLabel", "统计标题", "stats", "年培养输送各类人才"),
  def("statsText", "统计文案", "stats", "11年办学经验|10000+服务学员|98%通过率", {
    description: "竖线分隔的统计项（B 分支合并口径，main 无此键）",
  }),
  // ── advantage 旧优势项（main 已废弃，保留兼容 DB 数据） ──
  def("advantage1", "优势1（旧）", "stats", "正规可靠"),
  def("advantage2", "优势2（旧）", "stats", "国家承认"),
  def("advantage3", "优势3（旧）", "stats", "管家服务"),
  def("advantage4", "优势4（旧）", "stats", "终生可查"),
  // ── cards 首页四宫格 ──
  def("cardShowOverlay", "卡片显示遮罩", "cards", "true", { type: "boolean" }),
  def("cardZikaoTitle", "自考卡片标题", "cards", "自考"),
  def("cardZikaoSubtitle", "自考卡片副标题", "cards", "自助者天助之"),
  def("cardZikaoLink", "自考卡片链接", "cards", "/courses?cat=zikao"),
  def("cardChengkaoTitle", "成考卡片标题", "cards", "成考"),
  def("cardChengkaoSubtitle", "成考卡片副标题", "cards", "成就学员梦想"),
  def("cardChengkaoLink", "成考卡片链接", "cards", "/courses?cat=chengkao"),
  def("cardKaifangTitle", "开大卡片标题", "cards", "开放大学"),
  def("cardKaifangSubtitle", "开大卡片副标题", "cards", "终身学习伙伴"),
  def("cardKaifangLink", "开大卡片链接", "cards", "/courses?cat=kaifang"),
  // ── footer 页脚 ──
  def("footerLogo", "页脚 Logo（空回退主 Logo）", "footer", ""),
  def("footerSlogan", "页脚口号", "footer", "专注学历提升教育"),
  def("footerDescription", "页脚描述", "footer", "弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。"),
  def("workHours", "工作时间", "footer", "周一至周日 9:00-18:00"),
  // ── company 公司 ──
  def("companySlogan", "公司口号", "company", "弘道教育，百年大计，教育为本！"),
  def("companyIntro", "公司简介", "company", "弘道教育成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。", {
    type: "text",
  }),
  def("companyVideoUrl", "公司视频地址", "company", ""),
  // ── contact 联系 ──
  // D-04：contactPhone 保持 BRAND_DEFAULTS（ADR-010 品牌基准，环境可覆盖），
  // 覆盖循环会跳过 contactPhone，其余 contact 键按 main 快照对齐
  def("contactPhone", "联系电话", "contact", BRAND_DEFAULTS.contactPhone),
  def("contactPhone1", "备用电话", "contact", "132-1945-5550"),
  def("contactPhone2", "座机", "contact", "028-6167-5329"),
  def("contactEmail", "联系邮箱", "contact", ""),
  def("address", "地址", "contact", "成都市青羊区大石西路12号"),
  // ── seo ──
  def("seoTitle", "SEO 标题", "seo", "弘道教育 - 专注专升本学历提升"),
  def("seoKeywords", "SEO 关键词", "seo", "专升本,学历提升,成人教育,自考,成考"),
  def("seoDescription", "SEO 描述", "seo", "弘道教育专注专升本学历提升，提供自考、成考等多种学历提升方案。", {
    type: "text",
  }),
  // ── other ──
  def("icp", "备案号", "other", ""),

  // ── email 邮件（SOL-005；isPublic=false，凭证类加密） ──
  def("emailHost", "SMTP 服务器", "email", "", { isPublic: false }),
  def("emailPort", "SMTP 端口", "email", "465", { type: "number", isPublic: false }),
  def("emailSecure", "启用 SSL", "email", "true", { type: "boolean", isPublic: false }),
  def("emailUsername", "发件账号", "email", "", { isPublic: false }),
  def("emailPassword", "发件授权码", "email", "", { isPublic: false, isEncrypted: true }),
  def("emailFrom", "发件人显示", "email", BRAND_DEFAULTS.emailFrom, { isPublic: false }),
  // ── wechat-mp 公众号（SOL-006；凭证走 WechatAccount，此处仅全局默认） ──
  def("wechatMpMode", "接入模式", "wechat-mp", "test", { isPublic: false }),
  def("wechatFallbackReply", "公众号 AI 兜底回复", "wechat-mp", "抱歉，当前咨询繁忙，请拨打 {contactPhone} 或访问官网 {siteUrl} 留言。", {
    type: "text",
    isPublic: false,
    description: "模型不可用时的回复；{contactPhone}/{siteUrl} 会替换为对应设置",
  }),
  def("wechatReplyMaxLength", "公众号回复最大字数", "wechat-mp", "600", { type: "number", isPublic: false }),
  // ── collect 采集（SOL-004） ──
  def("collectRateLimitMs", "请求限速（毫秒）", "collect", "2000", { type: "number", isPublic: false }),
  def("collectUserAgent", "采集 UA", "collect", "Mozilla/5.0 (compatible; HDBot/1.0)", {
    isPublic: false,
  }),
  def("collectTimeoutMs", "请求超时（毫秒）", "collect", "15000", { type: "number", isPublic: false }),
  // V11-COL-02：图片转存独立开关（原误挂在 collectDefaultKnowledge 键下；该键唯一读取点即图片转存，已随解绑移除）
  def("collectTransferImages", "图片转存本地", "collect", "true", {
    type: "boolean",
    isPublic: false,
    description: "正文中的外链图片转存为本站 /uploads 资源（默认开启）；与源级「采集后自动入知识库」（autoToKb）互不影响",
  }),
  // ── kb 知识库（ADR-025 / C-04：Coze 同步所用 Provider 与 space） ──
  def("kbCozeProviderId", "知识库同步 Provider", "kb", "", {
    type: "number",
    isPublic: false,
    description: "指向 kind=coze 的 LLMProvider（其 apiKey 即 Coze PAT）；留空则知识库同步不可用，本地兜底检索仍生效",
  }),
  def("kbCozeSpaceId", "Coze 空间 ID（space_id）", "kb", "", {
    isPublic: false,
    isEncrypted: true,
    description: "Coze space_id（创建 dataset 必需）；加密存储、任何接口只回脱敏值（REQ-NF-002）",
  }),
  // ── llm 网关（SOL-003） ──
  def("llmTimeoutMs", "模型调用超时（毫秒）", "llm", "30000", { type: "number", isPublic: false }),
  def("llmBalanceThreshold", "余额提醒阈值", "llm", "100", { type: "number", isPublic: false }),
  // CCR-1（W0-10）：客服风控三键（REQ-F-009；消费卡 C-10 生效逻辑、D-04 设置页、E-02/E-10 展示）。
  // 扁平 key（ADR-009 规则）；JSON 数组串存储（jsonifyFields 接线，C-07 同款）。
  def("chatGuardRateLimitPerMin", "客服限流（次/分钟）", "llm", "20", { type: "number", isPublic: false }),
  def("chatGuardSensitiveWords", "敏感词列表（JSON 数组）", "llm", "[]", { type: "string", isPublic: false }),
  def("chatGuardBlacklist", "会话黑名单（JSON 数组）", "llm", "[]", { type: "string", isPublic: false }),
  // ── notify 通知（SOL-005） ──
  def("notifyRetryCount", "邮件重试次数", "notify", "3", { type: "number", isPublic: false }),
  def("notifyQuietHours", "静默时段", "notify", "", { isPublic: false }),
  // ── publish 发布（SOL-005） ──
  def("publishRemindAheadMinutes", "发布前提醒提前量（分钟）", "publish", "30", {
    type: "number",
    isPublic: false,
  }),
  def("publishWechatDailyLimit", "公众号每日发布上限", "publish", "20", {
    type: "number",
    isPublic: false,
  }),
  def("publishAutoChannels", "审核通过后自动发布渠道", "publish", "website,wechat", {
    isPublic: false,
    description: "逗号分隔：website / wechat；留空 = 审核通过后不自动建发布任务。公众号仅在存在启用的服务号时创建",
  }),
  def("publishAutoDelayMinutes", "自动发布延迟（分钟）", "publish", "60", {
    type: "number",
    isPublic: false,
    description: "审核通过后延迟多久自动发布；延迟 ≥ 发布前提醒提前量时可先收到提醒邮件再发布",
  }),
];

/**
 * D-04：默认值单一来源——前台相关分组（视觉冻结面）的 defaultValue 从
 * `WEB_SETTING_DEFAULTS`（main@94dbbbb 快照，见 setting-defaults.ts）覆盖。
 *
 * 覆盖范围 = 前台分组（site/topbar/banner/stats/cards/footer/company/contact/seo/other）；
 * 后台分组（email/wechat-mp/collect/kb/llm/notify/publish）与 upgrade 独有键（statsText）不覆盖。
 * contactPhone 保持 BRAND_DEFAULTS（ADR-010 品牌基准，环境可覆盖），跳过覆盖。
 * WEB_SETTING_DEFAULTS 中不存在的键（如 siteUrl、statsText）保持 registry 字面量值。
 */
const WEB_GROUPS = new Set(["site", "topbar", "banner", "stats", "cards", "footer", "company", "contact", "seo", "other"]);
const SKIP_WEB_OVERRIDE = new Set(["contactPhone", "siteUrl", "statsText"]);

for (const item of SETTINGS_REGISTRY) {
  if (!WEB_GROUPS.has(item.group)) continue;
  if (SKIP_WEB_OVERRIDE.has(item.key)) continue;
  const webDefault = WEB_SETTING_DEFAULTS[item.key];
  if (webDefault !== undefined) item.defaultValue = webDefault;
}

export function getRegistry(): RegistryItem[] {
  return SETTINGS_REGISTRY;
}

export function getGroups(): string[] {
  return [...new Set(SETTINGS_REGISTRY.map((d) => d.group))];
}

export function getSettingDefinition(key: string): RegistryItem | undefined {
  return SETTINGS_REGISTRY.find((d) => d.key === key);
}

export function getSettingsByGroup(group: string): RegistryItem[] {
  return SETTINGS_REGISTRY.filter((d) => d.group === group);
}

export function getDefaultValues(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of SETTINGS_REGISTRY) out[d.key] = d.defaultValue;
  return out;
}

export function getPublicSettingKeys(): string[] {
  return SETTINGS_REGISTRY.filter((d) => d.isPublic).map((d) => d.key);
}

/** 布尔值归一 */
export function isTruthySetting(value: string | undefined | null): boolean {
  return value === "true" || value === "1";
}
