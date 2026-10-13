/**
 * 契约唯一源（Contract Single Source）
 * =====================================
 * 全项目 API 请求/响应 Schema 的唯一权威定义（master-plan §4 契约冻结包①②③）。
 * 规则：
 * - 后端路由校验、前端表单校验、类型推导一律从本目录导入，禁止在他处重复定义 DTO。
 * - 字段命名 camelCase；时间格式 ISO 8601 字符串；分页 page/limit/total/totalPages。
 * - 错误契约：ApiResponse code 200/400/401/403/404/409/429/500/502/503，data 失败时为 null（ADR-028）。
 */
import { z } from "zod";

// ── 统一响应包（13-响应设计 §1） ──────────────────────────────

export const apiResponseCodeSchema = z.union([
  z.literal(200),
  z.literal(400),
  z.literal(401),
  z.literal(403),
  z.literal(404),
  z.literal(409),
  z.literal(429),
  z.literal(500),
  z.literal(502),
  z.literal(503),
]);

// data 形态由各接口泛型指定；此处仅约束信封
export const apiEnvelopeSchema = z.object({
  code: z.number(),
  data: z.unknown().nullable(),
  message: z.string(),
});

export type ApiEnvelope<T = unknown> = {
  code: number;
  data: T;
  message: string;
};

// ── 分页（列表接口统一形态） ─────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().max(200).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type Pagination = z.infer<typeof paginationSchema>;

export function paginated<T>(list: T[], pagination: Pagination) {
  return { list, pagination };
}

// ── 错误码枚举（契约②） ─────────────────────────────────────

export const errorCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ── 通用 ID 路径参数 ────────────────────────────────────────

export const idParamSchema = z.coerce.number().int().positive();

// ── UX 五态（契约⑥，P05）────────────────────────────────────
// 管理端每个数据视图必须能呈现以下五态之一；组件实现见 src/components/manager/feedback/**。

export const uxStateSchema = z.enum(["loading", "empty", "error", "forbidden", "success"]);
export type UxState = z.infer<typeof uxStateSchema>;

/** Toast 文案约定：成功用固定短句；失败优先用后端 message，缺省时用下列兜底 */
export const toastCopy = {
  saved: "已保存",
  created: "已创建",
  deleted: "已删除",
  updated: "已更新",
  failed: "操作失败，请稍后重试",
  network: "网络异常，请检查网络后重试",
  forbidden: "当前账号没有此操作的权限",
  // ── ADR-028 扩增（W0-04）──
  conflict: "数据已存在或已被他人修改，请刷新后重试",
  tooManyRequests: "操作太频繁，请稍后再试",
  badGateway: "上游服务暂时不可用，请稍后重试",
  serviceUnavailable: "服务繁忙或额度已用尽，请稍后再试",
} as const;
