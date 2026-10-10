"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Trash2, MessageSquare, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  sessionId: string;
  userId: string | null;
  userName: string | null;
  ipAddress: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  summary: string | null;
  messageCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null;
}

interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  
  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<ConversationDetail | null>(null);
  
  // 删除确认
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await managerFetch(
        `/api/conversations?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(searchTerm)}`
      );
      const result = await response.json();
      if (result.code === 200) {
        setConversations(result.data.list);
        setTotal(result.data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleViewDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await managerFetch(`/api/conversations/${id}`);
      const result = await response.json();
      if (result.code === 200) {
        setCurrentDetail(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversation detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await managerFetch(`/api/conversations/${deletingId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteOpen(false);
        setDeletingId(null);
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">对话日志</h1>
          <p className="text-gray-400 text-sm mt-1">查看和管理用户对话记录</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="搜索对话内容、用户..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-gray-400">用户信息</TableHead>
              <TableHead className="text-gray-400">页面</TableHead>
              <TableHead className="text-gray-400">对话摘要</TableHead>
              <TableHead className="text-gray-400">消息数</TableHead>
              <TableHead className="text-gray-400">时间</TableHead>
              <TableHead className="text-gray-400 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  加载中...
                </TableCell>
              </TableRow>
            ) : conversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  暂无对话记录
                </TableCell>
              </TableRow>
            ) : (
              conversations.map((conv) => (
                <TableRow key={conv.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {conv.userName || "匿名用户"}
                      </p>
                      <p className="text-gray-500 text-xs">{conv.ipAddress || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-gray-300 text-sm truncate max-w-[200px]">
                      {conv.pageTitle || "-"}
                    </p>
                    {conv.pageUrl && (
                      <p className="text-gray-500 text-xs truncate max-w-[200px]">
                        {conv.pageUrl}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-gray-300 text-sm truncate max-w-[300px]">
                      {conv.summary || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                      {conv.messageCount} 条
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-gray-400 text-sm">{formatDate(conv.createdAt)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(conv.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingId(conv.id);
                          setDeleteOpen(true);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-white/[0.06]">
            <p className="text-sm text-gray-500">
              共 {total} 条，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-gray-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-gray-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>对话详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-12 text-center text-gray-400">加载中...</div>
          ) : currentDetail ? (
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Info */}
              <div className="bg-white/[0.04] rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">用户</span>
                  <span className="text-gray-300">{currentDetail.userName || "匿名用户"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IP地址</span>
                  <span className="text-gray-300">{currentDetail.ipAddress || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">页面</span>
                  <span className="text-gray-300">{currentDetail.pageTitle || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时间</span>
                  <span className="text-gray-300">{formatDate(currentDetail.createdAt)}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {currentDetail.messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-4 rounded-lg",
                      msg.role === "user"
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "bg-emerald-500/10 border border-emerald-500/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          msg.role === "user" ? "text-blue-400" : "text-emerald-400"
                        )}
                      >
                        {msg.role === "user" ? "用户" : "AI助手"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-gray-200 text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            确定要删除这条对话记录吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingId(null);
              }}
              className="text-gray-400"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
