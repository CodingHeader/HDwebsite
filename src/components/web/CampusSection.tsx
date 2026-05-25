"use client";

import { useState } from "react";
import Image from "next/image";

interface CampusImage {
  id: number;
  image: string;
  caption: string | null;
  title?: string;
}

interface Campus {
  id: number;
  name: string;
  images: CampusImage[];
}

interface CampusSectionProps {
  campuses: Campus[];
  placeholderImage?: string;
  showOverlay?: boolean;
}

export function CampusSection({ campuses, placeholderImage = "/images/logo_card.png", showOverlay = true }: CampusSectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 无校区数据时不显示整个 section，等待后台配置
  if (!campuses || campuses.length === 0) {
    return null;
  }

  // 汇总所有校区的图片，统一展示（与证书风采一样的UI）
  const allImages = campuses.flatMap((c) =>
    (c.images || []).map((img) => ({
      id: img.id,
      title: img.title || img.caption || c.name,
      image: img.image || placeholderImage,
      campusName: c.name,
      campusImageCount: c.images.length,
    }))
  );

  const visibleImages = allImages.slice(0, 8);
  const activeItem = activeIndex === null ? null : visibleImages[activeIndex];

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {showOverlay && (
          <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3 mb-6">
            学院风采
          </h2>
        )}

        {/* 图片网格 - 2行4列，与证书风采一致 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visibleImages.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className="group relative rounded-lg overflow-hidden border hover:shadow-lg transition-shadow text-left"
              onClick={() => setActiveIndex(index)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={item.image || placeholderImage}
                  alt={item.title || item.campusName || "学院风采"}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                {showOverlay && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                    {item.campusImageCount}张
                  </span>
                )}
              </div>
              {showOverlay && (
                <div className="p-2 bg-white">
                  <p className="text-sm text-gray-700 text-center line-clamp-1">
                    {item.title}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 图片预览 dialog */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] bg-black">
              <Image
                src={activeItem.image || placeholderImage}
                alt={activeItem.title || activeItem.campusName || "学院风采"}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className={`flex items-center gap-4 p-4 ${showOverlay ? "justify-between" : "justify-end"}`}>
              {showOverlay && (
                <div>
                  <p className="text-lg font-semibold text-gray-900">{activeItem.title}</p>
                  <p className="text-sm text-gray-500">{activeItem.campusName}</p>
                </div>
              )}
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setActiveIndex(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
