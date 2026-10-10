"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { managerFetch } from "@/lib/manager-fetch";

interface Navigation {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  level: number;
  icon: string | null;
  link: string | null;
  linkType: string;
  target: string;
  sort: number;
  status: string;
  isVisible: boolean;
  children?: Navigation[];
}

interface NavigationFormData {
  name: string;
  slug: string;
  parentId: number | null;
  icon: string;
  link: string;
  linkType: string;
  target: string;
  sort: number;
  status: string;
  isVisible: boolean;
}

const initialFormData: NavigationFormData = {
  name: "",
  slug: "",
  parentId: null,
  icon: "",
  link: "",
  linkType: "internal",
  target: "_self",
  sort: 0,
  status: "active",
  isVisible: true,
};

export default function NavigationsPage() {
  const router = useRouter();
  const [navigations, setNavigations] = useState<Navigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Navigation | null>(null);
  const [deletingItem, setDeletingItem] = useState<Navigation | null>(null);
  const [formData, setFormData] = useState<NavigationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch navigations
  const fetchNavigations = useCallback(async () => {
    try {
      const response = await managerFetch("/api/navigations?tree=true");

      if (response.ok) {
        const result = await response.json();
        if (result.code === 200) {
          setNavigations(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch navigations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNavigations();
  }, [fetchNavigations]);

  // Filter tree by search query
  const filterTree = useCallback((items: Navigation[], query: string): Navigation[] => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.reduce<Navigation[]>((acc, item) => {
      const childMatches = item.children ? filterTree(item.children, query) : [];
      if (item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q) || childMatches.length > 0) {
        acc.push({ ...item, children: childMatches.length > 0 ? childMatches : item.children });
      }
      return acc;
    }, []);
  }, []);

  const filteredNavigations = filterTree(navigations, searchQuery);

  // Toggle expand
  const toggleExpand = (id: number) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (item: Navigation) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      parentId: item.parentId,
      icon: item.icon || "",
      link: item.link || "",
      linkType: item.linkType,
      target: item.target,
      sort: item.sort,
      status: item.status,
      isVisible: item.isVisible,
    });
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (item: Navigation) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingItem
        ? `/api/navigations/${editingItem.id}`
        : "/api/navigations";
      const method = editingItem ? "PUT" : "POST";

      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchNavigations();
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
      const response = await managerFetch(`/api/navigations/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchNavigations();
      } else {
        const error = await response.json();
        alert(error.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("删除失败");
    }
  };

  // Render tree item
  const renderTreeItem = (item: Navigation, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center gap-2 p-3 hover:bg-white/[0.02] border-b border-white/[0.04]",
            level > 0 && "pl-8"
          )}
        >
          {/* Expand button */}
          <button
            onClick={() => hasChildren && toggleExpand(item.id)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.06]",
              !hasChildren && "invisible"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Drag handle */}
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate text-white">{item.name}</span>
              {item.status === "inactive" && (
                <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-xs rounded">
                  禁用
                </span>
              )}
              {!item.isVisible && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded">
                  隐藏
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              /{item.slug} · {item.link || "无链接"}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
              className="text-blue-400 hover:text-blue-300"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(item)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {item.children?.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">导航管理</h1>
          <p className="text-gray-400 mt-1">管理网站前台导航菜单结构</p>
        </div>
        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          添加导航
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索导航..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchNavigations}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* Tree List */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-2 p-3 border-b border-white/[0.06] font-medium text-sm text-gray-400">
          <div className="w-6" />
          <div className="w-4" />
          <div className="flex-1">导航名称</div>
          <div className="w-32 text-center">操作</div>
        </div>
        <div>
          {filteredNavigations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery ? "未找到匹配的导航" : "暂无导航数据"}
            </div>
          ) : (
            filteredNavigations.map((item) => renderTreeItem(item))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "编辑导航" : "添加导航"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">导航名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="如：网站首页"
                  required
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
                  placeholder="如：home"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">父级导航</Label>
              <Select
                value={formData.parentId?.toString() || "null"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentId: value === "null" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue placeholder="无父级（一级导航）" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/[0.08]">
                  <SelectItem value="null">无父级（一级导航）</SelectItem>
                  {navigations.map((nav) => (
                    <SelectItem key={nav.id} value={nav.id.toString()}>
                      {nav.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">链接类型</Label>
                <Select
                  value={formData.linkType}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, linkType: value })
                  }
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-white/[0.08]">
                    <SelectItem value="internal">内部链接</SelectItem>
                    <SelectItem value="external">外部链接</SelectItem>
                    <SelectItem value="dropdown">下拉菜单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">打开方式</Label>
                <Select
                  value={formData.target}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, target: value })
                  }
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-white/[0.08]">
                    <SelectItem value="_self">当前窗口</SelectItem>
                    <SelectItem value="_blank">新窗口</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">链接地址</Label>
              <Input
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
                placeholder="如：/ 或 https://example.com"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">图标（Lucide图标名）</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="如：Home"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">排序</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) =>
                    setFormData({ ...formData, sort: parseInt(e.target.value) })
                  }
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      status: checked ? "active" : "inactive",
                    })
                  }
                />
                <Label className="text-gray-300">启用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isVisible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isVisible: checked })
                  }
                />
                <Label className="text-gray-300">可见</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-white/[0.08] text-gray-300 hover:bg-white/[0.04]"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "保存中..." : "保存"}
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
            确定要删除导航 &quot;{deletingItem?.name}&quot; 吗？此操作不可恢复。
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
