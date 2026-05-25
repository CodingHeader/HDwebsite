"use client";

import { Flame, Phone } from "lucide-react";
import Link from "next/link";

interface TopBannerProps {
  noticeText: string;
  noticePhone: string;
  showContent?: boolean;
  bgImage?: string;
  showOverlay?: boolean;
}

/**
 * 顶部横幅 - 位于四宫格后、三栏入口前
 * 背景仅在内容容器内显示
 */
export function TopBanner({
  noticeText,
  noticePhone,
  showContent = true,
  bgImage,
  showOverlay = true,
}: TopBannerProps) {
  if (!showContent) {
    return null;
  }

  const telHref = `tel:${noticePhone.replace(/[^\d+]/g, "")}`;
  const bannerStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;
  const bannerClassName = bgImage
    ? "relative overflow-hidden"
    : "bg-gradient-to-r from-[#0d47a1] via-[#1565c0] to-[#00695c]";

  return (
    <section className="py-4 md:py-6 lg:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-center gap-3 px-4 py-6 md:py-8 lg:py-8 text-center ${bannerClassName}`}
          style={bannerStyle}
        >
          {showOverlay && (
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Flame className="h-4 w-4 md:h-5 w-5 lg:h-6 w-6 text-yellow-400 animate-pulse" />
              <span className="text-sm md:text-base lg:text-lg font-bold text-white tracking-wide">
                {noticeText}
              </span>
              <span className="hidden sm:inline text-white/80 text-sm mx-2">|</span>
              <span className="hidden sm:inline text-white/90 text-sm md:text-base">报名热线：</span>
              <Link
                href={telHref}
                className="hidden sm:inline-flex items-center gap-1 text-yellow-300 hover:text-yellow-200 font-semibold transition-colors"
              >
                <Phone className="h-3 w-3 md:h-4 w-4 lg:h-5 w-5" />
                {noticePhone}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
