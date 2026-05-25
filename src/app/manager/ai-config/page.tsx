"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bot, Plus, Pencil, Trash2, Power, PowerOff, Loader2, Eye, EyeOff,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface AIConfigItem {
  id: number;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string | null;
  userPrompt: string | null;
  greeting: string | null;
  isActive: boolean;
  temperature: number;
  maxTokens: number;
  rateLimit: number;
  dailyQuota: number;
  createdAt: string;
  updatedAt: string;
}

const defaultFormData = {
  name: "",
  apiEndpoint: "",
  apiKey: "",
  model: "gpt-3.5-turbo",
  systemPrompt: "",
  userPrompt: "",
  greeting: "",
  isActive: false,
  temperature: 0.7,
  maxTokens: 1000,
  rateLimit: 60,
  dailyQuota: 1000,
};

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfigItem | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await managerFetch("/api/ai-config");
      const result = await response.json();
      if (result.code === 200) setConfigs(result.data);
    } catch (err) {
      console.error("Failed to fetch AI configs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editingConfig ? `/api/ai-config/${editingConfig.id}` : "/api/ai-config";
    const method = editingConfig ? "PUT" : "POST";
    try {
      const response = await managerFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          temperature: parseFloat(String(formData.temperature)),
          maxTokens: parseInt(String(formData.maxTokens)),
          rateLimit: parseInt(String(formData.rateLimit)),
          dailyQuota: parseInt(String(formData.dailyQuota)),
        }),
      });
      if (response.ok) {
        setIsDialogOpen(false);
        setEditingConfig(null);
        fetchConfigs();
      }
    } catch (err) {
      console.error("Failed to save AI config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此AI配置吗？")) return;
    try {
      await managerFetch(`/api/ai-config/${id}`, { method: "DELETE" });
      fetchConfigs();
    } catch (err) {
      console.error("Failed to delete AI config:", err);
    }
  };

  const handleToggleActive = async (config: AIConfigItem) => {
    try {
      await managerFetch(`/api/ai-config/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !config.isActive }),
      });
      fetchConfigs();
    } catch (err) {
      console.error("Failed to toggle AI config:", err);
    }
  };

  const openEdit = (config: AIConfigItem) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt: config.systemPrompt || "",
      userPrompt: config.userPrompt || "",
      greeting: config.greeting || "",
      isActive: config.isActive,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      rateLimit: config.rateLimit,
      dailyQuota: config.dailyQuota,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingConfig(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "****";
    return key.slice(0, 4) + "****" + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI 配置管理</h1>
          <p className="text-gray-400 text-sm mt-1">
            管理 OpenAI 兼容协议配置，包括 API 端点、密钥、模型参数和提示词
          </p>
        </div>
        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> 新增配置
        </Button>
      </div>

      <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : configs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Bot className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-400">暂无 AI 配置，请点击「新增配置」添加</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-gray-400">配置名称</TableHead>
                <TableHead className="text-gray-400">API 端点</TableHead>
                <TableHead className="text-gray-400">模型</TableHead>
                <TableHead className="text-gray-400">API Key</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell>
                    <div className="flex items-center gap-2 text-white">
                      <Bot className="h-4 w-4 text-blue-400" />
                      <span className="font-medium text-sm">{config.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm max-w-[200px] truncate">
                    {config.apiEndpoint}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-white/[0.06] rounded text-xs text-gray-300">
                      {config.model}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm font-mono">
                    {maskKey(config.apiKey)}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit",
                      config.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                    )}>
                      {config.isActive ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                      {config.isActive ? "启用" : "禁用"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(config)}
                        className={cn(
                          config.isActive
                            ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        )}
                        title={config.isActive ? "禁用" : "启用"}
                      >
                        {config.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(config)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              {editingConfig ? "编辑 AI 配置" : "新增 AI 配置"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">配置名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：生产环境GPT-4"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">模型</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="gpt-3.5-turbo"
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">API 端点 (Base URL) *</Label>
              <Input
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="bg-white/[0.04] border-white/[0.08] text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">API Key *</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="bg-white/[0.04] border-white/[0.08] text-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">温度 (Temperature)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">最大 Tokens</Label>
                <Input
                  type="number"
                  min="1"
                  max="128000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">速率限制 (次/分钟)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">每日配额</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.dailyQuota}
                  onChange={(e) => setFormData({ ...formData, dailyQuota: parseInt(e.target.value) })}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">系统提示词 (System Prompt)</Label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="设定AI助手的角色和行为，如：你是一位专业的教育顾问..."
                rows={3}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#EF4444]/20 focus:border-[#EF4444]/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">用户提示词模板 (User Prompt Template)</Label>
              <textarea
                value={formData.userPrompt}
                onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
                placeholder="可选。用户消息的包装模板，使用 {message} 作为占位符"
                rows={2}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#EF4444]/20 focus:border-[#EF4444]/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">欢迎语 (Greeting)</Label>
              <Input
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder="您好！我是AI教育顾问，有什么可以帮您？"
                className="bg-white/[0.04] border-white/[0.08] text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-white/[0.08] bg-white/[0.04]"
                />
                <span className="text-sm text-gray-300">立即启用此配置</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-400">
                取消
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存配置
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
