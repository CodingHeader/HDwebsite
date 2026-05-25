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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { Pagination } from "@/components/manager/Pagination";

interface Course {
  id: number;
  title: string;
}

interface Student {
  id: number;
  name: string;
  phone: string;
  message: string | null;
  status: string;
  course: Course | null;
  createdAt: string;
}

const PAGE_SIZE = 15;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const fetchStudents = useCallback(async (p = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const response = await managerFetch(`/api/students?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setStudents(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(page, searchTerm);
  }, [fetchStudents, page, searchTerm]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await managerFetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchStudents();
      } else {
        alert("更新失败");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("更新失败");
    }
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
    setIsDialogOpen(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">学员管理</h1>
        <p className="text-gray-400 mt-1">管理学员报名信息</p>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索姓名或手机号..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>意向课程</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>报名时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.id}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>{student.course?.title || "未选择"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        student.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : student.status === "contacted"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {student.status === "pending"
                        ? "待处理"
                        : student.status === "contacted"
                        ? "已联系"
                        : "已转化"}
                    </span>
                  </TableCell>
                  <TableCell>{student.createdAt.split("T")[0]}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(student)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        查看
                      </Button>
                      {student.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(student.id, "contacted")}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {student.status === "contacted" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(student.id, "converted")}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  暂无学员数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="条报名"
        onPageChange={setPage}
      />

      {/* View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>学员详情</DialogTitle>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">姓名</Label>
                  <p className="font-medium text-white">{viewingStudent.name}</p>
                </div>
                <div>
                  <Label className="text-gray-400">手机号</Label>
                  <p className="font-medium text-white">{viewingStudent.phone}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-400">意向课程</Label>
                <p className="font-medium text-white">
                  {viewingStudent.course?.title || "未选择"}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">留言</Label>
                <p className="text-sm bg-white/[0.04] p-3 rounded-lg text-gray-300">
                  {viewingStudent.message || "无留言"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">状态</Label>
                  <p className="font-medium text-white">
                    {viewingStudent.status === "pending"
                      ? "待处理"
                      : viewingStudent.status === "contacted"
                      ? "已联系"
                      : "已转化"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">报名时间</Label>
                  <p className="font-medium text-white">
                    {viewingStudent.createdAt.split("T")[0]}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
