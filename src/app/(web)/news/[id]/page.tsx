import { permanentRedirect, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** /news/<id> → /articles/<id>；资讯中心二级菜单 /news/<分类 slug> → /articles（main next.config 同口径） */
export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) redirect("/articles");
  permanentRedirect(`/articles/${id}`);
}
