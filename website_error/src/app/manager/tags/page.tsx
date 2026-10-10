"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Tag } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

interface TagItem {
  id: number;
  name: string;
  slug: string;
  articleCount: number;
  createdAt: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const fetchTags = useCallback(async () => {
    try {
      const response = await managerFetch("/api/tags");
      const result = await response.json();
      if (result.code === 200) setTags(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTag ? `/api/tags/${editingTag.id}` : "/api/tags";
    const method = editingTag ? "PUT" : "POST";
    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) { setIsDialogOpen(false); setEditingTag(null); fetchTags(); }
    } catch (err) { console.error("Failed to save tag:", err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此标签吗？")) return;
    try {
      await managerFetch(`/api/tags/${id}`, { method: "DELETE" });
      fetchTags();
    } catch (err) { console.error("Failed to delete tag:", err); }
  };

  const openEdit = (tag: TagItem) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, slug: tag.slug });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTag(null);
    setFormData({ name: "", slug: "" });
    setIsDialogOpen(true);
  };

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">标签管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理文章标签，便于内容分类检索</p>
        </div>
        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> 新增标签
        </Button>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">标签名称</TableHead>
                <TableHead className="text-gray-400">Slug</TableHead>
                <TableHead className="text-gray-400">文章数</TableHead>
                <TableHead className="text-gray-400">创建时间</TableHead>
                <TableHead className="text-gray-400 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <TableRow key={tag.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[#EF4444]" />
                        {tag.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">{tag.slug}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {tag.articleCount || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{tag.createdAt?.split("T")[0]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tag)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(tag.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-12">
                    暂无标签数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "编辑标签" : "新增标签"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">标签名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
                className="bg-white/[0.04] border-white/[0.08] text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="输入slug"
                className="bg-white/[0.04] border-white/[0.08] text-white"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-400">取消</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">保存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
