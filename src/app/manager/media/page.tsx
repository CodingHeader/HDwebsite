"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Upload, Loader2, Trash2, Copy, Eye, Pencil } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const response = await managerFetch("/api/media");
      const result = await response.json();
      if (result.code === 200) setMedia(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

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
        await fetchMedia();
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

  // 删除
  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此媒体文件吗？")) return;
    setDeletingId(id);
    try {
      const response = await managerFetch(`/api/media/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (response.ok && result.code === 200) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(result.message || "删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  // 编辑分类
  const startEditCategory = (item: MediaItem) => {
    setEditingId(item.id);
    setEditCategory(item.category || "");
  };

  const saveCategory = async (id: number) => {
    try {
      const response = await managerFetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: editCategory }),
      });
      const result = await response.json();
      if (response.ok && result.code === 200) {
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, category: editCategory } : m))
        );
      } else {
        alert(result.message || "更新失败");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("更新失败");
    } finally {
      setEditingId(null);
    }
  };

  // 复制URL
  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = item.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredMedia = media.filter(m =>
    m.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
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

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索媒体文件..."
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
                <TableHead className="text-gray-400">预览</TableHead>
                <TableHead className="text-gray-400">文件名</TableHead>
                <TableHead className="text-gray-400">类型</TableHead>
                <TableHead className="text-gray-400">大小</TableHead>
                <TableHead className="text-gray-400">分类</TableHead>
                <TableHead className="text-gray-400">上传时间</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.length > 0 ? (
                filteredMedia.map((item) => (
                  <TableRow key={item.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <div
                        className="w-10 h-10 rounded-lg bg-white/[0.06] overflow-hidden flex items-center justify-center cursor-pointer"
                        onClick={() => !item.missing && setPreviewUrl(item.url)}
                      >
                        {item.missing ? (
                          <span className="px-1 text-[10px] text-amber-300 text-center">缺失</span>
                        ) : (
                          <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-sm max-w-[200px] truncate">{item.filename}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{item.mimeType}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{formatFileSize(item.size)}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="h-7 w-24 text-xs bg-white/[0.04] border-white/[0.08] text-white"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveCategory(item.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-400" onClick={() => saveCategory(item.id)}>保存</Button>
                        </div>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded text-xs cursor-pointer ${item.missing ? "bg-amber-500/10 text-amber-300" : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]"}`}
                          onClick={() => startEditCategory(item)}
                          title="点击编辑分类"
                        >
                          {item.missing ? "文件缺失" : item.category || "未分类"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{item.createdAt?.split("T")[0]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                          onClick={() => !item.missing && setPreviewUrl(item.url)}
                          title="预览"
                          disabled={item.missing}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                          onClick={() => copyUrl(item)}
                          title="复制URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                          onClick={() => startEditCategory(item)}
                          title="编辑分类"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          title="删除"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {copiedId === item.id && (
                          <span className="text-xs text-green-400 ml-1">已复制</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                    暂无媒体文件
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 预览弹窗 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewUrl}
              alt="预览"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              className="absolute -top-2 -right-2 text-white hover:text-gray-300 bg-black/50 rounded-full h-8 w-8 p-0"
              onClick={() => setPreviewUrl(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
