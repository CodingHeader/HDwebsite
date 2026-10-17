"use client";

/**
 * 管理页规格表（E-07 单源派生）：字段键与枚举 options 由冻结契约派生（resource-meta/derive.ts + specs.ts），
 * 本文件只剩列定义、控件提示性覆盖入口与特殊行为（行操作/关联下拉/只读资源）。
 * 特殊页（settings/media/collect-items/publish-jobs/llm-providers/wechat-accounts/dashboard）单独实现。
 */
import type { CrudPageSpec, RowAction } from "@/components/manager/CrudPage";
import type { FieldSpec } from "@/components/manager/SchemaForm";
import { managerFetch } from "@/lib/manager-fetch";
import { alertDialog, toast } from "@/components/manager/feedback";
import { deriveFields } from "@/components/manager/resource-meta/derive";
import { resourceMetas } from "@/components/manager/resource-meta/specs";
import { COLUMNS } from "@/components/manager/resource-meta/columns";

async function runSource(row: Record<string, unknown>, reload: () => void, fail: (m: string) => void) {
  try {
    const res = await managerFetch<{ newCount: number; skipCount: number }>(`/api/collect-sources/${row.id}/run`, { method: "POST", body: "{}" });
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

/** 特殊行为（行操作/关联下拉/默认值/搜索占位），按资源名合并 */
const EXTRA: Record<string, Partial<CrudPageSpec>> = {
  courses: { searchPlaceholder: "搜索课程…" },
  "enrollment-offerings": { searchPlaceholder: "搜索批次/类型…" },
  students: { searchPlaceholder: "搜索姓名/电话…" },
  knowledge: { searchPlaceholder: "搜索标题/内容/标签…" },
  "content-items": { searchPlaceholder: "搜索标题/内容…" },
  users: { relations: { roleId: { endpoint: "roles", labelKey: "name" } } },
  "collect-sources": {
    // E-05 回归修复（E-01 引入）：defaultValues 把 switch 一律默认 true，autoApprove 违反 ADR-017「默认关闭」——显式覆盖
    defaults: { autoApprove: false },
    rowActions: [
      { label: "试抓", run: testSource },
      { label: "立即执行", confirm: (row) => `立即执行采集源「${row.name}」？`, run: runSource },
    ] as RowAction[],
  },
};

/** 只读资源（无表单契约；fields 空） */
const READ_ONLY: Record<string, CrudPageSpec> = {
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
    // E-06：模块筛选（后端 crud filters 白名单 module:string；动作/时间范围筛选需后端扩展 → 已登记待 B 线）
    filters: [
      {
        key: "module",
        label: "模块",
        options: [
          { label: "文章", value: "article" },
          { label: "认证", value: "auth" },
          { label: "校区", value: "campus" },
          { label: "对话日志", value: "chat-history" },
          { label: "采集", value: "collect" },
          { label: "模型供应商", value: "llm" },
          { label: "媒体库", value: "media" },
          { label: "内容审核", value: "review" },
          { label: "角色", value: "role" },
          { label: "站点设置", value: "setting" },
          { label: "用户", value: "user" },
          { label: "公众号", value: "wechat" },
        ],
      },
    ],
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

export const crudPageSpecs: Record<string, CrudPageSpec> = Object.fromEntries([
  ...Object.entries(resourceMetas).map(([key, meta]): [string, CrudPageSpec] => [
    key,
    {
      title: meta.title,
      endpoint: key,
      columns: COLUMNS[key] ?? [],
      fields: deriveFields(meta.schema, meta.labels) as FieldSpec[],
      ...EXTRA[key],
    } as CrudPageSpec,
  ]),
  ...Object.entries(READ_ONLY).map(([key, spec]): [string, CrudPageSpec] => [key, spec]),
]);
