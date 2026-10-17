"use client";

/**
 * 管理后台登录（P02 设计系统）：品牌分栏 + 表单卡片；标签/错误提示可访问、显示密码切换、回车提交、加载态。
 * 登录流程与契约保持不变：POST /api/auth/login → setAuth → /manager。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { AuthPayload } from "@/contracts";
import { Button, IconButton, Input } from "@/components/manager/ui";
import { Label } from "@/components/manager/ui/form-field";

const fieldClass =
  "h-10 rounded-mgr-control border-mgr-border bg-mgr-surface pl-9 text-[14px] text-mgr-fg placeholder:text-mgr-muted-fg focus-visible:border-mgr-primary focus-visible:ring-2 focus-visible:ring-mgr-primary/25";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as { code: number; data: AuthPayload | null; message: string };
      if (body.code !== 200 || !body.data) {
        setError(body.message || "登录失败");
        return;
      }
      setAuth(body.data.token, body.data.user);
      router.replace("/manager");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-mgr-bg lg:grid-cols-[1fr_minmax(480px,560px)]">
      {/* 品牌分栏（桌面） */}
      <aside className="relative hidden overflow-hidden bg-mgr-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3 text-mgr-primary-fg">
          <span className="flex h-10 w-10 items-center justify-center rounded-mgr-card bg-white/15 text-lg font-bold">弘</span>
          <span className="text-[16px] font-semibold">弘道教育 · 管理后台</span>
        </div>
        <div className="relative max-w-md text-mgr-primary-fg">
          <h2 className="text-[30px] font-semibold leading-tight">内容、招生与 AI 客服，一处管好</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/80">
            文章与轮播即时上线，报名线索实时可见，知识库与模型配置集中管理。
          </p>
        </div>
        <p className="relative flex items-center gap-2 text-[12px] text-white/70">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          仅限授权人员使用，操作全程留痕
        </p>
      </aside>

      {/* 表单 */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-mgr-card bg-mgr-primary text-lg font-bold text-mgr-primary-fg">弘</span>
            <span className="text-[16px] font-semibold text-mgr-fg">弘道教育 · 管理后台</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-mgr-fg">欢迎回来</h1>
          <p className="mt-1 text-[13px] text-mgr-muted-fg">请使用后台账号登录</p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 space-y-5 rounded-mgr-card border border-mgr-border bg-mgr-surface p-6 shadow-mgr-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-[13px] text-mgr-fg">
                用户名
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
                <Input
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-[13px] text-mgr-fg">
                密码
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className={`${fieldClass} pr-10`}
                />
                <IconButton
                  label={showPassword ? "隐藏密码" : "显示密码"}
                  aria-pressed={showPassword}
                  size="sm"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </IconButton>
              </div>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-mgr-control border border-mgr-danger/30 bg-mgr-danger/5 px-3 py-2 text-[13px] text-mgr-danger"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-mgr-control bg-mgr-primary text-[14px] font-semibold text-mgr-primary-fg hover:bg-mgr-primary-hover"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  登录中…
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
