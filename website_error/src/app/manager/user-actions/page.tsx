"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, MousePointerClick, Eye, FormInput, Filter, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface UserActionItem {
  id: number;
  actionType: string;
  actionTarget: string;
  sessionId: string;
  ipAddress: string | null;
  userAgent: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  referrer: string | null;
  metadata: string | null;
  createdAt: string;
}

const actionTypeConfig: Record<string, { label: string; icon: typeof MousePointerClick; color: string }> = {
  click: { label: "点击", icon: MousePointerClick, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  view: { label: "浏览", icon: Eye, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  submit: { label: "提交", icon: FormInput, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export default function UserActionsPage() {
  const [actions, setActions] = useState<UserActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (searchTerm) params.set("search", searchTerm);
      if (filterType) params.set("actionType", filterType);

      const response = await managerFetch(`/api/user-actions?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setActions(result.data.items);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch user actions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterType]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const handleSearch = () => {
    setPage(1);
    fetchActions();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">埋点日志</h1>
        <p className="text-gray-400 text-sm mt-1">追踪用户在前台页面的点击、浏览和提交行为</p>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索目标、页面..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            {["", "click", "view", "submit"].map((type) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => { setFilterType(type); setPage(1); }}
                className={cn(
                  "text-xs",
                  filterType === type
                    ? "bg-white/[0.08] text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {type === "" ? "全部" : actionTypeConfig[type]?.label || type}
              </Button>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-auto">共 {total} 条</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : actions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <MousePointerClick className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-400">暂无埋点数据</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">类型</TableHead>
                <TableHead className="text-gray-400">目标</TableHead>
                <TableHead className="text-gray-400">页面</TableHead>
                <TableHead className="text-gray-400">会话ID</TableHead>
                <TableHead className="text-gray-400">IP</TableHead>
                <TableHead className="text-gray-400">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => {
                const typeInfo = actionTypeConfig[action.actionType] || {
                  label: action.actionType,
                  icon: MousePointerClick,
                  color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
                };
                const Icon = typeInfo.icon;
                return (
                  <TableRow key={action.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit border",
                        typeInfo.color
                      )}>
                        <Icon className="h-3 w-3" />
                        {typeInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-white text-sm">{action.actionTarget}</TableCell>
                    <TableCell className="text-gray-400 text-sm max-w-[200px] truncate">
                      {action.pageTitle || action.pageUrl || "-"}
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs font-mono">{action.sessionId?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-gray-500 text-sm">{action.ipAddress || "-"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(action.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-gray-500">第 {page} / {totalPages} 页</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="text-gray-400 hover:text-white disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="text-gray-400 hover:text-white disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
