"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { managerFetch } from "@/lib/manager-fetch";
import type { ArticleSummary, Pagination } from "@/contracts";

type ListData = { list: (ArticleSummary & { category?: { name: string } | null })[]; pagination: Pagination };

/** 文章管理（骨架版：走真实 API 的列表/删除，验证鉴权 CRUD 闭环；完整 CrudPage 随 R0） */
export default function ManagerArticlesPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setError("");
      try {
        const res = await managerFetch<ListData>(`/api/articles?page=${page}&limit=10`);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [page, refresh]);

  async function handleDelete(id: number) {
    if (!window.confirm("确认删除该文章？")) return;
    try {
      await managerFetch(`/api/articles/${id}`, { method: "DELETE" });
      setRefresh((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <Link href="/" className="text-sm text-primary hover:underline">查看前台</Link>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">频道</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">浏览</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{a.title}</td>
                <td className="px-4 py-3">{a.channel === "news" ? "新闻" : "资讯"}</td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">{a.viewCount}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded border px-3 py-1 text-sm ${
                p === page ? "border-primary text-primary" : "border-border text-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
