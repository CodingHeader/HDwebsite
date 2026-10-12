import { redirect } from "next/navigation";

/** 「关于我们」二级菜单（/about/intro 等）收敛到 /about（main 由 next.config redirects 实现，P02 前台内承接） */
export default function AboutSubPage() {
  redirect("/about");
}
