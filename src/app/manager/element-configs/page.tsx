"use client";

/**
 * 元素配置（E-03，ADR-024）：ElementConfig CRUD（权限 block；layer 1-14 契约）
 * spec 内联（crud-resources "element-configs"；manager 侧 crudPageSpecs 归他线路径，本卡不越界）
 */
import { CrudPage } from "@/components/manager/CrudPage";
import type { CrudPageSpec } from "@/components/manager/CrudPage";

const spec: CrudPageSpec = {
  title: "元素配置",
  description: "页面元素（elementId 如 001-001）的位置、交互与状态配置；layer 1-14。",
  endpoint: "element-configs",
  columns: [
    { key: "elementId", label: "元素 ID" },
    { key: "elementName", label: "元素名称", primary: true },
    { key: "layer", label: "层级" },
    { key: "layerName", label: "层级名称" },
    { key: "elementType", label: "类型", render: (row) => String(row.elementType ?? "—") },
    { key: "status", label: "状态" },
    { key: "sort", label: "排序" },
  ],
  fields: [
    { key: "elementId", label: "元素 ID", required: true, placeholder: "001-001" },
    { key: "elementName", label: "元素名称", required: true },
    { key: "layer", label: "层级（1-14）", type: "number", required: true },
    { key: "layerName", label: "层级名称", required: true, placeholder: "TopBar" },
    { key: "navigationId", label: "关联导航 ID", type: "number" },
    { key: "elementType", label: "元素类型", placeholder: "link/button/card/image/text/icon" },
    { key: "selector", label: "CSS 选择器" },
    { key: "position", label: "位置（JSON：x/y/width/height）", type: "json", colSpan: 2 },
    { key: "interactions", label: "交互配置（JSON）", type: "json", colSpan: 2, advanced: true },
    { key: "normalState", label: "常态样式（JSON）", type: "json", colSpan: 2, advanced: true },
    { key: "hoverState", label: "悬停样式（JSON）", type: "json", colSpan: 2, advanced: true },
    { key: "activeState", label: "激活样式（JSON）", type: "json", colSpan: 2, advanced: true },
    { key: "content", label: "内容" },
    { key: "icon", label: "图标" },
    {
      key: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "启用", value: "active" },
        { label: "停用", value: "inactive" },
      ],
    },
    { key: "sort", label: "排序", type: "number" },
  ],
  filters: [
    { key: "status", label: "状态", options: [{ label: "启用", value: "active" }, { label: "停用", value: "inactive" }] },
    {
      key: "layer",
      label: "层级",
      options: Array.from({ length: 14 }, (_, i) => ({ label: `Layer ${i + 1}`, value: String(i + 1) })),
    },
  ],
};

export default function Page() {
  return <CrudPage spec={spec} />;
}
