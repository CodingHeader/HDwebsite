import Image from "next/image";
import type { Campus } from "@/types/campus";

interface CampusSectionProps {
  campuses: Campus[];
}

export function CampusSection({ campuses }: CampusSectionProps) {
  // 无校区数据时不显示整个 section，等待后台配置
  if (!campuses || campuses.length === 0) {
    return null;
  }

  // 将校区数据扁平化为展示项（每个校区作为一个展示卡片）
  const displayItems = campuses.slice(0, 8).map((campus) => ({
    id: campus.id,
    title: campus.name,
    image: campus.images[0]?.image || "/images/logo_card.png",
  }));

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3 mb-6">
          学院风采
        </h2>

        {/* 图片网格 - 2行4列 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="/images/logo_card.png"
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
