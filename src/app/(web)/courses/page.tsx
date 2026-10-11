import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Course, Category, Major } from ".prisma/client";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [courses, categories] = await Promise.all([
    prisma.course.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, include: { category: true, major: true } }),
    prisma.category.findMany({ where: { type: "course", isVisible: true }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">学历提升课程</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted">{c.name}</span>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/courses/${c.id}`} className="rounded-lg border border-border bg-card p-5 hover:border-primary">
            {c.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.cover} alt={c.title} className="mb-3 h-40 w-full rounded object-cover" loading="lazy" />
            )}
            <p className="font-semibold">{c.title}</p>
            <p className="mt-1 text-sm text-muted">{c.category?.name}{c.major ? ` · ${c.major.name}` : ""}</p>
            <p className="mt-2 text-primary">{c.priceText || (c.price > 0 ? `¥${c.price}` : "咨询报价")}</p>
          </Link>
        ))}
      </div>
      {courses.length === 0 && <p className="mt-10 text-muted">暂无课程</p>}
    </div>
  );
}
