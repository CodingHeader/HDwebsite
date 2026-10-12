import { redirect } from "next/navigation";

/** 「热门院校」二级菜单（/partners/<院校>）收敛到 /partners（main 由 next.config redirects 实现，P02 前台内承接） */
export default function PartnerSubPage() {
  redirect("/partners");
}
