import { Award, Users, Clock, MapPin, Phone, Mail } from "lucide-react";
import { getWebSettings as getSettings } from "@/components/web/data/settings";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

// 前台内容由后台 CMS 驱动：每次请求动态渲染，避免构建期静态化导致改动不生效（upgrade 基本目标：全部动态数据）
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "关于我们",
  description: "弘道教育专注专升本教育，助力学历提升，成就美好未来",
};

export default async function AboutPage() {
  const settings = await getSettings();

  const schoolName = settings.schoolShortName || "弘道教育";
  const companyIntro = settings.companyIntro || `${schoolName}是经教育主管部门批准成立的专业教育培训机构，致力于为专科毕业生提供优质的专升本教育服务。学院自成立以来，始终秉承"弘道励学，知行合一"的办学理念，累计帮助数万名学员成功通过专升本考试。`;
  const contactPhone = settings.contactPhone || "400-001-5729";
  const contactEmail = settings.contactEmail || "contact@hdaomanager.com";
  const address = settings.address || "成都市青羊区大石西路12号";
  const years = settings.yearsOfEstablishment || "26";
  const graduates = settings.totalGraduates || "11万";

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "关于我们" }]} />
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            关于{schoolName}
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            专注专升本教育，助力学历提升，成就美好未来
          </p>
        </div>

        {/* Introduction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">学院简介</h2>
            <div className="space-y-4 text-gray-600 whitespace-pre-line">
              {companyIntro}
            </div>
          </div>
          <div className="h-80 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-5xl font-bold mb-2">{schoolName.slice(0, 2)}</div>
              <div className="text-xl">{schoolName}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-red-600 mb-1">{years}+</div>
            <div className="text-sm text-gray-500">年办学经验</div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-red-600 mb-1">{graduates}+</div>
            <div className="text-sm text-gray-500">培训学员</div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-red-600 mb-1">95%</div>
            <div className="text-sm text-gray-500">考试通过率</div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-red-600 mb-1">50+</div>
            <div className="text-sm text-gray-500">专业师资</div>
          </div>
        </div>

        {/* Advantages */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            我们的优势
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Award className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">专业师资</h3>
              <p className="text-sm text-gray-500">
                资深教师团队，多年专升本教学经验，深谙考试规律
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">小班教学</h3>
              <p className="text-sm text-gray-500">
                控制班级规模，确保每位学员都能得到充分关注
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">全程服务</h3>
              <p className="text-sm text-gray-500">
                从报名咨询到考试通过，提供一站式全程跟踪服务
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            联系我们
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">校区地址</h3>
                <p className="text-sm text-gray-500">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">咨询热线</h3>
                <p className="text-lg font-bold text-red-600">{contactPhone}</p>
                <p className="text-sm text-gray-500">周一至周日 9:00-18:00</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">电子邮箱</h3>
                <p className="text-sm text-gray-500">{contactEmail || "contact@hdaomanager.com"}</p>
                <p className="text-sm text-gray-500">我们会在24小时内回复</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
