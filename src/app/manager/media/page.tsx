"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Upload, Loader2, Trash2, Copy, Eye, Pencil } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { Pagination } from "@/components/manager/Pagination";
import {
  buildMediaCategoryOptions,
  getMediaCategoryLabel,
  partitionMediaItems,
  resolveMediaCategoryInput,
  BUILTIN_MEDIA_CATEGORY,
} from "@/lib/media-management";

interface MediaItem {
  id: number;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  type: string;
  category: string | null;
  createdAt: string;
  uploader: { username: string; nickname: string | null } | null;
  missing?: boolean;
  source?: "builtin" | "upload";
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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchPresetCategory, setBatchPresetCategory] = useState("");
  const [batchCustomCategory, setBatchCustomCategory] = useState("");
  const [uploadPresetCategory, setUploadPresetCategory] = useState("");
  const [uploadCustomCategory, setUploadCustomCategory] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

    // 打开上传分类选择对话框
    setPendingFile(file);
    setIsUploadDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 执行上传
  const executeUpload = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    try {
      const nextCategory = resolveMediaCategoryInput(uploadPresetCategory, uploadCustomCategory);
      const formData = new FormData();
      formData.append("file", pendingFile);
      if (nextCategory) {
        formData.append("category", nextCategory);
      }

      const response = await managerFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok && result.code === 200) {
        // 如果有分类，更新刚上传文件的分类
        if (nextCategory && result.data?.id) {
          await managerFetch(`/api/media/${result.data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: nextCategory }),
          });
        }
        await fetchMedia();
        setIsUploadDialogOpen(false);
        setPendingFile(null);
        setUploadPresetCategory("");
        setUploadCustomCategory("");
      } else {
        alert(result.message || "上传失败");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
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

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要批量删除选中的 ${selectedIds.length} 个媒体文件吗？`)) return;

    setBatchDeleting(true);
    try {
      const ids = selectedIds;
      const response = await managerFetch("/api/media/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await response.json();
      if (response.ok && result.code === 200) {
        alert(`成功删除 ${result.data?.deleted || ids.length} 个媒体文件`);
      } else {
        alert(result.message || "批量删除失败");
      }
      clearSelection();
      await fetchMedia();
    } catch (err) {
      console.error("Batch delete error:", err);
      alert("批量删除失败");
    } finally {
      setBatchDeleting(false);
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

  const saveBatchCategory = async () => {
    const ids = selectedIds.filter((id) => id > 0);
    if (ids.length === 0) return;
    const nextCategory = resolveMediaCategoryInput(batchPresetCategory, batchCustomCategory);
    if (!nextCategory) {
      alert("请输入批量分类");
      return;
    }

    try {
      const response = await managerFetch("/api/media/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, category: nextCategory }),
      });
      const result = await response.json();
      if (response.ok && result.code === 200) {
        alert(`成功更新 ${result.data?.updated || ids.length} 个媒体文件的分类`);
      } else {
        alert(result.message || "批量更新失败");
      }
      clearSelection();
      setBatchPresetCategory("");
      setBatchCustomCategory("");
      await fetchMedia();
    } catch (err) {
      console.error("Batch update error:", err);
      alert("批量更新失败");
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

  const categoryOptions = useMemo(
    () => buildMediaCategoryOptions(media.map((item) => item.category)),
    [media]
  );

  const editableCategoryOptions = useMemo(
    () => categoryOptions.filter((item) => item.value !== BUILTIN_MEDIA_CATEGORY),
    [categoryOptions]
  );

  const filteredMedia = useMemo(
    () =>
      media.filter((m) => {
        const keyword = searchTerm.trim().toLowerCase();
        const categoryLabel = getMediaCategoryLabel(m.category).toLowerCase();
        const matchesKeyword =
          keyword.length === 0 ||
          m.filename.toLowerCase().includes(keyword) ||
          (m.category && m.category.toLowerCase().includes(keyword)) ||
          categoryLabel.includes(keyword);
        const matchesCategory =
          !categoryFilter || (m.category || "") === categoryFilter;
        return matchesKeyword && matchesCategory;
      }),
    [media, searchTerm, categoryFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / pageSize));

  const pagedMedia = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMedia.slice(start, start + pageSize);
  }, [filteredMedia, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const { builtinItems, uploadedItems } = useMemo(
    () => partitionMediaItems(pagedMedia),
    [pagedMedia]
  );
  const selectableIds = pagedMedia.map((item) => item.id);
  const uploadedSelectableIds = uploadedItems.map((item) => item.id);
  const builtinSelectableIds = builtinItems.map((item) => item.id);
  const allCurrentSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const allUploadedSelected =
    uploadedSelectableIds.length > 0 &&
    uploadedSelectableIds.every((id) => selectedIds.includes(id));
  const allBuiltinSelected =
    builtinSelectableIds.length > 0 &&
    builtinSelectableIds.every((id) => selectedIds.includes(id));
  const selectedBuiltinCount = selectedIds.filter((id) => id < 0).length;
  const selectedUploadedCount = selectedIds.filter((id) => id > 0).length;

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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索媒体文件..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
              />
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white"
              >
                <option value="">全部分类</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-black">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={batchPresetCategory}
                  onChange={(e) => setBatchPresetCategory(e.target.value)}
                  className="h-10 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white"
                >
                  <option value="">批量分类</option>
                  {editableCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-black">
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="或新增分类"
                  value={batchCustomCategory}
                  onChange={(e) => setBatchCustomCategory(e.target.value)}
                  className="w-32 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
                <Button
                  variant="outline"
                  onClick={saveBatchCategory}
                  disabled={selectedUploadedCount === 0 || selectedBuiltinCount > 0}
                  className="border-white/[0.08] text-white hover:bg-white/[0.06]"
                >
                  批量分类
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.length === 0 || batchDeleting}
                >
                  {batchDeleting ? "批量删除中..." : "批量删除"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (allUploadedSelected) {
                      setSelectedIds((prev) => prev.filter((id) => !uploadedSelectableIds.includes(id)));
                    } else {
                      setSelectedIds((prev) => Array.from(new Set([...prev, ...uploadedSelectableIds])));
                    }
                  }}
                  disabled={uploadedSelectableIds.length === 0}
                  className="border-white/[0.08] text-white hover:bg-white/[0.06]"
                >
                  {allUploadedSelected ? "取消当前页上传媒体" : "全选当前页上传媒体"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (allBuiltinSelected) {
                      setSelectedIds((prev) => prev.filter((id) => !builtinSelectableIds.includes(id)));
                    } else {
                      setSelectedIds((prev) => Array.from(new Set([...prev, ...builtinSelectableIds])));
                    }
                  }}
                  disabled={builtinSelectableIds.length === 0}
                  className="border-white/[0.08] text-white hover:bg-white/[0.06]"
                >
                  {allBuiltinSelected ? "取消当前页内置图" : "全选当前页内置图"}
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              当前页上传媒体 {uploadedItems.length} 项，内置静态图 {builtinItems.length} 项；内置静态图支持预览、复制与删除，固定归类为“内置静态图”。
            </div>
            {selectedIds.length > 0 && (
              <div className="text-xs text-gray-400">
                已选择 {selectedIds.length} 项，其中上传媒体 {selectedUploadedCount} 项，内置静态图 {selectedBuiltinCount} 项。
                {selectedBuiltinCount > 0 ? " 当前选择包含内置静态图时，不支持批量改分类。" : ""}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-gray-400 w-12">
                    <Checkbox
                      checked={allCurrentSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
                        }
                      }}
                    />
                  </TableHead>
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
                {pagedMedia.length > 0 ? (
                  pagedMedia.map((item) => (
                  <TableRow key={item.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
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
                          onClick={() => {
                            if (item.category !== BUILTIN_MEDIA_CATEGORY) {
                              startEditCategory(item);
                            }
                          }}
                          title={item.category === BUILTIN_MEDIA_CATEGORY ? "内置静态图固定分类" : "点击编辑分类"}
                        >
                          {item.missing ? "文件缺失" : getMediaCategoryLabel(item.category)}
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
                          disabled={item.category === BUILTIN_MEDIA_CATEGORY}
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
                  <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                    暂无媒体文件
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
            <div className="border-t border-white/[0.06] p-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={filteredMedia.length}
                label="个媒体文件"
                onPageChange={setPage}
              />
            </div>
          </>
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

      {/* 上传分类选择对话框 */}
      {isUploadDialogOpen && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1a1d26] rounded-xl border border-white/[0.06] p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">上传文件</h3>
            <p className="text-gray-400 text-sm mb-4">
              文件: {pendingFile.name} ({formatFileSize(pendingFile.size)})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择分类（可选）
                </label>
                <div className="flex gap-2">
                  <select
                    value={uploadPresetCategory}
                    onChange={(e) => setUploadPresetCategory(e.target.value)}
                    className="flex-1 h-10 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white"
                  >
                    <option value="">未分类</option>
                    {editableCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="或输入新分类"
                    value={uploadCustomCategory}
                    onChange={(e) => setUploadCustomCategory(e.target.value)}
                    className="w-32 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  可选预置分类，也可直接输入新增分类；内置静态图会自动归入独立类别。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setPendingFile(null);
                  setUploadPresetCategory("");
                  setUploadCustomCategory("");
                }}
                className="border-white/[0.08] text-white hover:bg-white/[0.06]"
              >
                取消
              </Button>
              <Button
                onClick={executeUpload}
                disabled={isUploading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 上传中...
                  </>
                ) : (
                  "确认上传"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
