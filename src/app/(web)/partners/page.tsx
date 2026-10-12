import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { GraduationCap, BookOpen, CheckCircle } from "lucide-react";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

// 前台内容由后台 CMS 驱动：每次请求动态渲染，避免构建期静态化导致改动不生效（upgrade 基本目标：全部动态数据）
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "招生院校",
  description: "弘道教育与多所知名高校合作，为您提供优质的学历提升服务",
};

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({
    where: { status: "active" },
    orderBy: { sort: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "招生院校" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">招生院校</h1>
          <p className="text-center text-lg opacity-90">
            与多所知名高校合作，为您提供优质的学历提升服务
          </p>
        </div>
      </div>

      {/* 院校网格 */}
      <div className="container mx-auto px-4 py-12">
        {partners.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无合作院校信息</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center p-6">
                  {partner.logo ? (
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-contain"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-lg font-bold">{partner.name.slice(0, 2)}</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
                    {partner.name}
                  </h3>
                  {partner.website && (
                    <p className="text-gray-600 text-sm text-center">
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#da251d]">
                        访问官网 →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 合作优势 */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            合作优势
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2d4a6f] rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">名校资源</h3>
              <p className="text-gray-600">
                与985、211等知名高校深度合作，确保教学质量
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#da251d] rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">专业齐全</h3>
              <p className="text-gray-600">
                涵盖经管、理工、文史、教育、医学等多个学科门类
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2d4a6f] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">学历认可</h3>
              <p className="text-gray-600">
                所有学历均可在学信网查询，国家承认
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
