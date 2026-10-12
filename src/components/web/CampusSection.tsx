"use client";

import Image from "next/image";

interface CampusImage {
  id: number;
  image: string;
  caption: string | null;
}

interface Campus {
  id: number;
  name: string;
  images: CampusImage[];
}

interface CampusSectionProps {
  campuses: Campus[];
  placeholderImage?: string;
}

export function CampusSection({ campuses, placeholderImage = "/images/logo_card.png" }: CampusSectionProps) {
  // 无校区数据时不显示整个 section，等待后台配置
  if (!campuses || campuses.length === 0) {
    return null;
  }

  // 汇总所有校区的图片，统一展示（与证书风采一样的UI）
  const allImages = campuses.flatMap((c) =>
    (c.images || []).map((img) => ({
      id: img.id,
      title: img.caption || c.name,
      image: img.image,
    }))
  );

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3 mb-6">
          学院风采
        </h2>

        {/* 图片网格 - 2行4列，与证书风采一致 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allImages.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="group rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={item.image || placeholderImage}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 bg-white">
                <p className="text-sm text-gray-700 text-center line-clamp-1">
                  {item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
