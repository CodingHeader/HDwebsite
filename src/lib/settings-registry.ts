/**
 * 站点设置注册表（SETTINGS_REGISTRY，ADR-009 唯一真相源）
 * - 统一 Registry 扁平 key 体系；废弃旧点分 key（site.title / contact.phone1 等）
 * - 品牌基准：弘道教育（ADR-010）
 * - 新配置分组（email/wechat-mp/collect/llm/notify/publish）在此注册，后台 SchemaForm 自动生成
 * - 工具族：getRegistry / getGroups / getSettingsByGroup / getSettingDefinition / getDefaultValues / validateSetting
 */
import type { SettingDefinition } from "@/contracts";

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
  def("siteDescription", "站点描述", "site", "专注专升本学历提升"),
  def("siteLogo", "站点 Logo", "site", "/images/logo.png"),
  def("schoolFullName", "学校全称", "site", "弘道教育"),
  def("schoolShortName", "学校简称", "site", "弘道"),
  def("welcomeText", "欢迎语", "site", "欢迎来到弘道教育"),
  def("defaultPlaceholderImage", "默认占位图", "site", "/images/placeholder.svg"),
  def("siteFavicon", "站点图标", "site", "/favicon.ico", { isPublic: false }),
  // ── topbar 顶栏 ──
  def("topNoticeText", "顶栏公告", "topbar", "2026成人高考火热报名中"),
  def("topNoticePhone", "顶栏电话", "topbar", "132-1945-5550"),
  // ── banner 首页横幅 ──
  def("bannerBgImage", "横幅背景图", "banner", "/images/banner-bg.jpg"),
  def("bannerTitle", "横幅标题", "banner", "学历提升 一站式服务"),
  def("bannerSubtitle", "横幅副标题", "banner", "自考 · 成考 · 开放大学"),
  def("bannerBtnText", "横幅按钮文字", "banner", "立即咨询"),
  def("bannerBtnLink", "横幅按钮链接", "banner", "/apply"),
  def("bannerOverlayOpacity", "遮罩透明度", "banner", "40", { type: "number" }),
  def("bannerShowContent", "显示横幅内容", "banner", "true", { type: "boolean" }),
  // ── stats 统计 ──
  def("yearsOfEstablishment", "办学年限", "stats", "26", { type: "number" }),
  def("totalGraduates", "累计毕业学员", "stats", "11万"),
  def("statsText", "统计文案", "stats", "11年办学经验|10000+服务学员|98%通过率", {
    description: "竖线分隔的统计项（B 分支合并口径）",
  }),
  // ── cards 首页四宫格 ──
  def("cardShowOverlay", "卡片显示遮罩", "cards", "true", { type: "boolean" }),
  def("cardZikaoTitle", "自考卡片标题", "cards", "自考"),
  def("cardZikaoLink", "自考卡片链接", "cards", "/courses?cat=zikao"),
  def("cardChengkaoTitle", "成考卡片标题", "cards", "成考"),
  def("cardChengkaoLink", "成考卡片链接", "cards", "/courses?cat=chengkao"),
  def("cardKaifangTitle", "开大卡片标题", "cards", "开放大学"),
  def("cardKaifangLink", "开大卡片链接", "cards", "/courses?cat=kaifang"),
  // ── footer 页脚 ──
  def("footerLogo", "页脚 Logo（空回退主 Logo）", "footer", ""),
  def("footerSlogan", "页脚口号", "footer", "让每一次学历提升都值得信赖"),
  def("footerDescription", "页脚描述", "footer", "弘道教育专注成人学历提升"),
  def("workHours", "工作时间", "footer", "周一至周日 9:00-18:00"),
  // ── company 公司 ──
  def("companySlogan", "公司口号", "company", "厚德弘道 笃行致远"),
  def("companyIntro", "公司简介", "company", "弘道教育致力于为学员提供专业的学历提升服务。", {
    type: "text",
  }),
  def("companyVideoUrl", "公司视频地址", "company", ""),
  // ── contact 联系 ──
  def("contactPhone", "联系电话", "contact", "400-001-5729"),
  def("contactPhone1", "备用电话", "contact", ""),
  def("contactPhone2", "座机", "contact", "028-6167-5329"),
  def("contactEmail", "联系邮箱", "contact", ""),
  def("address", "地址", "contact", "成都市青羊区大石西路12号"),
  // ── seo ──
  def("seoTitle", "SEO 标题", "seo", "弘道教育 - 专升本学历提升"),
  def("seoKeywords", "SEO 关键词", "seo", "专升本,学历提升,成人教育,自考,成考"),
  def("seoDescription", "SEO 描述", "seo", "弘道教育提供自考、成考、开放大学等学历提升服务。", {
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
  def("emailFrom", "发件人显示", "email", "弘道教育 <noreply@hd1994.com>", { isPublic: false }),
  // ── wechat-mp 公众号（SOL-006；凭证走 WechatAccount，此处仅全局默认） ──
  def("wechatMpMode", "接入模式", "wechat-mp", "test", { isPublic: false }),
  // ── collect 采集（SOL-004） ──
  def("collectRateLimitMs", "请求限速（毫秒）", "collect", "2000", { type: "number", isPublic: false }),
  def("collectUserAgent", "采集 UA", "collect", "Mozilla/5.0 (compatible; HDBot/1.0)", {
    isPublic: false,
  }),
  def("collectTimeoutMs", "请求超时（毫秒）", "collect", "15000", { type: "number", isPublic: false }),
  def("collectDefaultKnowledge", "默认入知识库", "collect", "true", { type: "boolean", isPublic: false }),
  // ── llm 网关（SOL-003） ──
  def("llmTimeoutMs", "模型调用超时（毫秒）", "llm", "30000", { type: "number", isPublic: false }),
  def("llmBalanceThreshold", "余额提醒阈值", "llm", "100", { type: "number", isPublic: false }),
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
];

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
