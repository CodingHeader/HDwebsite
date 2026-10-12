import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseCard } from "./CourseCard";

interface Category {
  id: number;
  name: string;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  price: number;
  duration: string | null;
  cover: string | null;
  status: string;
  categoryId: number;
  category?: Category;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseSectionProps {
  courses: Course[];
}

export function CourseSection({ courses }: CourseSectionProps) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              热门专业推荐
            </h2>
            <p className="text-gray-500">精选优质专升本课程，助力学历提升</p>
          </div>
          <Link
            href="/courses"
            className="hidden md:flex items-center gap-1 text-red-600 font-medium hover:text-red-700 transition-colors"
          >
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-red-600 font-medium"
          >
            查看全部课程
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
