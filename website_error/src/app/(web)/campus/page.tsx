import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { MapPin, Phone, Clock } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "学院风采",
  description: "展示校区风采，了解优美的学习环境和教学设施",
};

export default async function CampusPage() {
  const [campuses, settings] = await Promise.all([
    prisma.campus.findMany({
      where: { status: "active" },
      include: { images: { orderBy: { sort: "asc" } } },
      orderBy: { sort: "asc" },
    }),
    getSettings(),
  ]);

  const schoolShortName = settings.schoolShortName || "弘道教育";
  const address = settings.address || "成都市青羊区大石西路12号";
  const contactPhone = settings.contactPhone || "400-001-5729";

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "学院风采" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">学院风采</h1>
          <p className="text-center text-lg opacity-90">
            展示校区风采，了解优美的学习环境和教学设施
          </p>
        </div>
      </div>

      {/* 校区列表 */}
      <div className="container mx-auto px-4 py-12">
        {campuses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无校区信息</p>
          </div>
        ) : (
          campuses.map((campus) => (
            <div key={campus.id} className="mb-12">
              <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{campus.name}</h2>
                {campus.address && (
                  <p className="text-gray-600 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {campus.address}
                  </p>
                )}
              </div>

              {/* 校区图片展示 */}
              {campus.images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campus.images.map((img: { id: number; image: string; caption: string | null }) => (
                    <div
                      key={img.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="aspect-[4/3] bg-gray-100 relative">
                        {img.image ? (
                          <Image src={img.image} alt={img.caption || "校区图片"} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <span className="text-gray-400 text-sm">校区图片</span>
                          </div>
                        )}
                      </div>
                      {img.caption && (
                        <div className="p-4">
                          <p className="text-gray-600 text-sm">{img.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 联系方式 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">欢迎来访</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">地址：{address}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Phone className="w-5 h-5" />
                <span className="text-lg">电话：{contactPhone}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-5 h-5" />
                <span className="text-lg">工作时间：周一至周日 9:00-18:00</span>
              </div>
            </div>
            {/* "立即报名"按钮已移除 - 见三级原子化方案 Task-2.2 */}
          </div>
        </div>
      </div>
    </div>
  );
}
