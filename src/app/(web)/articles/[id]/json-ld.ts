/**
 * D-15：文章详情 NewsArticle JSON-LD 生成（结构化数据，REQ-NF-003 §3）
 *
 * 纯函数，无 IO / 无 prisma / 无副作用。只追加 `<script type="application/ld+json">`，
 * 不改可见像素（前台风格冻结 REQ-F-014）。
 *
 * 安全：标题等用户可控文本经 JSON.stringify 后转义 `</`，防止 `</script>` 提前闭合导致 HTML 注入。
 */

export type JsonLdArticleInput = {
  id: number;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  authorName?: string | null;
  categoryName?: string | null;
};

/** 转义 `</`（以及 `<!--`），防止嵌入 JSON 时提前闭合 script 标签 */
export function escapeScriptClosing(json: string): string {
  return json.replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

function iso(v?: Date | string | null): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 生成 NewsArticle JSON-LD 对象（不含 script 包裹） */
export function buildArticleJsonLd(article: JsonLdArticleInput): Record<string, unknown> {
  const datePublished = iso(article.publishedAt) ?? iso(article.updatedAt);
  const dateModified = iso(article.updatedAt) ?? datePublished;
  const canonicalUrl = `/articles/${article.id}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    mainEntityOfPage: canonicalUrl,
    datePublished,
    dateModified,
    description: article.excerpt ?? undefined,
  };

  if (article.coverImage) data.image = [article.coverImage];
  if (article.authorName) {
    data.author = [{ "@type": "Person", name: article.authorName }];
    data.creator = [{ "@type": "Person", name: article.authorName }];
  }
  if (article.categoryName) {
    data.articleSection = article.categoryName;
  }
  if (datePublished) {
    data.datePublished = datePublished;
  }

  return data;
}

/** 返回可直接放入 JSX 的 script 内容（已 JSON.stringify + 转义） */
export function buildArticleJsonLdScript(article: JsonLdArticleInput): string {
  const obj = buildArticleJsonLd(article);
  return escapeScriptClosing(JSON.stringify(obj));
}