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
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { ImageField } from "@/components/manager/ImageField";

interface Banner {
  id: number;
  image: string;
  link: string | null;
  sort: number;
  status: string;
  createdAt: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    image: "",
    link: "",
    sort: "0",
    status: "active",
  });

  const fetchBanners = useCallback(async () => {
    try {
      const response = await managerFetch("/api/banners");
      const result = await response.json();
      if (result.code === 200) {
        setBanners(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch banners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingBanner 
      ? `/api/banners/${editingBanner.id}` 
      : "/api/banners";
    const method = editingBanner ? "PUT" : "POST";

    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sort: parseInt(formData.sort),
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingBanner(null);
        setFormData({
          image: "",
          link: "",
          sort: "0",
          status: "active",
        });
        fetchBanners();
      } else {
        alert("保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失败");
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      image: banner.image,
      link: banner.link || "",
      sort: banner.sort.toString(),
      status: banner.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个轮播图吗？")) return;

    try {
      const response = await managerFetch(`/api/banners/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBanners();
      } else {
        alert("删除失败");
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
          <h1 className="text-2xl font-bold text-white">轮播图管理</h1>
          <p className="text-gray-400 mt-1">管理首页轮播图</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setEditingBanner(null);
                setFormData({
                  image: "",
                  link: "",
                  sort: "0",
                  status: "active",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加轮播图
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "编辑轮播图" : "添加轮播图"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">轮播图片 *</Label>
                <ImageField
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  placeholder="点击选择轮播图片（建议 1920×600）"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">链接地址</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="点击跳转链接（可选）"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">排序</Label>
                  <Input
                    type="number"
                    value={formData.sort}
                    onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
                    placeholder="0"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">状态</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    <option value="active" className="bg-[#1a1d27]">显示</option>
                    <option value="inactive" className="bg-[#1a1d27]">隐藏</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 border-white/[0.08] text-gray-300 hover:bg-white/[0.04]"
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

      {/* Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {banners
          .filter((b) => b.status === "active")
          .sort((a, b) => a.sort - b.sort)
          .map((banner) => (
            <div key={banner.id} className="relative rounded-lg overflow-hidden aspect-video bg-white/[0.06]">
              <img
                src={banner.image}
                alt={`轮播图 ${banner.id}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                排序: {banner.sort} | {banner.link ? "有链接" : "无链接"}
              </div>
            </div>
          ))}
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>图片</TableHead>
              <TableHead>链接</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.length > 0 ? (
              banners.sort((a, b) => a.sort - b.sort).map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>{banner.id}</TableCell>
                  <TableCell>
                    <div className="w-20 h-12 rounded overflow-hidden bg-white/[0.06]">
                      <img
                        src={banner.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {banner.link || "-"}
                  </TableCell>
                  <TableCell>{banner.sort}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        banner.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {banner.status === "active" ? "显示" : "隐藏"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(banner)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(banner.id)}
                        className="text-red-400 hover:text-red-300"
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
                  暂无轮播图数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
