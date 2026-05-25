"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface NewsItem {
  id: number;
  title: string;
  cover: string | null;
  category: string;
  categorySlug: string;
  date: string;
}

interface NewsCenterProps {
  news: NewsItem[];
  showOverlay?: boolean;
}

// Tab配置
const TABS = [
  { id: "latest", label: "最新动态" },
  { id: "exam", label: "考试通知" },
  { id: "qa", label: "自考问答" },
] as const;

// Tab到分类slug的映射
const TAB_CATEGORY_MAP: Record<string, string[]> = {
  latest: ["latest", "zhengce", "jingyan", "zikao", "chengkao", "kaoyan", "xueyuan", "remen", ""],
  exam: ["exam", "kaoshitongzhi", "zhengce", "tongzhi"],
  qa: ["qa", "zikaowenda", "wenda", "jingyan", "wenzhang"],
};

// 格式化日期: yy-MM-dd
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function NewsCenter({ news, showOverlay = true }: NewsCenterProps) {
  const [activeTab, setActiveTab] = useState<"latest" | "exam" | "qa">("latest");

  // 根据Tab过滤新闻
  const targetCategories = TAB_CATEGORY_MAP[activeTab];
  const filteredNews = news
    .filter((n) => {
      if (!n.categorySlug) return activeTab === "latest";
      return targetCategories.some((cat) =>
        n.categorySlug.toLowerCase().includes(cat.toLowerCase())
      );
    })
    .slice(0, 10);

  const displayNews = filteredNews.length > 0 ? filteredNews : news.slice(0, 10);

  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showOverlay && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3">
              资讯中心
            </h2>
            <Link
              href="/news"
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              查看更多
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* 左右两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧: 垂直Tab */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                    activeTab === tab.id
                      ? "bg-red-600 text-white"
                      : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                  }`}
                >
                  <span>{tab.label}</span>
                  <ChevronRight className={`w-4 h-4 ${activeTab === tab.id ? "text-white" : "text-gray-400"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* 右侧: 新闻列表 */}
          <div className="lg:col-span-10">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {showOverlay && (
                <div className="flex border-b bg-gray-50">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      onMouseEnter={() => setActiveTab(tab.id)}
                      className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? "text-gray-900 border-b-2 border-red-600 bg-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Link
                    href="/news"
                    className="flex items-center gap-1 px-4 py-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    查看更多&gt;&gt;
                  </Link>
                </div>
              )}

              {/* News List */}
              <div className="p-3">
                {displayNews.map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.id}`}
                    className="group flex items-center justify-between py-2.5 px-3 rounded hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700 group-hover:text-red-600 transition-colors truncate pr-4 text-sm">
                      {item.title}
                    </span>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
