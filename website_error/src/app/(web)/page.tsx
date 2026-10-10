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
import { Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import { stat } from "node:fs/promises";

// 强制每次请求动态渲染，保证后台 CMS（服务指南/轮播图/热门专业等）改动后前台立即生效
export const dynamic = "force-dynamic";

async function localImageExists(url: string) {
  if (!url.startsWith("/")) {
    return true;
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export default async function HomePage() {
  // Fetch all data from database (分组串行: 绕过 libsql 并发 race condition)
  const [hotMajorsRaw, articles, bannersRaw] = await Promise.all([
    prisma.hotMajor.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 12 }),
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

  const [serviceGuidesRaw, settings] = await Promise.all([
    prisma.serviceGuide.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } }),
    prisma.setting.findMany(),
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

  const partners: { id: number; name: string; logo: string; website: string | null }[] = partnersRaw.map((p: { id: number; name: string; logo: string; website: string | null }) => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    website: p.website,
  }));

  const campuses: { id: number; name: string; address: string | null; sort: number; status: string; images: { id: number; image: string; caption: string | null; sort: number }[] }[] = campusesRaw.map((c: { id: number; name: string; address: string | null; sort: number; status: string; images: { id: number; image: string; caption: string | null; sort: number }[] }) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    sort: c.sort,
    status: c.status,
    images: c.images.map((img: { id: number; image: string; caption: string | null; sort: number }) => ({
      id: img.id,
      image: img.image,
      caption: img.caption,
      sort: img.sort,
    })),
  }));

  const gallery: { id: number; title: string; image: string; imageMissing: boolean }[] = await Promise.all(
    galleryRaw.map(async (g: { id: number; title: string; image: string }) => ({
      id: g.id,
      title: g.title,
      image: g.image,
      imageMissing: !(await localImageExists(g.image)),
    }))
  );

  const serviceGuides: { id: number; title: string; icon: string; link: string }[] = serviceGuidesRaw.map((s: { id: number; title: string; icon: string; link: string }) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    link: s.link,
  }));

  // Parse settings
  const settingsMap = settings.reduce<Record<string, string | null>>(
    (acc: Record<string, string | null>, setting: { key: string; value: string | null }) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {}
  );

  // 学校名称（从系统配置获取，有默认值）
  const schoolFullName = settingsMap.schoolFullName || "弘道教育";
  const schoolShortName = settingsMap.schoolShortName || "弘道教育";

  // Default intro text（使用变量替换硬编码的学校名称）
  const defaultIntro = `${schoolFullName}成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。学校位于成都市青羊区大石西路12号，注册地址为成都市成华区双店路66号，总面积超过2000平米，学校教学及办公设施设备齐全，设有26间标准化教室和容纳上百人的多功能教室，共计300台教学及考试专用计算机。

我校与时俱进、创新务实、团结奋进、诚信办学，经过十五年的教育积淀，形成了学历继续教育为主，兼顾非学历培训的面向全社会的办学特色。我校坚持致力于适应国家教育改革及社会发展需求，更好地服务继续教育事业，传播先进的继续教育理念、科学的继续教育教学、助学、培训方法以及前沿的继续教育思想。

我校采用现场助学与在线学习相结合的自学考试助学方式，在各主考、主办院校的支持下，已经培养的成千上万的各类自学考试本专科毕业生。`;
  
  const introText = settingsMap.companyIntro || defaultIntro;

  // Top banner data
  const topbarShowContent = settingsMap.topbarShowContent !== "false";
  const topNoticeText = settingsMap.topNoticeText || "2026成人高考火热报名中";
  const topNoticePhone = settingsMap.topNoticePhone || "132-1945-5550";

  // Stats data
  const statsShowContent = settingsMap.statsShowContent !== "false";
  const years = parseInt(settingsMap.yearsOfEstablishment || "26");
  const graduates = settingsMap.totalGraduates || "11万";
  const advantages = [
    settingsMap.advantage1 || "正规可靠",
    settingsMap.advantage2 || "国家承认",
    settingsMap.advantage3 || "管家服务",
    settingsMap.advantage4 || "终生可查",
  ];

  // Banner 设置
  const bannerSettings = {
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
    showContent: settingsMap.bannerShowContent === "false" ? false : undefined,
    showTitle: settingsMap.bannerShowTitle === "false" ? false : undefined,
    showSubtitle: settingsMap.bannerShowSubtitle === "false" ? false : undefined,
    showExtraBtn: settingsMap.bannerShowExtraBtn === "true" ? true : undefined,
    extraBtnText: settingsMap.bannerExtraBtnText || undefined,
    extraBtnLink: settingsMap.bannerExtraBtnLink || undefined,
  };

  // FourCards 区块级配置
  const fourCardsSettings = {
    showSection: settingsMap.fourCardsShowSection !== "false",
    bgColor: settingsMap.fourCardsBgColor || "#f8fafc",
    bgImage: settingsMap.fourCardsBgImage || "",
    containerAlign: (settingsMap.fourCardsContainerAlign as "left" | "center" | "right") || "center",
  };

  // FourCards 卡片数据（从Settings解析）
  const homeCardsData = (() => {
    try {
      const data = settingsMap.fourCardsData;
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // JSON解析失败返回空数组
    }
    return [];
  })();

  return (
    <div>
      {/* Layer 5: Banner轮播 [005-001~030] 30交互点 */}
      <Banner banners={banners} settings={bannerSettings} />

      {/* Layer 4: 四宫格入口 [004-001~034] 34交互点 */}
      <FourCards
        cards={homeCardsData.map((c: { id: string; title: string; subtitle: string; icon: string; href?: string; gradient?: string; hoverGradient?: string; shadow?: string; showIcon?: boolean; showTitle?: boolean; showSubtitle?: boolean; showArrow?: boolean; showDecoration?: boolean; textAlign?: string; backgroundImage?: string | null; backgroundType?: string; description?: string | null; badge?: string | null }) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          icon: c.icon,
          href: c.href || "/courses",
          gradient: c.gradient || "from-blue-500 to-blue-600",
          hoverGradient: c.hoverGradient || "from-blue-400 to-blue-500",
          shadow: c.shadow || "shadow-blue-200",
          showIcon: c.showIcon ?? true,
          showTitle: c.showTitle ?? true,
          showSubtitle: c.showSubtitle ?? true,
          showArrow: c.showArrow ?? true,
          showDecoration: c.showDecoration ?? true,
          textAlign: (c.textAlign as "left" | "center" | "right") || "left",
          backgroundImage: c.backgroundImage || null,
          backgroundType: c.backgroundType || "gradient",
          description: c.description || null,
          badge: c.badge || null,
        }))}
        showSection={fourCardsSettings.showSection}
        bgColor={fourCardsSettings.bgColor}
        bgImage={fourCardsSettings.bgImage}
        containerAlign={fourCardsSettings.containerAlign}
      />

      {/* Layer 2.5: 顶部横幅 - 位于四宫格后、三栏入口前 */}
      <TopBanner noticeText={topNoticeText} noticePhone={topNoticePhone} showContent={topbarShowContent} />

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
      <StatsBanner years={years} graduates={graduates} advantages={advantages} showContent={statsShowContent} />

      {/* 招生院校 */}
      <PartnerUniversities partners={partners} />

      {/* 热门专业 */}
      <CourseSectionNew hotMajors={hotMajors} />

      {/* 公司简介 */}
      <CompanyIntro
        videoUrl={settingsMap.companyVideoUrl || undefined}
        introText={introText}
        slogan={settingsMap.companySlogan || `${schoolShortName}，百年大计，教育为本！`}
      />

      {/* 资讯中心 */}
      <NewsCenter news={articles.map((n: { id: number; title: string; coverImage: string | null; category: { name: string; slug: string } | null; publishedAt: Date | null; createdAt: Date }) => ({
        id: n.id,
        title: n.title,
        cover: n.coverImage,
        category: n.category?.name || "资讯",
        categorySlug: n.category?.slug || "",
        date: (n.publishedAt || n.createdAt).toISOString(),
      }))} />

      {/* 证书风采 */}
      <CertificateGallery items={gallery} />

      {/* 学院风采 */}
      <CampusSection campuses={campuses} />

      {/* Contact CTA */}
      <section className="py-16 bg-[#da251d]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            立即开始您的学历提升之旅
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            咨询热线：{settingsMap.contactPhone || "400-001-5729"}，专业顾问为您提供一对一咨询服务
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
