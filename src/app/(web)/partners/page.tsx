import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">合作院校</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {partners.map((p) => (
          <a
            key={p.id}
            href={p.website ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex h-28 flex-col items-center justify-center rounded-lg border border-border bg-card p-4 hover:border-primary"
          >
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt={p.name} className="max-h-16 object-contain" loading="lazy" />
            ) : (
              <span className="font-semibold">{p.name}</span>
            )}
          </a>
        ))}
      </div>
      {partners.length === 0 && <p className="mt-10 text-muted">暂无内容</p>}
    </div>
  );
}
