/**
 * E-07：资源 meta 表（并列元数据，升级条件口径——zod 4 无 UI 语义，label/控件提示/枚举中文在这里手写；
 * 字段键与枚举值一律由 schema 派生，见 derive.ts）。columns 与行行为留在 crud-specs.tsx。
 */
import { z } from "zod";
import {
  categoryCreateSchema, tagCreateSchema, courseCreateSchema, majorCreateSchema, offeringCreateSchema,
  studentCreateSchema, partnerCreateSchema, campusCreateSchema, galleryCreateSchema, bannerCreateSchema,
  homeCardCreateSchema, hotMajorCreateSchema, serviceGuideCreateSchema, navigationCreateSchema,
  userCreateSchema, roleCreateSchema, chatSceneCreateSchema, knowledgeCreateSchema, contentItemCreateSchema,
  recipientCreateSchema, notifyTemplateCreateSchema, collectSourceCreateSchema,
} from "@/contracts/resources";
import type { FieldMeta } from "./derive";

type Meta = { title: string; schema: z.ZodObject; labels: Record<string, FieldMeta> };

/** 通用枚举中文标签（值由契约派生，仅 label 手写） */
const CATALOG_STATUS = { active: "启用", draft: "草稿", archived: "归档" };
const ACTIVE_STATUS = { active: "启用", inactive: "停用" };

export const resourceMetas = {
  categories: {
    title: "分类管理",
    schema: categoryCreateSchema,
    labels: {
      name: { label: "名称" },
      slug: { label: "Slug（留空自动生成）" },
      type: { label: "类型", options: [{ label: "文章", value: "article" }, { label: "课程", value: "course" }, { label: "合作院校", value: "partner" }] },
      image: { label: "栏目图", type: "image" },
      parentId: { label: "父分类" },
      sort: { label: "排序" },
      isNav: { label: "显示在导航" },
      isVisible: { label: "可见" },
      description: { label: "描述", type: "textarea", colSpan: 2 },
    },
  },
  tags: {
    title: "标签管理",
    schema: tagCreateSchema,
    labels: {
      name: { label: "名称" },
      slug: { label: "Slug（留空自动生成）" },
    },
  },
  courses: {
    title: "课程管理",
    schema: courseCreateSchema,
    labels: {
      title: { label: "标题", colSpan: 2 },
      categoryId: { label: "分类 ID" },
      majorId: { label: "专业 ID" },
      price: { label: "价格" },
      priceText: { label: "价格文案" },
      duration: { label: "学制" },
      cover: { label: "封面", type: "image" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
      description: { label: "简介", type: "textarea", colSpan: 2 },
      outline: { label: "课程大纲", type: "textarea", colSpan: 2, rows: 6 },
    },
  },
  majors: {
    title: "专业管理",
    schema: majorCreateSchema,
    labels: {
      name: { label: "专业名称" },
      slug: { label: "Slug（留空自动生成）" },
      categoryId: { label: "分类 ID" },
      duration: { label: "学制" },
      cover: { label: "封面", type: "image" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
      description: { label: "简介", type: "textarea", colSpan: 2 },
    },
  },
  "enrollment-offerings": {
    title: "招生计划",
    schema: offeringCreateSchema,
    labels: {
      majorId: { label: "专业 ID", required: true },
      partnerId: { label: "院校 ID", required: true },
      sourceBatch: { label: "批次" },
      educationType: { label: "学历类型" },
      level: { label: "层次" },
      majorCode: { label: "专业代码" },
      studyForm: { label: "学习形式" },
      yearTuition: { label: "学年学费" },
      totalTuition: { label: "总学费" },
      hasPrice: { label: "已定价" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
      feeDetail: { label: "费用明细", type: "textarea", colSpan: 2 },
      extraFeeNote: { label: "其他费用说明", type: "textarea", colSpan: 2 },
    },
  },
  students: {
    title: "报名管理",
    schema: studentCreateSchema,
    labels: {
      name: { label: "姓名" },
      phone: { label: "电话" },
      courseId: { label: "课程 ID" },
      status: { label: "状态", options: [{ label: "待跟进", value: "pending" }, { label: "已联系", value: "contacted" }, { label: "已转化", value: "converted" }, { label: "无效", value: "invalid" }] },
      message: { label: "留言", type: "textarea", colSpan: 2 },
    },
  },
  partners: {
    title: "合作院校",
    schema: partnerCreateSchema,
    labels: {
      name: { label: "名称" },
      logo: { label: "Logo", type: "image" },
      website: { label: "官网地址" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  campus: {
    title: "校区管理",
    schema: campusCreateSchema,
    labels: {
      name: { label: "校区名称" },
      address: { label: "地址" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  gallery: {
    title: "证书风采",
    schema: galleryCreateSchema,
    labels: {
      title: { label: "标题" },
      image: { label: "图片", type: "image" },
      category: { label: "分类", options: [{ label: "证书", value: "certificate" }, { label: "考试", value: "exam" }, { label: "校园", value: "campus" }] },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  banners: {
    title: "轮播图",
    schema: bannerCreateSchema,
    labels: {
      image: { label: "图片", type: "image" },
      link: { label: "跳转链接" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  "home-cards": {
    title: "首页卡片",
    schema: homeCardCreateSchema,
    labels: {
      title: { label: "标题" },
      subtitle: { label: "副标题" },
      icon: { label: "图标（Lucide 名）" },
      href: { label: "链接" },
      gradient: { label: "渐变色（CSS）", colSpan: 2 },
      hoverGradient: { label: "悬停渐变（CSS）", colSpan: 2 },
      shadow: { label: "阴影（CSS）", colSpan: 2 },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  "hot-majors": {
    title: "热门专业位",
    schema: hotMajorCreateSchema,
    labels: {
      title: { label: "标题" },
      subtitle: { label: "副标题" },
      description: { label: "描述", type: "textarea", colSpan: 2 },
      duration: { label: "学制" },
      iconType: { label: "图标类型", options: [{ label: "文字", value: "text" }, { label: "图片", value: "image" }] },
      iconImage: { label: "图标图片", type: "image" },
      iconColor: { label: "图标颜色" },
      backgroundImage: { label: "背景图", type: "image" },
      link: { label: "链接" },
      majorId: { label: "关联专业 ID" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  "service-guides": {
    title: "服务指南",
    schema: serviceGuideCreateSchema,
    labels: {
      title: { label: "标题" },
      slug: { label: "Slug（留空自动生成）" },
      subtitle: { label: "副标题", colSpan: 2 },
      icon: { label: "图标（Lucide 名）" },
      contentType: { label: "内容类型", options: [{ label: "Markdown", value: "markdown" }, { label: "HTML", value: "html" }] },
      content: { label: "正文", type: "markdown", colSpan: 2, rows: 10 },
      link: { label: "链接" },
      sort: { label: "排序" },
      status: { label: "状态", options: Object.entries(CATALOG_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  navigations: {
    title: "导航管理",
    schema: navigationCreateSchema,
    labels: {
      name: { label: "名称" },
      slug: { label: "Slug（留空自动生成）" },
      link: { label: "链接" },
      linkType: { label: "链接类型", options: [{ label: "内部", value: "internal" }, { label: "外部", value: "external" }, { label: "下拉", value: "dropdown" }] },
      parentId: { label: "父导航 ID" },
      level: { label: "层级" },
      sort: { label: "排序" },
      isVisible: { label: "可见" },
      isNav: { label: "主导航" },
      icon: { label: "图标（Lucide 名）" },
      target: { label: "打开方式" },
      categoryId: { label: "分类 ID" },
      contentType: { label: "内容类型" },
    },
  },
  "chat-scenes": {
    title: "AI 场景",
    schema: chatSceneCreateSchema,
    labels: {
      code: { label: "Code（如 apply/float/faq）", section: "基础" },
      name: { label: "名称", section: "基础" },
      description: { label: "描述", section: "基础" },
      greeting: { label: "欢迎语", colSpan: 2, section: "基础" },
      systemPrompt: { label: "系统提示词", type: "textarea", colSpan: 2, rows: 5, section: "基础" },
      knowledgeTags: { label: "知识标签（逗号分隔）", colSpan: 2, section: "知识库" },
      baseIds: { label: "绑定知识库 ID（逗号分隔）", colSpan: 2, section: "知识库" },
      useKnowledgeBase: { label: "启用知识库", section: "知识库" },
      sort: { label: "排序", section: "基础" },
      // E-01/E-04：场景专属模型与参数（K11/K12）
      llmProviderId: { label: "专属模型供应商 ID", help: "留空 = 走网关默认路由（isDefault → priority → isFallback）", section: "模型与参数" },
      providerIds: { label: "供应商组 ID（JSON 数组串）", colSpan: 2, section: "模型与参数" },
      temperature: { label: "温度 temperature", help: "0~2；留空用供应商默认", section: "模型与参数" },
      maxTokens: { label: "最大 tokens", section: "模型与参数" },
      topP: { label: "top_p", help: "0~1；留空用供应商默认", section: "模型与参数" },
      starters: { label: "开场建议（JSON 数组串）", colSpan: 2, section: "基础" },
      status: { label: "状态", options: [{ label: "启用", value: "active" }, { label: "归档", value: "archived" }] },
    },
  },
  knowledge: {
    title: "知识条目（本地兜底库）",
    schema: knowledgeCreateSchema,
    labels: {
      title: { label: "标题", colSpan: 2 },
      content: { label: "内容", type: "markdown", colSpan: 2, rows: 8 },
      tags: { label: "标签（逗号分隔）", colSpan: 2 },
      source: { label: "来源", options: [{ label: "本地", value: "local" }, { label: "Notion", value: "notion" }, { label: "飞书", value: "feishu" }, { label: "网页", value: "web" }, { label: "采集", value: "collect" }] },
      externalUrl: { label: "外部链接" },
      priority: { label: "优先级" },
      status: { label: "状态", options: Object.entries(ACTIVE_STATUS).map(([value, label]) => ({ label, value })) },
    },
  },
  "content-items": {
    title: "内容中枢",
    schema: contentItemCreateSchema,
    labels: {
      title: { label: "标题", colSpan: 2 },
      contentType: { label: "内容类型", options: [{ label: "Markdown", value: "markdown" }, { label: "HTML", value: "html" }] },
      status: {
        label: "状态",
        // E-01：与冻结契约一致（draft/pending_review/offline；审核走专用端点，approved/published 由执行器写入）
        options: [{ label: "草稿", value: "draft" }, { label: "待审核", value: "pending_review" }, { label: "已下线", value: "offline" }],
      },
      excerpt: { label: "摘要（留空自动）", colSpan: 2 },
      coverImage: { label: "封面", type: "image" },
      tags: { label: "标签", type: "tags" },
      content: { label: "正文", type: "markdown", colSpan: 2, rows: 12 },
      source: { label: "来源", options: [{ label: "手动", value: "manual" }, { label: "采集", value: "collect" }] },
    },
  },
  "notify-recipients": {
    title: "提醒接收人",
    schema: recipientCreateSchema,
    labels: {
      name: { label: "姓名" },
      email: { label: "邮箱" },
      // V11-MAIL-02：分组口径与 prisma/seed.ts 种子规则对齐——publish=发布前提醒（before_publish_*）；
      // admin=失败/余额类告警（system_error/job_failed/collect_failed/llm_balance_low）
      groups: {
        label: "通知组（逗号分隔）",
        type: "tags",
        help: "分组口径与通知规则一致：publish=发布前提醒；admin=失败/余额类告警（系统错误、任务失败、采集失败、余额不足）",
      },
      enabled: { label: "启用" },
    },
  },
  "notify-templates": {
    title: "邮件模板",
    schema: notifyTemplateCreateSchema,
    labels: {
      name: { label: "名称" },
      event: { label: "适用事件（留空=通用）" },
      subject: { label: "主题（支持 {title} {time} {detail} {link}）", colSpan: 2 },
      body: { label: "正文（支持变量）", type: "textarea", colSpan: 2, rows: 6 },
      isDefault: { label: "设为默认模板" },
    },
  },
  "collect-sources": {
    title: "采集源",
    schema: collectSourceCreateSchema,
    labels: {
      name: { label: "名称" },
      type: { label: "类型", options: [{ label: "HTML 页面", value: "html" }, { label: "RSS", value: "rss" }] },
      url: { label: "列表页 URL", colSpan: 2 },
      // E-01：cron 留空 = 仅手动执行（契约口径的提示文案）
      cron: { label: "Cron 表达式", placeholder: "0 4 * * *", help: "留空表示仅手动执行（不在列表页展示计划）" },
      autoTags: { label: "自动标签", type: "tags" },
      parser: { label: "解析规则 JSON（listSelector/titleSelector/linkSelector/timeSelector/contentSelector）", type: "textarea", colSpan: 2, rows: 5 },
      enabled: { label: "启用" },
      // E-01：冻结契约字段补齐（collectSourceCreateSchema）
      autoToKb: { label: "采集后自动入知识库", help: "新条目默认入知识库（默认开启）" },
      autoApprove: { label: "超管预授权直接通过", visibleTo: "super", help: "仅超级管理员可见可改；开启后采集条目跳过人工审核" },
      knowledgeBaseId: { label: "采集目标库 ID", help: "留空 = 默认「采集资讯」库" },
    },
  },
  users: {
    title: "用户管理",
    schema: userCreateSchema,
    labels: {
      username: { label: "用户名" },
      password: { label: "密码（编辑时留空=不改）" },
      nickname: { label: "昵称" },
      email: { label: "邮箱" },
      phone: { label: "电话" },
      roleId: { label: "角色" },
      isActive: { label: "启用" },
    },
  },
  roles: {
    title: "角色管理",
    schema: roleCreateSchema,
    labels: {
      name: { label: "角色名" },
      slug: { label: "标识" },
      permissions: { label: "权限点（逗号分隔，如 article:list,article:edit）", type: "tags", colSpan: 2 },
      isSuper: { label: "超级管理员" },
      description: { label: "描述", type: "textarea", colSpan: 2 },
      status: { label: "状态", options: [{ label: "启用", value: "active" }, { label: "归档", value: "archived" }] },
    },
  },
} satisfies Record<string, Meta>;
