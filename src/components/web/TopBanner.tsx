"use client";

import { Flame, Phone } from "lucide-react";
import Link from "next/link";

interface TopBannerProps {
  noticeText: string;
  noticePhone: string;
  /** V1.8/A3：整条横幅显隐（原版 :7/:20/:25 同款，默认 true 保持现渲染） */
  showContent?: boolean;
  /** V1.8/A3：背景图，非空时以内联样式覆盖渐变（原版 :8/:22/:30-36） */
  bgImage?: string;
  /** V1.8/A3：内容层显隐（原版 :9/:23/:43 同款，默认 true 保持现渲染） */
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
  // 非空时才生成内联样式：inline backgroundImage 会覆盖 bg-gradient 类，为空则完全不干预
  const bannerStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <section className="py-4 md:py-6 lg:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-[#0d47a1] via-[#1565c0] to-[#00695c] px-4 py-6 md:py-8 lg:py-8 text-center"
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
