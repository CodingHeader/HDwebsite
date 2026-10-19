import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";
import { createElement } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { sanitizeRichContent } from "@/lib/markdown";
import { MarkdownRenderer } from "@/components/web/MarkdownRenderer";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/web/Breadcrumb";
import { resolveServiceGuideIcon } from "@/components/web/data/service-guide-icons";
import { getWebSettings as getSettings } from "@/components/web/data/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const guide = await prisma.serviceGuide.findFirst({
    where: { status: "active", OR: [{ slug }, { id: Number.isFinite(Number(slug)) ? Number(slug) : -1 }] },
  });
  if (!guide) return { title: "服务指南" };
  return {
    title: `${guide.title} - 服务指南`,
    description: guide.subtitle || `${guide.title}的详细说明`,
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await prisma.serviceGuide.findFirst({
    where: { status: "active", OR: [{ slug }, { id: Number.isFinite(Number(slug)) ? Number(slug) : -1 }] },
  });
  if (!guide) notFound();

  const settings = await getSettings();
  const siblings = await prisma.serviceGuide.findMany({
    where: { status: "active", id: { not: guide.id } },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    take: 8,
  });

  const Icon = resolveServiceGuideIcon(guide.icon ?? "");
  const hasContent = !!(guide.content && guide.content.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "服务指南", href: "/services" },
          { label: guide.title },
        ]}
      />
      <div className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                {createElement(Icon, { className: "h-8 w-8" })}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{guide.title}</h1>
                {guide.subtitle && (
                  <p className="text-gray-500 leading-relaxed">{guide.subtitle}</p>
                )}
              </div>
              <Link
                href="/apply?source=guide"
                className="hidden md:inline-flex items-center px-5 py-2.5 rounded-lg bg-[#da251d] text-white text-sm font-medium hover:bg-[#b91d1d] transition-colors"
              >
                在线咨询 AI 客服
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <article className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-8">
              {hasContent ? (
                guide.contentType === "markdown" ? (
                  <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-h2:text-xl prose-h3:text-lg">
                    <MarkdownRenderer content={guide.content as string} />
                  </div>
                ) : (
                  <div
                    className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-h2:text-xl prose-h3:text-lg"
                    // REQ-NF-002：html 型富内容统一净化出口
                    dangerouslySetInnerHTML={{ __html: sanitizeRichContent(guide.content as string) }}
                  />
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">该指南暂未配置详细内容</p>
                  <p className="text-sm">请前往{" "}
                    <Link href="/apply?source=guide" className="text-blue-600 underline">在线咨询</Link>{" "}
                    获取权威解答，或拨打 {settings.contactPhone || WEB_SETTING_DEFAULTS.contactPhone1}。
                  </p>
                </div>
              )}

              {/* 底部 CTA */}
              <div className="mt-10 pt-6 border-t border-gray-100">
                <div className="bg-red-50 rounded-xl p-6">
                  <h3 className="font-bold text-red-700 mb-2">还有更多疑问？</h3>
                  <p className="text-sm text-red-600 mb-4">
                    弘道教育 1 对 1 课程顾问 2 分钟内响应，帮您精准定位院校 / 专业 / 学费。
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/apply?source=guide"
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-[#da251d] text-white text-sm font-medium hover:bg-[#b91d1d] transition-colors"
                    >
                      在线咨询 →
                    </Link>
                    <a
                      href={`tel:${(settings.contactPhone || WEB_SETTING_DEFAULTS.contactPhone).replace(/-/g, "")}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-white transition-colors"
                    >
                      电话咨询：{settings.contactPhone || WEB_SETTING_DEFAULTS.contactPhone1}
                    </a>
                  </div>
                </div>
              </div>
            </article>

            {/* 侧边：其它指南 */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4">其它服务</h3>
                <ul className="space-y-2">
                  {siblings.map((s) => {
                    const SibIcon = resolveServiceGuideIcon(s.icon ?? "");
                    const href = s.slug ? `/services/${s.slug}` : (s.link ?? "#");
                    return (
                      <li key={s.id}>
                        <Link
                          href={href}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                        >
                          {createElement(SibIcon, { className: "h-4 w-4 flex-shrink-0" })}
                          <span className="text-sm line-clamp-1">{s.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
