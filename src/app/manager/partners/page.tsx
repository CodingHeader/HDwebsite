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
import { Plus, Search, Pencil, Trash2, GraduationCap } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { ImageField } from "@/components/manager/ImageField";

interface Partner {
  id: number;
  name: string;
  logo: string;
  website: string | null;
  sort: number;
  status: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    website: "",
    sort: "0",
    status: "active",
  });

  const fetchPartners = useCallback(async () => {
    try {
      const response = await managerFetch("/api/partners");
      const result = await response.json();
      if (result.code === 200) {
        setPartners(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingPartner
      ? `/api/partners/${editingPartner.id}`
      : "/api/partners";
    const method = editingPartner ? "PUT" : "POST";

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
        setEditingPartner(null);
        setFormData({
          name: "",
          logo: "",
          website: "",
          sort: "0",
          status: "active",
        });
        fetchPartners();
      } else {
        alert("保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失败");
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      logo: partner.logo,
      website: partner.website || "",
      sort: partner.sort.toString(),
      status: partner.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个院校吗？")) return;

    try {
      const response = await managerFetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPartners();
      } else {
        alert("删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    }
  };

  const filteredPartners = partners.filter((partner) =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">招生院校管理</h1>
          <p className="text-gray-400 mt-1">管理合作院校展示</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setEditingPartner(null);
                setFormData({
                  name: "",
                  logo: "",
                  website: "",
                  sort: "0",
                  status: "active",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加院校
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPartner ? "编辑院校" : "添加院校"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">院校名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：四川大学"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">院校Logo *</Label>
                <ImageField
                  value={formData.logo}
                  onChange={(url) => setFormData({ ...formData, logo: url })}
                  placeholder="点击选择院校Logo（建议正方形 200×200）"
                />
                <p className="text-xs text-gray-400">建议使用正方形Logo图片</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">官网链接</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.edu.cn"
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
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    <option value="active" className="bg-[#161922]">显示</option>
                    <option value="inactive" className="bg-[#161922]">隐藏</option>
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
            placeholder="搜索院校..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {partners
          .filter((p) => p.status === "active")
          .sort((a, b) => a.sort - b.sort)
          .slice(0, 6)
          .map((partner) => (
            <div key={partner.id} className="bg-[#161922] border border-white/[0.06] rounded-lg p-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/[0.06] mb-2">
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                    {partner.name.charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-1 text-white">{partner.name}</p>
            </div>
          ))}
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>院校名称</TableHead>
              <TableHead>官网</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length > 0 ? (
              filteredPartners.sort((a, b) => a.sort - b.sort).map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>{partner.id}</TableCell>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/[0.06]">
                      {partner.logo ? (
                        <img src={partner.logo} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                          {partner.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {partner.website ? (
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {partner.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{partner.sort}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        partner.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {partner.status === "active" ? "显示" : "隐藏"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(partner)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(partner.id)}
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
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  暂无院校数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
