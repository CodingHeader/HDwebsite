import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, User, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import { sanitizeHtmlServer } from "@/lib/security/xss-filter";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCourse(id: string) {
  const courseId = parseInt(id);
  if (isNaN(courseId)) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return course;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) {
    return { title: "课程未找到" };
  }
  return {
    title: course.title,
    description: course.description || `${course.category.name}专业专升本课程，${course.duration}学制`,
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [course, settings] = await Promise.all([
    getCourse(id),
    getSettings(),
  ]);
  const contactPhone = settings.contactPhone || "400-001-5729";

  if (!course) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "课程专业", href: "/courses" }, { label: course.title }]} />
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          返回课程列表
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                  {course.category.name}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>
              <p className="text-gray-600 mb-6">{course.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>学制：{course.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>系统课程</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>专业师资</span>
                </div>
              </div>
            </div>

            {/* Course Outline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">课程详情</h2>
              <div
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtmlServer(course.outline || "<p>暂无课程详情</p>") }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">课程费用</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-red-600 text-2xl font-bold">¥{course.price}</span>
                  <span className="text-gray-400 text-sm">/全程</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <Link href={`/apply?course=${course.id}`} className="block">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    立即报名
                  </Button>
                </Link>
                <Link href="/apply" className="block">
                  <Button variant="outline" className="w-full">
                    咨询课程
                  </Button>
                </Link>
              </div>

              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-900 mb-2">咨询热线</p>
                <p className="text-2xl font-bold text-red-600">{contactPhone}</p>
                <p className="text-xs text-gray-400 mt-1">周一至周日 9:00-18:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
