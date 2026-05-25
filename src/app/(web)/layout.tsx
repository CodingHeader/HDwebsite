import { TopBar } from "@/components/web/TopBar";
import { Header } from "@/components/web/Header";
import { Navbar } from "@/components/web/Navbar";
import { Footer } from "@/components/web/Footer";
import { FloatingContact } from "@/components/web/FloatingContact";
import { getSettings } from "@/lib/settings";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.siteName || "弘道经理学院";
  return {
    title: {
      default: siteName,
      template: `%s - ${siteName}`,
    },
    description: settings.siteDescription || "专注专升本教育，助力学历提升",
  };
}

export default async function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端单点读取settings，避免组件各自请求
  const settings = await getSettings();

  // 提取常用设置
  const schoolShortName = settings.schoolShortName || "弘道经理学院";
  const welcomeText = settings.welcomeText || `${schoolShortName} 欢迎您!`;
  const siteLogo = settings.siteLogo || "/images/logo.png";
  const siteLogoIcon = settings.siteLogoIcon || "/images/logo_card.png";
  const contactPhone1 = settings.contactPhone1 || "139-0809-1091";
  const contactPhone2 = settings.contactPhone2 || "028-8532-9903";
  const wechatQrCode = settings.wechatQrCode || "";
  const footerSlogan = settings.footerSlogan || "专注学历提升教育";
  const footerDescription = settings.footerDescription || "弘道经理学院致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。";
  const footerLogo = settings.footerLogo || "";
  const address = settings.address || "四川省成都市高新区天府大道1700号新世界环球中心N2区601室";
  const contactEmail = settings.contactEmail || "2360618023@qq.com";
  const icp = settings.icp || "蜀ICP备14008479号-2";
  const workHours = settings.workHours || "周一至周日 9:00-18:00";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Layer 1: TopBar [001-004] 2交互点 - 从settings注入 */}
      <TopBar welcomeText={welcomeText} />
      {/* Layer 2: Header [005-012] 8交互点 - 从settings注入 */}
      <Header 
        siteLogoIcon={siteLogoIcon}
        contactPhone1={contactPhone1} 
        contactPhone2={contactPhone2}
      />
      {/* Layer 3: Navbar 主导航 - 深蓝色背景居中 */}
      <Navbar />
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
      <FloatingContact phone={contactPhone1} wechatQrCode={wechatQrCode} />
    </div>
  );
}
