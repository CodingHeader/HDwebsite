"use client";

import { useState } from "react";
import Link from "next/link";
import { Laptop, MessageCircle, MapPin, ChevronRight } from "lucide-react";
import { resolveServiceGuideIcon } from "@/lib/service-guide-icons";

interface NewsItem {
  id: number;
  title: string;
  createdAt: string;
  category?: string; // 文章分类slug
}

interface ServiceGuideItem {
  id: number;
  title: string;
  icon: string;
  link: string;
}

interface TopEntranceSectionProps {
  news: NewsItem[];
  serviceGuides: ServiceGuideItem[];
}

// T10: Tab到分类slug的映射（支持多slug匹配）
const TAB_CATEGORY_MAP: Record<string, string[]> = {
  "latest": [],                                    // 最新动态 - 显示全部
  "exam": ["exam", "exam-notice", "exams"],        // 考试通知
  "qa": ["qa", "self-study-faq"],                  // 自考问答
};

export function TopEntranceSection({ news, serviceGuides }: TopEntranceSectionProps) {
  const [activeTab, setActiveTab] = useState<"latest" | "exam" | "qa">("latest");

  const leftEntrances = [
    { title: "网校平台", icon: <Laptop className="h-8 w-8 text-blue-600" />, link: "/courses", bg: "bg-blue-50", iconBg: "bg-blue-100" },
    { title: "在线咨询", icon: <MessageCircle className="h-8 w-8 text-green-600" />, link: "/apply", bg: "bg-green-50", iconBg: "bg-green-100" },
    { title: "学院风采", icon: <MapPin className="h-8 w-8 text-orange-600" />, link: "/campus", bg: "bg-orange-50", iconBg: "bg-orange-100" },
  ];

  // T10: 真实分类过滤 - 根据Tab映射到category过滤
  const filteredNews = news
    .filter((n) => {
      const slugs = TAB_CATEGORY_MAP[activeTab];
      // 空数组 = 显示所有文章（"最新动态"）
      if (!slugs || slugs.length === 0) return true;
      return slugs.includes(n.category || "");
    })
    .slice(0, 8);

  return (
    <section className="bg-white py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 左侧：3个大入口 */}
          <div className="md:col-span-12 lg:col-span-3 space-y-4 flex flex-col justify-center h-full">
            {leftEntrances.map((item) => (
              <Link
                key={item.title}
                href={item.link}
                className={`flex items-center gap-4 p-4 rounded-lg ${item.bg} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 w-full md:w-auto`}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center shadow-sm`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* 中间：新闻Tab区域 */}
          <div className="md:col-span-7 lg:col-span-6">
            <div className="border rounded-lg overflow-hidden">
              {/* Tab Header */}
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setActiveTab("latest")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "latest"
                      ? "text-red-600 border-b-2 border-red-600 bg-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  最新动态
                </button>
                <button
                  onClick={() => setActiveTab("exam")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "exam"
                      ? "text-red-600 border-b-2 border-red-600 bg-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  考试通知
                </button>
                <button
                  onClick={() => setActiveTab("qa")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "qa"
                      ? "text-red-600 border-b-2 border-red-600 bg-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  自考问答
                </button>
                <Link
                  href="/articles"
                  className="flex items-center gap-1 px-4 py-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  查看更多
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* News List */}
              <div className="p-4">
                <ul className="space-y-3">
                  {filteredNews.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/articles/${item.id}`}
                        className="flex items-center justify-between group"
                      >
                        <span className="text-gray-700 group-hover:text-red-600 transition-colors line-clamp-1 flex-1">
                          {item.title}
                        </span>
                        <span className="text-gray-400 text-sm ml-4 flex-shrink-0">
                          {item.createdAt.split("T")[0].replace(/-/g, "-")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 右侧：服务指南6宫格 */}
          <div className="md:col-span-5 lg:col-span-3">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-4 text-center">服务指南</h3>
              {serviceGuides.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8">
                  暂无服务指南，请在后台添加
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {serviceGuides.slice(0, 6).map((item) => {
                    const Icon = resolveServiceGuideIcon(item.icon);
                    return (
                      <Link
                        key={item.id}
                        href={item.link}
                        className="flex flex-col items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 mb-2 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs text-gray-700 text-center">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
