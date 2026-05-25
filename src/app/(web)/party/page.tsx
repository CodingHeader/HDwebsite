import { Flag, Heart, Users, BookOpen } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "党建专栏",
  description: "弘道经理学院党建工作专栏，展示党建活动、学习动态和党员风采",
};

export default async function PartyPage() {
  const settings = await getSettings();
  const schoolName = settings.schoolShortName || "弘道经理学院";

  const sections = [
    {
      icon: Flag,
      title: "党建动态",
      description: "及时发布党组织最新工作动态、会议精神和重要决策部署",
      color: "bg-red-100 text-red-600",
      items: ["支部主题党日活动", "党员大会决议", "党建工作部署", "基层组织建设"],
    },
    {
      icon: BookOpen,
      title: "理论学习",
      description: "组织党员深入学习党的最新理论成果和政策文件",
      color: "bg-blue-100 text-blue-600",
      items: ["习近平新时代中国特色社会主义思想", "党的二十大精神学习", "党章党规学习", "红色经典阅读"],
    },
    {
      icon: Users,
      title: "党员风采",
      description: "展示优秀党员先进事迹，发挥榜样示范引领作用",
      color: "bg-green-100 text-green-600",
      items: ["优秀党员评选", "先进事迹报道", "志愿服务活动", "社区共建成果"],
    },
    {
      icon: Heart,
      title: "为民服务",
      description: "践行初心使命，为社会提供优质教育服务",
      color: "bg-orange-100 text-orange-600",
      items: ["教育扶贫行动", "公益助学计划", "社区教育讲座", "困难学员帮扶"],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "党建专栏" }]} />
      {/* 页面头部 */}
      <div className="bg-[#da251d] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">党建专栏</h1>
          <p className="text-center text-lg opacity-90">
            {schoolName}坚持党建引领，推动教育事业高质量发展
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 党建板块 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-xl ${section.color} flex items-center justify-center mb-6`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{section.title}</h3>
                  <p className="text-gray-600 mb-6">{section.description}</p>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#da251d]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* 建设中提示 */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">党建专栏持续建设中</h2>
          <p className="text-gray-600">
            {schoolName}党建工作专栏正在持续完善中，更多党建内容即将上线。
            如有需要，请联系我们了解详情。
          </p>
        </div>
      </div>
    </div>
  );
}
