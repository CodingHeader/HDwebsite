"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, MessageSquare, User, Bot, Loader2, ChevronLeft, ChevronRight, Clock, Zap,
  Eye, Trash2, AlertTriangle, X,
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailItem, setDetailItem] = useState<ChatHistoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setSelectedIds([]);
    fetchChats();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === chats.length && chats.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(chats.map(c => c.id));
    }
  };

  const openDetail = async (id: number) => {
    try {
      const response = await managerFetch(`/api/chat-history/${id}`);
      const result = await response.json();
      if (result.code === 200) {
        setDetailItem(result.data);
        setDetailOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
    }
  };

  const openDeleteDialog = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await managerFetch(`/api/chat-history/${deleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.code === 200) {
        setDeleteDialogOpen(false);
        setDeleteId(null);
        fetchChats();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          managerFetch(`/api/chat-history/${id}`, { method: "DELETE" })
        )
      );
      setSelectedIds([]);
      fetchChats();
    } catch (err) {
      console.error("Failed to batch delete:", err);
    } finally {
      setDeleting(false);
    }
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
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              删除选中 ({selectedIds.length})
            </Button>
          )}
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === chats.length && chats.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="border-white/20"
                  />
                </TableHead>
                <TableHead className="text-gray-400">角色</TableHead>
                <TableHead className="text-gray-400">消息内容</TableHead>
                <TableHead className="text-gray-400">会话</TableHead>
                <TableHead className="text-gray-400">模型</TableHead>
                <TableHead className="text-gray-400">耗时</TableHead>
                <TableHead className="text-gray-400">Tokens</TableHead>
                <TableHead className="text-gray-400">时间</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((chat) => (
                <TableRow key={chat.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedIds.includes(chat.id)}
                      onCheckedChange={() => toggleSelect(chat.id)}
                      className="border-white/20"
                    />
                  </TableCell>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(chat.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(chat.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl bg-[#1a1d26] border-white/[0.06] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              对话详情
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-2 font-mono">{detailItem.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">角色:</span>
                  <span className={cn(
                    "ml-2 px-2 py-0.5 rounded text-xs font-medium",
                    detailItem.role === "user"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-emerald-400 bg-emerald-500/10"
                  )}>
                    {detailItem.role === "user" ? "用户" : "AI"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">会话ID:</span>
                  <span className="ml-2 font-mono text-xs">{detailItem.sessionId}</span>
                </div>
                <div>
                  <span className="text-gray-500">时间:</span>
                  <span className="ml-2">{new Date(detailItem.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                {detailItem.model && (
                  <div>
                    <span className="text-gray-500">模型:</span>
                    <span className="ml-2">{detailItem.model}</span>
                  </div>
                )}
                {detailItem.responseTime && (
                  <div>
                    <span className="text-gray-500">响应时间:</span>
                    <span className="ml-2">{detailItem.responseTime}ms</span>
                  </div>
                )}
                {detailItem.tokensUsed && (
                  <div>
                    <span className="text-gray-500">Tokens:</span>
                    <span className="ml-2">{detailItem.tokensUsed}</span>
                  </div>
                )}
                {detailItem.temperature !== null && (
                  <div>
                    <span className="text-gray-500">Temperature:</span>
                    <span className="ml-2">{detailItem.temperature}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/[0.04] rounded-lg p-4 border border-white/[0.06]">
                <span className="text-gray-500 text-sm block mb-2">消息内容:</span>
                <p className="text-white text-sm whitespace-pre-wrap">{detailItem.message}</p>
              </div>

              {detailItem.pageUrl && (
                <div className="text-sm">
                  <span className="text-gray-500">页面URL:</span>
                  <a href={detailItem.pageUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-blue-400 hover:underline truncate inline-block max-w-md">
                    {detailItem.pageUrl}
                  </a>
                </div>
              )}

              {detailItem.ipAddress && (
                <div className="text-sm">
                  <span className="text-gray-500">IP地址:</span>
                  <span className="ml-2 font-mono">{detailItem.ipAddress}</span>
                </div>
              )}

              {detailItem.userAgent && (
                <div className="text-sm">
                  <span className="text-gray-500">User-Agent:</span>
                  <p className="mt-1 p-2 bg-white/[0.04] rounded text-xs text-gray-400 break-all">
                    {detailItem.userAgent}
                  </p>
                </div>
              )}

              {detailItem.metadata && (
                <div className="text-sm">
                  <span className="text-gray-500">元数据:</span>
                  <pre className="mt-1 p-2 bg-white/[0.04] rounded text-xs text-gray-400 overflow-auto">
                    {detailItem.metadata}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1d26] border-white/[0.06] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300 py-4">
            确定要删除这条对话记录吗？此操作不可恢复。
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
