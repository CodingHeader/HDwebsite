import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ImageIcon } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";
import path from "node:path";
import { stat } from "node:fs/promises";

export const metadata: Metadata = {
  title: "证书风采",
  description: "展示学历证书样本，了解毕业成果",
};

interface GalleryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function localImageExists(url: string) {
  if (!url.startsWith("/")) {
    return true;
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const activeCategory = (params.category as string) || "all";

  const where: { status: string; category?: string } = { status: "active" };
  if (activeCategory !== "all") {
    where.category = activeCategory;
  }

  const items = await prisma.gallery.findMany({
    where,
    orderBy: { sort: "asc" },
  });

  const itemsWithStatus = await Promise.all(
    items.map(async (item) => ({
      ...item,
      imageMissing: !(await localImageExists(item.image)),
    }))
  );

  // 从数据库动态获取分类
  const distinctCategories = await prisma.gallery.findMany({
    where: { status: "active" },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const categoryLabels: Record<string, string> = {
    certificate: "证书展示",
    exam: "考试现场",
    campus: "校园风采",
  };
  const categories = [
    { id: "all", name: "全部" },
    ...distinctCategories.map((c) => ({
      id: c.category,
      name: categoryLabels[c.category] || c.category,
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "证书风采" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">证书风采</h1>
          <p className="text-center text-lg opacity-90">
            展示学历证书样本，了解毕业成果
          </p>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/gallery" : `/gallery?category=${cat.id}`}
              className={`px-6 py-2 rounded-full transition-colors shadow-sm ${
                activeCategory === cat.id
                  ? "bg-[#da251d] text-white"
                  : "bg-white text-gray-700 hover:bg-[#da251d] hover:text-white"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* 图片网格 */}
        {itemsWithStatus.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无展示内容</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itemsWithStatus.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {item.image && !item.imageMissing ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center px-6 text-center">
                      <span className="text-amber-700 text-sm">当前图片文件已丢失，请在后台重新配置</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {item.title}
                  </h3>
                  <span className="text-xs text-gray-400 capitalize">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 证书说明 */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">证书说明</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                我校学员通过考试后，可获得国家承认、学信网可查的正规学历证书。
                证书由教育部电子注册，与全日制学历具有同等法律效力。
              </p>
              <p>
                毕业证书可用于求职、考公务员、考研、评职称、出国留学等多种用途，
                为您的职业发展提供坚实的学历保障。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
