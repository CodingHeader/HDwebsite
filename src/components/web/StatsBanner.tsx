"use client";

import { CheckCircle } from "lucide-react";

interface StatsBannerProps {
  statsText: string;
  advantages: string[];
  showContent?: boolean;
  bgImage?: string;
  showOverlay?: boolean;
}

export function StatsBanner({
  statsText,
  advantages,
  showContent = true,
  bgImage,
  showOverlay = true,
}: StatsBannerProps) {
  if (!showContent) {
    return null;
  }

  const bannerStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;
  const bannerClassName = bgImage
    ? "relative overflow-hidden"
    : "bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#004d40]";

  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`px-4 py-6 md:px-6 md:py-8 ${bannerClassName}`} style={bannerStyle}>
          {showOverlay && (
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8">
              <div className="text-white text-center lg:text-left flex-shrink-0">
                <p className="text-xl md:text-2xl lg:text-[28px] font-bold leading-relaxed">
                  {statsText}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 md:gap-4">
                {advantages.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full"
                  >
                    <CheckCircle className="h-4 w-4 text-[#69f0ae] flex-shrink-0" />
                    <span className="text-white text-sm md:text-base font-medium whitespace-nowrap">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
