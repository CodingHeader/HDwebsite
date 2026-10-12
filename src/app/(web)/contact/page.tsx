import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { getWebSettings as getSettings } from "@/components/web/data/settings";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

// 前台内容由后台 CMS 驱动：每次请求动态渲染，避免构建期静态化导致改动不生效（upgrade 基本目标：全部动态数据）
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "联系我们",
  description: "弘道教育联系方式、校区地址、咨询热线",
};

export default async function ContactPage() {
  const [settings, campuses] = await Promise.all([
    getSettings(),
    prisma.campus.findMany({
      where: { status: "active" },
      orderBy: { sort: "asc" },
    }),
  ]);

  const schoolName = settings.schoolShortName || "弘道教育";
  const contactPhone = settings.contactPhone || "400-001-5729";
  const contactPhone1 = settings.contactPhone1 || "132-1945-5550";
  const contactPhone2 = settings.contactPhone2 || "028-6167-5329";
  const contactEmail = settings.contactEmail || "contact@hdaomanager.com";
  const address = settings.address || "成都市青羊区大石西路12号";

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "联系我们" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">联系我们</h1>
          <p className="text-center text-lg opacity-90">
            我们随时为您提供专业的学历提升咨询服务
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* 联系信息卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-[#da251d]" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">咨询热线</h3>
              <a href={`tel:${contactPhone.replace(/-/g, "")}`} className="text-[#da251d] font-bold text-lg hover:underline">
                {contactPhone}
              </a>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">校长热线</h3>
              <div className="space-y-1">
                <a href={`tel:${contactPhone1.replace(/-/g, "")}`} className="block text-gray-600 hover:text-[#da251d]">
                  {contactPhone1}
                </a>
                <a href={`tel:${contactPhone2.replace(/-/g, "")}`} className="block text-gray-600 hover:text-[#da251d]">
                  {contactPhone2}
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">电子邮箱</h3>
              <a href={`mailto:${contactEmail}`} className="text-gray-600 hover:text-[#da251d]">
                {contactEmail}
              </a>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">工作时间</h3>
              <p className="text-gray-600">周一至周日</p>
              <p className="text-gray-600">9:00 - 18:00</p>
            </div>
          </div>

          {/* 校区地址 */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#da251d]" />
              校区地址
            </h2>

            {campuses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campuses.map((campus) => (
                  <div key={campus.id} className="border rounded-lg p-4 hover:border-[#da251d] transition-colors">
                    <h3 className="font-bold text-gray-800 mb-2">{campus.name}</h3>
                    {campus.address && (
                      <p className="text-gray-600 text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {campus.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">{schoolName}校区</h3>
                <p className="text-gray-600 text-sm flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {address}
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-[#da251d] rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">立即开始您的学历提升之旅</h2>
            <p className="mb-6 opacity-90">专业顾问为您提供一对一咨询服务</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="inline-block px-8 py-3 bg-white text-[#da251d] rounded-lg hover:bg-gray-100 transition-colors font-bold"
              >
                在线报名
              </Link>
              <a
                href={`tel:${contactPhone.replace(/-/g, "")}`}
                className="inline-block px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-bold"
              >
                电话咨询
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
