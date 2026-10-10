"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HotMajor {
  id: number;
  title: string;
  subtitle: string;
  description: string | null;
  duration: string;
  iconType: string;
  iconImage: string | null;
  iconColor: string;
  link: string;
}

interface CourseSectionNewProps {
  hotMajors: HotMajor[];
}

export function CourseSectionNew({ hotMajors }: CourseSectionNewProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 从 hotMajors 的 subtitle 字段提取分类标签
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: number; name: string }[] = [];
    let id = 1;
    for (const item of hotMajors) {
      if (!seen.has(item.subtitle)) {
        seen.add(item.subtitle);
        list.push({ id: id++, name: item.subtitle });
      }
    }
    return list;
  }, [hotMajors]);

  const filteredMajors = activeCategory
    ? hotMajors.filter((m) => m.subtitle === activeCategory)
    : hotMajors;

  const displayMajors = filteredMajors.slice(0, 8);

  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">热门专业</h2>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === null
                ? "text-red-600 border-b-2 border-red-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.name
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Course Grid - 目标网站样式 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayMajors.map((item) => (
            <div
              key={item.id}
              className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-300"
            >
              {/* 图标区域：柔和留白 + 轻微顶部渐变 */}
              <div className="pt-5 pb-3 px-4 bg-gradient-to-b from-gray-50/60 to-white flex items-center justify-center">
                {item.iconType === "image" && item.iconImage ? (
                  <Image
                    src={item.iconImage}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className={cn(
                    "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-sm group-hover:scale-105 transition-transform duration-300",
                    item.iconColor
                  )}>
                    {item.title.charAt(0)}
                  </div>
                )}
              </div>

              {/* 课程信息 */}
              <div className="px-3 pb-3 text-center">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-gray-400 mb-2">
                  {item.subtitle}
                </p>

                {/* 简介 */}
                <p className="text-[11px] text-gray-500 mb-2 line-clamp-2 min-h-[2.6rem] leading-relaxed">
                  {item.description || "专业能力培养，面向实际就业岗位。"}
                </p>

                {/* 学制 */}
                <p className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-600 text-[11px] mb-3">
                  学制 {item.duration}
                </p>

                {/* 按钮 */}
                <div className="space-y-1.5">
                  <Link href={(() => {
                    const map: Record<string, string> = {
                      "会计学": "major-business",
                      "工商管理": "major-business",
                      "金融学": "major-business",
                      "市场营销": "major-business",
                      "计算机科学与技术": "major-tech",
                      "土木工程": "major-tech",
                      "电气工程": "major-tech",
                      "学前教育": "major-education",
                      "小学教育": "major-education",
                      "汉语言文学": "major-humanities",
                      "法学": "major-law",
                      "护理学": "major-medicine",
                      "临床医学": "major-medicine",
                      "视觉传达设计": "major-art",
                      "环境设计": "major-art",
                    };
                    const scene = map[item.title] || "apply";
                    return `/apply?source=${scene}`;
                  })()} className="block">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs bg-[#da251d] hover:bg-[#b91d1d] text-white shadow-sm"
                    >
                      立即咨询
                    </Button>
                  </Link>
                  <Link href={`/courses/${item.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs border-gray-200 text-gray-500 hover:text-gray-900"
                    >
                      查看详情
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
