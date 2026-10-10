"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Category {
  id: number;
  name: string;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  price: number;
  duration: string | null;
  status: string;
  category: Category;
  createdAt: string;
}

const PAGE_SIZE = 15;

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cover: "",
    price: "",
    duration: "",
    categoryId: "",
    status: "active",
  });

  const fetchCourses = useCallback(async (p = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const response = await managerFetch(`/api/courses?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setCourses(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await managerFetch("/api/categories");
      const result = await response.json();
      if (result.code === 200) {
        setCategories(result.data.items || result.data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchCourses(page, searchTerm);
    fetchCategories();
  }, [fetchCourses, fetchCategories, page, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingCourse 
      ? `/api/courses/${editingCourse.id}` 
      : "/api/courses";
    const method = editingCourse ? "PUT" : "POST";

    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          categoryId: parseInt(formData.categoryId),
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingCourse(null);
        setFormData({
          title: "",
          description: "",
          cover: "",
          price: "",
          duration: "",
          categoryId: "",
          status: "active",
        });
        fetchCourses(page, searchTerm);
      } else {
        alert("保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失败");
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      cover: (course as Course & { cover?: string }).cover || "",
      price: course.price.toString(),
      duration: course.duration || "",
      categoryId: course.category.id.toString(),
      status: course.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个课程吗？")) return;

    try {
      const response = await managerFetch(`/api/courses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCourses(page, searchTerm);
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
          <h1 className="text-2xl font-bold text-white">课程管理</h1>
          <p className="text-gray-400 mt-1">管理所有专升本课程</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setEditingCourse(null);
                setFormData({
                  title: "",
                  description: "",
                  cover: "",
                  price: "",
                  duration: "",
                  categoryId: "",
                  status: "active",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加课程
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? "编辑课程" : "添加课程"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">课程名称 *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入课程名称"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">课程描述</Label>
                <RichTextField
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: sanitizeHtmlServer(html) })}
                  placeholder="请输入课程描述..."
                  minHeight="200px"
                />
                <p className="text-xs text-gray-400">
                  支持富文本排版，内容会自动进行安全过滤
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">课程封面</Label>
                <ImageField
                  value={formData.cover}
                  onChange={(url) => setFormData({ ...formData, cover: url })}
                  placeholder="点击选择课程封面（建议 3:4 比例，如 600×800）"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">价格 (元) *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="5800"
                    required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">学制</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="2-3年"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">课程分类 *</Label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    required
                  >
                    <option value="" className="bg-[#161922]">请选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#161922]">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">状态</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    <option value="active" className="bg-[#161922]">上架</option>
                    <option value="inactive" className="bg-[#161922]">下架</option>
                  </select>
                </div>
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
            placeholder="搜索课程..."
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
              <TableHead>课程名称</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>价格</TableHead>
              <TableHead>学制</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length > 0 ? (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>{course.id}</TableCell>
                  <TableCell className="font-medium text-white">{course.title}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-white/[0.06] text-gray-200 text-sm rounded">
                      {course.category?.name || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-amber-400 font-medium">¥{course.price}</TableCell>
                  <TableCell>{course.duration || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        course.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-gray-500/15 text-gray-400"
                      }`}
                    >
                      {course.status === "active" ? "上架" : "下架"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/courses/${course.id}`} target="_blank" title="查看">
                        <Button variant="ghost" size="icon" className="bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(course)}
                        title="编辑"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(course.id)}
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
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  暂无课程数据
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
        label="个课程"
        onPageChange={setPage}
      />
    </div>
  );
}
