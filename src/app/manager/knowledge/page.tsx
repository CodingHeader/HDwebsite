"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  tags: string;
  source: "local" | "notion" | "feishu" | "web";
  externalId: string | null;
  externalUrl: string | null;
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const defaultForm = {
  title: "",
  content: "",
  tags: "",
  source: "local" as "local" | "notion" | "feishu" | "web",
  externalId: "",
  externalUrl: "",
  priority: 50,
  status: "active" as "active" | "inactive",
};

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchItems = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/knowledge?search=${encodeURIComponent(q)}` : "/api/knowledge";
      const res = await managerFetch(url);
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setEditingItem(null);
    setForm(defaultForm);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      tags: item.tags || "",
      source: item.source,
      externalId: item.externalId || "",
      externalUrl: item.externalUrl || "",
      priority: item.priority,
      status: item.status as "active" | "inactive",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      content: form.content,
      tags: form.tags,
      source: form.source,
      externalId: form.externalId || null,
      externalUrl: form.externalUrl || null,
      priority: form.priority,
      status: form.status,
    };
    const url = editingItem ? `/api/knowledge/${editingItem.id}` : "/api/knowledge";
    const method = editingItem ? "PUT" : "POST";
    try {
      const res = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchItems(search);
      } else {
        const j = await res.json().catch(() => null);
        alert(j?.message || "保存失败");
      }
    } catch {
      alert("保存失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该知识条目？")) return;
    try {
      const res = await managerFetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems(search);
      else alert("删除失败");
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-400" /> AI 知识库
          </h1>
          <p className="text-gray-400 mt-1">供 AI 客服检索的知识片段，支持本地录入或外部同步（Notion/飞书/网页）</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />新增知识
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "编辑知识" : "新增知识"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">标题 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：自考报名条件"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">正文 *</Label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="知识点完整内容（markdown 纯文本）"
                  required
                  rows={6}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">标签（逗号分隔）</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="zikao,enrollment,fee"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">来源</Label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="local" className="bg-[#161922]">本地</option>
                    <option value="notion" className="bg-[#161922]">Notion</option>
                    <option value="feishu" className="bg-[#161922]">飞书</option>
                    <option value="web" className="bg-[#161922]">网页</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">外部原文链接</Label>
                  <Input
                    value={form.externalUrl}
                    onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                    placeholder="可选"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">外部ID</Label>
                  <Input
                    value={form.externalId}
                    onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                    placeholder="Notion pageId 等"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">优先级</Label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">状态</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="active" className="bg-[#161922]">启用</option>
                    <option value="inactive" className="bg-[#161922]">停用</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="border-white/[0.15] text-gray-300 hover:bg-white/[0.04]">取消</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchItems(search);
          }}
          placeholder="搜索标题/内容/标签…"
          className="max-w-md bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
        />
        <Button onClick={() => fetchItems(search)} variant="outline" className="border-white/[0.15] text-gray-300 hover:bg-white/[0.04]">搜索</Button>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-gray-400">标题</TableHead>
              <TableHead className="text-gray-400">标签</TableHead>
              <TableHead className="text-gray-400">来源</TableHead>
              <TableHead className="text-gray-400">优先级</TableHead>
              <TableHead className="text-gray-400">状态</TableHead>
              <TableHead className="text-gray-400 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">加载中…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">暂无知识条目</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-gray-200 font-medium max-w-sm truncate">{item.title}</TableCell>
                <TableCell className="text-gray-400 text-xs">{item.tags || "-"}</TableCell>
                <TableCell className="text-gray-400 text-xs uppercase">{item.source}</TableCell>
                <TableCell className="text-gray-400">{item.priority}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs ${item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                    {item.status === "active" ? "启用" : "停用"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-gray-400 hover:text-white hover:bg-white/[0.04]">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
