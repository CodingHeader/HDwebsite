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
  Eye, Trash2, AlertTriangle, X, MessagesSquare,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";
import {
  buildChatTranscript,
  buildChatTranscriptSummary,
} from "@/lib/chat-history-view";

// 会话列表项
interface ChatSession {
  sessionId: string;
  messageCount: number;
  userMessageCount: number;
  aiMessageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  firstMessage: string;
  lastMessage: string;
  ipAddress: string | null;
  pageUrl: string | null;
}

// 会话内的单条消息
interface ChatMessage {
  id: number;
  sessionId: string;
  role: string;
  message: string;
  model: string | null;
  temperature: number | null;
  tokensUsed: number | null;
  responseTime: number | null;
  pageUrl: string | null;
  createdAt: string;
}

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  
  // 详情弹窗状态
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailMessages, setDetailMessages] = useState<ChatMessage[]>([]);
  const [detailTranscript, setDetailTranscript] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 删除弹窗状态
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 获取会话列表
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (searchTerm) params.set("search", searchTerm);

      const response = await managerFetch(`/api/chat-history?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setSessions(result.data.items);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleSearch = () => {
    setPage(1);
    setSelectedSessionIds([]);
    fetchSessions();
  };

  const toggleSelect = (sessionId: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSessionIds.length === sessions.length && sessions.length > 0) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(sessions.map(s => s.sessionId));
    }
  };

  // 打开详情弹窗，加载会话的所有消息
  const openDetail = async (sessionId: string) => {
    setDetailSessionId(sessionId);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await managerFetch(`/api/chat-history?sessionId=${sessionId}&mode=messages`);
      const result = await response.json();
      if (result.code === 200) {
        const messages = result.data.messages || [];
        setDetailMessages(messages);
        setDetailTranscript(buildChatTranscript(messages));
      }
    } catch (err) {
      console.error("Failed to fetch session messages:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeleteDialog = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setDeleteDialogOpen(true);
  };

  // 删除整个会话（需要后端支持按sessionId删除）
  const handleDelete = async () => {
    if (!deleteSessionId) return;
    setDeleting(true);
    try {
      // 先获取该会话的所有消息ID，然后逐个删除
      const response = await managerFetch(`/api/chat-history?sessionId=${deleteSessionId}&mode=messages`);
      const result = await response.json();
      if (result.code === 200) {
        const messages = result.data.messages;
        await Promise.all(
          messages.map((m: ChatMessage) =>
            managerFetch(`/api/chat-history/${m.id}`, { method: "DELETE" })
          )
        );
        setDeleteDialogOpen(false);
        setDeleteSessionId(null);
        fetchSessions();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeleting(false);
    }
  };

  // 批量删除会话
  const handleBatchDelete = async () => {
    if (selectedSessionIds.length === 0) return;
    setDeleting(true);
    try {
      for (const sessionId of selectedSessionIds) {
        const response = await managerFetch(`/api/chat-history?sessionId=${sessionId}&mode=messages`);
        const result = await response.json();
        if (result.code === 200) {
          const messages = result.data.messages;
          await Promise.all(
            messages.map((m: ChatMessage) =>
              managerFetch(`/api/chat-history/${m.id}`, { method: "DELETE" })
            )
          );
        }
      }
      setSelectedSessionIds([]);
      fetchSessions();
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
          {selectedSessionIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              删除选中 ({selectedSessionIds.length})
            </Button>
          )}
          <span className="text-xs text-gray-500 ml-auto">共 {total} 个会话</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
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
                    checked={selectedSessionIds.length === sessions.length && sessions.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="border-white/20"
                  />
                </TableHead>
                <TableHead className="text-gray-400">会话ID</TableHead>
                <TableHead className="text-gray-400">消息数</TableHead>
                <TableHead className="text-gray-400">最后消息预览</TableHead>
                <TableHead className="text-gray-400">首次对话</TableHead>
                <TableHead className="text-gray-400">最后活跃</TableHead>
                <TableHead className="text-gray-400">IP地址</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session: ChatSession) => (
                <TableRow key={session.sessionId} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedSessionIds.includes(session.sessionId)}
                      onCheckedChange={() => toggleSelect(session.sessionId)}
                      className="border-white/20"
                    />
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs font-mono">
                    {session.sessionId.slice(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {session.messageCount} 条
                      </span>
                      <span className="text-xs text-gray-500">
                        ({session.userMessageCount}问/{session.aiMessageCount}答)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[300px]">
                    <p className="line-clamp-2 text-gray-300">{session.lastMessage}</p>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {session.firstMessageAt ? new Date(session.firstMessageAt).toLocaleString("zh-CN") : "-"}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString("zh-CN") : "-"}
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs font-mono">
                    {session.ipAddress || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(session.sessionId)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(session.sessionId)}
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

      {/* 详情弹窗 - 显示完整对话 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl bg-[#1a1d26] border-white/[0.06] text-white max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-gray-400" />
              对话详情
              {detailSessionId && (
                <span className="text-xs text-gray-500 font-normal font-mono ml-2">
                  {detailSessionId.slice(0, 16)}...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
              {detailMessages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">暂无消息</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const summary = buildChatTranscriptSummary(detailMessages);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">消息总数</p>
                          <p className="mt-1 text-lg font-semibold">{summary.messageCount}</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">用户消息</p>
                          <p className="mt-1 text-lg font-semibold">{summary.userMessageCount}</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">AI消息</p>
                          <p className="mt-1 text-lg font-semibold">{summary.assistantMessageCount}</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">起止时间</p>
                          <p className="mt-1 text-xs text-gray-300">
                            {summary.startedAt ? new Date(summary.startedAt).toLocaleString("zh-CN") : "-"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {summary.endedAt ? new Date(summary.endedAt).toLocaleString("zh-CN") : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-xl border border-white/[0.08] bg-black/20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <MessagesSquare className="h-4 w-4" />
                        单次完整 Transcript
                      </div>
                      <span className="text-xs text-gray-500">
                        适合复制、检索、整体审阅
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-6 text-gray-200 font-mono">
                      {detailTranscript}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.08] text-sm text-gray-300">
                      原始逐条消息
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {detailMessages.map((msg: ChatMessage) => (
                        <div key={msg.id} className="px-4 py-3">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5",
                              msg.role === "user"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            )}>
                              {msg.role === "user" ? "用户" : "AI"}
                            </span>
                            <span>{new Date(msg.createdAt).toLocaleString("zh-CN")}</span>
                            {msg.model && <span className="font-mono">{msg.model}</span>}
                            {msg.tokensUsed !== null && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {msg.tokensUsed} tokens
                              </span>
                            )}
                            {msg.responseTime !== null && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {msg.responseTime}ms
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm whitespace-pre-wrap text-white">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
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
            确定要删除这个会话及其所有 {detailMessages.length > 0 ? detailMessages.length : ""} 条消息吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}
              className="text-gray-400 hover:text-white">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
