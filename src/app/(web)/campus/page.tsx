import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { MapPin, Phone, Clock } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";
import {
  localImageExists,
  resolveCampusCaption,
  resolveCampusName,
  resolveShowcaseImage,
} from "@/lib/showcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "学院风采",
  description: "展示学院风采与教学环境，帮助访客快速了解学习场景",
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

  const schoolShortName = settings.schoolShortName || "弘道经理学院";
  const address = settings["contact.address"] || settings.address || "四川省成都市高新区天府大道1700号新世界环球中心N2区601室";
  const contactPhone = settings["contact.phone1"] || settings.contactPhone || "139-0809-1091";
  const workHours = settings.workHours || settings["contact.worktime"] || "周一至周日 9:00-18:00";
  const defaultPlaceholderImage =
    settings.defaultPlaceholderImage || "/images/logo_card.png";
  const showImageOverlays = settings.showImageOverlays !== "false";

  type CampusImageItem = {
    id: number;
    image: string;
    caption: string | null;
  };

  type CampusItem = {
    id: number;
    name: string;
    address: string | null;
    images: CampusImageItem[];
  };

  const resolvedCampuses = await Promise.all(
    campuses.map(async (campus: CampusItem, campusIndex: number) => ({
      ...campus,
      name: resolveCampusName(campus.name, campusIndex),
      images: await Promise.all(
        campus.images.map(async (image: CampusImageItem, index: number) => {
          const imageMissing = !(await localImageExists(image.image));
          const resolvedCaption = resolveCampusCaption(
            image.caption,
            campus.name,
            campusIndex,
            index,
          );
          return {
            ...image,
            image: resolveShowcaseImage({
              image: image.image,
              imageMissing,
              placeholderImage: defaultPlaceholderImage,
            }),
            caption: resolvedCaption,
            title: resolvedCaption,
          };
        })
      ),
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "学院风采" }]} />
      {showImageOverlays && (
        <div className="bg-[#2d4a6f] text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4">学院风采</h1>
            <p className="text-center text-lg opacity-90">
              展示学院风采与教学环境，帮助访客快速了解学习场景
            </p>
          </div>
        </div>
      )}

      {/* 校区列表 */}
      <div className="container mx-auto px-4 py-12">
        {resolvedCampuses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无学院风采内容</p>
          </div>
        ) : (
          resolvedCampuses.map((campus) => (
            <div key={campus.id} className="mb-12">
              <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 mb-6">
                {showImageOverlays && (
                  <>
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">{campus.name}</h2>
                    {campus.address && (
                      <p className="text-gray-600 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {campus.address}
                      </p>
                    )}
                  </>
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
                        <Image src={img.image} alt={img.caption || "学院风采"} fill className="object-cover" />
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

      {showImageOverlays && (
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
                  <span className="text-lg">工作时间：{workHours}</span>
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
      )}
    </div>
  );
}
