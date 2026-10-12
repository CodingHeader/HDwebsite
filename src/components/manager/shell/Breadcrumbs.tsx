"use client";

/** 顶栏面包屑（P02）：由菜单树 + 当前路径推导「后台 / 分组 / 页面」 */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { matchMenu, type FlatMenuItem } from "./types";

export function Breadcrumbs({ items, pathname }: { items: FlatMenuItem[]; pathname: string }) {
  const current = matchMenu(items, pathname);
  const crumbs: { label: string; href?: string }[] = [{ label: "后台", href: "/manager" }];
  if (current && current.path !== "/manager") {
    if (current.group) crumbs.push({ label: current.group });
    crumbs.push({ label: current.label, href: current.path === pathname ? undefined : current.path });
    if (current.path !== pathname) crumbs.push({ label: "详情" });
  } else if (current?.path === "/manager") {
    crumbs.push({ label: current.label });
  }

  return (
    <nav aria-label="面包屑" className="min-w-0">
      <ol className="flex items-center gap-1 text-[13px] text-mgr-muted-fg">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-mgr-fg">
                  {c.label}
                </span>
              ) : c.href ? (
                <Link href={c.href} className="truncate hover:text-mgr-fg">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate">{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
