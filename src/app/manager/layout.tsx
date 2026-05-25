import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ManagerLayoutClient } from "@/components/manager/ManagerLayoutClient";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.siteName || settings.schoolShortName || "弘道经理学院";

  return {
    title: {
      default: `后台管理端 - ${siteName}`,
      template: `%s - 后台管理端 - ${siteName}`,
    },
    description: settings.siteDescription || "专升本教育后台管理系统",
  };
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerLayoutClient>{children}</ManagerLayoutClient>;
}
