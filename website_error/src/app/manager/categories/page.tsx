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
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

interface CategoryRaw {
  id: number;
  name: string;
  slug: string;
  sort: number;
  _count: { courses: number };
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  sort: number;
  courseCount: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sort: "0",
  });

  const fetchCategories = useCallback(async () => {
    try {
      const response = await managerFetch("/api/categories");
      const result = await response.json();
      if (result.code === 200) {
        setCategories(
          (result.data as CategoryRaw[]).map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            sort: c.sort,
            courseCount: c._count?.courses ?? 0,
            createdAt: c.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingCategory 
      ? `/api/categories/${editingCategory.id}` 
      : "/api/categories";
    const method = editingCategory ? "PUT" : "POST";

    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug: formData.name.trim().toLowerCase().replace(/\s+/g, "-"),
          sort: parseInt(formData.sort),
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingCategory(null);
        setFormData({
          name: "",
          sort: "0",
        });
        fetchCategories();
      } else {
        const result = await response.json();
        alert(result.message || "保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失败");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      sort: category.sort.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个分类吗？如果分类下有关联课程，将无法删除。")) return;

    try {
      const response = await managerFetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        fetchCategories();
      } else {
        alert(result.message || "删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">分类管理</h1>
          <p className="text-gray-400 mt-1">管理课程分类</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setEditingCategory(null);
                setFormData({
                  name: "",
                  sort: "0",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加分类
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "编辑分类" : "添加分类"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">分类名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入分类名称"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">排序</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
                  placeholder="数字越小越靠前"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-400">数字越小，排序越靠前</p>
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

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>分类名称</TableHead>
              <TableHead>课程数量</TableHead>
              <TableHead>排序</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.sort((a, b) => a.sort - b.sort).map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-red-400" />
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-full text-sm font-medium ${
                        category.courseCount > 0
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-white/[0.06] text-gray-400"
                      }`}
                    >
                      {category.courseCount}
                    </span>
                  </TableCell>
                  <TableCell>{category.sort}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                        title="编辑"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        title={category.courseCount > 0 ? "该分类下有课程，无法删除" : "删除"}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 h-8 w-8 disabled:opacity-40 disabled:bg-white/[0.03]"
                        disabled={category.courseCount > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  暂无分类数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
