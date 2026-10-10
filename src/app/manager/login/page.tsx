"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, GraduationCap, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { getSetting } = useSettings();
  const { login } = useAuthStore();
  const schoolShortName = getSetting("schoolShortName", "弘道教育");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const watchedFields = watch();
  const hasInput = watchedFields.username || watchedFields.password;

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || "登录失败");
      }

      // Store token and user in Auth Store
      // Store will automatically persist to localStorage via persist middleware
      login(result.data.token, result.data.user);

      // 登录成功后直接跳转，不依赖 useEffect
      window.location.href = "/manager";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      
      {/* Gradient Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-[#DC2626]/20 rounded-full blur-[128px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-[#DC2626]/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-[400px] px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#DC2626] shadow-lg shadow-[#DC2626]/25 mb-6">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-1">
            {schoolShortName}
          </h1>
          <p className="text-white/40 text-sm">后台管理系统</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111111] rounded-2xl border border-white/[0.08] p-8 shadow-2xl shadow-black/50">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-white/70">
                用户名
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#DC2626] transition-colors" />
                <Input
                  id="username"
                  placeholder="请输入用户名"
                  {...register("username")}
                  className={cn(
                    "pl-10 h-11 bg-white/[0.04] border-white/[0.08] rounded-lg text-white placeholder:text-white/30",
                    "focus:bg-white/[0.08] focus:border-[#DC2626]/50 focus:ring-0",
                    "transition-all duration-200",
                    errors.username && "border-red-500/50"
                  )}
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/70">
                密码
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#DC2626] transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  {...register("password")}
                  className={cn(
                    "pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.08] rounded-lg text-white placeholder:text-white/30",
                    "focus:bg-white/[0.08] focus:border-[#DC2626]/50 focus:ring-0",
                    "transition-all duration-200",
                    errors.password && "border-red-500/50"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                "w-full h-11 mt-2 rounded-lg font-medium transition-all duration-200",
                "bg-red-600 hover:bg-red-700",
                "shadow-lg shadow-[#DC2626]/25 hover:shadow-[#DC2626]/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "text-white"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  登录中...
                </div>
              ) : (
                "登录"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-white/30">
          © 2024 {schoolShortName} · 后台管理系统
        </p>
      </div>
    </div>
  );
}
