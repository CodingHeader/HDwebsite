/**
 * 统一 API 路由包装（P03 / REQ-F-011 接入点 / 13-响应设计）
 * ==========================================================
 * withApi(handler, { permission })：
 * - 鉴权：permission 为字符串 → requireAuth(request, permission)；auth:"optional" → 解析会话但不强制；
 *   默认（未给 permission 且未设 auth）为公开路由。
 * - 解析：handler 内用 parseBody / parseQuery / parseId（失败抛 ApiHttpError → 契约 400）。
 * - 异常：ApiHttpError → 对应契约响应（400/401/403/404/409/429/502/503，ADR-028）；Prisma P2002 → 409、P2003 → 400；
 *   其余未捕获异常 → onApiError 钩子（默认 console.error + notify-gateway system_error 多收件人邮件，P06）→ serverError()。
 * 响应信封始终是 { code, data, message }（src/contracts/common.ts）。
 */
import type { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import {
  badGateway,
  conflict,
  error,
  forbidden,
  notFound,
  serverError,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
  validationError,
} from "@/lib/api-response";
import { idParamSchema } from "@/contracts";
import type { SessionUser } from "@/contracts";

// ── 错误类型 ────────────────────────────────────────────────

type Issue = { message: string; path?: (string | number | symbol)[] };

/** 可抛出的契约错误状态（ADR-028；W1 各线一致使用） */
export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 502 | 503;

/** 业务可预期错误：在 handler 内 throw，即返回对应契约响应（不触发 onApiError） */
export class ApiHttpError extends Error {
  readonly status: ApiErrorStatus;
  readonly issues?: Issue[];
  constructor(status: ApiErrorStatus, message: string, issues?: Issue[]) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.issues = issues;
  }
}

export const badRequest = (message: string) => new ApiHttpError(400, message);
export const notFoundError = (message = "资源不存在") => new ApiHttpError(404, message);

// ── onApiError 钩子（P03 定义；P06 订阅邮件提醒） ─────────────

export type ApiErrorContext = {
  error: unknown;
  method: string;
  path: string;
  route?: string;
  username?: string | null;
  at: Date;
};
export type ApiErrorListener = (ctx: ApiErrorContext) => void | Promise<void>;

/** 默认监听（P06）：记日志 + system_error 邮件（notify-gateway 动态导入，避免循环依赖；10 分钟同类聚合） */
const defaultListener: ApiErrorListener = async (ctx) => {
  console.error(`[api-error] ${ctx.method} ${ctx.route ?? ctx.path}`, ctx.error);
  const { notifyApiError } = await import("@/lib/notify-gateway");
  await notifyApiError(ctx);
};

const listeners = new Set<ApiErrorListener>([defaultListener]);

/** 订阅未捕获 API 异常；返回取消订阅函数 */
export function onApiError(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 触发钩子（监听器自身失败不影响响应；异步监听器不阻塞响应） */
export function emitApiError(ctx: ApiErrorContext): void {
  for (const l of listeners) {
    try {
      const r = l(ctx);
      if (r && typeof (r as Promise<void>).catch === "function") (r as Promise<void>).catch(() => {});
    } catch {
      // 忽略监听器异常
    }
  }
}

// ── 解析工具 ────────────────────────────────────────────────

export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiHttpError(400, "请求体不是合法 JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiHttpError(400, "参数校验失败", parsed.error.issues);
  return parsed.data;
}

export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw new ApiHttpError(400, "参数校验失败", parsed.error.issues);
  return parsed.data;
}

export function parseId(raw: string | undefined, message = "非法 ID"): number {
  const parsed = idParamSchema.safeParse(raw);
  if (!parsed.success) throw new ApiHttpError(400, message, [{ message }]);
  return parsed.data;
}

// ── 包装器 ──────────────────────────────────────────────────

type RouteCtx<P> = { params: Promise<P> };

export type ApiContext<P, Authed extends boolean> = {
  request: Request;
  params: P;
  session: Authed extends true ? SessionUser : SessionUser | null;
};

type Options = {
  /** 需要的权限点（"module:action"）；给出即强制登录 */
  permission?: string;
  /** 只要求登录、不校验权限点 */
  auth?: true | "optional";
  /** 未捕获异常时返回的 500 文案 */
  errorMessage?: string;
  /** 日志/钩子中的路由标识 */
  route?: string;
  /** Prisma 唯一/外键冲突文案（默认通用文案） */
  conflictMessage?: { unique?: string; foreignKey?: string };
};

export function withApi<P = Record<string, string>>(
  handler: (ctx: ApiContext<P, true>) => Promise<Response>,
  options: Options & ({ permission: string } | { auth: true })
): (request: Request, ctx?: RouteCtx<P>) => Promise<Response>;
export function withApi<P = Record<string, string>>(
  handler: (ctx: ApiContext<P, false>) => Promise<Response>,
  options?: Options
): (request: Request, ctx?: RouteCtx<P>) => Promise<Response>;
export function withApi<P>(
  handler: (ctx: ApiContext<P, boolean>) => Promise<Response>,
  options: Options = {}
) {
  return async function route(request: Request, ctx?: RouteCtx<P>): Promise<Response> {
    let session: SessionUser | null = null;
    try {
      if (options.permission || options.auth === true) {
        const guard = await requireAuth(request, options.permission);
        if (!guard.ok) return guard.response;
        session = guard.session;
      } else if (options.auth === "optional") {
        session = await getSession(request);
      }
      const params = (ctx?.params ? await ctx.params : {}) as P;
      return await handler({ request, params, session });
    } catch (err) {
      return toErrorResponse(err, request, session, options);
    }
  };
}

function toErrorResponse(err: unknown, request: Request, session: SessionUser | null, options: Options): Response {
  if (err instanceof ApiHttpError) {
    if (err.status === 400) return err.issues?.length ? validationError(err.issues) : error(err.message, 400);
    if (err.status === 401) return unauthorized(err.message);
    if (err.status === 403) return forbidden(err.message);
    if (err.status === 404) return notFound(err.message);
    if (err.status === 409) return conflict(err.message);
    if (err.status === 429) return tooManyRequests(err.message);
    if (err.status === 502) return badGateway(err.message);
    return serviceUnavailable(err.message);
  }
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  // ADR-028：P2002 唯一冲突 → 409（原 400）
  if (code === "P2002") return conflict(options.conflictMessage?.unique ?? "数据已存在（唯一字段冲突）");
  if (code === "P2003") return error(options.conflictMessage?.foreignKey ?? "关联数据不存在或存在关联数据", 400);
  if (code === "P2025") return notFound("资源不存在");
  emitApiError({
    error: err,
    method: request.method,
    path: safePath(request.url),
    route: options.route,
    username: session?.username ?? null,
    at: new Date(),
  });
  return serverError(options.errorMessage ?? "服务器错误");
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
