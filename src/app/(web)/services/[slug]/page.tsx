import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/web/MarkdownRenderer";
import { sanitizeRichContent } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function ServiceGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await prisma.serviceGuide.findUnique({ where: { slug } });
  if (!guide || guide.status !== "active") notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">{guide.title}</h1>
      {guide.subtitle && <p className="mt-2 text-muted">{guide.subtitle}</p>}
      <div className="mt-8">
        {guide.contentType === "markdown" ? (
          <MarkdownRenderer content={guide.content ?? ""} />
        ) : (
          <div className="prose-hd" dangerouslySetInnerHTML={{ __html: sanitizeRichContent(guide.content ?? "") }} />
        )}
      </div>
    </div>
  );
}
