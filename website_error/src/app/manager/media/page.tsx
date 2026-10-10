"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Upload,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  Copy,
  Check,
  X,
  ImageIcon,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { Pagination } from "@/components/manager/Pagination";
import { DeleteConfirmDialog } from "@/components/manager/DeleteConfirmDialog";
import { ImagePreviewDialog } from "@/components/manager/ImagePreviewDialog";

interface MediaItem {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  type: string;
  category: string | null;
  createdAt: string;
  uploader: { username: string; nickname: string | null } | null;
  missing?: boolean;
}

interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: "upload", label: "上传" },
  { value: "banner", label: "轮播图" },
  { value: "article", label: "文章插图" },
  { value: "avatar", label: "头像" },
  { value: "partner", label: "合作院校" },
  { value: "gallery", label: "证书风采" },
  { value: "campus", label: "校区" },
  { value: "course", label: "课程" },
  { value: "news", label: "新闻" },
  { value: "other", label: "其他" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);

  // 编辑分类
  const [editTarget, setEditTarget] = useState<MediaItem | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);

  // 图片预览
  const [previewTarget, setPreviewTarget] = useState<MediaItem | null>(null);

  // 复制URL
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchMedia = useCallback(async (currentPage = page, search = searchTerm, category = categoryFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);

      const response = await managerFetch(`/api/v2/media?${params.toString()}`);
      const result = await response.json();
      if (result.code === 200) {
        const data = result.data as MediaListResponse;
        setMedia(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setPage(data.page || currentPage);
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, categoryFilter]);

  useEffect(() => { fetchMedia(1); }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia(1, searchTerm, categoryFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter]);

  // 分页切换
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMedia(newPage);
  };

  // 上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await managerFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok && result.code === 200) {
        await fetchMedia(page);
      } else {
        alert(result.message || "上传失败");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 选择切换
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentIds = media.map((m) => m.id);
    const allSelected = currentIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        currentIds.forEach((id) => next.delete(id));
      } else {
        currentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // 单条删除
  const handleDelete = (item: MediaItem) => {
    setDeleteTarget(item);
    setBatchDeleteMode(false);
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setBatchDeleteMode(true);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (batchDeleteMode) {
        const response = await managerFetch("/api/v2/media/batch", {
          method: "DELETE",
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
        });
        const result = await response.json();
        if (result.code === 200) {
          setSelectedIds(new Set());
          await fetchMedia(page);
        } else {
          alert(result.message || "批量删除失败");
        }
      } else if (deleteTarget) {
        const response = await managerFetch(`/api/v2/media/${deleteTarget.id}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.code === 200) {
          await fetchMedia(page);
        } else {
          alert(result.message || "删除失败");
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setBatchDeleteMode(false);
    }
  };

  // 单条编辑分类
  const handleEditCategory = (item: MediaItem) => {
    setEditTarget(item);
    setEditCategory(item.category || "upload");
    setBatchEditMode(false);
  };

  // 批量编辑分类
  const handleBatchEditCategory = () => {
    if (selectedIds.size === 0) return;
    setBatchEditMode(true);
    setEditTarget(null);
    setEditCategory("upload");
  };

  const confirmEditCategory = async () => {
    setIsEditing(true);
    try {
      if (batchEditMode) {
        const response = await managerFetch("/api/v2/media/batch", {
          method: "PATCH",
          body: JSON.stringify({ ids: Array.from(selectedIds), category: editCategory }),
        });
        const result = await response.json();
        if (result.code === 200) {
          setSelectedIds(new Set());
          await fetchMedia(page);
        } else {
          alert(result.message || "批量更新失败");
        }
      } else if (editTarget) {
        const response = await managerFetch(`/api/v2/media/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ category: editCategory }),
        });
        const result = await response.json();
        if (result.code === 200) {
          await fetchMedia(page);
        } else {
          alert(result.message || "更新失败");
        }
      }
    } catch (err) {
      console.error("Edit category error:", err);
      alert("更新失败");
    } finally {
      setIsEditing(false);
      setEditTarget(null);
      setBatchEditMode(false);
    }
  };

  // 复制URL
  const handleCopyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = item.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const currentAllSelected = media.length > 0 && media.every((m) => selectedIds.has(m.id));
  const currentSomeSelected = media.some((m) => selectedIds.has(m.id));

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">媒体管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理上传的图片、视频和文档</p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
        />
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={triggerFileInput}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 上传中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" /> 上传文件
            </>
          )}
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="搜索媒体文件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.08] text-white">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e2028] border-white/[0.08]">
            <SelectItem value="">全部分类</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-600/10 border border-red-600/20 rounded-lg">
          <span className="text-sm text-red-300">已选择 {selectedIds.size} 项</span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchEditCategory}
            className="border-white/[0.08] text-gray-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            修改分类
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            批量删除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            取消
          </Button>
        </div>
      )}

      {/* 表格 */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        {loading && media.length === 0 ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-gray-400 w-10">
                    <Checkbox
                      checked={currentAllSelected}
                      className="border-white/[0.2] data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-gray-400">预览</TableHead>
                  <TableHead className="text-gray-400">文件名</TableHead>
                  <TableHead className="text-gray-400">类型</TableHead>
                  <TableHead className="text-gray-400">大小</TableHead>
                  <TableHead className="text-gray-400">分类</TableHead>
                  <TableHead className="text-gray-400">上传时间</TableHead>
                  <TableHead className="text-gray-400 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {media.length > 0 ? (
                  media.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          className="border-white/[0.2] data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className="w-10 h-10 rounded-lg bg-white/[0.06] overflow-hidden flex items-center justify-center cursor-pointer"
                          onClick={() => setPreviewTarget(item)}
                        >
                          {item.missing ? (
                            <ImageIcon className="h-4 w-4 text-amber-300" />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.filename}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white text-sm max-w-[200px] truncate">
                        {item.filename}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{item.mimeType}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{formatFileSize(item.size)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${item.missing ? "bg-amber-500/10 text-amber-300" : item.category === "builtin" ? "bg-blue-500/10 text-blue-300" : "bg-white/[0.06] text-gray-300"}`}>
                          {item.missing ? "文件缺失" : item.category === "builtin" ? "静态资源" : item.category || "未分类"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">{item.createdAt?.split("T")[0]}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/[0.06]"
                            onClick={() => setPreviewTarget(item)}
                            title="预览"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/[0.06]"
                            onClick={() => handleCopyUrl(item)}
                            title="复制URL"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() => handleEditCategory(item)}
                            title={item.category === "builtin" ? "静态资源不支持修改分类" : "编辑分类"}
                            disabled={item.category === "builtin"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDelete(item)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                      暂无媒体文件
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/[0.06]">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  label="条记录"
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        open={!!deleteTarget || batchDeleteMode}
        title={batchDeleteMode ? "批量删除确认" : "删除确认"}
        description={
          batchDeleteMode
            ? `确定要删除选中的 ${selectedIds.size} 个媒体文件吗？此操作不可撤销。`
            : `确定要删除「${deleteTarget?.filename}」吗？此操作不可撤销。`
        }
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setBatchDeleteMode(false);
        }}
      />

      {/* 编辑分类弹窗 */}
      <Dialog
        open={!!editTarget || batchEditMode}
        onOpenChange={(v) => {
          if (!v) {
            setEditTarget(null);
            setBatchEditMode(false);
          }
        }}
      >
        <DialogContent className="bg-[#161922] border-white/[0.06] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {batchEditMode ? "批量修改分类" : "编辑分类"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {batchEditMode
                ? `为选中的 ${selectedIds.size} 个媒体文件设置分类`
                : `为「${editTarget?.filename}」设置分类`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={editCategory} onValueChange={setEditCategory}>
              <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e2028] border-white/[0.08]">
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditTarget(null);
                setBatchEditMode(false);
              }}
              disabled={isEditing}
              className="border-white/[0.08] text-gray-300 hover:bg-white/[0.06] hover:text-white"
            >
              取消
            </Button>
            <Button
              onClick={confirmEditCategory}
              disabled={isEditing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "确认保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览弹窗 */}
      <ImagePreviewDialog
        open={!!previewTarget}
        src={previewTarget?.url || ""}
        alt={previewTarget?.filename || "预览"}
        filename={previewTarget?.filename}
        size={previewTarget ? formatFileSize(previewTarget.size) : undefined}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
