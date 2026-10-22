import { Fragment, type ReactNode } from "react";
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
import { getHomeData, type HomeData } from "@/components/web/data/home";
import { resolveHomeBlocks } from "@/lib/block-registry";

// D-06：首页数据（getHomeData）与区块配置（resolveHomeBlocks）经 WEB_TAGS.home 缓存并由后台写操作按标签失效，
// 故移除 force-dynamic；页面仍由后台 CMS 驱动（改后 ≤5s 可见），首页可命中缓存。
//（首页数据全部来自 unstable_cache 缓存函数，无 headers()/cookies() 调用，可被稳定缓存。）

/**
 * 首页区块（ADR-024）：区块数组 → 依次渲染。
 * - code 与 main `src/lib/block-registry.ts` 命名风格一致（home-xxx），最外层 `data-block` 为稳定锚点；
 * - P06 起由区块配置决定启用与顺序：resolveHomeBlocks() 读 home 模板的 TemplateBlock（无配置回落 main 原样顺序）；
 *   本文件只做组合（取舍/排序），区块 JSX 与 className 不变。
 * - 视觉与 main 逐字一致：包裹层为无样式 div，不改变任何区块的盒模型。
 */
/**
 * 首页区块 code 联合类型（V8-T-03）。
 * 原先写成 `const HOME_BLOCK_ORDER = [...] as const; type X = (typeof HOME_BLOCK_ORDER)[number]`，
 * 但该常量只用于取类型、运行时从不读取，会被 no-unused-vars 判为「仅作类型使用」。
 * 直接内联为联合类型：语义完全等价，且不产生永不使用的运行时常量。
 */
type HomeBlockCode =
  | "home-banner"
  | "home-cards"
  | "home-topbar"
  | "home-entrance"
  | "home-stats"
  | "home-partners"
  | "home-courses"
  | "home-intro"
  | "home-news"
  | "home-certificates"
  | "home-campus"
  | "home-cta";

type HomeBlock = { code: HomeBlockCode; render: (d: HomeData) => ReactNode };

const HOME_BLOCKS: HomeBlock[] = [
  {
    // Layer 5: Banner轮播 [005-001~030] 30交互点
    code: "home-banner",
    render: (d) => (
      <div data-block="home-banner">
        <Banner banners={d.banners} settings={d.bannerSettings} />
      </div>
    ),
  },
  {
    // Layer 4: 四宫格入口 [004-001~034] 34交互点
    code: "home-cards",
    render: (d) => (
      <div data-block="home-cards">
        <FourCards cards={d.homeCards} showOverlay={d.cardShowOverlay} />
      </div>
    ),
  },
  {
    // Layer 2.5: 顶部横幅 - 位于四宫格后、三栏入口前
    code: "home-topbar",
    render: (d) => (
      <div data-block="home-topbar">
        <TopBanner noticeText={d.topNoticeText} noticePhone={d.topNoticePhone} />
      </div>
    ),
  },
  {
    // Layer 6: 三栏内容区 [006-001~156] 156交互点
    code: "home-entrance",
    render: (d) => (
      <div data-block="home-entrance">
        <TopEntranceSection news={d.entranceNews} serviceGuides={d.serviceGuides} />
      </div>
    ),
  },
  {
    // 统计横幅
    code: "home-stats",
    render: (d) => (
      <div data-block="home-stats">
        <StatsBanner years={d.years} graduates={d.graduates} advantages={d.advantages} />
      </div>
    ),
  },
  {
    // 招生院校
    code: "home-partners",
    render: (d) => (
      <div data-block="home-partners">
        <PartnerUniversities partners={d.partners} />
      </div>
    ),
  },
  {
    // 热门专业
    code: "home-courses",
    render: (d) => (
      <div data-block="home-courses">
        <CourseSectionNew hotMajors={d.hotMajors} />
      </div>
    ),
  },
  {
    // 公司简介
    code: "home-intro",
    render: (d) => (
      <div data-block="home-intro">
        <CompanyIntro videoUrl={d.intro.videoUrl} introText={d.intro.introText} slogan={d.intro.slogan} />
      </div>
    ),
  },
  {
    // 资讯中心
    code: "home-news",
    render: (d) => (
      <div data-block="home-news">
        <NewsCenter news={d.centerNews} />
      </div>
    ),
  },
  {
    // 证书风采
    code: "home-certificates",
    render: (d) => (
      <div data-block="home-certificates">
        <CertificateGallery items={d.gallery} placeholderImage={d.placeholderImage} />
      </div>
    ),
  },
  {
    // 学院风采
    code: "home-campus",
    render: (d) => (
      <div data-block="home-campus">
        <CampusSection campuses={d.campuses} placeholderImage={d.placeholderImage} />
      </div>
    ),
  },
  {
    // Contact CTA
    code: "home-cta",
    render: (d) => (
      <div data-block="home-cta">
        <section className="py-16 bg-[#da251d]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              立即开始您的学历提升之旅
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              咨询热线：{d.ctaPhone}，专业顾问为您提供一对一咨询服务
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
    ),
  },
];

export default async function HomePage() {
  const [data, resolved] = await Promise.all([getHomeData(), resolveHomeBlocks()]);
  const byCode = new Map<string, HomeBlock>(HOME_BLOCKS.map((b) => [b.code, b]));
  const order = resolved.map((b) => b.code).filter((code) => byCode.has(code));

  return (
    <div>
      {order.map((code) => {
        const block = byCode.get(code);
        return block ? <Fragment key={code}>{block.render(data)}</Fragment> : null;
      })}
    </div>
  );
}
