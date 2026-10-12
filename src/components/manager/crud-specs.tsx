"use client";

/**
 * 管理页规格表（与后端 crud-resources.ts 一一对应）：列 + 表单字段 + 关联下拉。
 * 特殊页（settings/media/collect-items/publish-jobs/llm-providers/wechat-accounts/dashboard）单独实现。
 */
import type { CrudPageSpec, RowAction } from "@/components/manager/CrudPage";
import { managerFetch } from "@/lib/manager-fetch";
import { alertDialog, toast } from "@/components/manager/feedback";

const statusField = {
  key: "status",
  label: "状态",
  type: "select" as const,
  options: [
    { label: "启用", value: "active" },
    { label: "草稿", value: "draft" },
    { label: "归档", value: "archived" },
  ],
};

async function runSource(row: Record<string, unknown>, reload: () => void, fail: (m: string) => void) {
  try {
    const res = await managerFetch<{ newCount: number; skipCount: number }>(
      `/api/collect-sources/${row.id}/run`,
      { method: "POST", body: "{}" }
    );
    toast.success("采集执行完成", `新增 ${res.newCount} 条，跳过 ${res.skipCount} 条；新条目在「采集审核」中待审。`);
    reload();
  } catch (e) {
    fail(e instanceof Error ? e.message : "执行失败");
  }
}

async function testSource(row: Record<string, unknown>, _reload: () => void, fail: (m: string) => void) {
  try {
    const res = await managerFetch<{ count: number; samples: { title: string; url: string }[] }>(
      `/api/collect-sources/${row.id}/test`,
      { method: "POST", body: "{}" }
    );
    await alertDialog({
      title: `试抓结果：解析到 ${res.count} 条`,
      description:
        res.samples.length > 0 ? (
          <div data-testid="collect-test-result">
            <p>以下为预览（不入库）：</p>
            <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-mgr-fg">
              {res.samples.map((s) => (
                <li key={s.url} className="break-all">
                  {s.title}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p data-testid="collect-test-result">未解析到条目，请检查列表 URL 与解析规则（listSelector / titleSelector / linkSelector）。</p>
        ),
    });
  } catch (e) {
    fail(e instanceof Error ? e.message : "试抓失败");
  }
}


export const crudPageSpecs: Record<string, CrudPageSpec> = {
  categories: {
    title: "分类管理",
    endpoint: "categories",
    columns: [
      { key: "name", label: "名称" },
      { key: "slug", label: "Slug" },
      { key: "type", label: "类型" },
      { key: "sort", label: "排序" },
      { key: "isVisible", label: "可见", render: "boolean" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      { key: "slug", label: "Slug（留空自动生成）" },
      {
        key: "type", label: "类型", type: "select", required: true,
        options: [
          { label: "文章", value: "article" },
          { label: "课程", value: "course" },
          { label: "合作院校", value: "partner" },
        ],
      },
      { key: "image", label: "栏目图", type: "image" },
      { key: "parentId", label: "父分类", type: "number" },
      { key: "sort", label: "排序", type: "number" },
      { key: "isNav", label: "显示在导航", type: "switch" },
      { key: "isVisible", label: "可见", type: "switch" },
      { key: "description", label: "描述", type: "textarea", colSpan: 2 },
    ],
  },
  tags: {
    title: "标签管理",
    endpoint: "tags",
    columns: [
      { key: "name", label: "名称" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      { key: "slug", label: "Slug（留空自动生成）" },
    ],
  },
  courses: {
    title: "课程管理",
    endpoint: "courses",
    searchPlaceholder: "搜索课程…",
    columns: [
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "priceText", label: "价格文案" },
      { key: "price", label: "价格" },
      { key: "cover", label: "封面", render: "image" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "title", label: "标题", required: true, colSpan: 2 },
      { key: "categoryId", label: "分类 ID" },
      { key: "majorId", label: "专业 ID" },
      { key: "price", label: "价格", type: "number" },
      { key: "priceText", label: "价格文案" },
      { key: "duration", label: "学制" },
      { key: "cover", label: "封面", type: "image" },
      { key: "sort", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { label: "启用", value: "active" }, { label: "草稿", value: "draft" }, { label: "归档", value: "archived" },
      ] },
      { key: "description", label: "简介", type: "textarea", colSpan: 2 },
      { key: "outline", label: "课程大纲", type: "textarea", colSpan: 2, rows: 6 },
    ],
  },
  majors: {
    title: "专业管理",
    endpoint: "majors",
    columns: [
      { key: "name", label: "专业名称" },
      { key: "slug", label: "Slug" },
      { key: "category", label: "分类" },
      { key: "duration", label: "学制" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "name", label: "专业名称", required: true },
      { key: "slug", label: "Slug（留空自动生成）" },
      { key: "categoryId", label: "分类 ID" },
      { key: "duration", label: "学制" },
      { key: "cover", label: "封面", type: "image" },
      { key: "sort", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { label: "启用", value: "active" }, { label: "草稿", value: "draft" }, { label: "归档", value: "archived" },
      ] },
      { key: "description", label: "简介", type: "textarea", colSpan: 2 },
    ],
  },
  "enrollment-offerings": {
    title: "招生计划",
    endpoint: "enrollment-offerings",
    searchPlaceholder: "搜索批次/类型…",
    columns: [
      { key: "major", label: "专业" },
      { key: "partner", label: "院校" },
      { key: "sourceBatch", label: "批次" },
      { key: "educationType", label: "学历类型" },
      { key: "yearTuition", label: "学年学费" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "majorId", label: "专业 ID", type: "number", required: true },
      { key: "partnerId", label: "院校 ID", type: "number", required: true },
      { key: "sourceBatch", label: "批次" },
      { key: "educationType", label: "学历类型" },
      { key: "level", label: "层次" },
      { key: "majorCode", label: "专业代码" },
      { key: "studyForm", label: "学习形式" },
      { key: "yearTuition", label: "学年学费", type: "number" },
      { key: "totalTuition", label: "总学费", type: "number" },
      { key: "hasPrice", label: "已定价", type: "switch" },
      { key: "sort", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { label: "启用", value: "active" }, { label: "草稿", value: "draft" }, { label: "归档", value: "archived" },
      ] },
      { key: "feeDetail", label: "费用明细", type: "textarea", colSpan: 2 },
      { key: "extraFeeNote", label: "其他费用说明", type: "textarea", colSpan: 2 },
    ],
  },
  students: {
    title: "报名管理",
    endpoint: "students",
    searchPlaceholder: "搜索姓名/电话…",
    columns: [
      { key: "name", label: "姓名" },
      { key: "phone", label: "电话" },
      { key: "course", label: "课程" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "报名时间" },
    ],
    fields: [
      { key: "name", label: "姓名", required: true },
      { key: "phone", label: "电话", required: true },
      { key: "courseId", label: "课程 ID", type: "number" },
      {
        key: "status", label: "状态", type: "select", options: [
          { label: "待跟进", value: "pending" }, { label: "已联系", value: "contacted" },
          { label: "已转化", value: "converted" }, { label: "无效", value: "invalid" },
        ],
      },
      { key: "message", label: "留言", type: "textarea", colSpan: 2 },
    ],
  },
  partners: {
    title: "合作院校",
    endpoint: "partners",
    columns: [
      { key: "logo", label: "Logo", render: "image" },
      { key: "name", label: "名称" },
      { key: "website", label: "官网" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      { key: "logo", label: "Logo", type: "image" },
      { key: "website", label: "官网地址" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  campus: {
    title: "校区管理",
    endpoint: "campus",
    columns: [
      { key: "name", label: "校区" },
      { key: "address", label: "地址" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "name", label: "校区名称", required: true },
      { key: "address", label: "地址" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  gallery: {
    title: "证书风采",
    endpoint: "gallery",
    columns: [
      { key: "image", label: "图片", render: "image" },
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "title", label: "标题", required: true },
      { key: "image", label: "图片", type: "image", required: true },
      {
        key: "category", label: "分类", type: "select", options: [
          { label: "证书", value: "certificate" }, { label: "考试", value: "exam" }, { label: "校园", value: "campus" },
        ],
      },
      { key: "sort", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { label: "启用", value: "active" }, { label: "草稿", value: "draft" }, { label: "归档", value: "archived" },
      ] },
    ],
  },
  banners: {
    title: "轮播图",
    endpoint: "banners",
    columns: [
      { key: "image", label: "图片", render: "image" },
      { key: "link", label: "链接" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "image", label: "图片", type: "image", required: true },
      { key: "link", label: "跳转链接" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  "home-cards": {
    title: "首页卡片",
    endpoint: "home-cards",
    columns: [
      { key: "title", label: "标题" },
      { key: "subtitle", label: "副标题" },
      { key: "href", label: "链接" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "title", label: "标题", required: true },
      { key: "subtitle", label: "副标题" },
      { key: "icon", label: "图标（Lucide 名）" },
      { key: "href", label: "链接" },
      { key: "gradient", label: "渐变色（CSS）", colSpan: 2 },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  "hot-majors": {
    title: "热门专业位",
    endpoint: "hot-majors",
    columns: [
      { key: "title", label: "标题" },
      { key: "subtitle", label: "副标题" },
      { key: "duration", label: "学制" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "title", label: "标题", required: true },
      { key: "subtitle", label: "副标题" },
      { key: "description", label: "描述", type: "textarea", colSpan: 2 },
      { key: "duration", label: "学制" },
      {
        key: "iconType", label: "图标类型", type: "select",
        options: [{ label: "文字", value: "text" }, { label: "图片", value: "image" }],
      },
      { key: "iconImage", label: "图标图片", type: "image" },
      { key: "iconColor", label: "图标颜色" },
      { key: "backgroundImage", label: "背景图", type: "image" },
      { key: "link", label: "链接" },
      { key: "majorId", label: "关联专业 ID", type: "number" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  "service-guides": {
    title: "服务指南",
    endpoint: "service-guides",
    columns: [
      { key: "title", label: "标题" },
      { key: "slug", label: "Slug" },
      { key: "contentType", label: "内容类型" },
      { key: "sort", label: "排序" },
    ],
    fields: [
      { key: "title", label: "标题", required: true },
      { key: "slug", label: "Slug（留空自动生成）" },
      { key: "subtitle", label: "副标题", colSpan: 2 },
      { key: "icon", label: "图标（Lucide 名）" },
      {
        key: "contentType", label: "内容类型", type: "select",
        options: [{ label: "Markdown", value: "markdown" }, { label: "HTML", value: "html" }],
      },
      { key: "content", label: "正文", type: "markdown", colSpan: 2, rows: 10 },
      { key: "sort", label: "排序", type: "number" },
      { key: "status", label: "状态", type: "select", options: [
        { label: "启用", value: "active" }, { label: "草稿", value: "draft" }, { label: "归档", value: "archived" },
      ] },
    ],
  },
  navigations: {
    title: "导航管理",
    endpoint: "navigations",
    columns: [
      { key: "name", label: "名称" },
      { key: "link", label: "链接" },
      { key: "level", label: "层级" },
      { key: "sort", label: "排序" },
      { key: "isVisible", label: "可见", render: "boolean" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      { key: "slug", label: "Slug（留空自动生成）" },
      { key: "link", label: "链接" },
      {
        key: "linkType", label: "链接类型", type: "select",
        options: [{ label: "内部", value: "internal" }, { label: "外部", value: "external" }, { label: "下拉", value: "dropdown" }],
      },
      { key: "parentId", label: "父导航 ID", type: "number" },
      { key: "level", label: "层级", type: "number" },
      { key: "sort", label: "排序", type: "number" },
      { key: "isVisible", label: "可见", type: "switch" },
      { key: "isNav", label: "主导航", type: "switch" },
    ],
  },
  "chat-scenes": {
    title: "AI 场景",
    endpoint: "chat-scenes",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "名称" },
      { key: "useKnowledgeBase", label: "用知识库", render: "boolean" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "code", label: "Code（如 apply/float/faq）", required: true },
      { key: "name", label: "名称", required: true },
      { key: "greeting", label: "欢迎语", required: true, colSpan: 2 },
      { key: "systemPrompt", label: "系统提示词", type: "textarea", required: true, colSpan: 2, rows: 5 },
      { key: "knowledgeTags", label: "知识标签（逗号分隔）", colSpan: 2 },
      { key: "baseIds", label: "绑定知识库 ID（逗号分隔）", colSpan: 2 },
      { key: "useKnowledgeBase", label: "启用知识库", type: "switch" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  knowledge: {
    title: "知识条目（本地兜底库）",
    endpoint: "knowledge",
    searchPlaceholder: "搜索标题/内容/标签…",
    columns: [
      { key: "title", label: "标题" },
      { key: "tags", label: "标签" },
      { key: "priority", label: "优先级" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "title", label: "标题", required: true, colSpan: 2 },
      { key: "content", label: "内容", type: "textarea", required: true, colSpan: 2, rows: 8 },
      { key: "tags", label: "标签（逗号分隔）", colSpan: 2 },
      { key: "priority", label: "优先级", type: "number" },
      {
        key: "status", label: "状态", type: "select",
        options: [{ label: "启用", value: "active" }, { label: "停用", value: "inactive" }],
      },
    ],
  },
  "content-items": {
    title: "内容中枢",
    endpoint: "content-items",
    searchPlaceholder: "搜索标题/内容…",
    columns: [
      { key: "title", label: "标题" },
      { key: "source", label: "来源" },
      { key: "status", label: "状态" },
      { key: "author", label: "作者" },
      { key: "createdAt", label: "创建时间" },
    ],
    fields: [
      { key: "title", label: "标题", required: true, colSpan: 2 },
      {
        key: "contentType", label: "内容类型", type: "select",
        options: [{ label: "Markdown", value: "markdown" }, { label: "HTML", value: "html" }],
      },
      {
        key: "status", label: "状态", type: "select",
        options: [
          { label: "草稿", value: "draft" }, { label: "待审核", value: "pending_review" },
          { label: "已通过", value: "approved" }, { label: "已发布", value: "published" }, { label: "已下线", value: "offline" },
        ],
      },
      { key: "excerpt", label: "摘要（留空自动）", colSpan: 2 },
      { key: "coverImage", label: "封面", type: "image" },
      { key: "tags", label: "标签", type: "tags" },
      { key: "content", label: "正文", type: "markdown", required: true, colSpan: 2, rows: 12 },
    ],
  },
  "notify-recipients": {
    title: "提醒接收人",
    endpoint: "notify-recipients",
    columns: [
      { key: "name", label: "姓名" },
      { key: "email", label: "邮箱" },
      { key: "groups", label: "通知组" },
      { key: "enabled", label: "启用", render: "boolean" },
    ],
    fields: [
      { key: "name", label: "姓名", required: true },
      { key: "email", label: "邮箱", required: true },
      { key: "groups", label: "通知组（逗号分隔：publish,ops）", type: "tags" },
      { key: "enabled", label: "启用", type: "switch" },
    ],
  },
  "notify-templates": {
    title: "邮件模板",
    endpoint: "notify-templates",
    columns: [
      { key: "name", label: "名称" },
      { key: "event", label: "适用事件" },
      { key: "subject", label: "主题" },
      { key: "isDefault", label: "默认", render: "boolean" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      { key: "event", label: "适用事件（留空=通用）" },
      { key: "subject", label: "主题（支持 {title} {time} {detail} {link}）", required: true, colSpan: 2 },
      { key: "body", label: "正文（支持变量）", type: "textarea", required: true, colSpan: 2, rows: 6 },
      { key: "isDefault", label: "设为默认模板", type: "switch" },
    ],
  },
  "collect-sources": {
    title: "采集源",
    endpoint: "collect-sources",
    columns: [
      { key: "name", label: "名称" },
      { key: "type", label: "类型" },
      { key: "url", label: "地址" },
      { key: "cron", label: "计划" },
      { key: "lastStatus", label: "上次状态" },
    ],
    fields: [
      { key: "name", label: "名称", required: true },
      {
        key: "type", label: "类型", type: "select",
        options: [{ label: "HTML 页面", value: "html" }, { label: "RSS", value: "rss" }],
      },
      { key: "url", label: "列表页 URL", required: true, colSpan: 2 },
      { key: "cron", label: "Cron 表达式", placeholder: "0 4 * * *" },
      { key: "autoTags", label: "自动标签", type: "tags" },
      { key: "parser", label: "解析规则 JSON（listSelector/titleSelector/linkSelector/timeSelector/contentSelector）", type: "textarea", colSpan: 2, rows: 5 },
      { key: "enabled", label: "启用", type: "switch" },
    ],
    rowActions: [
      { label: "试抓", run: testSource },
      { label: "立即执行", confirm: (row) => `立即执行采集源「${row.name}」？`, run: runSource },
    ] as RowAction[],
  },
  users: {
    title: "用户管理",
    endpoint: "users",
    columns: [
      { key: "username", label: "用户名" },
      { key: "nickname", label: "昵称" },
      { key: "role", label: "角色" },
      { key: "isActive", label: "启用", render: "boolean" },
      { key: "lastLoginAt", label: "最后登录" },
    ],
    fields: [
      { key: "username", label: "用户名", required: true },
      { key: "password", label: "密码（编辑时留空=不改）" },
      { key: "nickname", label: "昵称" },
      { key: "email", label: "邮箱" },
      { key: "phone", label: "电话" },
      { key: "roleId", label: "角色 ID", type: "number", required: true },
      { key: "isActive", label: "启用", type: "switch" },
    ],
  },
  roles: {
    title: "角色管理",
    endpoint: "roles",
    columns: [
      { key: "name", label: "角色" },
      { key: "slug", label: "标识" },
      { key: "isSuper", label: "超管", render: "boolean" },
      { key: "userCount", label: "用户数" },
    ],
    fields: [
      { key: "name", label: "角色名", required: true },
      { key: "slug", label: "标识" },
      { key: "permissions", label: "权限点（逗号分隔，如 article:list,article:edit）", type: "tags", colSpan: 2 },
      { key: "isSuper", label: "超级管理员", type: "switch" },
      { key: "description", label: "描述", type: "textarea", colSpan: 2 },
    ],
  },
  "user-actions": {
    title: "行为记录",
    endpoint: "user-actions",
    searchPlaceholder: "搜索行为/页面…",
    readOnly: true,
    columns: [
      { key: "actionType", label: "类型" },
      { key: "actionTarget", label: "目标" },
      { key: "pageUrl", label: "页面" },
      { key: "sessionId", label: "会话" },
      { key: "createdAt", label: "时间" },
    ],
    fields: [],
  },
  logs: {
    title: "操作日志",
    endpoint: "logs",
    searchPlaceholder: "搜索用户/模块…",
    readOnly: true,
    columns: [
      { key: "username", label: "用户" },
      { key: "module", label: "模块" },
      { key: "action", label: "动作" },
      { key: "title", label: "对象" },
      { key: "ipAddress", label: "IP" },
      { key: "createdAt", label: "时间" },
    ],
    fields: [],
  },
  "notify-records": {
    title: "通知记录",
    endpoint: "notify-records",
    readOnly: true,
    columns: [
      { key: "event", label: "事件" },
      { key: "toEmails", label: "收件人" },
      { key: "subject", label: "主题" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "时间" },
    ],
    fields: [],
  },
  "collect-tasks": {
    title: "采集任务",
    endpoint: "collect-tasks",
    readOnly: true,
    columns: [
      { key: "source", label: "采集源" },
      { key: "status", label: "状态" },
      { key: "newCount", label: "新增" },
      { key: "skipCount", label: "跳过" },
      { key: "startedAt", label: "开始" },
      { key: "finishedAt", label: "结束" },
    ],
    fields: [],
  },
};

export { statusField };
