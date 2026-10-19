import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";
import { TopBar } from "@/components/web/TopBar";
import { Header } from "@/components/web/Header";
import { Navbar } from "@/components/web/Navbar";
import { Footer } from "@/components/web/Footer";
import { FloatingContact } from "@/components/web/FloatingContact";
import { getWebSettings as getSettings } from "@/components/web/data/settings";
import { getNavItems } from "@/components/web/data/navigation";
import { UserActionTracker } from "@/components/web/UserActionTracker";
import { ChatWidget } from "@/components/web/ChatWidget";
import type { Metadata } from "next";

// D-06：站点框架（设置/导航）数据已按 WEB_TAGS.settings 缓存（data/settings.ts、data/navigation.ts），
// 后台写设置/导航后经标签失效 → 前台 ≤5s 可见；layout 段不再强制动态，让子路由可命中缓存。

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.siteName || "弘道教育";
  return {
    title: {
      default: siteName,
      template: `%s - ${siteName}`,
    },
    description: settings.seoDescription || settings.siteDescription || "专注专升本教育，助力学历提升",
    keywords: settings.seoKeywords || undefined,
  };
}

export default async function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端单点读取settings，避免组件各自请求
  const [settings, navItems] = await Promise.all([getSettings(), getNavItems()]);

  // 提取常用设置
  const schoolShortName = settings.schoolShortName || "弘道教育";
  const welcomeText = settings.welcomeText || `${schoolShortName} 欢迎您!`;
  const siteLogo = settings.siteLogo || "/images/logo.png";
  const siteLogoIcon = settings.siteLogoIcon || "/images/logo_card.png";
  const contactPhone1 = settings.contactPhone1 || WEB_SETTING_DEFAULTS.contactPhone1;
  const contactPhone2 = settings.contactPhone2 || "028-6167-5329";
  const footerSlogan = settings.footerSlogan || "专注学历提升教育";
  const footerDescription = settings.footerDescription || "弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。";
  const footerLogo = settings.footerLogo || "";
  const address = settings.address || "成都市青羊区大石西路12号";
  const contactEmail = settings.contactEmail || "contact@hdaomanager.com";
  const icp = settings.icp || "蜀ICP备XXXXXXXX号";
  const workHours = settings.workHours || "周一至周日 9:00-18:00";

  return (
    <div className="flex min-h-screen flex-col">
      {/* upgrade：埋点（ASM-008，无可见 UI） */}
      <UserActionTracker />
      {/* Layer 1: TopBar [001-004] 2交互点 - 从settings注入 */}
      <TopBar welcomeText={welcomeText} />
      {/* Layer 2: Header [005-012] 8交互点 - 从settings注入 */}
      <Header 
        siteLogoIcon={siteLogoIcon}
        contactPhone1={contactPhone1} 
        contactPhone2={contactPhone2}
      />
      {/* Layer 3: Navbar 主导航 - 深蓝色背景居中 */}
      <Navbar items={navItems} />
      <main className="flex-1">{children}</main>
      <Footer 
        schoolShortName={schoolShortName}
        siteLogo={siteLogo}
        footerLogo={footerLogo}
        footerSlogan={footerSlogan}
        footerDescription={footerDescription}
        address={address}
        contactPhone={contactPhone1}
        contactEmail={contactEmail}
        icp={icp}
        workHours={workHours}
      />
      {/* 右侧悬浮组件 [FLOAT-001~020] 20交互点 */}
      <FloatingContact phone={contactPhone1} />
      {/* upgrade：AI 客服悬浮窗（SOL-003；视觉对比时遮罩） */}
      <ChatWidget />
    </div>
  );
}
