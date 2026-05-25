"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { managerFetch } from "@/lib/manager-fetch";
import { RichTextField } from "@/components/manager/RichTextField";
import { ImageField } from "@/components/manager/ImageField";
import { sanitizeHtmlServer } from "@/lib/security/xss-filter";
import { Pagination } from "@/components/manager/Pagination";

interface News {
  id: number;
  title: string;
  content: string | null;
  cover: string | null;
  views: number;
  status: string;
  createdAt: string;
}

const PAGE_SIZE = 15;

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    cover: "",
    status: "draft",
  });

  const fetchNews = useCallback(async (p = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const response = await managerFetch(`/api/news?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setNews(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(page, searchTerm);
  }, [fetchNews, page, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingNews 
      ? `/api/news/${editingNews.id}` 
      : "/api/news";
    const method = editingNews ? "PUT" : "POST";

    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingNews(null);
        setFormData({
          title: "",
          content: "",
          cover: "",
          status: "draft",
        });
        fetchNews(page, searchTerm);
      } else {
        const result = await response.json();
        alert(result.message || "保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失败");
    }
  };

  const handleEdit = (item: News) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      content: item.content || "",
      cover: item.cover || "",
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条新闻吗？")) return;

    try {
      const response = await managerFetch(`/api/news/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchNews(page, searchTerm);
      } else {
        alert("删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">新闻管理</h1>
          <p className="text-gray-400 mt-1">管理网站新闻资讯</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setEditingNews(null);
                setFormData({
                  title: "",
                  content: "",
                  cover: "",
                  status: "draft",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加新闻
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? "编辑新闻" : "添加新闻"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">标题 *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入新闻标题"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label>封面图片</Label>
                <ImageField
                  value={formData.cover}
                  onChange={(url) => setFormData({ ...formData, cover: url })}
                  placeholder="点击选择封面图片（建议 16:9 比例，如 800×450）"
                />
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <RichTextField
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: sanitizeHtmlServer(html) })}
                  placeholder="请输入新闻内容..."
                  minHeight="300px"
                />
                <p className="text-xs text-gray-400">
                  支持富文本排版，内容会自动进行安全过滤
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">状态</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  <option value="draft" className="bg-[#161922]">草稿</option>
                  <option value="published" className="bg-[#161922]">发布</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  保存
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索新闻..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>浏览量</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news.length > 0 ? (
              news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate text-white">
                    {item.title}
                  </TableCell>
                  <TableCell>{item.views}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        item.status === "published"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-gray-500/15 text-gray-400"
                      }`}
                    >
                      {item.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </TableCell>
                  <TableCell>{item.createdAt.split("T")[0]}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/news/${item.id}`} target="_blank" title="查看">
                        <Button variant="ghost" size="icon" className="bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        title="编辑"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        title="删除"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  暂无新闻数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="条新闻"
        onPageChange={setPage}
      />
    </div>
  );
}
