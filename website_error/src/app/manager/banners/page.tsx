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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Settings2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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

interface BannerSettingsData {
  bannerTitle: string;
  bannerSubtitle: string;
  bannerBtnText: string;
  bannerBtnLink: string;
  bannerBgImage: string;
  bannerTextAlign: string;
  bannerTextVerticalAlign: string;
  bannerOverlayColor: string;
  bannerOverlayOpacity: string;
  bannerShowContent: boolean;
  bannerShowTitle: boolean;
  bannerShowSubtitle: boolean;
  bannerShowExtraBtn: boolean;
  bannerExtraBtnText: string;
  bannerExtraBtnLink: string;
}

const defaultSettings: BannerSettingsData = {
  bannerTitle: "弘道教育",
  bannerSubtitle: "专注专升本教育，助力学历提升",
  bannerBtnText: "立即咨询",
  bannerBtnLink: "/apply",
  bannerBgImage: "",
  bannerTextAlign: "center",
  bannerTextVerticalAlign: "middle",
  bannerOverlayColor: "#000000",
  bannerOverlayOpacity: "40",
  bannerShowContent: true,
  bannerShowTitle: true,
  bannerShowSubtitle: true,
  bannerShowExtraBtn: false,
  bannerExtraBtnText: "了解更多",
  bannerExtraBtnLink: "/courses",
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Banner显示设置
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<BannerSettingsData>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

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

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await managerFetch("/api/banners/settings");
      const result = await response.json();
      if (result.code === 200) {
        setSettings({ ...defaultSettings, ...result.data });
      }
    } catch (err) {
      console.error("Failed to fetch banner settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    fetchSettings();
  }, [fetchBanners, fetchSettings]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const response = await managerFetch("/api/banners/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        alert("设置已保存");
      } else {
        alert("保存失败");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      alert("保存失败");
    } finally {
      setSettingsSaving(false);
    }
  };

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

      {/* Banner显示设置面板 */}
      <div className="mb-6 bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">Banner显示设置</span>
            <span className="text-xs text-gray-500">控制文字、按钮、遮罩等元素的显示</span>
          </div>
          {settingsOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {settingsOpen && (
          <div className="px-5 pb-5 border-t border-white/[0.06]">
            {settingsLoading ? (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : (
              <div className="space-y-5 mt-4">
                {/* 基础文案 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">文案内容</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">主标题</Label>
                      <Input
                        value={settings.bannerTitle}
                        onChange={(e) => setSettings({ ...settings, bannerTitle: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">副标题</Label>
                      <Input
                        value={settings.bannerSubtitle}
                        onChange={(e) => setSettings({ ...settings, bannerSubtitle: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">主按钮文字</Label>
                      <Input
                        value={settings.bannerBtnText}
                        onChange={(e) => setSettings({ ...settings, bannerBtnText: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">主按钮链接</Label>
                      <Input
                        value={settings.bannerBtnLink}
                        onChange={(e) => setSettings({ ...settings, bannerBtnLink: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 元素显隐控制 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">元素显隐控制</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.bannerShowContent}
                        onCheckedChange={(checked) => setSettings({ ...settings, bannerShowContent: checked })}
                      />
                      <Label className="text-gray-400 text-sm">显示内容层</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.bannerShowTitle}
                        onCheckedChange={(checked) => setSettings({ ...settings, bannerShowTitle: checked })}
                      />
                      <Label className="text-gray-400 text-sm">显示主标题</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.bannerShowSubtitle}
                        onCheckedChange={(checked) => setSettings({ ...settings, bannerShowSubtitle: checked })}
                      />
                      <Label className="text-gray-400 text-sm">显示副标题</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.bannerShowExtraBtn}
                        onCheckedChange={(checked) => setSettings({ ...settings, bannerShowExtraBtn: checked })}
                      />
                      <Label className="text-gray-400 text-sm">显示附加按钮</Label>
                    </div>
                  </div>
                </div>

                {/* 附加按钮 */}
                {settings.bannerShowExtraBtn && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-3">附加按钮</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs">按钮文字</Label>
                        <Input
                          value={settings.bannerExtraBtnText}
                          onChange={(e) => setSettings({ ...settings, bannerExtraBtnText: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs">按钮链接</Label>
                        <Input
                          value={settings.bannerExtraBtnLink}
                          onChange={(e) => setSettings({ ...settings, bannerExtraBtnLink: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 遮罩设置 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">遮罩层设置</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">遮罩颜色</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.bannerOverlayColor}
                          onChange={(e) => setSettings({ ...settings, bannerOverlayColor: e.target.value })}
                          className="w-10 h-10 rounded border border-white/[0.08] cursor-pointer"
                        />
                        <Input
                          value={settings.bannerOverlayColor}
                          onChange={(e) => setSettings({ ...settings, bannerOverlayColor: e.target.value })}
                          className="flex-1 bg-white/[0.04] border-white/[0.08] text-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">遮罩透明度 (0-100)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.bannerOverlayOpacity}
                        onChange={(e) => setSettings({ ...settings, bannerOverlayOpacity: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">文字对齐</Label>
                      <select
                        value={settings.bannerTextAlign}
                        onChange={(e) => setSettings({ ...settings, bannerTextAlign: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-white text-sm"
                      >
                        <option value="left" className="bg-[#1a1d27]">居左</option>
                        <option value="center" className="bg-[#1a1d27]">居中</option>
                        <option value="right" className="bg-[#1a1d27]">居右</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 备用背景图 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">备用背景图</h3>
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">无轮播图时显示的背景图</Label>
                    <ImageField
                      value={settings.bannerBgImage}
                      onChange={(url) => setSettings({ ...settings, bannerBgImage: url })}
                      placeholder="点击选择备用背景图"
                    />
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveSettings}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      "保存设置"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
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
