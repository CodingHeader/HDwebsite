"use client";

/**
 * 后台 fetch：统一解包 ApiResponse 信封（契约②前端侧唯一实现）
 * 401 时清除会话并跳登录。
 */
import { useAuthStore } from "@/store/authStore";

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export async function managerFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/manager/login")) {
      window.location.href = "/manager/login";
    }
    throw new ApiError(401, "登录已过期，请重新登录");
  }
  const body = (await res.json()) as { code: number; data: T; message: string };
  if (body.code !== 200) throw new ApiError(body.code, body.message || "请求失败");
  return body.data;
}
