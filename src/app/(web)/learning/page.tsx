import { BookOpen, FileText, Monitor, ExternalLink } from "lucide-react";
import { getSettings } from "@/lib/settings";
import Link from "next/link";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "学习中心",
  description: "每日一练、在线学堂、学习资源，助力您的学历提升之路",
};

export default async function LearningPage() {
  const settings = await getSettings();
  const schoolName = settings.schoolShortName || "弘道经理学院";

  const resources = [
    {
      icon: FileText,
      title: "每日一练",
      description: "每天精选练习题，巩固所学知识，提升应试能力",
      color: "bg-blue-100 text-blue-600",
      features: ["历年真题精选", "智能题库推荐", "错题自动收集", "答案详细解析"],
    },
    {
      icon: Monitor,
      title: "在线学堂",
      description: "名师在线授课，随时随地学习，不受时间地点限制",
      color: "bg-purple-100 text-purple-600",
      features: ["直播课程回放", "高清视频教学", "互动答疑环节", "课程进度跟踪"],
    },
    {
      icon: BookOpen,
      title: "学习资料",
      description: "精心整理的学习资料和考试大纲，助您高效备考",
      color: "bg-green-100 text-green-600",
      features: ["考试大纲解读", "重点知识梳理", "模拟试卷下载", "学习笔记分享"],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "学习中心" }]} />
      {/* 页面头部 */}
      <div className="bg-[#2d4a6f] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">学习中心</h1>
          <p className="text-center text-lg opacity-90">
            {schoolName}为您提供全方位的在线学习资源
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 学习资源卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-xl ${resource.color} flex items-center justify-center mb-6`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{resource.title}</h3>
                  <p className="text-gray-600 mb-6">{resource.description}</p>
                  <ul className="space-y-2">
                    {resource.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#da251d]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-8 pb-6">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                    即将上线
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 提示信息 */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">在线学习平台建设中</h2>
          <p className="text-gray-600 mb-6">
            {schoolName}在线学习平台正在紧锣密鼓地建设中，即将为您提供丰富的在线学习资源。
            如需了解课程详情或学习安排，请联系我们的课程顾问。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-[#da251d] text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              查看课程
            </Link>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              联系顾问
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
