import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Article, Category } from ".prisma/client";

export const dynamic = "force-dynamic";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = 10;
  const [list, total] = await Promise.all([
    prisma.article.findMany({
      where: { status: "published" },
      orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }) as Promise<(Article & { category: Category | null })[]>,
    prisma.article.count({ where: { status: "published" } }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">资讯中心</h1>
      {list.length === 0 ? (
        <p className="mt-6 text-muted">暂无内容</p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {list.map((a) => (
            <li key={a.id} className="py-4">
              <Link href={`/articles/${a.id}`} className="hover:text-primary">
                <span className="font-semibold">{a.title}</span>
                <span className="ml-3 text-xs text-muted">
                  {a.publishedAt?.toISOString().slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="mt-8 flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/articles?page=${p}`}
              className={`rounded border px-3 py-1 text-sm ${
                p === page ? "border-primary text-primary" : "border-border text-muted"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
