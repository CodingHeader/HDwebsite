import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  let title = "弘道教育 - 专升本学历提升";
  let description = "弘道教育提供自考、成考、开放大学等学历提升服务。";
  try {
    const settings = await getSettings();
    title = settings.seoTitle || settings.siteName || title;
    description = settings.seoDescription || description;
  } catch {
    // 数据库未就绪时回退默认文案
  }
  return { title, description };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
