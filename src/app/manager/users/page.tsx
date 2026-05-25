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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Users, UserCheck, UserX, Plus, Pencil, Trash2, KeyRound, Loader2,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface RoleItem {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
  role: { id: number; name: string };
}

const initialFormData = {
  username: "",
  nickname: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await managerFetch("/api/users");
      const result = await response.json();
      if (result.code === 200) setUsers(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await managerFetch("/api/roles");
      const result = await response.json();
      if (result.code === 200) setRoles(result.data.items || result.data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.nickname && u.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Open create dialog
  const handleCreate = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      nickname: user.nickname || "",
      email: user.email || "",
      password: "",
      roleId: user.role?.id?.toString() || "",
      isActive: user.isActive,
    });
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (user: UserItem) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Open reset password dialog
  const handleResetPasswordClick = (user: UserItem) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  // Submit form (create or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        username: formData.username,
        nickname: formData.nickname || null,
        email: formData.email || null,
        roleId: formData.roleId ? parseInt(formData.roleId) : 1,
        isActive: formData.isActive,
      };

      if (!editingUser && formData.password) {
        body.password = formData.password;
      }

      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchUsers();
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

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      const response = await managerFetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.message || "删除失败");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("删除失败");
    }
  };

  // Confirm reset password
  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    try {
      const response = await managerFetch(`/api/users/${resetPasswordUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (response.ok) {
        setIsResetPasswordDialogOpen(false);
        alert("密码重置成功");
      } else {
        const err = await response.json();
        alert(err.message || "重置密码失败");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      alert("重置密码失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">用户管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理系统用户账号和权限</p>
        </div>
        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新增用户
        </Button>
      </div>

      {/* Search */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索用户..."
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
                <TableHead className="text-gray-400">用户</TableHead>
                <TableHead className="text-gray-400">角色</TableHead>
                <TableHead className="text-gray-400">邮箱</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">创建时间</TableHead>
                <TableHead className="text-gray-400 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{user.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{user.nickname || user.username}</p>
                          <p className="text-gray-500 text-xs">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                        {user.role?.name || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">{user.email || "-"}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit",
                        user.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.isActive ? "活跃" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{user.createdAt?.split("T")[0]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPasswordClick(user)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          title="重置密码"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
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
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    暂无用户数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "编辑用户" : "新增用户"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">用户名 *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="输入用户名"
                className="bg-white/[0.04] border-white/[0.08] text-white"
                required
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">昵称</Label>
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="输入昵称"
                className="bg-white/[0.04] border-white/[0.08] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">邮箱</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="输入邮箱"
                className="bg-white/[0.04] border-white/[0.08] text-white"
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-gray-300">密码 *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="输入密码"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                  required={!editingUser}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-gray-300">角色</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/[0.08]">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()} className="text-white">
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label className="text-gray-300">启用账号</Label>
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
            确定要删除用户 <span className="text-white font-medium">&quot;{deletingUser?.nickname || deletingUser?.username}&quot;</span> 吗？此操作不可恢复。
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

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-gray-300 text-sm">
              为用户 <span className="text-white font-medium">{resetPasswordUser?.nickname || resetPasswordUser?.username}</span> 设置新密码：
            </p>
            <div className="space-y-2">
              <Label className="text-gray-300">新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码"
                className="bg-white/[0.04] border-white/[0.08] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetPasswordDialogOpen(false)} className="text-gray-400">
              取消
            </Button>
            <Button onClick={handleConfirmResetPassword} className="bg-amber-600 hover:bg-amber-700 text-white">
              重置密码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
