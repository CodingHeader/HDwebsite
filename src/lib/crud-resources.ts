/**
 * CRUD 资源规格注册表（SSOT）：每资源的模型/权限/搜索字段/钩子集中于此，
 * 路由文件只引用 spec key；管理页 CrudPage 共用同一 spec（列与表单配置在 crud-specs）。
 * createSchema 缺省 = 只读资源（仅生成 GET 路由）。
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import type { CrudSpec } from "@/lib/crud";
import {
  contentItemCreateSchema,
  categoryCreateSchema,
  tagCreateSchema,
  courseCreateSchema,
  majorCreateSchema,
  offeringCreateSchema,
  studentCreateSchema,
  partnerCreateSchema,
  campusCreateSchema,
  campusImageCreateSchema,
  galleryCreateSchema,
  bannerCreateSchema,
  homeCardCreateSchema,
  hotMajorCreateSchema,
  serviceGuideCreateSchema,
  navigationCreateSchema,
  chatSceneCreateSchema,
  knowledgeCreateSchema,
  recipientCreateSchema,
  notifyTemplateCreateSchema,
  collectSourceCreateSchema,
  publishJobCreateSchema,
} from "@/contracts/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 数组字段 → JSON 字符串（JSON-in-String 约定） */
function jsonifyArray(keys: string[]) {
  const conv = (data: Record<string, unknown>) => {
    for (const k of keys) {
      const v = data[k];
      if (Array.isArray(v)) data[k] = JSON.stringify(v);
      else if (typeof v === "string" && v.trim().startsWith("[")) {
        // 幂等：已是 JSON 串的原样保留（防止二次 stringify 损坏）
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) data[k] = JSON.stringify(parsed);
        } catch {
          /* 非法 JSON 交由上层校验 */
        }
      }
    }
    return data;
  };
  return {
    beforeCreate: async (data: Record<string, unknown>) => conv(data),
    beforeUpdate: async (data: Record<string, unknown>) => conv(data),
  };
}

export const crudSpecs: Record<string, CrudSpec> = {
  categories: {
    model: "category",
    permission: "category",
    label: "分类",
    searchFields: ["name", "slug"],
    filters: { type: "string" },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: categoryCreateSchema,
    beforeCreate: async (data) => ({
      ...data,
      slug: (data.slug as string) || (await uniqueSlug(data.name as string, (s) =>
        prisma.category.findUnique({ where: { slug: s } }).then((r) => !!r)
      )),
    }),
  },
  tags: {
    model: "tag",
    permission: "tag",
    label: "标签",
    searchFields: ["name", "slug"],
    orderBy: [{ id: "asc" }],
    createSchema: tagCreateSchema,
    beforeCreate: async (data) => ({
      ...data,
      slug: (data.slug as string) || (await uniqueSlug(data.name as string, (s) =>
        prisma.tag.findUnique({ where: { slug: s } }).then((r) => !!r)
      )),
    }),
  },
  courses: {
    model: "course",
    permission: "course",
    label: "课程",
    searchFields: ["title", "description"],
    filters: { categoryId: "number", majorId: "number", status: "string" },
    orderBy: [{ sort: "asc" }, { id: "desc" }],
    include: { category: true, major: true },
    createSchema: courseCreateSchema,
  },
  majors: {
    model: "major",
    permission: "major",
    label: "专业",
    searchFields: ["name", "slug"],
    filters: { categoryId: "number", status: "string" },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { category: true },
    createSchema: majorCreateSchema,
    beforeCreate: async (data) => ({
      ...data,
      slug: (data.slug as string) || (await uniqueSlug(data.name as string, (s) =>
        prisma.major.findUnique({ where: { slug: s } }).then((r) => !!r)
      )),
    }),
  },
  "enrollment-offerings": {
    model: "enrollmentOffering",
    permission: "enrollment",
    label: "招生计划",
    searchFields: ["sourceBatch", "educationType", "studyForm"],
    filters: { majorId: "number", partnerId: "number", status: "string" },
    orderBy: [{ sort: "asc" }, { id: "desc" }],
    include: { major: true, partner: true },
    createSchema: offeringCreateSchema,
  },
  students: {
    model: "student",
    permission: "student",
    label: "报名线索",
    searchFields: ["name", "phone", "message"],
    filters: { courseId: "number", status: "string" },
    orderBy: [{ id: "desc" }],
    include: { course: true },
    createSchema: studentCreateSchema,
  },
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
  "chat-scenes": {
    model: "chatScene",
    permission: "setting",
    label: "AI 场景",
    searchFields: ["name", "code"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: chatSceneCreateSchema,
  },
  knowledge: {
    model: "knowledge",
    permission: "kb",
    label: "知识条目",
    searchFields: ["title", "content", "tags"],
    filters: { status: "string" },
    orderBy: [{ priority: "desc" }, { id: "desc" }],
    createSchema: knowledgeCreateSchema,
  },
  'content-items': {
    createSchema: contentItemCreateSchema,
    ...jsonifyArray(["tags"]),
    extraCreate: (session) => ({ authorId: session.id }),
    model: 'contentItem',
    permission: 'content',
    label: '内容条目',
    searchFields: ['title', 'content'],
    filters: { status: 'string', source: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { author: { select: { id: true, username: true } } },

  },
  'notify-recipients': {
    model: "notifyRecipient",
    permission: "notify",
    label: "提醒接收人",
    searchFields: ["name", "email"],
    orderBy: [{ id: "asc" }],
    createSchema: recipientCreateSchema,
    ...jsonifyArray(["groups"]),
  },
  "notify-templates": {
    model: "notifyTemplate",
    permission: "notify",
    label: "邮件模板",
    searchFields: ["name", "subject"],
    orderBy: [{ id: "asc" }],
    createSchema: notifyTemplateCreateSchema,
  },
  "collect-sources": {
    model: "collectSource",
    permission: "collect",
    label: "采集源",
    searchFields: ["name", "url"],
    filters: { type: "string", enabled: "boolean" },
    orderBy: [{ id: "asc" }],
    createSchema: collectSourceCreateSchema,
    ...jsonifyArray(["autoTags"]),
  },
  "collect-tasks": {
    model: "collectTask",
    permission: "collect",
    label: "采集任务",
    searchFields: [],
    filters: { sourceId: "number", status: "string" },
    orderBy: [{ id: "desc" }],
    include: { source: { select: { id: true, name: true } } },
  },
  "publish-jobs": {
    model: "publishJob",
    permission: "publish",
    label: "发布任务",
    searchFields: [],
    filters: { channel: "string", status: "string" },
    orderBy: [{ id: "desc" }],
    createSchema: publishJobCreateSchema,
  },
  "notify-records": {
    model: "notifyRecord",
    permission: "notify",
    label: "通知记录",
    searchFields: ["subject", "toEmails"],
    filters: { event: "string", status: "string" },
    orderBy: [{ id: "desc" }],
  },
  "user-actions": {
    model: "userAction",
    permission: "log",
    label: "行为记录",
    searchFields: ["actionTarget", "pageUrl"],
    filters: { actionType: "string" },
    orderBy: [{ id: "desc" }],
  },
  media: {
    model: 'media',
    permission: 'media',
    label: '媒体',
    searchFields: ['filename'],
    filters: { type: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { uploader: { select: { id: true, username: true } } },
  },
  logs: {
    model: "operationLog",
    permission: "log",
    label: "操作日志",
    searchFields: ["username", "module", "title"],
    filters: { module: "string" },
    orderBy: [{ id: "desc" }],
  },
};

export type { CrudSpec };
