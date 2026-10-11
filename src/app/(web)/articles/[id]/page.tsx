import { prisma } from "@/lib/prisma";
import { MarkdownRenderer } from "@/components/web/MarkdownRenderer";
import { sanitizeRichContent } from "@/lib/markdown";
import { notFound } from "next/navigation";
import type { Article, Category } from ".prisma/client";

export const dynamic = "force-dynamic";

/** 文章详情：contentType 双模渲染（markdown → MarkdownRenderer；html → 净化注入） */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId <= 0) notFound();

  const article = (await prisma.article.findUnique({
    where: { id: articleId },
    include: { category: true },
  })) as (Article & { category: Category | null }) | null;
  if (!article || article.status !== "published") notFound();

  // 浏览计数（异步自增，失败不阻断）
  prisma.article
    .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">{article.title}</h1>
      <p className="mt-3 text-sm text-muted">
        {article.category?.name}
        {article.publishedAt ? ` · ${article.publishedAt.toISOString().slice(0, 10)}` : ""}
        {` · 阅读 ${article.viewCount}`}
      </p>
      <div className="mt-8">
        {article.contentType === "markdown" ? (
          <MarkdownRenderer content={article.content} />
        ) : (
          <div
            className="prose-hd"
            // REQ-NF-002：html 型内容统一净化出口
            dangerouslySetInnerHTML={{ __html: sanitizeRichContent(article.content) }}
          />
        )}
      </div>
    </article>
  );
}
