import { TopBanner } from "@/components/web/TopBanner";
import { Banner } from "@/components/web/Banner";
import { FourCards } from "@/components/web/FourCards";
import { TopEntranceSection } from "@/components/web/TopEntranceSection";
import { StatsBanner } from "@/components/web/StatsBanner";
import { PartnerUniversities } from "@/components/web/PartnerUniversities";
import { CourseSectionNew } from "@/components/web/CourseSectionNew";
import { CompanyIntro } from "@/components/web/CompanyIntro";
import { NewsCenter } from "@/components/web/NewsCenter";
import { CertificateGallery } from "@/components/web/CertificateGallery";
import { CampusSection } from "@/components/web/CampusSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  localImageExists,
  resolveCampusCaption,
  resolveCampusName,
  resolvePartnerLogo,
  resolveShowcaseImage,
  resolveShowcaseTitle,
} from "@/lib/showcase";

// 强制每次请求动态渲染，保证后台 CMS（服务指南/轮播图/热门专业等）改动后前台立即生效
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch all data from database (分组串行: 绕过 libsql 并发 race condition)
  const [hotMajorsRaw, articles, bannersRaw, campusesRaw, galleryRaw] =
    await Promise.all([
    prisma.hotMajor.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
    prisma.article.findMany({
      where: { status: "published" },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
      take: 30,
      orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }],
    }),
    prisma.banner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
    prisma.campus.findMany({
      where: { status: "active" },
      include: { images: { orderBy: { sort: "asc" } } },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      take: 4,
    }),
    prisma.gallery.findMany({
      where: { status: "active", category: "certificate" },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    }),
  ]);

  const [partnersRaw] = await Promise.all([
    prisma.partner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
  ]);

  const [serviceGuidesRaw, settings, homeCards] = await Promise.all([
    prisma.serviceGuide.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
    prisma.setting.findMany(),
    prisma.homeCard.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 3 }),
  ]);

  // 净化原始 Prisma 数据：移除 Date 等不可序列化字段，再传给 Client Components
  const banners: { id: number; image: string; link: string | null; sort: number }[] = bannersRaw.map((b: { id: number; image: string; link: string | null; sort: number }) => ({
    id: b.id,
    image: b.image,
    link: b.link,
    sort: b.sort,
  }));

  const hotMajors: { id: number; title: string; subtitle: string; description: string | null; duration: string; iconType: string; iconImage: string | null; iconColor: string; link: string }[] = hotMajorsRaw.map((h: { id: number; title: string; subtitle: string; description: string | null; duration: string; iconType: string; iconImage: string | null; iconColor: string; link: string }) => ({
    id: h.id,
    title: h.title,
    subtitle: h.subtitle,
    description: h.description,
    duration: h.duration,
    iconType: h.iconType,
    iconImage: h.iconImage,
    iconColor: h.iconColor,
    link: h.link,
  }));

  const partners: { id: number; name: string; logo: string; website: string | null }[] = await Promise.all(
    partnersRaw.map(async (p: { id: number; name: string; logo: string; website: string | null }) => ({
      id: p.id,
      name: p.name,
      logo: resolvePartnerLogo({
        logo: p.logo,
        imageMissing: !(await localImageExists(p.logo)),
      }),
      website: p.website,
    }))
  );

  const serviceGuides: { id: number; title: string; icon: string; link: string }[] = serviceGuidesRaw.map((s: { id: number; title: string; icon: string; link: string }) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    link: s.link,
  }));

  // Parse settings
  const settingsMap: Record<string, string | null> = settings.reduce(
    (acc: Record<string, string | null>, setting: { key: string; value: string | null }) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string | null>
  );

  // 学校名称（从系统配置获取，有默认值）
  const schoolFullName = settingsMap.schoolFullName || "弘道经理学院";
  const schoolShortName = settingsMap.schoolShortName || "弘道经理学院";

  // Default intro text（使用变量替换硬编码的学校名称）
  const defaultIntro = `${schoolFullName}成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。学校位于四川省成都市高新区天府大道1700号新世界环球中心N2区601室，注册地址为成都市成华区双店路66号，总面积超过2000平米，学校教学及办公设施设备齐全，设有26间标准化教室和容纳上百人的多功能教室，共计300台教学及考试专用计算机。

我校与时俱进、创新务实、团结奋进、诚信办学，经过十五年的教育积淀，形成了学历继续教育为主，兼顾非学历培训的面向全社会的办学特色。我校坚持致力于适应国家教育改革及社会发展需求，更好地服务继续教育事业，传播先进的继续教育理念、科学的继续教育教学、助学、培训方法以及前沿的继续教育思想。

我校采用现场助学与在线学习相结合的自学考试助学方式，在各主考、主办院校的支持下，已经培养的成千上万的各类自学考试本专科毕业生。`;
  
  const introText = settingsMap.companyIntro || defaultIntro;

  // 全局图片上层元素显示开关（总控）
  const showImageOverlays = settingsMap.showImageOverlays !== "false";

  // Top banner data
  const topNoticeText = settingsMap.topNoticeText || "2026成人高考火热报名中";
  const topNoticePhone = settingsMap.topNoticePhone || "139-0809-1091";
  const topbarShowContent = settingsMap.topbarShowContent !== "false";
  const topbarShowOverlay = showImageOverlays && settingsMap.topbarShowOverlay !== "false";
  const topbarBgImage = settingsMap.topbarBgImage || undefined;

  // Stats data
  const statsText = settingsMap.statsText || "办学26年培养输送各类人才11万余人";
  const statsShowContent = settingsMap.statsShowContent !== "false";
  const statsShowOverlay = showImageOverlays && settingsMap.statsShowOverlay !== "false";
  const statsBgImage = settingsMap.statsBgImage || undefined;
  const advantages = [
    settingsMap.advantage1 || "正规可靠",
    settingsMap.advantage2 || "国家承认",
    settingsMap.advantage3 || "管家服务",
    settingsMap.advantage4 || "终生可查",
  ];

  // Banner 设置（与全局开关联动）
  const bannerSettings = {
    title: settingsMap.bannerTitle || undefined,
    subtitle: settingsMap.bannerSubtitle || undefined,
    btnText: settingsMap.bannerBtnText || undefined,
    btnLink: settingsMap.bannerBtnLink || undefined,
    bgImage: settingsMap.bannerBgImage || undefined,
    textAlign: (settingsMap.bannerTextAlign as "left" | "center" | "right") || undefined,
    textVerticalAlign: (settingsMap.bannerTextVerticalAlign as "top" | "middle" | "bottom") || undefined,
    showContent: showImageOverlays && settingsMap.bannerShowContent !== "false",
    showTitle: showImageOverlays && settingsMap.bannerShowTitle !== "false",
    showSubtitle: showImageOverlays && settingsMap.bannerShowSubtitle !== "false",
    showBtn: showImageOverlays && settingsMap.bannerShowBtn !== "false",
    showExtraBtn: showImageOverlays && settingsMap.bannerShowExtraBtn === "true",
    extraBtnText: settingsMap.bannerExtraBtnText || undefined,
    extraBtnLink: settingsMap.bannerExtraBtnLink || undefined,
  };

  // 卡片显示开关（与全局开关联动）
  const cardShowOverlay = showImageOverlays && settingsMap.cardShowOverlay !== "false";
  const fourCardsShowSection = settingsMap.fourCardsShowSection !== "false";
  const fourCardsBgColor = settingsMap.fourCardsBgColor || "#f9fafb";
  const fourCardsBgImage = settingsMap.fourCardsBgImage || "";
  const fourCardsContainerAlign =
    (settingsMap.fourCardsContainerAlign as "left" | "center" | "right") || "center";

  // 默认占位图
  const defaultPlaceholderImage = settingsMap.defaultPlaceholderImage || "/images/logo_card.png";

  type HomeCampusImageRecord = {
    id: number;
    image: string;
    caption: string | null;
    sort: number;
  };

  type HomeCampusRecord = {
    id: number;
    name: string;
    images: HomeCampusImageRecord[];
  };

  type HomeGalleryRecord = {
    id: number;
    title: string;
    image: string;
  };

  const resolvedHomeCards = [
    {
      title: settingsMap.cardZikaoTitle || "自学考试",
      subtitle: settingsMap.cardZikaoSubtitle || "自助者天助之",
      href: settingsMap.cardZikaoLink || "/courses?cat=zikao",
    },
    {
      title: settingsMap.cardChengkaoTitle || "成人高考",
      subtitle: settingsMap.cardChengkaoSubtitle || "成就学员梦想",
      href: settingsMap.cardChengkaoLink || "/courses?cat=chengkao",
    },
    {
      title: settingsMap.cardKaifangTitle || "开放大学",
      subtitle: settingsMap.cardKaifangSubtitle || "终身学习伙伴",
      href: settingsMap.cardKaifangLink || "/courses?cat=kaifang",
    },
  ].map((configuredCard, index) => {
    const dbCard = homeCards[index];

    return {
      id: dbCard?.id || index + 1,
      title: configuredCard.title || dbCard?.title || `卡片 ${index + 1}`,
      subtitle: configuredCard.subtitle || dbCard?.subtitle || "",
      href: configuredCard.href || dbCard?.href || "/courses",
      icon: dbCard?.icon || (index === 0 ? "BookOpen" : index === 1 ? "GraduationCap" : "Globe"),
      gradient: dbCard?.gradient || (index === 0 ? "from-blue-500 to-blue-600" : index === 1 ? "from-green-500 to-green-600" : "from-orange-500 to-orange-600"),
      hoverGradient: dbCard?.hoverGradient || (index === 0 ? "from-blue-400 to-blue-500" : index === 1 ? "from-green-400 to-green-500" : "from-orange-400 to-orange-500"),
      shadow: dbCard?.shadow || (index === 0 ? "shadow-blue-200" : index === 1 ? "shadow-green-200" : "shadow-orange-200"),
      backgroundImage: dbCard?.backgroundImage || null,
      showIcon: cardShowOverlay,
      showTitle: cardShowOverlay,
      showSubtitle: cardShowOverlay,
      showArrow: cardShowOverlay,
      showDecoration: cardShowOverlay,
      textAlign: "left" as const,
    };
  });

  const campuses = await Promise.all(
    campusesRaw.map(async (campus: HomeCampusRecord, campusIndex: number) => ({
      id: campus.id,
      name: resolveCampusName(campus.name, campusIndex),
      images: await Promise.all(
        campus.images.map(async (image: HomeCampusImageRecord, index: number) => {
          const imageMissing = !(await localImageExists(image.image));
          const resolvedCaption = resolveCampusCaption(
            image.caption,
            campus.name,
            campusIndex,
            index,
          );

          return {
            id: image.id,
            image: resolveShowcaseImage({
              image: image.image,
              imageMissing,
              placeholderImage: defaultPlaceholderImage,
            }),
            caption: resolvedCaption,
            title: resolvedCaption,
            imageMissing,
          };
        })
      ),
    }))
  );

  const gallery = await Promise.all(
    galleryRaw.map(async (item: HomeGalleryRecord, index: number) => {
      const imageMissing = !(await localImageExists(item.image));

      return {
        id: item.id,
        title: resolveShowcaseTitle({
          rawTitle: item.title,
          fallbackPrefix: "证书风采",
          index,
        }),
        image: resolveShowcaseImage({
          image: item.image,
          imageMissing,
          placeholderImage: defaultPlaceholderImage,
        }),
        imageMissing,
      };
    })
  );

  return (
    <div>
      {/* Layer 5: Banner轮播 [005-001~030] 30交互点 */}
      <Banner banners={banners} settings={bannerSettings} />

      {/* Layer 4: 四宫格入口 [004-001~034] 34交互点 */}
      <FourCards
        cards={resolvedHomeCards}
        showOverlay={cardShowOverlay}
        showSection={fourCardsShowSection}
        bgColor={fourCardsBgColor}
        bgImage={fourCardsBgImage}
        containerAlign={fourCardsContainerAlign}
      />

      {/* Layer 2.5: 顶部横幅 - 位于四宫格后、三栏入口前 */}
      <TopBanner
        noticeText={topNoticeText}
        noticePhone={topNoticePhone}
        showContent={topbarShowContent}
        bgImage={topbarBgImage}
        showOverlay={topbarShowOverlay}
      />

      {/* Layer 6: 三栏内容区 [006-001~156] 156交互点 */}
      <TopEntranceSection
        news={articles.map((n: { id: number; title: string; publishedAt: Date | null; createdAt: Date; category: { slug: string } | null }) => ({
          id: n.id,
          title: n.title,
          createdAt: (n.publishedAt || n.createdAt).toISOString(),
          category: n.category?.slug || "",
        }))}
        serviceGuides={serviceGuides}
      />

      {/* 统计横幅 */}
      <StatsBanner
        statsText={statsText}
        advantages={advantages}
        showContent={statsShowContent}
        bgImage={statsBgImage}
        showOverlay={statsShowOverlay}
      />

      {/* 招生院校 */}
      <PartnerUniversities partners={partners} showOverlay={showImageOverlays} />

      {/* 热门专业 */}
      <CourseSectionNew hotMajors={hotMajors} showOverlay={showImageOverlays} />

      {/* 公司简介 */}
      <CompanyIntro
        videoUrl={settingsMap.companyVideoUrl || undefined}
        introText={introText}
        slogan={settingsMap.companySlogan || `${schoolShortName}，百年大计，教育为本！`}
        showOverlay={showImageOverlays}
      />

      {/* 资讯中心 */}
      <NewsCenter news={articles.map((n: { id: number; title: string; coverImage: string | null; category: { name: string; slug: string } | null; publishedAt: Date | null; createdAt: Date }) => ({
        id: n.id,
        title: n.title,
        cover: n.coverImage,
        category: n.category?.name || "资讯",
        categorySlug: n.category?.slug || "",
        date: (n.publishedAt || n.createdAt).toISOString(),
      }))} showOverlay={showImageOverlays} />

      {/* 证书风采 */}
      <CertificateGallery items={gallery} placeholderImage={defaultPlaceholderImage} showOverlay={showImageOverlays} />

      {/* 学院风采 */}
      <CampusSection campuses={campuses} placeholderImage={defaultPlaceholderImage} showOverlay={showImageOverlays} />

      {/* Contact CTA */}
      <section className="py-16 bg-[#da251d]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            立即开始您的学历提升之旅
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            咨询热线：{settingsMap.contactPhone || "139-0809-1091"}，专业顾问为您提供一对一咨询服务
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply">
              <Button size="lg" variant="secondary" className="bg-white text-[#da251d] hover:bg-gray-100">
                在线报名
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                了解课程
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
