/**
 * SchemaForm - 配置驱动动态表单组件
 *
 * 基于 settings-registry.ts 的元数据定义，自动渲染表单字段。
 * 支持：text/textarea/number/url/image/email/phone/boolean/json/color
 *
 * 执行逻辑6步：
 * 1. 触发：Settings页面加载 / 其他配置页面使用
 * 2. 路由：传入 registry 定义 + 当前值
 * 3. 处理：按字段类型渲染对应组件
 * 4. 请求：用户交互更新本地状态
 * 5. 数据库：父组件提交到API
 * 6. 响应：表单验证+保存反馈
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageField } from "@/components/manager/ImageField";
import { HomeCardsEditor } from "@/components/manager/HomeCardsEditor";
import { Globe, TrendingUp, Award, Building2, Phone, Search, Settings, AlertCircle, Image, LayoutGrid, PanelBottom } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingDefinition, SettingGroup } from "@/lib/settings-registry";

// ─── 图标映射 ──────────────────────────────────────────

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Globe: <Globe className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Image: <Image className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
  Phone: <Phone className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  LayoutGrid: <LayoutGrid className="h-5 w-5" />,
  PanelBottom: <PanelBottom className="h-5 w-5" />,
};

// ─── Props ─────────────────────────────────────────────

interface SchemaFormProps {
  groups: SettingGroup[];
  fields: SettingDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  className?: string;
}

// ─── 主组件 ────────────────────────────────────────────

export function SchemaForm({
  groups,
  fields,
  values,
  onChange,
  errors = {},
  onSubmit,
  isSubmitting = false,
  submitLabel = "保存设置",
  className,
}: SchemaFormProps) {
  const [activeTab, setActiveTab] = useState(groups[0]?.key || "");

  // 按分组组织字段
  const fieldsByGroup = useMemo(() => {
    const map: Record<string, SettingDefinition[]> = {};
    groups.forEach((g) => {
      map[g.key] = fields.filter((f) => f.group === g.key);
    });
    return map;
  }, [groups, fields]);

  // 字段变更处理器
  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      onChange(key, value);
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
          {groups.map((group) => (
            <TabsTrigger
              key={group.key}
              value={group.key}
              className="flex items-center gap-2"
            >
              {GROUP_ICONS[group.icon] || <Settings className="h-4 w-4" />}
              <span className="hidden sm:inline">{group.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => {
          const groupFields = fieldsByGroup[group.key] || [];
          return (
            <TabsContent key={group.key} value={group.key} className="space-y-6">
              {/* 分组头部 */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  {GROUP_ICONS[group.icon] || <Settings className="h-5 w-5 text-red-500" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                  <p className="text-sm text-gray-400">{group.description}</p>
                </div>
              </div>

              {/* 字段网格 - 单列布局确保对齐 */}
              <div className="flex flex-col gap-6">
                {groupFields.map((field) => (
                  <SchemaField
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? field.defaultValue}
                    onChange={(value) => handleFieldChange(field.key, value)}
                    error={errors[field.key]}
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 提交按钮 */}
      {onSubmit && (
        <div className="flex justify-end pt-4 border-t border-white/[0.06]">
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 min-w-[140px]"
          >
            {isSubmitting ? "保存中..." : submitLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── 单个字段组件 ──────────────────────────────────────

interface SchemaFieldProps {
  field: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

function SchemaField({ field, value, onChange, error, className }: SchemaFieldProps) {
  const [localValue, setLocalValue] = useState(value);

  // 当外部value变化时同步（初始化/加载后）
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-300">
          {field.label}
          {field.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
        {field.description && (
          <span className="text-xs text-gray-500">{field.description}</span>
        )}
      </div>

      <FieldInput
        field={field}
        value={localValue}
        onChange={handleChange}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── 字段输入组件 ──────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const commonProps = {
    placeholder: field.placeholder,
    className: cn(
      "w-full",
      field.type === "textarea" && "min-h-[120px]"
    ),
  };

  switch (field.type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return (
        <Input
          type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...commonProps}
        />
      );

    case "textarea":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          {...commonProps}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...commonProps}
        />
      );

    case "image":
      return (
        <ImageField
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || "点击选择图片"}
        />
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-400">{field.placeholder || "启用"}</span>
        </label>
      );

    case "color":
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 rounded border border-white/[0.12] bg-white/[0.04] cursor-pointer"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      );

    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-white/[0.15] bg-white/[0.04] text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 hover:border-white/[0.25] hover:bg-white/[0.06]"
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1d27] text-gray-200">
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "json":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder={field.placeholder || '{ "key": "value" }'}
          className="font-mono text-sm"
        />
      );

    case "home-cards":
      return (
        <HomeCardsEditor
          value={value}
          onChange={onChange}
        />
      );

    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...commonProps}
        />
      );
  }
}
