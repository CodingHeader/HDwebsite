import Image from "next/image";

interface GalleryItem {
  id: number;
  title: string;
  image: string;
}

interface CertificateGalleryProps {
  items: GalleryItem[];
  placeholderImage?: string;
  showOverlay?: boolean;
}

export function CertificateGallery({ items, placeholderImage = "/images/logo_card.png", showOverlay = true }: CertificateGalleryProps) {
  // 无图片时不显示整个 section，等待后台配置
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {showOverlay && (
          <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3 mb-6">
            证书风采
          </h2>
        )}

        {/* 图片网格 - 2行4列 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
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
              {showOverlay && (
                <div className="p-2 bg-white">
                  <p className="text-sm text-gray-700 text-center line-clamp-1">
                    {item.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
