import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewsCard } from "./NewsCard";

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

interface NewsSectionProps {
  news: News[];
}

export function NewsSection({ news }: NewsSectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              最新资讯
            </h2>
            <p className="text-gray-500">掌握最新专升本政策与动态</p>
          </div>
          <Link
            href="/news"
            className="hidden md:flex items-center gap-1 text-red-600 font-medium hover:text-red-700 transition-colors"
          >
            查看更多
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/news"
            className="inline-flex items-center gap-1 text-red-600 font-medium"
          >
            查看更多资讯
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
