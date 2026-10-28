import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getWebSettings as getSettings } from "@/components/web/data/settings";
import { MapPin, Phone, Clock } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

// D-06：前台数据（getWebSettings 等）经 WEB_TAGS 缓存并按后台写操作失效；本页无 searchParams/headers/cookies，
// 可被稳定缓存，故移除 force-dynamic（CMS 改动后 ≤5s 可见）。

export const metadata: Metadata = {
  title: "校区环境",
  description: "优美的学习环境，完善的教学设施，为您的学习保驾护航",
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

  const address = settings.address || "成都市青羊区大石西路12号";
  const contactPhone = settings.contactPhone || WEB_SETTING_DEFAULTS.contactPhone;
  // V1.8/A4：图片与文案遮罩开关（原版 :38 同款判定；默认 true 保持现渲染）
  const showImageOverlays = settings.showImageOverlays !== "false";

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "校区环境" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">校区环境</h1>
          <p className="text-center text-lg opacity-90">
            优美的学习环境，完善的教学设施，为您的学习保驾护航
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
                      {showImageOverlays && img.caption && (
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
            <div className="mt-8">
              <Link
                href="/apply"
                className="inline-block px-8 py-3 bg-[#da251d] text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                立即报名
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
