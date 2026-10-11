"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { AuthPayload } from "@/contracts";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-xl font-bold text-center">管理后台登录</h1>
        <div className="mt-6 space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            autoComplete="username"
            className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            autoComplete="current-password"
            className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </div>
      </form>
    </div>
  );
}
