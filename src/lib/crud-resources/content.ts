/*
 * crudSpecs · 内容域（分类/标签/课程/专业/招生/线索/内容条目）（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import type { CrudSpec } from "@/lib/crud";
import {
  categoryCreateSchema,
  tagCreateSchema,
  courseCreateSchema,
  majorCreateSchema,
  offeringCreateSchema,
  studentCreateSchema,
  contentItemCreateSchema,
} from "@/contracts/resources";
import { CONTENT_EDITABLE_STATUSES, canTransitionContentItem, contentItemStatusSchema } from "@/contracts/events";
import { badRequest } from "@/lib/api-handler";
import { contentItemTags } from "./shared";

export const contentSpecs: Record<string, CrudSpec> = {
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
  'content-items': {
    createSchema: contentItemCreateSchema,
    beforeCreate: contentItemTags.beforeCreate,
    // P06：状态迁移须合法（contracts/events contentItemStatusTransitions）；approved/published 已在契约层拒绝
    // 更新契约接受完整状态集（表单回传未改动的 approved/published 不报错），但"变更到"审核/发布态一律拒绝
    updateSchema: contentItemCreateSchema.extend({ status: contentItemStatusSchema }).partial(),
    beforeUpdate: async (data, existing) => {
      const to = data.status as string | undefined;
      const from = existing.status as string;
      if (to && to !== from) {
        if (!(CONTENT_EDITABLE_STATUSES as readonly string[]).includes(to)) {
          throw badRequest(`不能直接把状态改为 ${to}：审核请用「审核」操作（仅超级管理员），发布请建发布任务`);
        }
        if (!canTransitionContentItem(from, to)) throw badRequest(`内容状态不能从 ${from} 变更为 ${to}`);
      }
      return contentItemTags.beforeUpdate(data);
    },
    extraCreate: (session) => ({ authorId: session.id }),
    model: 'contentItem',
    permission: 'content',
    label: '内容条目',
    searchFields: ['title', 'content'],
    filters: { status: 'string', source: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { author: { select: { id: true, username: true } } },

  },
};
