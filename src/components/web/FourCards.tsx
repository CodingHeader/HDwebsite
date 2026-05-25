"use client";

import Link from "next/link";
import { MessageSquare, FileText, BookOpen, Award, GraduationCap, Globe, Shield, UserCheck, Clock, MapPin, Phone, Mail, Star, type LucideIcon } from "lucide-react";

interface CardData {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  gradient: string;
  hoverGradient: string;
  shadow: string;
  backgroundImage?: string | null;
  showIcon?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showArrow?: boolean;
  showDecoration?: boolean;
  textAlign?: "left" | "center" | "right";
}

interface FourCardsProps {
  cards?: CardData[];
  showOverlay?: boolean;
  showSection?: boolean;
  bgColor?: string;
  bgImage?: string;
  containerAlign?: "left" | "center" | "right";
}

// 图标映射表 — 覆盖所有数据库中可能用到的Lucide图标名
const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  FileText,
  BookOpen,
  Award,
  GraduationCap,
  Globe,
  Shield,
  UserCheck,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] || MessageSquare;
}

// 将 Tailwind 渐变类名映射为 CSS 内联渐变值
// 解决 Tailwind v4 JIT 无法动态编译运行时拼接类名的问题
const gradientStyleMap: Record<string, string> = {
  "from-blue-500 to-blue-600": "linear-gradient(135deg, #3b82f6, #2563eb)",
  "from-blue-400 to-blue-500": "linear-gradient(135deg, #60a5fa, #3b82f6)",
  "from-emerald-500 to-emerald-600": "linear-gradient(135deg, #10b981, #059669)",
  "from-emerald-400 to-emerald-500": "linear-gradient(135deg, #34d399, #10b981)",
  "from-green-500 to-green-600": "linear-gradient(135deg, #22c55e, #16a34a)",
  "from-green-400 to-green-500": "linear-gradient(135deg, #4ade80, #22c55e)",
  "from-amber-500 to-amber-600": "linear-gradient(135deg, #f59e0b, #d97706)",
  "from-amber-400 to-amber-500": "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "from-orange-500 to-orange-600": "linear-gradient(135deg, #f97316, #ea580c)",
  "from-orange-400 to-orange-500": "linear-gradient(135deg, #fb923c, #f97316)",
  "from-red-500 to-red-600": "linear-gradient(135deg, #ef4444, #dc2626)",
  "from-red-400 to-red-500": "linear-gradient(135deg, #f87171, #ef4444)",
  "from-purple-500 to-purple-600": "linear-gradient(135deg, #a855f7, #9333ea)",
  "from-purple-400 to-purple-500": "linear-gradient(135deg, #c084fc, #a855f7)",
  "from-cyan-500 to-cyan-600": "linear-gradient(135deg, #06b6d4, #0891b2)",
  "from-cyan-400 to-cyan-500": "linear-gradient(135deg, #22d3ee, #06b6d4)",
};

// 阴影映射
const shadowStyleMap: Record<string, string> = {
  "shadow-blue-200": "0 4px 14px 0 rgba(191, 219, 254, 0.5)",
  "shadow-green-200": "0 4px 14px 0 rgba(187, 247, 208, 0.5)",
  "shadow-orange-200": "0 4px 14px 0 rgba(254, 215, 170, 0.5)",
  "shadow-purple-200": "0 4px 14px 0 rgba(233, 213, 255, 0.5)",
  "shadow-red-200": "0 4px 14px 0 rgba(254, 202, 202, 0.5)",
  "shadow-amber-200": "0 4px 14px 0 rgba(253, 230, 138, 0.5)",
  "shadow-cyan-200": "0 4px 14px 0 rgba(165, 243, 252, 0.5)",
  "shadow-emerald-200": "0 4px 14px 0 rgba(167, 243, 208, 0.5)",
};

const defaultCards: CardData[] = [
  {
    id: 1,
    title: "自学考试",
    subtitle: "自助者天助之",
    icon: "BookOpen",
    href: "/courses?type=zikao",
    gradient: "from-blue-500 to-blue-600",
    hoverGradient: "from-blue-400 to-blue-500",
    shadow: "shadow-blue-200",
    backgroundImage: null,
  },
  {
    id: 2,
    title: "成人高考",
    subtitle: "成就学员梦想",
    icon: "GraduationCap",
    href: "/courses?type=chengkao",
    gradient: "from-green-500 to-green-600",
    hoverGradient: "from-green-400 to-green-500",
    shadow: "shadow-green-200",
    backgroundImage: null,
  },
  {
    id: 3,
    title: "开放大学",
    subtitle: "构建终身学堂",
    icon: "Globe",
    href: "/courses?type=kaifang",
    gradient: "from-orange-500 to-orange-600",
    hoverGradient: "from-orange-400 to-orange-500",
    shadow: "shadow-orange-200",
    backgroundImage: null,
  },
];

export function FourCards({
  cards: propCards,
  showOverlay = true,
  showSection = true,
  bgColor = "#f9fafb",
  bgImage = "",
  containerAlign = "center",
}: FourCardsProps) {
  if (!showSection) {
    return null;
  }

  // 3 卡居中布局：若数据库无数据，回退到默认 3 张
  const cardsData: CardData[] =
    propCards && propCards.length > 0 ? propCards.slice(0, 3) : defaultCards;

  const containerAlignClass =
    containerAlign === "left"
      ? "justify-start"
      : containerAlign === "right"
        ? "justify-end"
        : "justify-center";

  const sectionStyle = {
    backgroundColor: bgColor,
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: bgImage ? "cover" : undefined,
    backgroundPosition: bgImage ? "center" : undefined,
  };

  return (
    <section className="py-6" style={sectionStyle}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex ${containerAlignClass}`}>
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {cardsData.map((card) => {
            const Icon = getIcon(card.icon);
            // 使用内联样式替代动态Tailwind类名，解决v4 JIT编译问题
            const bgStyle = gradientStyleMap[card.gradient] || gradientStyleMap["from-blue-500 to-blue-600"];
            const hoverBgStyle = gradientStyleMap[card.hoverGradient] || gradientStyleMap["from-blue-400 to-blue-500"];
            const shadowVal = shadowStyleMap[card.shadow] || shadowStyleMap["shadow-blue-200"];
            const textAlignClass =
              card.textAlign === "center"
                ? "text-center"
                : card.textAlign === "right"
                  ? "text-right"
                  : "text-left";

            // 判断是否有背景图片
            const hasBgImage = !!card.backgroundImage;

            return (
              <Link
                key={card.id}
                href={card.href || "/courses"}
                className="group relative overflow-hidden rounded-xl p-5 h-[130px] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: hasBgImage ? undefined : bgStyle,
                  boxShadow: shadowVal,
                }}
                onMouseEnter={(e) => {
                  if (!hasBgImage) {
                    e.currentTarget.style.background = hoverBgStyle;
                  }
                  e.currentTarget.style.boxShadow = shadowVal.replace("0.5", "0.7");
                }}
                onMouseLeave={(e) => {
                  if (!hasBgImage) {
                    e.currentTarget.style.background = bgStyle;
                  }
                  e.currentTarget.style.boxShadow = shadowVal;
                }}
              >
                {/* 背景图片 */}
                {hasBgImage && (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url(${card.backgroundImage})` }}
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                  </>
                )}
                {/* 背景装饰（无背景图时显示） */}
                {!hasBgImage && card.showDecoration !== false && (
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                )}
                
                {showOverlay && (
                  <>
                    {/* 图标区域 */}
                    {card.showIcon !== false && (
                      <div className="relative flex-shrink-0 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    )}

                    {/* 文字区域 */}
                    <div className={`relative flex-1 ${textAlignClass}`}>
                      {card.showTitle !== false && (
                        <h3 className="text-lg font-bold text-white mb-1">
                          {card.title}
                        </h3>
                      )}
                      {card.showSubtitle !== false && (
                        <p className="text-sm text-white/80">
                          {card.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Hover箭头 */}
                    {card.showArrow !== false && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
