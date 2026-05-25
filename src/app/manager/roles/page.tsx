"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
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

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">角色管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理系统角色和权限配置</p>
        </div>
      </div>

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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-12">
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
