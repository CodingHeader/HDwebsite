"use client";

/**
 * Settings Page - 网站设置（SchemaForm驱动）
 *
 * 升级说明：
 * - 改造前：硬编码表单字段，20+字段手动渲染
 * - 改造后：基于settings-registry动态渲染，新增字段自动显示
 *
 * 执行逻辑6步：
 * 1. 触发：管理员访问 /manager/settings
 * 2. 路由：加载SchemaForm组件
 * 3. 处理：GET /api/settings 获取当前值 + registry元数据
 * 4. 请求：SchemaForm按字段类型渲染对应组件
 * 5. 数据库：POST /api/settings 批量保存
 * 6. 响应：成功提示 + 刷新前台
 */

import { useState, useEffect, useCallback } from "react";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm } from "@/components/manager/runtime/SchemaForm";
import {
  getGroups,
  getRegistry,
  getDefaultValues,
  validateSettings,
  type SettingGroup,
  type SettingDefinition,
} from "@/lib/settings-registry";

export default function SettingsPage() {
  // 注册表元数据（静态，服务端/客户端同构）
  const groups: SettingGroup[] = getGroups();
  const fields: SettingDefinition[] = getRegistry();
  const defaults = getDefaultValues();

  // 状态
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 加载当前设置值
  const fetchSettings = useCallback(async () => {
    try {
      const response = await managerFetch("/api/settings");
      const result = await response.json();
      if (result.code === 200) {
        // 合并数据库值和默认值：保证能看到数据库中"故意清空"的字段
        // undefined/null → 保留默认值；空字符串 → 如实回显（用户清空过）
        setValues((prev) => {
          const merged = { ...prev };
          for (const field of fields) {
            const incoming = result.data?.[field.key];
            if (incoming === undefined || incoming === null) {
              continue;
            }
            merged[field.key] = incoming;
          }
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 字段变更
  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // 清除该字段的错误
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // 提交保存
  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setMessage("");
    setErrors({});

    // 校验
    const validation = validateSettings(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setMessage("请修正表单中的错误");
      setSaving(false);
      return;
    }

    try {
      const response = await managerFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        setMessage("设置保存成功");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const result = await response.json();
        setMessage(result.message || "保存失败");
      }
    } catch (err) {
      console.error("Save error:", err);
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  }, [values]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">网站设置</h1>
          <p className="text-gray-400 mt-1">管理网站基本信息、品牌内容、SEO等</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-red-600 hover:bg-red-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes("成功")
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message}
        </div>
      )}

      {/* SchemaForm动态表单 */}
      <div className="bg-[#161922] rounded-xl border border-white/[0.06] p-6">
        <SchemaForm
          groups={groups}
          fields={fields}
          values={values}
          onChange={handleFieldChange}
          errors={errors}
          isSubmitting={saving}
        />
      </div>

      {/* 配置说明 */}
      <div className="bg-[#161922]/50 rounded-lg p-4 border border-white/[0.06]">
        <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          配置说明
        </h3>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>站点信息：控制前台Logo、Favicon、品牌名称、学校名称显示</li>
          <li>顶部横幅：首页顶部红色横幅的文案和电话</li>
          <li>轮播图设置：首页Banner背景图、标题、按钮、遮罩层配置</li>
          <li>统计横幅：首页数据展示（办学年限、毕业人数等）</li>
          <li>公司简介：首页“关于我们”区域的内容</li>
          <li>联系方式：页脚和联系页面的信息显示</li>
          <li>SEO设置：搜索引擎优化相关配置</li>
        </ul>
      </div>
    </div>
  );
}
