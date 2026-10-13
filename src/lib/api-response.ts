/**
 * 统一响应包工厂（契约② Errors 单一实现）
 * HTTP 状态码与业务 code 并行设置；data 失败时为 null。
 */
import { NextResponse } from "next/server";
import { toastCopy } from "@/contracts/common";
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

// ── ADR-028 扩增错误码（W0-04）：409 / 429 / 502 / 503 ────────
// 默认文案取 `toastCopy`（契约②前端展示口径的单一来源）

/** 409：唯一约束冲突（Prisma P2002） */
export function conflict(message: string = toastCopy.conflict) {
  return build(409, null, message, 409);
}

/** 429：限频（如 AI 咨询每 IP 每分钟 10 次） */
export function tooManyRequests(message: string = toastCopy.tooManyRequests) {
  return build(429, null, message, 429);
}

/** 502：上游失败（LLM / 微信 / 采集源） */
export function badGateway(message: string = toastCopy.badGateway) {
  return build(502, null, message, 502);
}

/** 503：全部模型额度/限频用尽 */
export function serviceUnavailable(message: string = toastCopy.serviceUnavailable) {
  return build(503, null, message, 503);
}

const ZOD_DEFAULT = /^(Invalid|Expected|Too (small|big)|Unrecognized|Required)/i;

/** zod 默认英文消息 → 中文字段级说明（P06：含 zod v4 "Invalid option"） */
export function localizeIssue(message: string): string {
  if (!ZOD_DEFAULT.test(message)) return message;
  if (/^Invalid option/i.test(message)) return "取值不在允许范围内";
  if (/received undefined/i.test(message) || /^Required/i.test(message)) return "不能为空";
  if (/^Too small/i.test(message)) return "长度或数值过小";
  if (/^Too big/i.test(message)) return "长度或数值过大";
  if (/^Unrecognized/i.test(message)) return "包含不支持的字段";
  if (/expected (number|int)/i.test(message)) return "须为数字";
  if (/expected boolean/i.test(message)) return "须为布尔值";
  if (/expected (string|date)/i.test(message)) return "格式不正确";
  return "格式不正确";
}

/**
 * zod 校验失败 → 400（契约②）：
 * - message：首个问题；zod 默认英文统一为"参数校验失败：字段 说明"，自定义中文文案原样返回
 * - data.fieldErrors：{ 字段路径: 中文说明 }（字段级，供表单逐项标红；P06）
 */
export function validationError(issues: { message: string; path?: (string | number | symbol)[] }[]) {
  const first = issues[0];
  if (!first) return build(400, null, "参数校验失败", 400);
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path?.length ? issue.path.map(String).join(".") : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = localizeIssue(issue.message);
  }
  const pathStr = first.path?.length ? first.path.map(String).join(".") : "";
  const message = ZOD_DEFAULT.test(first.message)
    ? `参数校验失败${pathStr ? `：${pathStr} ${localizeIssue(first.message)}` : ""}`
    : first.message;
  return build(400, { fieldErrors }, message, 400);
}
