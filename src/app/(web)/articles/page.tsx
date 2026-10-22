import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Calendar, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/web/Breadcrumb";

interface ArticlesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || "1");
  const limit = 10;
  const categoryId = params.category ? parseInt(params.category as string) : undefined;
  const tagSlug = params.tag as string | undefined;

  // 构建查询条件
  const where: {
    status: string;
    categoryId?: number;
    tags?: { some: { tag: { slug: string } } };
  } = { status: "published" };
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
  }

  // 获取文章列表
  const [articles, total, categories] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { tags: true } },
      },
      orderBy: [
        { isTop: "desc" },
        { publishedAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
    // 只获取文章类型的分类
    prisma.category.findMany({
      where: { type: "article" },
      orderBy: { sort: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <Breadcrumb items={[{ label: "新闻资讯" }]} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧内容区 */}
          <div className="lg:col-span-3">
            {/* 分类筛选 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={tagSlug ? `/articles?tag=${tagSlug}` : "/articles"}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    !categoryId
                      ? "bg-[#da251d] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  全部资讯
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/articles?category=${cat.id}${tagSlug ? `&tag=${tagSlug}` : ""}`}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      categoryId === cat.id
                        ? "bg-[#da251d] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* 标签筛选提示 */}
            {tagSlug && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center gap-2">
                <span className="text-sm text-gray-600">当前标签：</span>
                <span className="px-3 py-1 bg-[#da251d] text-white text-sm rounded-full">{tagSlug}</span>
                <Link
                  href={`/articles${categoryId ? `?category=${categoryId}` : ""}`}
                  className="text-sm text-gray-500 hover:text-[#da251d]"
                >
                  清除筛选
                </Link>
              </div>
            )}

            {/* 文章列表 */}
            <div className="space-y-4">
              {articles.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <p className="text-gray-500">暂无文章</p>
                </div>
              ) : (
                articles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <Link href={`/articles/${article.id}`} className="flex flex-col md:flex-row">
                      {/* 封面图 */}
                      {article.coverImage && (
                        <div className="md:w-48 h-48 md:h-auto flex-shrink-0">
                          <Image
                            src={article.coverImage}
                            alt={article.title}
                            width={192}
                            height={192}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1">
                        {/* 分类标签 */}
                        {article.category && (
                          <span className="inline-block px-2 py-1 bg-[#da251d]/10 text-[#da251d] text-xs rounded mb-2">
                            {article.category.name}
                          </span>
                        )}
                        {/* 标题 */}
                        <h2 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-[#da251d]">
                          {article.title}
                        </h2>
                        {/* 摘要 */}
                        {article.excerpt && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                        )}
                        {/* 标签 */}
                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {article.tags.slice(0, 3).map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* 元信息 */}
                        <div className="flex items-center text-sm text-gray-500 gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {article.viewCount}
                          </span>
                          {article.isTop && (
                            <span className="text-[#da251d] font-medium">置顶</span>
                          )}
                          {article.isRecommend && (
                            <span className="text-amber-600 font-medium">推荐</span>
                          )}
                          {article.isHot && (
                            <span className="text-red-600 font-medium">热门</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                ))
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/articles?page=${p}${categoryId ? `&category=${categoryId}` : ""}${tagSlug ? `&tag=${tagSlug}` : ""}`}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      p === page
                        ? "bg-[#da251d] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 右侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 热门文章 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">热门文章</h3>
              <HotArticles />
            </div>

            {/* 标签云 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">热门标签</h3>
              <TagCloud />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 热门文章组件（Server Component）
async function HotArticles() {
  const articles = await prisma.article.findMany({
    where: { status: "published", isHot: true },
    orderBy: { viewCount: "desc" },
    take: 5,
    select: { id: true, title: true, viewCount: true },
  });

  if (articles.length === 0) {
    return <p className="text-gray-500 text-sm">暂无热门文章</p>;
  }

  return (
    <ul className="space-y-3">
      {articles.map((article, index) => (
        <li key={article.id}>
          <Link
            href={`/articles/${article.id}`}
            className="flex items-start gap-2 text-sm text-gray-700 hover:text-[#da251d] group"
          >
            <span className={cn(
              "w-5 h-5 flex items-center justify-center rounded text-xs font-medium flex-shrink-0",
              index < 3 ? "bg-[#da251d] text-white" : "bg-gray-200 text-gray-600"
            )}>
              {index + 1}
            </span>
            <span className="line-clamp-2 group-hover:underline">{article.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 标签云组件（Server Component）
async function TagCloud() {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    },
    take: 15,
  });
  
  // 按文章数量排序
  const sortedTags = tags.sort((a, b) => b._count.articles - a._count.articles);

  if (sortedTags.length === 0) {
    return <p className="text-gray-500 text-sm">暂无标签</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortedTags.map((tag) => (
        <Link
          key={tag.id}
          href={`/articles?tag=${tag.slug}`}
          className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-[#da251d] hover:text-white transition-colors"
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
