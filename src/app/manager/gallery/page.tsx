"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Award } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { ImageField } from "@/components/manager/ImageField";

interface GalleryItem { id: number; title: string; image: string; category: string; sort: number; status: string; imageMissing?: boolean; }

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [formData, setFormData] = useState({ title: "", image: "", category: "certificate", sort: "0", status: "active" });

  const fetchItems = useCallback(async () => {
    try {
      const res = await managerFetch("/api/gallery");
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/gallery/${editingItem.id}` : "/api/gallery";
    const method = editingItem ? "PUT" : "POST";
    try {
      const res = await managerFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, sort: parseInt(formData.sort) }) });
      if (res.ok) { setIsDialogOpen(false); setEditingItem(null); setFormData({ title: "", image: "", category: "certificate", sort: "0", status: "active" }); fetchItems(); }
      else alert("保存失败");
    } catch { alert("保存失败"); }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, image: item.image, category: item.category, sort: item.sort.toString(), status: item.status });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    try {
      const res = await managerFetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems(); else alert("删除失败");
    } catch { alert("删除失败"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">证书风采管理</h1><p className="text-gray-400 mt-1">管理证书、活动照片展示</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditingItem(null); setFormData({ title: "", image: "", category: "certificate", sort: "0", status: "active" }); }}>
              <Plus className="h-4 w-4 mr-2" />添加图片
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
            <DialogHeader><DialogTitle>{editingItem ? "编辑图片" : "添加图片"}</DialogTitle><DialogDescription>填写证书或活动图片信息</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-gray-300">标题 *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="space-y-2"><Label className="text-gray-300">图片 *</Label><ImageField value={formData.image} onChange={(url) => setFormData({ ...formData, image: url })} placeholder="点击选择证书图片（建议 4:3 比例，如 800×600）" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">分类</Label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
                    <option value="certificate" className="bg-[#161922]">证书风采</option><option value="exam" className="bg-[#161922]">考试现场</option><option value="campus" className="bg-[#161922]">校区环境</option>
                  </select>
                </div>
                <div className="space-y-2"><Label className="text-gray-300">排序</Label><Input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              </div>
              <div className="space-y-2"><Label className="text-gray-300">状态</Label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
                  <option value="active" className="bg-[#161922]">显示</option><option value="inactive" className="bg-[#161922]">隐藏</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">取消</Button><Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">保存</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {items.filter(i => i.status === "active").sort((a, b) => a.sort - b.sort).slice(0, 6).map((item) => (
          <div key={item.id} className="bg-[#161922] border border-white/[0.06] rounded-lg overflow-hidden"><div className="aspect-[4/3]">{item.imageMissing ? <div className="flex h-full w-full items-center justify-center bg-amber-500/10 px-2 text-center text-xs text-amber-300">图片文件缺失</div> : <img src={item.image} alt={item.title} className="w-full h-full object-cover" />}</div><div className="p-2"><p className="text-xs text-center text-gray-300 line-clamp-1">{item.title}</p>{item.imageMissing ? <p className="mt-1 text-center text-[10px] text-amber-300">当前配置已失效，请重新选择图片</p> : null}</div></div>
        ))}
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>图片</TableHead><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell><div className="w-16 h-12 rounded overflow-hidden bg-white/[0.06]">{item.imageMissing ? <div className="flex h-full w-full items-center justify-center px-1 text-[10px] text-amber-300">文件缺失</div> : <img src={item.image} alt={item.title} className="w-full h-full object-cover" />}</div></TableCell>
                <TableCell className="font-medium">{item.title}{item.imageMissing ? <div className="mt-1 text-xs text-amber-300">图片路径存在，但文件已丢失</div> : null}</TableCell>
                <TableCell><span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">{item.category === "certificate" ? "证书" : item.category === "exam" ? "考试" : "校区"}</span></TableCell>
                <TableCell><span className={`px-2 py-1 text-xs rounded-full ${item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{item.status === "active" ? "显示" : "隐藏"}</span></TableCell>
                <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
