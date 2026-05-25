"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/manager/Pagination";
import { managerFetch } from "@/lib/manager-fetch";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

interface EnrollmentOffering {
  id: number;
  sourceBatch: string;
  educationType: string;
  level: string | null;
  majorCode: string | null;
  studyForm: string | null;
  yearTuition: number | null;
  totalTuition: number | null;
  feeDetail: string | null;
  extraFeeNote: string | null;
  hasPrice: boolean;
  status: string;
  sort: number;
  major: { id: number; name: string };
  partner: { id: number; name: string };
}

const PAGE_SIZE = 20;

const emptyForm = {
  majorName: "",
  partnerName: "",
  sourceBatch: "26春",
  educationType: "自考",
  level: "",
  majorCode: "",
  studyForm: "",
  yearTuition: "",
  totalTuition: "",
  feeDetail: "",
  extraFeeNote: "",
  status: "active",
  sort: "0",
};

type EnrollmentForm = typeof emptyForm;

export default function EnrollmentOfferingsPage() {
  const [items, setItems] = useState<EnrollmentOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [majorName, setMajorName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EnrollmentOffering | null>(null);
  const [formData, setFormData] = useState<EnrollmentForm>(emptyForm);

  const fetchItems = useCallback(async (nextPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) });
      if (schoolName.trim()) params.set("schoolName", schoolName.trim());
      if (majorName.trim()) params.set("majorName", majorName.trim());
      const response = await managerFetch(`/api/enrollment-offerings?${params}`);
      const result = await response.json();
      if (result.code === 200) {
        setItems(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [majorName, page, schoolName]);

  useEffect(() => {
    fetchItems(page);
  }, [fetchItems, page]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingItem(null);
  };

  const toPayload = () => ({
    majorName: formData.majorName.trim(),
    partnerName: formData.partnerName.trim(),
    sourceBatch: formData.sourceBatch.trim() || "26春",
    educationType: formData.educationType.trim() || "自考",
    level: formData.level.trim() || null,
    majorCode: formData.majorCode.trim() || null,
    studyForm: formData.studyForm.trim() || null,
    yearTuition: formData.yearTuition.trim() ? Number(formData.yearTuition) : null,
    totalTuition: formData.totalTuition.trim() ? Number(formData.totalTuition) : null,
    feeDetail: formData.feeDetail.trim() || null,
    extraFeeNote: formData.extraFeeNote.trim() || null,
    status: formData.status,
    sort: Number(formData.sort || 0),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const url = editingItem ? `/api/enrollment-offerings/${editingItem.id}` : "/api/enrollment-offerings";
    const method = editingItem ? "PUT" : "POST";
    const payload = toPayload();

    if (!payload.majorName || !payload.partnerName) {
      alert("专业名称和学校名称不能为空");
      return;
    }

    const response = await managerFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setIsDialogOpen(false);
      resetForm();
      fetchItems(page);
    } else {
      alert("保存失败");
    }
  };

  const handleEdit = (item: EnrollmentOffering) => {
    setEditingItem(item);
    setFormData({
      majorName: item.major.name,
      partnerName: item.partner.name,
      sourceBatch: item.sourceBatch,
      educationType: item.educationType,
      level: item.level || "",
      majorCode: item.majorCode || "",
      studyForm: item.studyForm || "",
      yearTuition: item.yearTuition?.toString() || "",
      totalTuition: item.totalTuition?.toString() || "",
      feeDetail: item.feeDetail || "",
      extraFeeNote: item.extraFeeNote || "",
      status: item.status,
      sort: item.sort.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该招生计划？")) return;
    const response = await managerFetch(`/api/enrollment-offerings/${id}`, { method: "DELETE" });
    if (response.ok) fetchItems(page);
    else alert("删除失败");
  };

  const handleSearch = () => {
    setPage(1);
    fetchItems(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">招生计划管理</h1>
          <p className="text-gray-400 mt-1">维护学校、专业、层次与总费用，课程页价格将自动联动</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />新增招生计划
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? "编辑招生计划" : "新增招生计划"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>专业名称 *</Label><Input value={formData.majorName} onChange={(event) => setFormData({ ...formData, majorName: event.target.value })} required /></div>
                <div className="space-y-2"><Label>学校名称 *</Label><Input value={formData.partnerName} onChange={(event) => setFormData({ ...formData, partnerName: event.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2"><Label>批次</Label><Input value={formData.sourceBatch} onChange={(event) => setFormData({ ...formData, sourceBatch: event.target.value })} /></div>
                <div className="space-y-2"><Label>招生类型</Label><Input value={formData.educationType} onChange={(event) => setFormData({ ...formData, educationType: event.target.value })} /></div>
                <div className="space-y-2"><Label>层次</Label><Input value={formData.level} onChange={(event) => setFormData({ ...formData, level: event.target.value })} /></div>
                <div className="space-y-2"><Label>专业代码</Label><Input value={formData.majorCode} onChange={(event) => setFormData({ ...formData, majorCode: event.target.value })} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2"><Label>学习形式</Label><Input value={formData.studyForm} onChange={(event) => setFormData({ ...formData, studyForm: event.target.value })} /></div>
                <div className="space-y-2"><Label>年学费</Label><Input type="number" value={formData.yearTuition} onChange={(event) => setFormData({ ...formData, yearTuition: event.target.value })} /></div>
                <div className="space-y-2"><Label>总费用</Label><Input type="number" value={formData.totalTuition} onChange={(event) => setFormData({ ...formData, totalTuition: event.target.value })} /></div>
                <div className="space-y-2"><Label>排序</Label><Input type="number" value={formData.sort} onChange={(event) => setFormData({ ...formData, sort: event.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>缴费说明</Label><Textarea value={formData.feeDetail} onChange={(event) => setFormData({ ...formData, feeDetail: event.target.value })} /></div>
              <div className="space-y-2"><Label>报考费/免考费等补充说明</Label><Textarea value={formData.extraFeeNote} onChange={(event) => setFormData({ ...formData, extraFeeNote: event.target.value })} /></div>
              <div className="space-y-2">
                <Label>状态</Label>
                <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm">
                  <option value="active" className="bg-[#161922]">启用</option>
                  <option value="inactive" className="bg-[#161922]">停用</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">取消</Button>
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="搜索学校" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className="pl-10" />
        </div>
        <Input placeholder="搜索专业" value={majorName} onChange={(event) => setMajorName(event.target.value)} className="max-w-sm" />
        <Button onClick={handleSearch}>筛选</Button>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学校</TableHead>
              <TableHead>专业</TableHead>
              <TableHead>类型/层次</TableHead>
              <TableHead>代码</TableHead>
              <TableHead>年学费</TableHead>
              <TableHead>总费用</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">加载中...</TableCell></TableRow>
            ) : items.length > 0 ? items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-white">{item.partner.name}</TableCell>
                <TableCell>{item.major.name}</TableCell>
                <TableCell>{item.educationType}{item.level ? ` / ${item.level}` : ""}</TableCell>
                <TableCell>{item.majorCode || "-"}</TableCell>
                <TableCell>{item.yearTuition === null ? "--" : `¥${item.yearTuition}`}</TableCell>
                <TableCell className="text-amber-400 font-medium">{item.totalTuition === null ? "--" : `¥${item.totalTuition}`}</TableCell>
                <TableCell>{item.status === "active" ? "启用" : "停用"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">暂无招生计划</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} label="条招生计划" onPageChange={setPage} />
    </div>
  );
}
