"use client";

/** 仪表盘（P05 五态：骨架 / 错误+重试 / 无权限） */
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, GraduationCap, Send, Settings, Sparkles, UserPlus, ClipboardCheck, Bot } from "lucide-react";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { isForbidden } from "@/lib/manager-fetch";
import { ErrorState, Forbidden, PageSkeleton, cardCls, useManagerQuery } from "@/components/manager/feedback";

type DashboardData = { articles: number; published: number; students: number; courses: number };

const QUICK_LINKS = [
  { href: "/manager/articles", label: "写文章", icon: FileText, desc: "新建或编辑新闻资讯" },
  { href: "/manager/collect-items", label: "采集审核", icon: ClipboardCheck, desc: "审核采集到的内容" },
  { href: "/manager/publish-jobs", label: "发布任务", icon: Send, desc: "官网 / 公众号发布队列" },
  { href: "/manager/llm-providers", label: "模型配置", icon: Bot, desc: "AI 客服模型与余额" },
  { href: "/manager/settings", label: "站点设置", icon: Settings, desc: "站点信息与联系方式" },
];

export default function ManagerDashboard() {
  const { data, error, loading, reload } = useManagerQuery<DashboardData>("/api/manager/dashboard");

  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const stats = data
    ? [
        { label: "文章总数", value: data.articles, icon: BookOpen },
        { label: "已发布", value: data.published, icon: Sparkles },
        { label: "报名线索", value: data.students, icon: UserPlus },
        { label: "课程", value: data.courses, icon: GraduationCap },
      ]
    : [];

  return (
    <div>
      <PageHeader title="仪表盘" description="站点内容与招生数据概览" />
      {loading && <PageSkeleton cards={4} lines={0} />}
      {error && (
        <div className={cardCls}>
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      )}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className={`${cardCls} p-5`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-mgr-muted-fg">{item.label}</p>
                <item.icon className="h-4 w-4 text-mgr-muted-fg" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums text-mgr-fg">{item.value}</p>
            </div>
          ))}
        </div>
      )}
      <section className="mt-8" aria-labelledby="quick-links">
        <h2 id="quick-links" className="text-[13px] font-semibold text-mgr-muted-fg">
          快捷入口
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${cardCls} group flex items-center gap-3 p-4 transition-colors hover:border-mgr-primary`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-mgr-control bg-mgr-primary-soft text-mgr-primary" aria-hidden="true">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-mgr-fg">{l.label}</span>
                <span className="block truncate text-[12px] text-mgr-muted-fg">{l.desc}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-mgr-muted-fg transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
