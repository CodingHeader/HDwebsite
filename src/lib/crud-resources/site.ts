/*
 * crudSpecs · 站点展示域（院校/校区/图库/横幅/首页卡片/服务/导航/区块配置）（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import type { CrudSpec } from "@/lib/crud";
import {
  partnerCreateSchema,
  campusCreateSchema,
  campusImageCreateSchema,
  galleryCreateSchema,
  bannerCreateSchema,
  homeCardCreateSchema,
  hotMajorCreateSchema,
  serviceGuideCreateSchema,
  navigationCreateSchema,
} from "@/contracts/resources";
import {
  pageTemplateCreateSchema,
  contentBlockCreateSchema,
  templateBlockCreateSchema,
  elementConfigCreateSchema,
} from "@/contracts/blocks";
import { jsonifyFields } from "./shared";

export const siteSpecs: Record<string, CrudSpec> = {
  partners: {
    model: "partner",
    permission: "partner",
    label: "合作院校",
    searchFields: ["name"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: partnerCreateSchema,
  },
  campus: {
    model: "campus",
    permission: "campus",
    label: "校区",
    searchFields: ["name", "address"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { images: { orderBy: { sort: "asc" } } },
    createSchema: campusCreateSchema,
  },
  "campus-images": {
    model: "campusImage",
    permission: "campus",
    label: "校区图片",
    searchFields: ["caption"],
    filters: { campusId: "number" },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: campusImageCreateSchema,
  },
  gallery: {
    model: "gallery",
    permission: "gallery",
    label: "证书风采",
    searchFields: ["title"],
    filters: { category: "string" },
    orderBy: [{ sort: "asc" }, { id: "desc" }],
    createSchema: galleryCreateSchema,
  },
  banners: {
    model: "banner",
    permission: "banner",
    label: "轮播图",
    searchFields: [],
    orderBy: [{ sort: "asc" }, { id: "desc" }],
    createSchema: bannerCreateSchema,
  },
  "home-cards": {
    model: "homeCard",
    permission: "banner",
    label: "首页卡片",
    searchFields: ["title"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: homeCardCreateSchema,
  },
  "hot-majors": {
    model: "hotMajor",
    permission: "course",
    label: "热门专业",
    searchFields: ["title", "subtitle"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { major: true },
    createSchema: hotMajorCreateSchema,
  },
  "service-guides": {
    model: "serviceGuide",
    permission: "service",
    label: "服务指南",
    searchFields: ["title", "subtitle"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: serviceGuideCreateSchema,
    beforeCreate: async (data) => {
      const slug =
        (data.slug as string) ||
        (await uniqueSlug(data.title as string, (s) =>
          prisma.serviceGuide.findUnique({ where: { slug: s } }).then((r) => !!r)
        ));
      return { ...data, slug, link: (data.link as string) || `/services/${slug}` };
    },
  },
  navigations: {
    model: "navigation",
    permission: "navigation",
    label: "导航",
    searchFields: ["name", "slug"],
    filters: { level: "number" },
    orderBy: [{ level: "asc" }, { sort: "asc" }, { id: "asc" }],
    createSchema: navigationCreateSchema,
    beforeCreate: async (data) => ({
      ...data,
      slug: (data.slug as string) || (await uniqueSlug(data.name as string, (s) =>
        prisma.navigation.findUnique({ where: { slug: s } }).then((r) => !!r)
      )),
    }),
  },
  "page-templates": {
    model: "pageTemplate",
    permission: "block",
    label: "页面模板",
    searchFields: ["code", "name"],
    filters: { status: "string" },
    orderBy: [{ id: "asc" }],
    createSchema: pageTemplateCreateSchema,
    ...jsonifyFields(["config"]),
  },
  "content-blocks": {
    model: "contentBlock",
    permission: "block",
    label: "内容区块",
    searchFields: ["code", "name"],
    filters: { status: "string", type: "string" },
    orderBy: [{ id: "asc" }],
    createSchema: contentBlockCreateSchema,
    ...jsonifyFields(["query", "content", "style", "interactions"]),
  },
  "template-blocks": {
    model: "templateBlock",
    permission: "block",
    label: "模板区块",
    searchFields: [],
    filters: { templateId: "number", blockId: "number" },
    orderBy: [{ templateId: "asc" }, { sort: "asc" }, { id: "asc" }],
    include: { block: { select: { id: true, code: true, name: true, status: true } }, template: { select: { id: true, code: true, name: true } } },
    createSchema: templateBlockCreateSchema,
    ...jsonifyFields(["config"]),
  },
  "element-configs": {
    model: "elementConfig",
    permission: "block",
    label: "元素配置",
    searchFields: ["elementId", "elementName", "layerName"],
    filters: { layer: "number", status: "string", navigationId: "number" },
    orderBy: [{ layer: "asc" }, { sort: "asc" }, { id: "asc" }],
    createSchema: elementConfigCreateSchema,
    ...jsonifyFields(["position", "interactions", "normalState", "hoverState", "activeState"]),
  },
};
