"use client";

/**
 * 页面模板（E-03，ADR-024）：PageTemplate CRUD（权限 block）
 * spec 内联（crud-resources "page-templates"；manager 侧 crudPageSpecs 归他线路径，本卡不越界）
 */
import { CrudPage } from "@/components/manager/CrudPage";
import type { CrudPageSpec } from "@/components/manager/CrudPage";

const spec: CrudPageSpec = {
  title: "页面模板",
  description: "页面渲染模板（list/article/home 等）；home 模板的区块配置在「首页区块」中管理。",
  endpoint: "page-templates",
  columns: [
    { key: "code", label: "模板代码" },
    { key: "name", label: "名称", primary: true },
    { key: "layout", label: "布局" },
    { key: "contentType", label: "内容类型", render: (row) => String(row.contentType ?? "—") },
    { key: "isDefault", label: "默认", render: (row) => (row.isDefault ? "是" : "—") },
    { key: "status", label: "状态" },
  ],
  fields: [
    { key: "code", label: "模板代码", required: true, placeholder: "home" },
    { key: "name", label: "名称", required: true },
    { key: "description", label: "描述", type: "textarea" },
    {
      key: "layout",
      label: "布局",
      type: "select",
      options: [
        { label: "默认", value: "default" },
        { label: "侧边栏", value: "sidebar" },
        { label: "全宽", value: "fullwidth" },
      ],
    },
    { key: "contentType", label: "内容类型", placeholder: "article/course/partner" },
    { key: "templateFile", label: "模板文件路径", required: true },
    { key: "thumbnail", label: "缩略图 URL", type: "image" },
    { key: "isDefault", label: "设为默认模板", type: "switch" },
    {
      key: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "启用", value: "active" },
        { label: "停用", value: "inactive" },
      ],
    },
    { key: "config", label: "模板配置（JSON）", type: "json", advanced: true },
  ],
  filters: [{ key: "status", label: "状态", options: [{ label: "启用", value: "active" }, { label: "停用", value: "inactive" }] }],
};

export default function Page() {
  return <CrudPage spec={spec} />;
}
