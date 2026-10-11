/**
 * 统一响应包工厂（契约② Errors 单一实现）
 * HTTP 状态码与业务 code 并行设置；data 失败时为 null。
 */
import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@/contracts";

function build<T>(code: number, data: T, message: string, status: number) {
  return NextResponse.json<ApiEnvelope<T>>({ code, data, message }, { status });
}

export function success<T>(data: T, message = "操作成功") {
  return build(200, data, message, 200);
}

export function created<T>(data: T, message = "创建成功") {
  return build(200, data, message, 201);
}

export function error(message: string, code = 400, status?: number) {
  return build(code, null, message, status ?? code);
}

export function unauthorized(message = "未授权访问") {
  return build(401, null, message, 401);
}

export function forbidden(message = "权限不足") {
  return build(403, null, message, 403);
}

export function notFound(message = "资源不存在") {
  return build(404, null, message, 404);
}

export function serverError(message = "服务器错误") {
  return build(500, null, message, 500);
}

/** zod 校验失败 → 400 + 中文文案（契约②：默认 zod 英文消息统一转为参数校验失败 + 字段路径） */
export function validationError(issues: { message: string; path?: (string | number | symbol)[] }[]) {
  const first = issues[0];
  if (!first) return build(400, null, "参数校验失败", 400);
  const isZodDefault = /^(Invalid input|Expected|Too|Unrecognized|Required)/i.test(first.message);
  const pathStr = first.path?.length ? String(first.path[0]) : "";
  const message = isZodDefault
    ? `参数校验失败${pathStr ? `：${pathStr}` : ""}`
    : first.message;
  return build(400, null, message, 400);
}
