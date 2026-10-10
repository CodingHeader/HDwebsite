"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { SERVICE_GUIDE_ICONS, resolveServiceGuideIcon } from "@/lib/service-guide-icons";

interface ServiceGuide {
  id: number;
  slug: string | null;
  title: string;
  subtitle: string | null;
  content: string | null;
  icon: string;
  link: string;
  sort: number;
  status: string;
}

const EMPTY_FORM = {
  slug: "",
  title: "",
  subtitle: "",
  content: "",
  icon: "FileText",
  link: "",
  sort: "0",
  status: "active",
};

export default function ServiceGuidesPage() {
  const [items, setItems] = useState<ServiceGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceGuide | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchItems = useCallback(async () => {
    try {
      const res = await managerFetch("/api/service-guides");
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/service-guides/${editingItem.id}` : "/api/service-guides";
    const method = editingItem ? "PUT" : "POST";
    try {
      const payload = {
        slug: formData.slug || null,
        title: formData.title,
        subtitle: formData.subtitle || null,
        content: formData.content || null,
        icon: formData.icon,
        link: formData.link,
        sort: parseInt(formData.sort) || 0,
        status: formData.status,
      };
      const res = await managerFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setIsDialogOpen(false); setEditingItem(null); setFormData(EMPTY_FORM); fetchItems(); }
      else alert("保存失败");
    } catch { alert("保存失败"); }
  };

  const handleEdit = (item: ServiceGuide) => {
    setEditingItem(item);
    setFormData({
      slug: item.slug || "",
      title: item.title,
      subtitle: item.subtitle || "",
      content: item.content || "",
      icon: item.icon,
      link: item.link,
      sort: item.sort.toString(),
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    try {
      const res = await managerFetch(`/api/service-guides/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems(); else alert("删除失败");
    } catch { alert("删除失败"); }
  };

  const getIcon = (iconName: string) => {
    const Icon = resolveServiceGuideIcon(iconName);
    return <Icon className="h-5 w-5" />;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">服务指南管理</h1><p className="text-gray-400 mt-1">配置首页6宫格入口（报考条件、报名费用等）</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditingItem(null); setFormData(EMPTY_FORM); }}>
              <Plus className="h-4 w-4 mr-2" />添加指南
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? "编辑服务指南" : "添加服务指南"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">标题 *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="如：报名流程" required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
                <div className="space-y-2"><Label className="text-gray-300">URL 别名 slug</Label><Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="process（对应 /services/process）" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              </div>
              <div className="space-y-2"><Label className="text-gray-300">副标题（独立页开头摘要）</Label><Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="如：从咨询到入学的5个关键节点" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="space-y-2"><Label className="text-gray-300">正文（支持 HTML）</Label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder={'<h2>报名流程</h2><p>...</p>'} rows={10} className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500/30" /><p className="text-xs text-gray-500">填写后前台 /services/{'{slug}'} 即可访问独立页</p></div>
              <div className="space-y-2"><Label className="text-gray-300">链接 *</Label><Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="/services/process 或 /apply?source=guide" required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="space-y-2"><Label className="text-gray-300">图标</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_GUIDE_ICONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = formData.icon === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setFormData({ ...formData, icon: opt.value })} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${selected ? "bg-blue-500/10 border-blue-500 text-blue-400" : "border-white/[0.08] hover:bg-white/[0.04] text-gray-300"}`}>
                        <Icon className="h-5 w-5" /><span className="text-sm">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">排序</Label><Input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
                <div className="space-y-2"><Label className="text-gray-300">状态</Label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
                    <option value="active" className="bg-[#161922]">显示</option><option value="inactive" className="bg-[#161922]">隐藏</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">取消</Button><Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">保存</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {items.filter(i => i.status === "active").sort((a, b) => a.sort - b.sort).slice(0, 6).map((item) => (
          <div key={item.id} className="bg-[#161922] border border-white/[0.06] rounded-lg p-4 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2">{getIcon(item.icon)}</div>
            <span className="text-sm text-gray-300 text-center">{item.title}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>图标</TableHead><TableHead>标题</TableHead><TableHead>链接</TableHead><TableHead>排序</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell><div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">{getIcon(item.icon)}</div></TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-blue-400">{item.link}</TableCell>
                <TableCell>{item.sort}</TableCell>
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
