"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Plus, Pencil, Trash2, Loader2, LayoutGrid, ArrowUpDown,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";
import { ImageField } from "@/components/manager/ImageField";

interface HomeCardItem {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  gradient: string;
  hoverGradient: string;
  shadow: string;
  backgroundImage: string | null;
  sort: number;
  status: string;
}

const initialFormData = {
  title: "",
  subtitle: "",
  icon: "MessageSquare",
  href: "/courses",
  gradient: "from-blue-500 to-blue-600",
  hoverGradient: "from-blue-400 to-blue-500",
  shadow: "shadow-blue-200",
  backgroundImage: "",
  sort: 0,
  status: "active",
};

const iconOptions = [
  "MessageSquare", "FileText", "BookOpen", "Award", "Shield", "UserCheck",
  "GraduationCap", "Clock", "MapPin", "Phone", "Mail", "Star",
];

const gradientOptions = [
  { value: "from-blue-500 to-blue-600", label: "蓝色" },
  { value: "from-green-500 to-green-600", label: "绿色" },
  { value: "from-orange-500 to-orange-600", label: "橙色" },
  { value: "from-purple-500 to-purple-600", label: "紫色" },
  { value: "from-red-500 to-red-600", label: "红色" },
  { value: "from-amber-500 to-amber-600", label: "琥珀" },
  { value: "from-cyan-500 to-cyan-600", label: "青色" },
  { value: "from-emerald-500 to-emerald-600", label: "翠绿" },
];

export default function HomeCardsPage() {
  const [cards, setCards] = useState<HomeCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<HomeCardItem | null>(null);
  const [deletingCard, setDeletingCard] = useState<HomeCardItem | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await managerFetch("/api/home-cards?all=1");
      const result = await response.json();
      if (result.code === 200) setCards(result.data);
    } catch (err) {
      console.error("Failed to fetch home cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filteredCards = cards.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingCard(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (card: HomeCardItem) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      subtitle: card.subtitle,
      icon: card.icon,
      href: card.href,
      gradient: card.gradient,
      hoverGradient: card.hoverGradient,
      shadow: card.shadow,
      backgroundImage: card.backgroundImage || "",
      sort: card.sort,
      status: card.status,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (card: HomeCardItem) => {
    setDeletingCard(card);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingCard ? `/api/home-cards/${editingCard.id}` : "/api/home-cards";
      const method = editingCard ? "PUT" : "POST";

      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchCards();
      } else {
        const err = await response.json();
        alert(err.message || "操作失败");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("操作失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCard) return;
    try {
      const response = await managerFetch(`/api/home-cards/${deletingCard.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchCards();
      } else {
        const err = await response.json();
        alert(err.message || "删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    }
  };

  const handleToggleStatus = async (card: HomeCardItem) => {
    try {
      const response = await managerFetch(`/api/home-cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: card.status === "active" ? "inactive" : "active" }),
      });
      if (response.ok) {
        fetchCards();
      }
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">首页卡片管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理首页四宫格卡片内容和样式</p>
        </div>
        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新增卡片
        </Button>
      </div>

      {/* Search */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索卡片..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            加载中...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">排序</TableHead>
                <TableHead className="text-gray-400">卡片信息</TableHead>
                <TableHead className="text-gray-400">图标</TableHead>
                <TableHead className="text-gray-400">链接</TableHead>
                <TableHead className="text-gray-400">样式</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.length > 0 ? (
                filteredCards.sort((a, b) => a.sort - b.sort).map((card) => (
                  <TableRow key={card.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-gray-400 text-sm">
                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        {card.sort}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white text-sm font-medium">{card.title}</p>
                        <p className="text-gray-500 text-xs">{card.subtitle}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">{card.icon}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{card.href}</TableCell>
                    <TableCell>
                      <div className={cn("w-6 h-6 rounded bg-gradient-to-br", card.gradient)} />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(card)}
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium transition-colors",
                          card.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        )}
                      >
                        {card.status === "active" ? "显示" : "隐藏"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(card)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(card)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                  <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <LayoutGrid className="h-5 w-5 text-gray-400" />
                    </div>
                    暂无卡片数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? "编辑卡片" : "新增卡片"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">标题 *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="如：自学考试"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">副标题 *</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="如：自助者天助之"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">图标</Label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon} className="bg-[#1a1d27]">{icon}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">跳转链接</Label>
                <Input
                  value={formData.href}
                  onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                  placeholder="如：/courses"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">渐变颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {gradientOptions.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gradient: g.value })}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      formData.gradient === g.value
                        ? "border-white/30 bg-white/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded bg-gradient-to-br", g.value)} />
                    <span className="text-xs text-gray-300">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 背景图片上传 */}
            <div className="space-y-2">
              <Label className="text-gray-300">卡片背景图（可选）</Label>
              <p className="text-xs text-gray-500">上传图片后将覆盖渐变色背景</p>
              <ImageField
                value={formData.backgroundImage}
                onChange={(url) => setFormData({ ...formData, backgroundImage: url })}
                placeholder="点击上传卡片背景图"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">排序</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.status === "active"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
              />
              <Label className="text-gray-300">显示卡片</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-400">
                取消
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            确定要删除卡片 <span className="text-white font-medium">&quot;{deletingCard?.title}&quot;</span> 吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="text-gray-400">
              取消
            </Button>
            <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
