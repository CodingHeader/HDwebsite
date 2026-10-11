import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { sanitizeRichContent } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId) || courseId <= 0) notFound();
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { category: true, major: true } });
  if (!course || course.status !== "active") notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-8">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {course.category?.name}{course.major ? ` · ${course.major.name}` : ""}{course.duration ? ` · 学制 ${course.duration}` : ""}
        </p>
        <p className="mt-4 text-2xl font-bold text-primary">{course.priceText || (course.price > 0 ? `¥${course.price}` : "咨询报价")}</p>
        <Link href="/apply" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground">
          立即报名
        </Link>
      </div>
      {course.description && (
        <div className="mt-8">
          <h2 className="text-xl font-bold">课程简介</h2>
          <p className="mt-3 leading-7 text-muted">{course.description}</p>
        </div>
      )}
      {course.outline && (
        <div className="mt-8">
          <h2 className="text-xl font-bold">课程大纲</h2>
          <div className="prose-hd mt-3" dangerouslySetInnerHTML={{ __html: sanitizeRichContent(course.outline) }} />
        </div>
      )}
    </div>
  );
}
