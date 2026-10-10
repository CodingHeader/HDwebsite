"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Shield, ShieldCheck, ShieldAlert, Plus, Pencil, Trash2 } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface RoleItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string;
  isSuper: boolean;
  status: string;
  userCount: number;
  createdAt: string;
}

const initialFormData = {
  name: "",
  slug: "",
  description: "",
  permissions: "[]",
  status: "active" as string,
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await managerFetch("/api/roles");
      const result = await response.json();
      if (result.code === 200) setRoles(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingRole(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (role: RoleItem) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || "",
      permissions: role.permissions,
      status: role.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingRole
      ? `/api/roles/${editingRole.id}`
      : "/api/roles";
    const method = editingRole ? "PUT" : "POST";

    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingRole(null);
        setFormData(initialFormData);
        fetchRoles();
      } else {
        const result = await response.json();
        alert(result.message || "保存失败");
      }
    } catch (err) {
      console.error("Save role error:", err);
      alert("保存失败");
    }
  };

  const handleDelete = async (role: RoleItem) => {
    if (role.isSuper) {
      alert("超级管理员角色不可删除");
      return;
    }
    if (role.userCount > 0) {
      alert(`该角色下有 ${role.userCount} 个用户，无法删除`);
      return;
    }
    if (!confirm(`确定要删除角色「${role.name}」吗？`)) return;

    try {
      const response = await managerFetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        fetchRoles();
      } else {
        alert(result.message || "删除失败");
      }
    } catch (err) {
      console.error("Delete role error:", err);
      alert("删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">角色管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理系统角色和权限配置</p>
        </div>
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4 mr-2" />
          新增角色
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? "编辑角色" : "新增角色"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">角色名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：内容编辑"
                required
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">角色标识 (Slug) *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="如：content-editor"
                required
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
              />
              <p className="text-xs text-gray-500">英文标识，用于权限匹配</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">描述</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="角色描述（选填）"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">权限配置 (JSON)</Label>
              <Input
                value={formData.permissions}
                onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                placeholder='如：["article:create","article:edit"]'
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600 font-mono text-sm"
              />
              <p className="text-xs text-gray-500">JSON数组格式，如 ["article:create","article:edit"] 或 ["*"]</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/[0.08]">
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
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

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索角色..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">角色名称</TableHead>
                <TableHead className="text-gray-400">Slug</TableHead>
                <TableHead className="text-gray-400">描述</TableHead>
                <TableHead className="text-gray-400">用户数</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <TableRow key={role.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-2 text-white">
                        {role.isSuper ? (
                          <ShieldAlert className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Shield className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="font-medium text-sm">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">{role.slug}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{role.description || "-"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {role.userCount} 用户
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        role.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                      )}>
                        {role.status === "active" ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                          title={role.isSuper ? "超级管理员不可编辑" : "编辑"}
                          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 h-8 w-8 disabled:opacity-40"
                          disabled={role.isSuper}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          title={role.isSuper ? "超级管理员不可删除" : role.userCount > 0 ? "该角色下有用户，无法删除" : "删除"}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 h-8 w-8 disabled:opacity-40"
                          disabled={role.isSuper || role.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="h-5 w-5 text-gray-400" />
                    </div>
                    暂无角色数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
