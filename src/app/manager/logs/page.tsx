"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ScrollText, User, Monitor } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

interface LogItem {
  id: number;
  username: string;
  module: string;
  action: string;
  title: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionMap: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  login: "登录",
  logout: "登出",
};

const moduleMap: Record<string, string> = {
  article: "文章",
  user: "用户",
  category: "分类",
  navigation: "导航",
  course: "课程",
  news: "新闻",
  banner: "轮播图",
  setting: "设置",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const response = await managerFetch("/api/logs");
      const result = await response.json();
      if (result.code === 200) setLogs(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter(l =>
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.title && l.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">操作日志</h1>
          <p className="text-gray-400 text-sm mt-1">查看系统操作记录和审计日志</p>
        </div>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索日志..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">用户</TableHead>
                <TableHead className="text-gray-400">模块</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
                <TableHead className="text-gray-400">标题</TableHead>
                <TableHead className="text-gray-400">IP地址</TableHead>
                <TableHead className="text-gray-400">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-2 text-white text-sm">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        {log.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {moduleMap[log.module] || log.module}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.action === "delete" ? "bg-red-500/10 text-red-400" :
                        log.action === "create" ? "bg-emerald-500/10 text-emerald-400" :
                        log.action === "login" ? "bg-blue-500/10 text-blue-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        {actionMap[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">{log.title || "-"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {log.ipAddress || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{log.createdAt?.split("T")[0]} {log.createdAt?.split("T")[1]?.slice(0,5)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <ScrollText className="h-5 w-5 text-gray-400" />
                    </div>
                    暂无日志数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
