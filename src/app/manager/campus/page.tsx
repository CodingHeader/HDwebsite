"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, MapPin, ImageIcon, X } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { ImageField } from "@/components/manager/ImageField";

interface CampusImage { id: number; image: string; caption: string | null; sort: number; }
interface Campus { id: number; name: string; address: string | null; sort: number; status: string; images: CampusImage[]; }

export default function CampusPage() {
  const [items, setItems] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Campus | null>(null);
  const [managingCampus, setManagingCampus] = useState<Campus | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "", sort: "0", status: "active" });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [tempImages, setTempImages] = useState<{image: string; caption: string | null}[]>([]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await managerFetch("/api/campus");
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/campus/${editingItem.id}` : "/api/campus";
    const method = editingItem ? "PUT" : "POST";
    try {
      const res = await managerFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, sort: parseInt(formData.sort), images: tempImages }) });
      if (res.ok) { setIsDialogOpen(false); resetForm(); fetchItems(); }
      else alert("保存失败");
    } catch { alert("保存失败"); }
  };

  const handleEdit = (item: Campus) => {
    setEditingItem(item);
    setFormData({ name: item.name, address: item.address || "", sort: item.sort.toString(), status: item.status });
    setTempImages(item.images?.map(img => ({ image: img.image, caption: img.caption })) || []);
    setIsDialogOpen(true);
  };

  const handleAddTempImage = () => {
    if (!newImageUrl) return;
    setTempImages([...tempImages, { image: newImageUrl, caption: newCaption || null }]);
    setNewImageUrl("");
    setNewCaption("");
  };

  const handleRemoveTempImage = (index: number) => {
    setTempImages(tempImages.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ name: "", address: "", sort: "0", status: "active" });
    setTempImages([]);
    setNewImageUrl("");
    setNewCaption("");
    setEditingItem(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该校区？关联图片将一并删除。")) return;
    try {
      const res = await managerFetch(`/api/campus/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems(); else alert("删除失败");
    } catch { alert("删除失败"); }
  };

  // 图片管理
  const openImageManager = (campus: Campus) => {
    setManagingCampus(campus);
    setNewImageUrl("");
    setNewCaption("");
    setIsImageDialogOpen(true);
  };

  const handleAddImage = async () => {
    if (!managingCampus || !newImageUrl) return;
    setAddingImage(true);
    try {
      const res = await managerFetch(`/api/campus/${managingCampus.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: newImageUrl, caption: newCaption || null, sort: managingCampus.images.length }),
      });
      if (res.ok) {
        setNewImageUrl("");
        setNewCaption("");
        // 刷新校区列表以更新图片
        await fetchItems();
        // 更新 managingCampus
        const updated = await (await managerFetch(`/api/campus/${managingCampus.id}`)).json();
        if (updated.code === 200) setManagingCampus(updated.data);
      } else {
        alert("添加图片失败");
      }
    } catch { alert("添加图片失败"); }
    finally { setAddingImage(false); }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!managingCampus) return;
    if (!confirm("确定删除该图片？")) return;
    try {
      const res = await managerFetch(`/api/campus/${managingCampus.id}/images/${imageId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchItems();
        const updated = await (await managerFetch(`/api/campus/${managingCampus.id}`)).json();
        if (updated.code === 200) setManagingCampus(updated.data);
      } else {
        alert("删除图片失败");
      }
    } catch { alert("删除图片失败"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div>
      {/* 头部 + 添加校区弹窗 */}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">学院风采管理</h1><p className="text-gray-400 mt-1">管理学院风采分组及图片展示</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />添加校区
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
            <DialogHeader><DialogTitle>{editingItem ? "编辑校区" : "添加校区"}</DialogTitle><DialogDescription>设置校区名称、地址和显示状态</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-gray-300">校区名称 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="space-y-2"><Label className="text-gray-300">地址</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-gray-300">排序</Label><Input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600" /></div>
                <div className="space-y-2"><Label className="text-gray-300">状态</Label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
                    <option value="active" className="bg-[#161922]">显示</option><option value="inactive" className="bg-[#161922]">隐藏</option>
                  </select>
                </div>
              </div>

              {/* 图片上传区域 */}
              <div className="space-y-3 border-t border-white/[0.06] pt-4">
                <Label className="text-gray-300">校区图片 ({tempImages.length} 张)</Label>
                
                {/* 添加图片 */}
                <div className="space-y-2">
                  <ImageField value={newImageUrl} onChange={(url) => setNewImageUrl(url)} placeholder="选择图片" />
                  <div className="flex gap-2">
                    <Input 
                      value={newCaption} 
                      onChange={(e) => setNewCaption(e.target.value)} 
                      placeholder="图片说明（可选）" 
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600 text-sm flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddTempImage} 
                      disabled={!newImageUrl}
                      className="bg-red-600 hover:bg-red-700 h-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 已添加图片预览 */}
                {tempImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {tempImages.map((img, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.03] aspect-video">
                        <img src={img.image} alt={img.caption || ""} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveTempImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {img.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">取消</Button><Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">保存</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索 */}
      <div className="flex gap-4 mb-6"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="搜索校区..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></div>

      {/* 校区列表 */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>校区名称</TableHead><TableHead>地址</TableHead><TableHead>图片数</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-400" />{item.name}</div></TableCell>
                <TableCell>{item.address || "-"}</TableCell>
                <TableCell>{item.images?.length || 0} 张</TableCell>
                <TableCell><span className={`px-2 py-1 text-xs rounded-full ${item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{item.status === "active" ? "显示" : "隐藏"}</span></TableCell>
                <TableCell className="text-right"><div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openImageManager(item)} className="text-amber-400 hover:text-amber-300" title="管理图片"><ImageIcon className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 图片管理弹窗 */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>管理图片 - {managingCampus?.name}</DialogTitle><DialogDescription>添加、删除校区展示图片（建议 16:9 比例，如 1920×1080）</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            {/* 添加图片区 */}
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
              <h4 className="text-sm font-medium text-gray-300 mb-3">添加图片</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">选择图片 *</Label>
                  <ImageField value={newImageUrl} onChange={(url) => setNewImageUrl(url)} placeholder="点击选择校区图片（建议 16:9）" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">图片说明</Label>
                  <Input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="如：教学楼外观" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600 h-9 text-sm" />
                </div>
                <Button onClick={handleAddImage} disabled={!newImageUrl || addingImage} className="bg-red-600 hover:bg-red-700 h-9 text-sm">
                  <Plus className="h-4 w-4 mr-1" />{addingImage ? "添加中..." : "添加图片"}
                </Button>
              </div>
            </div>

            {/* 已有图片列表 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">已有图片（{managingCampus?.images?.length || 0} 张）</h4>
              {managingCampus && managingCampus.images && managingCampus.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {managingCampus.images.map((img) => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.03]">
                      <div className="aspect-video"><img src={img.image} alt={img.caption || "校区图片"} className="w-full h-full object-cover" /></div>
                      <div className="p-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 line-clamp-1 flex-1">{img.caption || "无说明"}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteImage(img.id)} className="h-6 w-6 text-red-400 hover:text-red-300 shrink-0"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">暂无图片，请点击上方添加</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
