import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = { certificate: "证书", exam: "考试", campus: "校园" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const where = cat === "certificate" || cat === "exam" || cat === "campus" ? { category: cat } : {};
  const [items, counts] = await Promise.all([
    prisma.gallery.findMany({ where: { ...where, status: "active" }, orderBy: { sort: "asc" } }),
    prisma.gallery.groupBy({ by: ["category"], where: { status: "active" }, _count: true }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">证书风采</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/gallery" className={`rounded-full border px-4 py-1.5 text-sm ${!cat ? "border-primary text-primary" : "border-border text-muted"}`}>全部</a>
        {counts.map((c) => (
          <a key={c.category} href={`/gallery?cat=${c.category}`} className={`rounded-full border px-4 py-1.5 text-sm ${cat === c.category ? "border-primary text-primary" : "border-border text-muted"}`}>
            {CATEGORY_LABELS[c.category] ?? c.category}（{c._count}）
          </a>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g) => (
          <figure key={g.id} className="overflow-hidden rounded-lg border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.image} alt={g.title} className="h-44 w-full object-cover" loading="lazy" />
            <figcaption className="p-3 text-sm">{g.title}</figcaption>
          </figure>
        ))}
      </div>
      {items.length === 0 && <p className="mt-10 text-muted">暂无内容</p>}
    </div>
  );
}
