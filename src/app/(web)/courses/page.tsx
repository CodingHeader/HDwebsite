import Link from "next/link";
import { CategoryFilter } from "@/components/web/CategoryFilter";
import { SearchBox } from "@/components/web/SearchBox";
import { CourseCard } from "@/components/web/CourseCard";
import type { Course } from "@/components/web/CourseCard";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const { category, q, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 12;
  const categoryId = category ? parseInt(category) : undefined;

  const where = {
    status: "active" as const,
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { title: { contains: q } } : {}),
  };

  const [courses, total, categories] = await Promise.all([
    prisma.course.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.course.count({ where }),
    prisma.category.findMany({
      where: { type: "course" },
      orderBy: { sort: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "课程专业" }]} />

      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">课程专业</h1>
            <p className="text-gray-500">选择适合您的专升本专业，开启学历提升之旅</p>
          </div>

          {/* Search & Category Filter */}
          <div className="mb-8 space-y-4">
            <SearchBox
              defaultValue={q || ""}
              placeholder="搜索课程名称..."
              basePath="/courses"
              extraParams={category ? { category } : {}}
            />
            <CategoryFilter categories={categories} currentCategory={category} />
          </div>

          {/* Result Info */}
          <div className="mb-4 text-sm text-gray-500">
            共找到 <span className="font-medium text-gray-900">{total}</span> 个课程
            {q && <span>，搜索关键词：&ldquo;{q}&rdquo;</span>}
          </div>

          {/* Course Grid */}
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: Course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">暂无该分类下的课程</p>
              {(q || category) && (
                <Link href="/courses" className="text-[#da251d] text-sm mt-2 inline-block hover:underline">
                  清除筛选条件
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={`/courses?page=${page - 1}${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 border"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Link
                    key={pageNum}
                    href={`/courses?page=${pageNum}${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "bg-[#da251d] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border"
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
              {page < totalPages && (
                <Link
                  href={`/courses?page=${page + 1}${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 border"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
