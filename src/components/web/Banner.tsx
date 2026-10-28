"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerItem {
  id: number;
  image: string;
  link: string | null;
  sort: number;
  title?: string;
}

export interface BannerSettings {
  /** 主标题，若单条 Banner 未配图也会显示 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 按钮文字（空则不显示按钮） */
  btnText?: string;
  /** 按钮链接 */
  btnLink?: string;
  /** 备用背景图：当 banners 为空时显示 */
  bgImage?: string;
  /** 文字水平位置 left/center/right */
  textAlign?: "left" | "center" | "right";
  /** 文字垂直位置 top/middle/bottom */
  textVerticalAlign?: "top" | "middle" | "bottom";
  /** 遮罩层颜色，默认 #000000 */
  overlayColor?: string;
  /** 遮罩层透明度 0-100，默认 40 */
  overlayOpacity?: number;
  /** 一键控制整个Banner内容层（标题+副标题+按钮）的显示；关闭后Banner仅显示图片/背景 */
  showContent?: boolean;
  /** 是否显示主标题 */
  showTitle?: boolean;
  /** 是否显示副标题 */
  showSubtitle?: boolean;
  /** 是否显示按钮 */
  showBtn?: boolean;
  /** V1.8/A3：是否显示第二按钮（原版 :40/:81/:128 同款，默认 false 精简模式不显示） */
  showExtraBtn?: boolean;
  /** V1.8/A3：第二按钮文字（原版 :42/:82，默认「了解更多」） */
  extraBtnText?: string;
  /** V1.8/A3：第二按钮链接（原版 :44/:83，默认「/courses」） */
  extraBtnLink?: string;
}

interface BannerProps {
  banners: BannerItem[];
  settings?: BannerSettings;
}

/** HEX 颜色 + 透明度 → rgba 字符串 */
function hexToRgba(hex: string, opacityPct: number): string {
  const safeHex = /^#?[0-9a-fA-F]{6}$/.test(hex.replace("#", "")) ? hex.replace("#", "") : "000000";
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);
  const a = Math.max(0, Math.min(100, opacityPct)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const ALIGN_CLASSES: Record<string, string> = {
  left: "items-center justify-start text-left",
  center: "items-center justify-center text-center",
  right: "items-center justify-end text-right",
};

const VALIGN_CLASSES: Record<string, string> = {
  top: "items-start",
  middle: "items-center",
  bottom: "items-end",
};

export function Banner({ banners, settings }: BannerProps) {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  const cfg: Required<BannerSettings> = {
    title: settings?.title || "弘道教育",
    subtitle: settings?.subtitle || "专注专升本教育，助力学历提升",
    btnText: settings?.btnText || "",
    btnLink: settings?.btnLink || "/apply",
    bgImage: settings?.bgImage || "",
    textAlign: settings?.textAlign || "center",
    textVerticalAlign: settings?.textVerticalAlign || "middle",
    overlayColor: settings?.overlayColor || "#000000",
    overlayOpacity: typeof settings?.overlayOpacity === "number" ? settings.overlayOpacity : 40,
    showContent: settings?.showContent !== false,
    showTitle: settings?.showTitle !== false,
    showSubtitle: settings?.showSubtitle !== false,
    showBtn: settings?.showBtn !== false,
    showExtraBtn: settings?.showExtraBtn === true,
    extraBtnText: settings?.extraBtnText || "了解更多",
    extraBtnLink: settings?.extraBtnLink || "/courses",
  };

  // 配置了统一的 Banner 背景图 + 文案，而且管理后台 banner 列表为空 → 使用配置渲染单张
  const useConfigSingleBanner = banners.length === 0 && !!cfg.bgImage;

  const slides: BannerItem[] = useConfigSingleBanner
    ? [{ id: 0, image: cfg.bgImage, link: cfg.btnLink || null, sort: 0 }]
    : banners;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const overlayRgba = hexToRgba(cfg.overlayColor, cfg.overlayOpacity);
  const hAlign = ALIGN_CLASSES[cfg.textAlign] || ALIGN_CLASSES.center;
  const vAlign = VALIGN_CLASSES[cfg.textVerticalAlign] || VALIGN_CLASSES.middle;

  // 没有 banners 也没配置背景 → 纯渐变红色兆回
  if (slides.length === 0) {
    return (
      <section className="w-full relative h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-r from-red-600 to-red-700">
        {cfg.showContent && (
          <div className={`flex h-full px-4 ${hAlign} ${vAlign}`}>
            <div className="text-white">
              {cfg.showTitle && (
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{cfg.title}</h2>
              )}
              {cfg.showSubtitle && (
                <p className="text-lg md:text-xl opacity-90">{cfg.subtitle}</p>
              )}
              {cfg.showBtn && cfg.btnText && (
                <Link
                  href={cfg.btnLink}
                  className="inline-block mt-6 px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  {cfg.btnText}
                </Link>
              )}
              {cfg.showBtn && cfg.showExtraBtn && cfg.extraBtnText && (
                <Link
                  href={cfg.extraBtnLink}
                  className="inline-block mt-3 sm:ml-4 px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 backdrop-blur-sm transition-colors"
                >
                  {cfg.extraBtnText}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="w-full relative h-[400px] md:h-[500px] overflow-hidden bg-gray-100">
      {slides.map((banner, index) => {
        const slideContent = (
          <div
            className="h-full w-full bg-cover bg-center relative"
            style={{ backgroundImage: `url(${banner.image})` }}
          >
            {cfg.showContent && (
              <>
                {/* 遮罩层 */}
                <div className="absolute inset-0" style={{ backgroundColor: overlayRgba }} />
                {/* 文字内容 */}
                <div className={`relative z-10 flex h-full px-4 md:px-12 ${hAlign} ${vAlign}`}>
                  <div className="text-white max-w-3xl">
                    {cfg.showTitle && (
                      <h2 className="text-3xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">
                        {banner.title || cfg.title}
                      </h2>
                    )}
                    {cfg.showSubtitle && (
                      <p className="text-lg md:text-xl opacity-95 drop-shadow">
                        {cfg.subtitle}
                      </p>
                    )}
                    {cfg.showBtn && cfg.btnText && (
                      <Link
                        href={cfg.btnLink}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-20 inline-block mt-6 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg transition-colors"
                      >
                        {cfg.btnText}
                      </Link>
                    )}
                    {cfg.showBtn && cfg.showExtraBtn && cfg.extraBtnText && (
                      <Link
                        href={cfg.extraBtnLink}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-20 inline-block mt-3 sm:ml-4 px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 backdrop-blur-sm transition-colors"
                      >
                        {cfg.extraBtnText}
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );

        const visibility = index === current ? "opacity-100" : "opacity-0";
        const clickable = !!banner.link;
        const wrapperClass = `absolute inset-0 transition-opacity duration-500 ${visibility} ${
          clickable ? "cursor-pointer" : ""
        }`;

        return (
          <div
            key={banner.id}
            className={wrapperClass}
            onClick={clickable ? () => banner.link && router.push(banner.link) : undefined}
            role={clickable ? "link" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if ((e.key === "Enter" || e.key === " ") && banner.link) {
                      e.preventDefault();
                      router.push(banner.link);
                    }
                  }
                : undefined
            }
          >
            {slideContent}
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="上一张"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors z-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="下一张"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors z-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`第 ${index + 1} 张`}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === current ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
