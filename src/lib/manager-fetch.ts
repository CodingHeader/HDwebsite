"use client";

/**
 * 后台 fetch：统一解包 ApiResponse 信封（契约②前端侧唯一实现）
 * - 401：清除会话并跳登录
 * - 403：抛 ForbiddenError（页面据此渲染 <Forbidden/>，契约⑥）
 * - 400：`data.fieldErrors` 透传到 `ApiError.fieldErrors`（表单逐项标红，P06）
 * - 409/429/502/503：抛 ApiError，文案取 `toastCopy`（ADR-028）
 * - 网络失败 / 非 JSON 响应（如 502 网关页）：抛 ApiError(0 | status, 可读文案)，页面渲染 ErrorState + 重试
 */
import { useAuthStore } from "@/store/authStore";
import { toastCopy } from "@/contracts/common";

/** 契约②：错误码 → 中文展示文案（ADR-028；这些码的后端错误体为 null，文案以前端为准） */
const CODE_COPY: Record<number, string> = {
  403: toastCopy.forbidden,
  409: toastCopy.conflict,
  429: toastCopy.tooManyRequests,
  502: toastCopy.badGateway,
  503: toastCopy.serviceUnavailable,
};

export class ApiError extends Error {
  code: number;
  /** 400 参数校验失败时后端返回的字段级错误（data.fieldErrors，契约②/P06；P07 表单逐项标红） */
  fieldErrors?: Record<string, string>;
  constructor(code: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
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
  let body: { code: number; data: unknown; message: string } | null = null;
  try {
    body = (await res.json()) as { code: number; data: unknown; message: string };
  } catch {
    body = null;
  }
  if (res.status === 403 || body?.code === 403) throw new ForbiddenError(body?.message);
  if (!body) throw new ApiError(res.status || 500, `服务器异常（HTTP ${res.status}），请稍后重试`);
  if (body.code !== 200) {
    // 契约②（ADR-028）：409/429/502/503 的后端错误体为 null，前端用 CODE_COPY 给可读文案；其余保留后端 message
    const message = CODE_COPY[body.code] ?? (body.message || toastCopy.failed);
    const fe = (body.data as { fieldErrors?: Record<string, string> } | null)?.fieldErrors;
    throw new ApiError(body.code, message, fe && typeof fe === "object" ? fe : undefined);
  }
  return body.data as T;
}
