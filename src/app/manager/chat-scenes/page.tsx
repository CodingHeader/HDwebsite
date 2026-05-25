"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";

interface ChatScene {
  id: number;
  code: string;
  name: string;
  description: string | null;
  greeting: string;
  systemPrompt: string;
  knowledgeTags: string;
  starters: string | null;
  pageTitle: string | null;
  pageSubtitle: string | null;
  headerTip: string | null;
  sidebarTitle: string | null;
  processSteps: string | null;
  promiseList: string | null;
  contactCardTitle: string | null;
  useKnowledgeBase: boolean;
  status: string;
  sort: number;
}

const defaultForm = {
  code: "",
  name: "",
  description: "",
  greeting: "",
  systemPrompt: "",
  knowledgeTags: "",
  starters: "",
  pageTitle: "",
  pageSubtitle: "",
  headerTip: "",
  sidebarTitle: "",
  processSteps: "",
  promiseList: "",
  contactCardTitle: "",
  useKnowledgeBase: true,
  status: "active" as "active" | "inactive",
  sort: 10,
};

export default function ChatScenesPage() {
  const [items, setItems] = useState<ChatScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChatScene | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managerFetch("/api/chat-scenes");
      const result = await res.json();
      if (result.code === 200) setItems(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setEditingItem(null);
    setForm(defaultForm);
  };

  const handleEdit = (item: ChatScene) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      greeting: item.greeting,
      systemPrompt: item.systemPrompt,
      knowledgeTags: item.knowledgeTags || "",
      starters: item.starters || "",
      pageTitle: item.pageTitle || "",
      pageSubtitle: item.pageSubtitle || "",
      headerTip: item.headerTip || "",
      sidebarTitle: item.sidebarTitle || "",
      processSteps: item.processSteps || "",
      promiseList: item.promiseList || "",
      contactCardTitle: item.contactCardTitle || "",
      useKnowledgeBase: item.useKnowledgeBase ?? true,
      status: item.status as "active" | "inactive",
      sort: item.sort,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      greeting: form.greeting,
      systemPrompt: form.systemPrompt,
      knowledgeTags: form.knowledgeTags,
      starters: form.starters || null,
      pageTitle: form.pageTitle || null,
      pageSubtitle: form.pageSubtitle || null,
      headerTip: form.headerTip || null,
      sidebarTitle: form.sidebarTitle || null,
      processSteps: form.processSteps || null,
      promiseList: form.promiseList || null,
      contactCardTitle: form.contactCardTitle || null,
      useKnowledgeBase: form.useKnowledgeBase,
      status: form.status,
      sort: form.sort,
    };
    const url = editingItem ? `/api/chat-scenes/${editingItem.id}` : "/api/chat-scenes";
    const method = editingItem ? "PUT" : "POST";
    try {
      const res = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchItems();
      } else {
        const j = await res.json().catch(() => null);
        alert(j?.message || "保存失败");
      }
    } catch {
      alert("保存失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该场景？")) return;
    try {
      const res = await managerFetch(`/api/chat-scenes/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems();
      else alert("删除失败");
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-400" /> AI 对话场景
          </h1>
          <p className="text-gray-400 mt-1">
            不同入口 (apply / float / guide) 对应不同场景：欢迎语、系统提示词、检索的知识库标签各不同
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />新增场景
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "编辑场景" : "新增场景"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">场景 code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="apply / float / guide"
                    required
                    disabled={!!editingItem}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">中文名 *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：在线报名全面咨询"
                    required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">描述</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="说明该场景的使用语境"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">欢迎语 *</Label>
                <textarea
                  value={form.greeting}
                  onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                  placeholder="AI 第一句话"
                  required
                  rows={2}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">系统提示词 *</Label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="角色设定、话术策略，作为 system message 注入 AI"
                  required
                  rows={5}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">知识库标签（逗号分隔）</Label>
                  <Input
                    value={form.knowledgeTags}
                    onChange={(e) => setForm({ ...form, knowledgeTags: e.target.value })}
                    placeholder="zikao,chengkao,fee"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">推荐提问（JSON 数组）</Label>
                  <Input
                    value={form.starters}
                    onChange={(e) => setForm({ ...form, starters: e.target.value })}
                    placeholder='["自考多少钱","报名流程"]'
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <input
                  id="useKnowledgeBase"
                  type="checkbox"
                  checked={form.useKnowledgeBase}
                  onChange={(e) => setForm({ ...form, useKnowledgeBase: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="useKnowledgeBase" className="text-gray-300 text-sm cursor-pointer">
                  启用知识库检索（关闭可显著提升 AI 响应速度，但回答将仅依赖模型自身知识）
                </Label>
              </div>

              {/* 前台渲染差异化字段 */}
              <div className="mt-2 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-xs">前台渲染</span>
                  <span className="text-xs text-gray-500">控制 /apply?source={"{"}code{"}"} 页面的标题/副标题/流程步骤/承诺列表</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">页面大标题</Label>
                    <Input
                      value={form.pageTitle}
                      onChange={(e) => setForm({ ...form, pageTitle: e.target.value })}
                      placeholder="在线报名 / 在线客服 / 政策解答"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">顶部小提示</Label>
                    <Input
                      value={form.headerTip}
                      onChange={(e) => setForm({ ...form, headerTip: e.target.value })}
                      placeholder="AI 客服在线为您服务"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <Label className="text-gray-300">页面副标题</Label>
                  <Input
                    value={form.pageSubtitle}
                    onChange={(e) => setForm({ ...form, pageSubtitle: e.target.value })}
                    placeholder="AI 课程顾问为您定制学历提升方案"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">侧栏主标题</Label>
                    <Input
                      value={form.sidebarTitle}
                      onChange={(e) => setForm({ ...form, sidebarTitle: e.target.value })}
                      placeholder="报名流程 / 办理流程"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">联系卡标题</Label>
                    <Input
                      value={form.contactCardTitle}
                      onChange={(e) => setForm({ ...form, contactCardTitle: e.target.value })}
                      placeholder="联系我们 / 服务支持"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <Label className="text-gray-300">流程步骤（JSON 数组 [{"{title,desc}"}]）</Label>
                  <textarea
                    value={form.processSteps}
                    onChange={(e) => setForm({ ...form, processSteps: e.target.value })}
                    placeholder={'[{"title":"在线咨询","desc":"AI 快速评估您的情况"}, {"title":"顾问跟进","desc":"1 对 1 电话"}]'}
                    rows={3}
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div className="space-y-2 mt-3">
                  <Label className="text-gray-300">服务承诺（JSON 字符串数组）</Label>
                  <textarea
                    value={form.promiseList}
                    onChange={(e) => setForm({ ...form, promiseList: e.target.value })}
                    placeholder={'["24 小时内顾问响应","学费透明无隐形收费"]'}
                    rows={2}
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">排序</Label>
                  <Input
                    type="number"
                    value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: parseInt(e.target.value) || 0 })}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">状态</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                    className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="active" className="bg-[#161922]">启用</option>
                    <option value="inactive" className="bg-[#161922]">停用</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="border-white/[0.15] text-gray-300 hover:bg-white/[0.04]">取消</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-gray-400">Code</TableHead>
              <TableHead className="text-gray-400">名称</TableHead>
              <TableHead className="text-gray-400">知识库</TableHead>
              <TableHead className="text-gray-400">欢迎语片段</TableHead>
              <TableHead className="text-gray-400">状态</TableHead>
              <TableHead className="text-gray-400 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">加载中…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">暂无场景</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-indigo-300 font-mono text-xs">{item.code}</TableCell>
                <TableCell className="text-gray-200 font-medium">{item.name}</TableCell>
                <TableCell className="text-gray-400 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.useKnowledgeBase ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {item.useKnowledgeBase ? "启用" : "关闭"}
                  </span>
                  {item.knowledgeTags ? <span className="ml-1 text-gray-500">{item.knowledgeTags}</span> : null}
                </TableCell>
                <TableCell className="text-gray-400 text-xs max-w-xs truncate">{item.greeting}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs ${item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                    {item.status === "active" ? "启用" : "停用"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-gray-400 hover:text-white hover:bg-white/[0.04]">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
