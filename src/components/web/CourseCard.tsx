"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, BookOpen, ArrowRight } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

export interface Course {
  id: number;
  title: string;
  description: string | null;
  price: number;
  priceText?: string | null;
  duration: string | null;
  cover: string | null;
  status: string;
  categoryId: number;
  category?: Category;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {course.cover ? (
          <Image
            src={course.cover}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y3ZjdmNyIvPjwvc3ZnPg=="
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
            <BookOpen className="h-12 w-12 text-white/50" />
          </div>
        )}
        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">
          {course.category?.name || "专升本"}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-red-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {course.description || "暂无课程描述"}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{course.duration || "2-3年"}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>系统课程</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-red-600">
            {course.priceText === "--" ? (
              <span className="text-xl font-bold">--</span>
            ) : (
              <span className="text-xl font-bold">{course.priceText || `¥${course.price}`}</span>
            )}
          </div>
          <Link
            href={`/courses/${course.id}`}
            className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            了解详情
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
