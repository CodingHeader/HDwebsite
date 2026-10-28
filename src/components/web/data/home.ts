import { WEB_SETTING_DEFAULTS } from "./setting-defaults";
/**
 * 首页数据适配层（P02 / REQ-F-014、ADR-024 铺路）
 * 查询与映射口径逐条复刻 main `src/app/(web)/page.tsx`，把 upgrade 模型（可空列、Article.channel 等）
 * 映射为 main 首页组件的 props；空值按 main schema 的列默认值兜底，保证同数据同外观。
 *
 * D-06：getHomeData 以 WEB_TAGS.home 缓存（unstable_cache），后台写操作经 crud 工厂按标签失效，
 * 前台 ≤5s 可见最新数据；TTFB 不劣化（首页数据复用）。
 */
import { localImageExists } from "@/lib/image-exists";
import { isBlockedShowcaseImage, hasBrokenShowcaseText } from "@/lib/showcase-guard";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { WEB_TAGS, withWebCacheFallback } from "@/lib/cache-tags";
import { getWebSettings } from "./settings";

export interface HomeBannerItem {
  id: number;
  image: string;
  link: string | null;
  sort: number;
}

export interface HomeData {
  banners: HomeBannerItem[];
  bannerSettings: {
    title?: string;
    subtitle?: string;
    btnText?: string;
    btnLink?: string;
    bgImage?: string;
    textAlign?: "left" | "center" | "right";
    textVerticalAlign?: "top" | "middle" | "bottom";
    overlayColor?: string;
    overlayOpacity?: number;
    showContent: boolean;
    showTitle: boolean;
    showSubtitle: boolean;
    showBtn: boolean;
  };
  homeCards: {
    id: number;
    title: string;
    subtitle: string;
    icon: string;
    href: string;
    gradient: string;
    hoverGradient: string;
    shadow: string;
  }[];
  cardShowOverlay: boolean;
  topNoticeText: string;
  topNoticePhone: string;
  entranceNews: { id: number; title: string; createdAt: string; category: string }[];
  serviceGuides: { id: number; title: string; icon: string; link: string }[];
  years: number;
  graduates: string;
  advantages: string[];
  partners: { id: number; name: string; logo: string; website: string | null }[];
  hotMajors: {
    id: number;
    title: string;
    subtitle: string;
    description: string | null;
    duration: string;
    iconType: string;
    iconImage: string | null;
    iconColor: string;
    link: string;
  }[];
  intro: { videoUrl?: string; introText: string; slogan: string };
  centerNews: {
    id: number;
    title: string;
    cover: string | null;
    category: string;
    categorySlug: string;
    date: string;
  }[];
  gallery: { id: number; title: string; image: string; imageMissing: boolean }[];
  campuses: { id: number; name: string; images: { id: number; image: string; caption: string | null }[] }[];
  placeholderImage: string;
  ctaPhone: string;
}

async function getHomeDataUncached(): Promise<HomeData> {
  // 分组串行：绕过 libsql 并发 race condition（main 同口径）
  const [hotMajorsRaw, articles, bannersRaw] = await Promise.all([
    prisma.hotMajor.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 12 }),
    prisma.article.findMany({
      where: { status: "published" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      take: 30,
      orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }],
    }),
    prisma.banner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
  ]);

  const [partnersRaw, campusesRaw, galleryRaw] = await Promise.all([
    prisma.partner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 8 }),
    prisma.campus.findMany({
      where: { status: "active" },
      include: { images: { orderBy: { sort: "asc" } } },
      orderBy: { sort: "asc" },
    }),
    prisma.gallery.findMany({ where: { status: "active", category: "certificate" }, orderBy: { sort: "asc" }, take: 8 }),
  ]);

  const [serviceGuidesRaw, settingsMap, homeCardsRaw] = await Promise.all([
    prisma.serviceGuide.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
    getWebSettings(),
    prisma.homeCard.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 3 }),
  ]);

  const schoolFullName = settingsMap.schoolFullName || "弘道教育";
  const schoolShortName = settingsMap.schoolShortName || "弘道教育";

  const defaultIntro = `${schoolFullName}成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。学校位于成都市青羊区大石西路12号，注册地址为成都市成华区双店路66号，总面积超过2000平米，学校教学及办公设施设备齐全，设有26间标准化教室和容纳上百人的多功能教室，共计300台教学及考试专用计算机。

我校与时俱进、创新务实、团结奋进、诚信办学，经过十五年的教育积淀，形成了学历继续教育为主，兼顾非学历培训的面向全社会的办学特色。我校坚持致力于适应国家教育改革及社会发展需求，更好地服务继续教育事业，传播先进的继续教育理念、科学的继续教育教学、助学、培训方法以及前沿的继续教育思想。

我校采用现场助学与在线学习相结合的自学考试助学方式，在各主考、主办院校的支持下，已经培养的成千上万的各类自学考试本专科毕业生。`;

  const gallery = await Promise.all(
    galleryRaw
      .filter((g) => !isBlockedShowcaseImage(g.image) && !hasBrokenShowcaseText(g.title))
      .map(async (g) => ({
        id: g.id,
        title: g.title,
        image: g.image,
        imageMissing: !(await localImageExists(g.image)),
      }))
  );

  return {
    banners: bannersRaw.map((b) => ({ id: b.id, image: b.image, link: b.link, sort: b.sort })),
    bannerSettings: {
      title: settingsMap.bannerTitle || undefined,
      subtitle: settingsMap.bannerSubtitle || undefined,
      btnText: settingsMap.bannerBtnText || undefined,
      btnLink: settingsMap.bannerBtnLink || undefined,
      bgImage: settingsMap.bannerBgImage || undefined,
      textAlign: (settingsMap.bannerTextAlign as "left" | "center" | "right") || undefined,
      textVerticalAlign: (settingsMap.bannerTextVerticalAlign as "top" | "middle" | "bottom") || undefined,
      overlayColor: settingsMap.bannerOverlayColor || undefined,
      overlayOpacity: settingsMap.bannerOverlayOpacity
        ? parseInt(settingsMap.bannerOverlayOpacity, 10)
        : undefined,
      showContent: settingsMap.bannerShowContent !== "false",
      showTitle: settingsMap.bannerShowTitle !== "false",
      showSubtitle: settingsMap.bannerShowSubtitle !== "false",
      showBtn: settingsMap.bannerShowBtn !== "false",
    },
    homeCards: homeCardsRaw.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle ?? "",
      icon: c.icon || "MessageSquare",
      href: c.href || "/courses",
      gradient: c.gradient || "from-blue-500 to-blue-600",
      hoverGradient: c.hoverGradient || "from-blue-400 to-blue-500",
      shadow: c.shadow || "shadow-blue-200",
    })),
    cardShowOverlay: settingsMap.cardShowOverlay !== "false",
    topNoticeText: settingsMap.topNoticeText || "2026成人高考火热报名中",
    topNoticePhone: settingsMap.topNoticePhone || WEB_SETTING_DEFAULTS.topNoticePhone,
    entranceNews: articles.map((n) => ({
      id: n.id,
      title: n.title,
      createdAt: (n.publishedAt || n.createdAt).toISOString(),
      category: n.category?.slug || "",
    })),
    serviceGuides: serviceGuidesRaw.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon ?? "",
      link: s.link || `/services/${s.slug}`,
    })),
    years: parseInt(settingsMap.yearsOfEstablishment || "26"),
    graduates: settingsMap.totalGraduates || "11万",
    advantages: [
      settingsMap.advantage1 || "正规可靠",
      settingsMap.advantage2 || "国家承认",
      settingsMap.advantage3 || "管家服务",
      settingsMap.advantage4 || "终生可查",
    ],
    partners: partnersRaw.map((p) => ({ id: p.id, name: p.name, logo: p.logo ?? "", website: p.website })),
    hotMajors: hotMajorsRaw.map((h) => ({
      id: h.id,
      title: h.title,
      subtitle: h.subtitle,
      description: h.description,
      duration: h.duration,
      iconType: h.iconType,
      iconImage: h.iconImage,
      iconColor: h.iconColor || "from-blue-500 to-blue-600",
      link: h.link,
    })),
    intro: {
      videoUrl: settingsMap.companyVideoUrl || undefined,
      introText: settingsMap.companyIntro || defaultIntro,
      slogan: settingsMap.companySlogan || `${schoolShortName}，百年大计，教育为本！`,
    },
    centerNews: articles.map((n) => ({
      id: n.id,
      title: n.title,
      cover: n.coverImage,
      category: n.category?.name || "资讯",
      categorySlug: n.category?.slug || "",
      date: (n.publishedAt || n.createdAt).toISOString(),
    })),
    gallery,
    campuses: campusesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      images: c.images.map((img) => ({ id: img.id, image: img.image, caption: img.caption })),
    })),
    placeholderImage: settingsMap.defaultPlaceholderImage || "/images/logo_card.png",
    ctaPhone: settingsMap.contactPhone || WEB_SETTING_DEFAULTS.contactPhone,
  };
}

/**
 * getHomeData（D-06）：以 WEB_TAGS.home 缓存，后台写操作（crud 工厂 / settings API / setSettings）按标签失效。
 * 生产/请求上下文命中缓存；非 Next 请求上下文（单测/脚本）下 unstable_cache 抛 Invariant，
 * 由 withWebCacheFallback 识别后回退未缓存实现，不影响直读。
 */
const getHomeDataCached: () => Promise<HomeData> = unstable_cache(getHomeDataUncached, ["web:home-data"], {
  tags: [WEB_TAGS.home],
  revalidate: false,
});

export function getHomeData(): Promise<HomeData> {
  return withWebCacheFallback(getHomeDataCached, getHomeDataUncached);
}
