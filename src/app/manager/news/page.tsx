/**
 * V11-UI-05：/manager/news 兼容入口——旧站路径重定向到文章管理
 *（main 的 news 已并入 Article，ADR-001；旧链接/收藏可达）。
 */
import { redirect } from "next/navigation";

export default function ManagerNewsCompatPage() {
  redirect("/manager/articles");
}
