"use client";

import { useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

type DashboardData = {
  articles: number;
  published: number;
  students: number;
  courses: number;
};

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
    </div>
  );
}
