import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { Navigation } from ".prisma/client";

/** 前台页头：顶栏公告 + 表驱动主导航（Navigation 表，isNav） */
export async function Header() {
  const [settings, navs] = await Promise.all([
    getSettings(),
    prisma.navigation.findMany({ where: { isVisible: true, isNav: true, level: 1 }, orderBy: { sort: "asc" } }) as Promise<Navigation[]>,
  ]);
  const siteName = settings.siteName || "弘道教育";
  return (
    <header>
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs">
          <span>{settings.topNoticeText}</span>
          <span>咨询热线：{settings.topNoticePhone || settings.contactPhone}</span>
        </div>
      </div>
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-primary">{siteName}</Link>
          <nav className="flex flex-wrap gap-5 text-sm">
            {navs.map((n) => (
              <Link key={n.id} href={n.link ?? "#"} className="hover:text-primary" target={n.linkType === "external" ? "_blank" : undefined}>
                {n.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

/** 前台页脚：站点信息 + 联系方式 + 备案 */
export async function Footer() {
  const settings = await getSettings();
  return (
    <footer className="mt-12 bg-[#1f2937] text-gray-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">{settings.siteName || "弘道教育"}</p>
          <p className="mt-2 text-sm">{settings.footerSlogan}</p>
          <p className="mt-2 text-sm">{settings.footerDescription}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">联系方式</p>
          <p className="mt-2">{settings.contactPhone && `电话：${settings.contactPhone}`}</p>
          <p>{settings.contactPhone2 && `座机：${settings.contactPhone2}`}</p>
          <p>{settings.contactEmail && `邮箱：${settings.contactEmail}`}</p>
          <p>{settings.workHours}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">地址</p>
          <p className="mt-2">{settings.address}</p>
          <p className="mt-3 text-xs text-gray-500">
            {settings.schoolFullName}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-700 py-3 text-center text-xs text-gray-500">
        {settings.icp ? <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">{settings.icp}</a> : `© ${new Date().getFullYear()} ${settings.siteName}`}
      </div>
    </footer>
  );
}
