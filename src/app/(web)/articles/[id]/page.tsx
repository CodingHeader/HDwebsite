import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChevronRight, Calendar, Eye, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtmlServer } from "@/lib/security/xss-filter";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasBrandSuffix(title: string, brandNames: string[]) {
  const normalized = title.trim();
  return brandNames.some((brandName) => {
    const name = brandName.trim();
    if (!name) {
      return false;
    }
    return new RegExp(`(?:\\s*[-—|｜·•/]+\\s*|\\s+)${escapeRegExp(name)}$`).test(normalized);
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    notFound();
  }

  // 获取文章详情
  const article = await prisma.article.findFirst({
    where: { id: articleId, status: "published" },
    include: {
      author: { select: { id: true, username: true, nickname: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  if (!article) {
    notFound();
  }

  // 异步增加浏览量（不阻塞页面渲染）
  prisma.article.update({
    where: { id: articleId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // 获取相关文章
  const relatedArticles = await prisma.article.findMany({
    where: {
      status: "published",
      id: { not: articleId },
      OR: [
        { categoryId: article.categoryId },
        { tags: { some: { tagId: { in: article.tags.map((t: { tag: { id: number } }) => t.tag.id) } } } },
      ],
    },
    take: 5,
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, coverImage: true, publishedAt: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-[#da251d]">首页</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link href="/articles" className="hover:text-[#da251d]">新闻资讯</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            {article.category && (
              <>
                <Link
                  href={`/articles?category=${article.category.id}`}
                  className="hover:text-[#da251d]"
                >
                  {article.category.name}
                </Link>
                <ChevronRight className="w-4 h-4 mx-2" />
              </>
            )}
            <span className="text-gray-900 truncate max-w-[200px]">{article.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧内容区 */}
          <article className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* 封面图 */}
              {article.coverImage && (
                <div className="w-full h-64 md:h-80">
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    width={800}
                    height={320}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* 标题 */}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {article.title}
                </h1>

                {/* 元信息 */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b">
                  {article.category && (
                    <Link
                      href={`/articles?category=${article.category.id}`}
                      className="px-3 py-1 bg-[#da251d]/10 text-[#da251d] rounded-full hover:bg-[#da251d]/20"
                    >
                      {article.category.name}
                    </Link>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {article.viewCount} 阅读
                  </span>
                  {article.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {article.author.nickname || article.author.username}
                    </span>
                  )}
                </div>

                {/* 标签 */}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {article.tags.map(({ tag }: { tag: { id: number; name: string; slug: string } }) => (
                      <Link
                        key={tag.id}
                        href={`/articles?tag=${tag.slug}`}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-[#da251d] hover:text-white transition-colors"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* 文章内容（经过XSS安全过滤） */}
                <div
                  className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#da251d] prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlServer(article.content) }}
                />

                {/* 分享和返回 */}
                <div className="mt-8 pt-6 border-t flex items-center justify-between">
                  <Link
                    href="/articles"
                    className="flex items-center gap-2 text-gray-600 hover:text-[#da251d]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    返回列表
                  </Link>
                  <div className="text-sm text-gray-500">
                    如果觉得本文有帮助，欢迎分享给朋友
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* 右侧边栏 */}
          <aside className="lg:col-span-1 space-y-6">
            {/* 相关文章 */}
            {relatedArticles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">相关文章</h3>
                <ul className="space-y-3">
                  {relatedArticles.map((relArticle: { id: number; title: string; coverImage: string | null; publishedAt: Date | null }) => (
                    <li key={relArticle.id}>
                      <Link
                        href={`/articles/${relArticle.id}`}
                        className="group"
                      >
                        {relArticle.coverImage && (
                          <div className="w-full h-24 mb-2 overflow-hidden rounded">
                            <Image
                              src={relArticle.coverImage}
                              alt={relArticle.title}
                              width={200}
                              height={96}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <h4 className="text-sm text-gray-700 line-clamp-2 group-hover:text-[#da251d]">
                          {relArticle.title}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(relArticle.publishedAt || new Date()).toLocaleDateString()}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 热门文章 */}
            <HotArticles currentId={articleId} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// 热门文章组件
async function HotArticles({ currentId }: { currentId: number }) {
  const articles = await prisma.article.findMany({
    where: { status: "published", id: { not: currentId }, isHot: true },
    orderBy: { viewCount: "desc" },
    take: 5,
    select: { id: true, title: true, viewCount: true },
  });

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">热门文章</h3>
      <ul className="space-y-3">
        {articles.map((article: { id: number; title: string; viewCount: number }, index: number) => (
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
    </div>
  );
}

// 生成元数据
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    return { title: "文章不存在" };
  }

  const [article, settings] = await Promise.all([
    prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, excerpt: true, seoTitle: true, seoDescription: true, seoKeywords: true },
    }),
    getSettings(),
  ]);

  if (!article) {
    return { title: "文章不存在" };
  }

  const siteName = settings.siteName || "弘道经理学院";
  const schoolShortName = settings.schoolShortName || siteName;
  const resolvedTitle = (article.seoTitle || article.title).trim();
  const title = hasBrandSuffix(resolvedTitle, [siteName, schoolShortName])
    ? { absolute: resolvedTitle }
    : resolvedTitle;

  return {
    title,
    description: article.seoDescription || article.excerpt,
    keywords: article.seoKeywords,
  };
}
