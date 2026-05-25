"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  Tag,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { managerFetch } from "@/lib/manager-fetch";
import { RichTextField } from "@/components/manager/RichTextField";
import { ImageField } from "@/components/manager/ImageField";
import { sanitizeHtmlServer } from "@/lib/security/xss-filter";
import { Pagination } from "@/components/manager/Pagination";

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  status: string;
  isTop: boolean;
  isRecommend: boolean;
  isHot: boolean;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  seoTitle: string | null;
  seoKeywords: string | null;
  seoDescription: string | null;
  author: {
    id: number;
    username: string;
    nickname: string | null;
  };
  category: {
    id: number;
    name: string;
  } | null;
  tags: { tag: { id: number; name: string } }[];
}

interface Category {
  id: number;
  name: string;
}

interface TagItem {
  id: number;
  name: string;
}

interface ArticleFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: number | null;
  tagIds: number[];
  status: string;
  isTop: boolean;
  isRecommend: boolean;
  isHot: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

const initialFormData: ArticleFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  categoryId: null,
  tagIds: [],
  status: "draft",
  isTop: false,
  isRecommend: false,
  isHot: false,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Article | null>(null);
  const [deletingItem, setDeletingItem] = useState<Article | null>(null);
  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const totalPages = Math.ceil(total / limit);

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter) params.set("status", statusFilter);

      const response = await managerFetch(`/api/articles?${params}`);

      if (response.ok) {
        const result = await response.json();
        if (result.code === 200) {
          setArticles(result.data.list);
          setTotal(result.data.pagination.total);
        }
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter]);  

  // Fetch categories and tags
  const fetchCategoriesAndTags = useCallback(async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        managerFetch("/api/categories?type=article"),
        managerFetch("/api/tags"),
      ]);

      if (catRes.ok) {
        const catResult = await catRes.json();
        if (catResult.code === 200) {
          setCategories(catResult.data);
        }
      }

      if (tagRes.ok) {
        const tagResult = await tagRes.json();
        if (tagResult.code === 200) {
          setTags(tagResult.data.items || tagResult.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories/tags:", error);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchCategoriesAndTags();
  }, [fetchArticles, fetchCategoriesAndTags]);

  // Open create dialog
  const handleCreate = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (item: Article) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || "",
      content: item.content,
      coverImage: item.coverImage || "",
      categoryId: item.category?.id || null,
      tagIds: item.tags.map((t) => t.tag.id),
      status: item.status,
      isTop: item.isTop,
      isRecommend: item.isRecommend,
      isHot: item.isHot,
      seoTitle: item.seoTitle || "",
      seoDescription: item.seoDescription || "",
      seoKeywords: item.seoKeywords || "",
    });
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (item: Article) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingItem ? `/api/articles/${editingItem.id}` : "/api/articles";
      const method = editingItem ? "PUT" : "POST";

      const submitData = {
        ...formData,
        categoryId: formData.categoryId ?? undefined,
        status: publish ? "published" : formData.status,
      };

      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchArticles();
      } else {
        const error = await response.json();
        alert(error.message || "操作失败");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("操作失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const response = await managerFetch(`/api/articles/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchArticles();
      } else {
        const error = await response.json();
        alert(error.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("删除失败");
    }
  };

  // Toggle publish status
  const handleTogglePublish = async (item: Article) => {
    try {
      const newStatus = item.status === "published" ? "draft" : "published";

      const response = await managerFetch(`/api/articles/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchArticles();
      } else {
        const error = await response.json();
        alert(error.message || "操作失败");
      }
    } catch (error) {
      console.error("Toggle publish error:", error);
      alert("操作失败");
    }
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">文章管理</h1>
          <p className="text-gray-400 mt-1">管理网站新闻资讯和文章内容</p>
        </div>
        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          写文章
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索文章标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
        >
          <option value="" className="bg-[#161922]">全部状态</option>
          <option value="published" className="bg-[#161922]">已发布</option>
          <option value="draft" className="bg-[#161922]">草稿</option>
        </select>
        <Button variant="outline" onClick={fetchArticles}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* Articles Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/[0.06]">
            <tr className="text-left text-sm font-medium text-gray-400">
              <th className="px-4 py-3">文章信息</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">浏览</th>
              <th className="px-4 py-3">发布时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  暂无文章数据
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="transition-colors hover:bg-[#1f2330]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {article.coverImage && (
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/articles/${article.id}`}
                          target="_blank"
                          className="font-medium text-white hover:text-[#EF4444] line-clamp-1"
                        >
                          {article.title}
                        </Link>
                        <p className="text-sm text-gray-400">
                          {article.author.nickname || article.author.username}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {article.isTop && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">
                            置顶
                          </span>
                        )}
                        {article.isRecommend && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded">
                            推荐
                          </span>
                        )}
                        {article.isHot && (
                          <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded">
                            热门
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-white/[0.06] text-gray-300 text-sm rounded">
                      {article.category?.name || "未分类"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-1 text-sm rounded",
                        article.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-gray-500/10 text-gray-400"
                      )}
                    >
                      {article.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {article.viewCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(article)}
                        title={article.status === "published" ? "下架" : "发布"}
                        className="bg-white/[0.06] hover:bg-white/[0.12] h-8 w-8 p-0"
                      >
                        {article.status === "published" ? (
                          <EyeOff className="w-4 h-4 text-gray-300" />
                        ) : (
                          <Eye className="w-4 h-4 text-emerald-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(article)}
                        title="编辑"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(article)}
                        title="删除"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="篇文章"
        onPageChange={setPage}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "编辑文章" : "写文章"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">文章标题</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: editingItem ? formData.slug : generateSlug(e.target.value),
                      })
                    }
                    placeholder="请输入文章标题"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">URL标识</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="文章URL标识"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">摘要</Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                    placeholder="文章摘要（选填）"
                    rows={3}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>正文内容</Label>
                  <RichTextField
                    value={formData.content}
                    onChange={(html) =>
                      setFormData({ ...formData, content: sanitizeHtmlServer(html) })
                    }
                    placeholder="请输入文章内容..."
                    minHeight="400px"
                  />
                  <p className="text-xs text-gray-400">
                    支持富文本排版，内容会自动进行安全过滤
                  </p>
                </div>
              </div>

              {/* Sidebar Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">状态</Label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-white text-sm"
                  >
                    <option value="draft" className="bg-[#1a1d27]">草稿</option>
                    <option value="published" className="bg-[#1a1d27]">发布</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">分类</Label>
                  <select
                    value={formData.categoryId || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-white text-sm"
                  >
                    <option value="" className="bg-[#1a1d27]">选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#1a1d27]">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>封面图片</Label>
                  <ImageField
                    value={formData.coverImage}
                    onChange={(url) =>
                      setFormData({ ...formData, coverImage: url })
                    }
                    placeholder="点击选择封面图片"
                  />
                </div>

                <div className="space-y-2">
                  <Label>标签</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tagIds.map((tid) => {
                      const t = tags.find((tag) => tag.id === tid);
                      return t ? (
                        <span
                          key={tid}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-600/10 text-red-400 text-xs rounded-full"
                        >
                          {t.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                tagIds: formData.tagIds.filter((id) => id !== tid),
                              })
                            }
                            className="hover:text-red-300"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-white text-sm"
                      value=""
                      onChange={(e) => {
                        const tagId = parseInt(e.target.value);
                        if (tagId && !formData.tagIds.includes(tagId)) {
                          setFormData({
                            ...formData,
                            tagIds: [...formData.tagIds, tagId],
                          });
                        }
                      }}
                    >
                      <option value="" className="bg-[#1a1d27]">选择标签...</option>
                      {tags
                        .filter((t) => !formData.tagIds.includes(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#1a1d27]">
                            {t.name}
                          </option>
                        ))}
                    </select>
                    <Input
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="新标签"
                      className="w-32 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && newTagInput.trim()) {
                          e.preventDefault();
                          try {
                            const res = await managerFetch("/api/tags", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: newTagInput.trim(),
                                slug: newTagInput.trim().toLowerCase().replace(/\s+/g, "-"),
                              }),
                            });
                            if (res.ok) {
                              const result = await res.json();
                              const newTag = result.data;
                              setTags((prev) => [newTag, ...prev]);
                              setFormData({
                                ...formData,
                                tagIds: [...formData.tagIds, newTag.id],
                              });
                            }
                          } catch (err) {
                            console.error("Failed to create tag:", err);
                          }
                          setNewTagInput("");
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">SEO标题</Label>
                  <Input
                    value={formData.seoTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, seoTitle: e.target.value })
                    }
                    placeholder="SEO标题"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">SEO描述</Label>
                  <Textarea
                    value={formData.seoDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, seoDescription: e.target.value })
                    }
                    placeholder="SEO描述"
                    rows={2}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">SEO关键词</Label>
                  <Input
                    value={formData.seoKeywords}
                    onChange={(e) =>
                      setFormData({ ...formData, seoKeywords: e.target.value })
                    }
                    placeholder="关键词1, 关键词2, ..."
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.isTop}
                      onChange={(e) =>
                        setFormData({ ...formData, isTop: e.target.checked })
                      }
                    />
                    <span className="text-sm">置顶</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.isRecommend}
                      onChange={(e) =>
                        setFormData({ ...formData, isRecommend: e.target.checked })
                      }
                    />
                    <span className="text-sm">推荐</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.isHot}
                      onChange={(e) =>
                        setFormData({ ...formData, isHot: e.target.checked })
                      }
                    />
                    <span className="text-sm">热门</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e as React.FormEvent, false)}
                disabled={isSubmitting}
              >
                保存草稿
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => handleSubmit(e as React.FormEvent, true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "发布中..." : "立即发布"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            确定要删除文章 &quot;{deletingItem?.title}&quot; 吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-white/[0.08] text-gray-300 hover:bg-white/[0.04]"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
