"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { managerFetch } from "@/lib/manager-fetch";

type DashboardData = { articles: number; published: number; students: number; courses: number };

const QUICK_LINKS = [
  { href: "/manager/articles", label: "写文章" },
  { href: "/manager/collect-items", label: "采集审核" },
  { href: "/manager/publish-jobs", label: "发布任务" },
  { href: "/manager/llm-providers", label: "模型配置" },
  { href: "/manager/settings", label: "站点设置" },
];

export default function ManagerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    managerFetch<DashboardData>("/api/manager/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">仪表盘</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {data && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "文章总数", value: data.articles },
            { label: "已发布", value: data.published },
            { label: "报名线索", value: data.students },
            { label: "课程", value: data.courses },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted">快捷入口</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary hover:text-primary">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
