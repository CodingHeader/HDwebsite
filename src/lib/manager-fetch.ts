"use client";

/**
 * 后台 fetch：统一解包 ApiResponse 信封（契约②前端侧唯一实现）
 * - 401：清除会话并跳登录
 * - 403：抛 ForbiddenError（页面据此渲染 <Forbidden/>，契约⑥）
 * - 网络失败 / 非 JSON 响应（如 502 网关页）：抛 ApiError(0 | status, 可读文案)，页面渲染 ErrorState + 重试
 */
import { useAuthStore } from "@/store/authStore";
import { toastCopy } from "@/contracts/common";

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** 无权限（HTTP 403 或信封 code 403） */
export class ForbiddenError extends ApiError {
  constructor(message?: string) {
    super(403, message || toastCopy.forbidden);
    this.name = "ForbiddenError";
  }
}

export function isForbidden(err: unknown): err is ForbiddenError {
  return err instanceof ForbiddenError || (err instanceof ApiError && err.code === 403);
}

/** 将任意异常转为可展示文案 */
export function errorMessage(err: unknown, fallback: string = toastCopy.failed): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function managerFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, toastCopy.network);
  }
  if (res.status === 401) {
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/manager/login")) {
      window.location.href = "/manager/login";
    }
    throw new ApiError(401, "登录已过期，请重新登录");
  }
  let body: { code: number; data: T; message: string } | null = null;
  try {
    body = (await res.json()) as { code: number; data: T; message: string };
  } catch {
    body = null;
  }
  if (res.status === 403 || body?.code === 403) throw new ForbiddenError(body?.message);
  if (!body) throw new ApiError(res.status || 500, `服务器异常（HTTP ${res.status}），请稍后重试`);
  if (body.code !== 200) throw new ApiError(body.code, body.message || "请求失败");
  return body.data;
}
