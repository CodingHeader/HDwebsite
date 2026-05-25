"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Flame } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { ImageField } from "@/components/manager/ImageField";
import { cn } from "@/lib/utils";

interface HotMajor {
  id: number;
  title: string;
  subtitle: string;
  description: string | null;
  duration: string;
  iconType: string;
  iconImage: string | null;
  iconColor: string;
  link: string;
  sort: number;
  status: string;
}

const gradientOptions = [
  { value: "from-blue-500 to-blue-600", label: "蓝色" },
  { value: "from-emerald-500 to-emerald-600", label: "绿色" },
  { value: "from-amber-500 to-amber-600", label: "橙色" },
  { value: "from-red-500 to-red-600", label: "红色" },
  { value: "from-purple-500 to-purple-600", label: "紫色" },
  { value: "from-cyan-500 to-cyan-600", label: "青色" },
  { value: "from-rose-500 to-rose-600", label: "玫红" },
  { value: "from-indigo-500 to-indigo-600", label: "靛蓝" },
];

export default function HotMajorsPage() {
  const [items, setItems] = useState<HotMajor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HotMajor | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "专升本",
    description: "",
    duration: "2年",
    iconType: "text",
    iconImage: "",
    iconColor: "from-blue-500 to-blue-600",
    link: "/apply",
    sort: "0",
    status: "active",
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await managerFetch("/api/hot-majors?all=1");
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "专升本",
      description: "",
      duration: "2年",
      iconType: "text",
      iconImage: "",
      iconColor: "from-blue-500 to-blue-600",
      link: "/apply",
      sort: "0",
      status: "active",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/hot-majors/${editingItem.id}` : "/api/hot-majors";
    const method = editingItem ? "PUT" : "POST";
    try {
      const res = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sort: parseInt(formData.sort),
        }),
      });
      if (res.ok) { setIsDialogOpen(false); setEditingItem(null); resetForm(); fetchItems(); }
      else alert("保存失败");
    } catch { alert("保存失败"); }
  };

  const handleEdit = (item: HotMajor) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      subtitle: item.subtitle,
      description: item.description || "",
      duration: item.duration,
      iconType: item.iconType,
      iconImage: item.iconImage || "",
      iconColor: item.iconColor,
      link: item.link,
      sort: item.sort.toString(),
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该热门专业？")) return;
    try {
      const res = await managerFetch(`/api/hot-majors/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems(); else alert("删除失败");
    } catch { alert("删除失败"); }
  };

  const filteredItems = items.filter(i =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">热门专业管理</h1><p className="text-gray-400 mt-1">管理首页热门专业区块的展示内容</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditingItem(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />添加专业
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? "编辑热门专业" : "添加热门专业"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">专业名称 *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="如：金融学" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
                <div className="space-y-2"><Label className="text-gray-300">分类标签</Label><Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="如：成人高考" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              </div>
              <div className="space-y-2"><Label className="text-gray-300">简介</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="培养目标简介..." className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">学制</Label><Input value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="如：2年" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
                <div className="space-y-2"><Label className="text-gray-300">排序</Label><Input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              </div>
              <div className="space-y-2"><Label className="text-gray-300">跳转链接</Label><Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="如：/apply 或 /courses/123" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>

              {/* 图标类型切换 */}
              <div className="space-y-2">
                <Label className="text-gray-300">图标模式</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, iconType: "text" })} className={cn("flex-1 py-2 rounded-lg border text-sm transition-all", formData.iconType === "text" ? "border-red-500/50 bg-red-500/10 text-white" : "border-white/[0.08] text-gray-400 hover:bg-white/[0.04]")}>文字图标（首字）</button>
                  <button type="button" onClick={() => setFormData({ ...formData, iconType: "image" })} className={cn("flex-1 py-2 rounded-lg border text-sm transition-all", formData.iconType === "image" ? "border-red-500/50 bg-red-500/10 text-white" : "border-white/[0.08] text-gray-400 hover:bg-white/[0.04]")}>自定义图片</button>
                </div>
              </div>

              {/* 文字图标配置 */}
              {formData.iconType === "text" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">背景颜色</Label>
                  <div className="flex gap-2 flex-wrap">
                    {gradientOptions.map((g) => (
                      <button key={g.value} type="button" onClick={() => setFormData({ ...formData, iconColor: g.value })} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs", formData.iconColor === g.value ? "border-white/30 bg-white/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]")}>
                        <div className={cn("w-4 h-4 rounded-full bg-gradient-to-br", g.value)} />
                        <span className="text-gray-300">{g.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-white/[0.04]">
                    <div className={cn("w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold", formData.iconColor)}>
                      {formData.title ? formData.title.charAt(0) : "专"}
                    </div>
                    <span className="text-xs text-gray-400">预览效果</span>
                  </div>
                </div>
              )}

              {/* 图片图标配置 */}
              {formData.iconType === "image" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">自定义图片</Label>
                  <ImageField value={formData.iconImage} onChange={(url) => setFormData({ ...formData, iconImage: url })} placeholder="点击上传专业图标图片" />
                  <p className="text-xs text-gray-500">建议上传 200x200 像素的正方形图片，将以圆形裁剪展示</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-300">状态</Label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
                  <option value="active" className="bg-[#161922]">显示</option>
                  <option value="inactive" className="bg-[#161922]">隐藏</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingItem(null); resetForm(); }} className="flex-1">取消</Button>
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="搜索专业..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" />
        </div>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {items.filter(i => i.status === "active").sort((a, b) => a.sort - b.sort).slice(0, 8).map((item) => (
          <div key={item.id} className="bg-[#161922] border border-white/[0.06] rounded-lg p-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/[0.06] mb-2 flex items-center justify-center">
              {item.iconType === "image" && item.iconImage ? (
                <img src={item.iconImage} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold", item.iconColor)}>
                  {item.title.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-sm font-medium line-clamp-1 text-white">{item.title}</p>
            <p className="text-xs text-gray-500">{item.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-gray-400">排序</TableHead>
              <TableHead className="text-gray-400">图标</TableHead>
              <TableHead className="text-gray-400">专业名称</TableHead>
              <TableHead className="text-gray-400">分类</TableHead>
              <TableHead className="text-gray-400">学制</TableHead>
              <TableHead className="text-gray-400">状态</TableHead>
              <TableHead className="text-gray-400 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.sort((a, b) => a.sort - b.sort).map((item) => (
                <TableRow key={item.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="text-gray-400">{item.sort}</TableCell>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center">
                      {item.iconType === "image" && item.iconImage ? (
                        <img src={item.iconImage} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold", item.iconColor)}>
                          {item.title.charAt(0)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white">{item.title}</TableCell>
                  <TableCell className="text-gray-400">{item.subtitle}</TableCell>
                  <TableCell className="text-gray-400">{item.duration}</TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 text-xs rounded-full", item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400")}>
                      {item.status === "active" ? "显示" : "隐藏"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  暂无热门专业数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
