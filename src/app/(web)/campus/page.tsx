import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CampusPage() {
  const campusList = await prisma.campus.findMany({
    where: { status: "active" },
    orderBy: { sort: "asc" },
    include: { images: { orderBy: { sort: "asc" } } },
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">校区环境</h1>
      <div className="mt-8 space-y-10">
        {campusList.map((c) => (
          <section key={c.id}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">{c.name}</h2>
              <p className="text-sm text-muted">{c.address}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {c.images.map((img) => (
                <figure key={img.id} className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.image} alt={img.caption ?? c.name} className="h-44 w-full object-cover" loading="lazy" />
                  {img.caption && <figcaption className="mt-1 text-xs text-muted">{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
      {campusList.length === 0 && <p className="mt-10 text-muted">暂无内容</p>}
    </div>
  );
}
