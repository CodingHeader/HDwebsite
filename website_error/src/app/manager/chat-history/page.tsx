"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, MessageSquare, User, Bot, Loader2, ChevronLeft, ChevronRight, Clock, Zap,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface ChatHistoryItem {
  id: number;
  sessionId: string;
  conversationId: string;
  ipAddress: string | null;
  userAgent: string | null;
  role: string;
  message: string;
  model: string | null;
  temperature: number | null;
  tokensUsed: number | null;
  responseTime: number | null;
  pageUrl: string | null;
  pageTitle: string | null;
  metadata: string | null;
  createdAt: string;
}

export default function ChatHistoryPage() {
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (searchTerm) params.set("search", searchTerm);

      const response = await managerFetch(`/api/chat-history?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setChats(result.data.items);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const handleSearch = () => {
    setPage(1);
    fetchChats();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">对话日志</h1>
        <p className="text-gray-400 text-sm mt-1">查看学员与AI助手的对话记录</p>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索对话内容、会话ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
          <span className="text-xs text-gray-500 ml-auto">共 {total} 条</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : chats.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-400">暂无对话记录</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">角色</TableHead>
                <TableHead className="text-gray-400">消息内容</TableHead>
                <TableHead className="text-gray-400">会话</TableHead>
                <TableHead className="text-gray-400">模型</TableHead>
                <TableHead className="text-gray-400">耗时</TableHead>
                <TableHead className="text-gray-400">Tokens</TableHead>
                <TableHead className="text-gray-400">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((chat) => (
                <TableRow key={chat.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit border",
                      chat.role === "user"
                        ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                        : chat.role === "assistant"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-gray-400 bg-gray-500/10 border-gray-500/20"
                    )}>
                      {chat.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      {chat.role === "user" ? "用户" : chat.role === "assistant" ? "AI" : "系统"}
                    </span>
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[300px]">
                    <p className="line-clamp-2">{chat.message}</p>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs font-mono">
                    {chat.sessionId?.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {chat.model ? (
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {chat.model}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {chat.responseTime ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {chat.responseTime}ms
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {chat.tokensUsed ? (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {chat.tokensUsed}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {new Date(chat.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                </TableRow>
              ))}
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
