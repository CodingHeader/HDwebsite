import Link from "next/link";
import { getSettings } from "@/lib/settings";

/** 前台页头（骨架版：站点名 + 主导航占位；完整导航随 R0 基线重建） */
export async function Header() {
  const settings = await getSettings();
  const siteName = settings.siteName || "弘道教育";
  return (
    <header className="bg-white border-b border-border">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
        <Link href="/" className="text-xl font-bold text-primary">
          {siteName}
        </Link>
        <nav className="flex gap-6 text-sm text-muted">
          <Link href="/articles" className="hover:text-primary">资讯中心</Link>
          <Link href="/apply" className="hover:text-primary">在线报名</Link>
          <Link href="/manager" className="hover:text-primary">后台管理</Link>
        </nav>
      </div>
    </header>
  );
}

/** 前台页脚（骨架版） */
export async function Footer() {
  const settings = await getSettings();
  return (
    <footer className="bg-white border-t border-border mt-12">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <p className="font-semibold">{settings.siteName || "弘道教育"}</p>
        <p className="mt-2">{settings.footerDescription}</p>
        <p className="mt-2">
          {settings.contactPhone && <span className="mr-4">电话：{settings.contactPhone}</span>}
          {settings.address}
        </p>
        {settings.icp && <p className="mt-2 text-xs">{settings.icp}</p>}
      </div>
    </footer>
  );
}
