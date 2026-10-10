"use client";

import { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  Newspaper,
  Users,
  UserCheck,
  TrendingUp,
  Eye,
  Loader2,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { managerFetch } from "@/lib/manager-fetch";
import { cn } from "@/lib/utils";

interface Stats {
  totalCourses: number;
  totalArticles: number;
  totalStudents: number;
  pendingStudents: number;
}

interface Student {
  id: number;
  name: string;
  status: string;
  course: { title: string } | null;
}

interface Article {
  id: number;
  title: string;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
}

// 统计卡片数据
const statsConfig = [
  {
    title: "课程总数",
    key: "totalCourses" as const,
    icon: BookOpen,
    gradient: "from-[#3b82f6] to-[#1d4ed8]",
    shadow: "shadow-blue-500/20",
    bgHover: "hover:shadow-blue-500/30",
  },
  {
    title: "文章总数",
    key: "totalArticles" as const,
    icon: Newspaper,
    gradient: "from-[#10b981] to-[#047857]",
    shadow: "shadow-emerald-500/20",
    bgHover: "hover:shadow-emerald-500/30",
  },
  {
    title: "学员总数",
    key: "totalStudents" as const,
    icon: Users,
    gradient: "from-[#8b5cf6] to-[#5b21b6]",
    shadow: "shadow-violet-500/20",
    bgHover: "hover:shadow-violet-500/30",
  },
  {
    title: "待处理报名",
    key: "pendingStudents" as const,
    icon: UserCheck,
    gradient: "from-[#f59e0b] to-[#b45309]",
    shadow: "shadow-amber-500/20",
    bgHover: "hover:shadow-amber-500/30",
  },
];

// 数字动画 Hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    countRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(easeProgress * end);
      
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

// 统计卡片组件
function StatCard({ config, value, index }: { config: typeof statsConfig[0]; value: number; index: number }) {
  const animatedValue = useCountUp(value, 1200 + index * 200);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative bg-[#161922] rounded-xl p-6 border border-white/[0.06]",
        "transition-all duration-300 hover:-translate-y-1",
        config.bgHover
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* 背景渐变光晕 */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-br",
        config.gradient
      )} style={{ opacity: 0.03 }} />
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-3">
          <p className="text-sm text-gray-400 font-medium">{config.title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {animatedValue}
          </p>
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>实时更新</span>
          </div>
        </div>
        <div className={cn(
          "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center",
          config.gradient,
          config.shadow,
          "shadow-lg group-hover:scale-110 transition-transform duration-300"
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await managerFetch("/api/manager/dashboard");

        const result = await response.json();
        if (result.code === 200) {
          setStats(result.data.stats);
          setRecentStudents(result.data.recentStudents);
          setRecentArticles(result.data.recentArticles);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">加载失败，请刷新页面重试</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <p className="text-gray-400 mt-1 text-sm">欢迎回来，查看今日数据概况</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsConfig.map((config, index) => (
          <StatCard
            key={config.key}
            config={config}
            value={stats[config.key]}
            index={index}
          />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center shadow-lg shadow-amber-500/20">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-white">最新报名</h2>
            </div>
            <span className="text-xs text-gray-500 bg-white/[0.04] px-2.5 py-1 rounded-full">
              最近5条
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentStudents.length > 0 ? (
              recentStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      student.status === "pending"
                        ? "bg-amber-500/10 text-amber-400"
                        : student.status === "contacted"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      <span className="text-sm font-semibold">
                        {student.name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{student.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {student.course?.title || "未选择课程"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0",
                      student.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : student.status === "contacted"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    )}
                  >
                    {student.status === "pending"
                      ? "待处理"
                      : student.status === "contacted"
                      ? "已联系"
                      : "已转化"}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">暂无报名数据</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Articles */}
        <div className="bg-[#161922] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-white">热门文章</h2>
            </div>
            <span className="text-xs text-gray-500 bg-white/[0.04] px-2.5 py-1 rounded-full">
              最近5篇
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentArticles.length > 0 ? (
              recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm line-clamp-1 group-hover:text-[#EF4444] transition-colors">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(article.publishedAt || article.createdAt).split("T")[0]}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.viewCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <Newspaper className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">暂无文章数据</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
