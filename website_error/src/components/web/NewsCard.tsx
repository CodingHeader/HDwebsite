"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Eye } from "lucide-react";

interface News {
  id: number;
  title: string;
  content: string | null;
  cover: string | null;
  views: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NewsCardProps {
  news: News;
  variant?: "default" | "compact";
}

export function NewsCard({ news, variant = "default" }: NewsCardProps) {
  if (variant === "compact") {
    return (
      <Link
        href={`/news/${news.id}`}
        className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-xs text-gray-400">{news.createdAt.getFullYear()}</div>
          <div className="text-lg font-bold text-red-600">
            {String(news.createdAt.getMonth() + 1).padStart(2, "0")}/{String(news.createdAt.getDate()).padStart(2, "0")}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
            {news.title}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {news.views}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/news/${news.id}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {news.cover ? (
          <Image
            src={news.cover}
            alt={news.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y3ZjdmNyIvPjwvc3ZnPg=="
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
            <span className="text-white text-lg font-medium">新闻资讯</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-red-600 transition-colors">
          {news.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {news.createdAt.toISOString().split("T")[0]}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {news.views} 阅读
          </span>
        </div>
      </div>
    </Link>
  );
}
