/**
 * 通用 CRUD 路由工厂（R2 收敛：25 个管理资源共用一套列表/创建/详情/更新/删除实现）
 * - 鉴权：requireAuth(`${module}:action`)；审核类操作用 superAdminOnly（ADR-017）
 * - 校验：契约 zod（src/contracts/resources.ts）
 * - 响应：统一 ApiResponse 信封 + 分页；keyword 走 searchFields OR 模糊
 * - 审计：写操作经 logOperation 留痕
 */
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { created, error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { listQuerySchema, idParamSchema } from "@/contracts";
import type { z } from "zod";
import type { Prisma } from ".prisma/client";

type AnyRecord = Record<string, unknown>;

export type CrudSpec = {
  /** prisma delegate 名（如 "article"） */
  model: string;
  /** 权限模块名（对应权限点 module:list/create/edit/delete） */
  permission: string;
  /** 审计日志模块名（默认同 permission） */
  logModule?: string;
  /** keyword 模糊搜索字段 */
  searchFields: string[];
  /** 默认排序（列表） */
  orderBy?: AnyRecord[];
  /** 列表/详情 include 关联 */
  include?: AnyRecord;
  /** 列表附加过滤（来自 query，除 page/limit/keyword 外） */
  filters?: Record<string, "string" | "number" | "boolean">;
  /** 创建 schema */
  createSchema?: z.ZodObject<z.ZodRawShape>;
  /** 更新 schema（默认 createSchema.partial()） */
  updateSchema?: z.ZodObject<z.ZodRawShape>;
  /** 创建前钩子（如 slug 生成、密码哈希）；抛错即 400 */
  beforeCreate?: (input: AnyRecord, session: { id: number; username: string }) => Promise<AnyRecord>;
  /** 更新前钩子 */
  beforeUpdate?: (input: AnyRecord, existing: AnyRecord) => Promise<AnyRecord>;
  /** 创建数据收尾（authorId 等） */
  extraCreate?: (session: { id: number }) => AnyRecord;
  /** 资源中文名（日志与错误文案） */
  label: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function delegate(model: string): any {
  const d = (prisma as any)[model];
  if (!d) throw new Error(`未知 Prisma 模型：${model}`);
  return d;
}

function buildWhere(spec: CrudSpec, url: URL): AnyRecord {
  const where: AnyRecord = {};
  for (const [key, type] of Object.entries(spec.filters ?? {})) {
    const raw = url.searchParams.get(key);
    if (raw === null || raw === "") continue;
    if (type === "number") where[key] = Number(raw);
    else if (type === "boolean") where[key] = raw === "true";
    else where[key] = raw;
  }
  return where;
}

export function crudList(spec: CrudSpec) {
  return async function GET(request: Request): Promise<Response> {
    const guard = await requireAuth(request, `${spec.permission}:list`);
    if (!guard.ok) return guard.response;
    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return validationError(parsed.error.issues);
    const { page, limit, keyword } = parsed.data;
    try {
      const where: AnyRecord = buildWhere(spec, url);
      if (keyword && spec.searchFields.length) {
        where.OR = spec.searchFields.map((f) => ({ [f]: { contains: keyword } }));
      }
      const [list, total] = await Promise.all([
        delegate(spec.model).findMany({
          where,
          include: spec.include,
          orderBy: spec.orderBy ?? [{ createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        delegate(spec.model).count({ where }),
      ]);
      return success(
        { list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
        `获取${spec.label}列表成功`
      );
    } catch (err) {
      console.error(`[${spec.model}/GET] 查询失败：`, err);
      return serverError(`获取${spec.label}列表失败`);
    }
  };
}

export function crudCreate(spec: CrudSpec) {
  return async function POST(request: Request): Promise<Response> {
    const guard = await requireAuth(request, `${spec.permission}:create`);
    if (!guard.ok) return guard.response;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("请求体不是合法 JSON");
    }
    if (!spec.createSchema) return error(`${spec.label}不支持创建`, 400);
    const parsed = spec.createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues);
    try {
      let data = parsed.data as AnyRecord;
      if (spec.beforeCreate) data = await spec.beforeCreate(data, guard.session);
      if (spec.extraCreate) data = { ...data, ...spec.extraCreate(guard.session) };
      const row = await delegate(spec.model).create({ data, include: spec.include });
      await logOperation({
        userId: guard.session.id,
        username: guard.session.username,
        module: spec.logModule ?? spec.permission,
        action: "create",
        title: String((row as AnyRecord).title ?? (row as AnyRecord).name ?? (row as AnyRecord).id ?? ""),
        after: { id: (row as AnyRecord).id },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return created(row, `创建${spec.label}成功`);
    } catch (err) {
      console.error(`[${spec.model}/POST] 创建失败：`, err);
      if (isUniqueViolation(err)) return error(`${spec.label}已存在（唯一字段冲突）`, 400);
      if (isForeignKeyViolation(err)) return error("关联数据不存在", 400);
      return serverError(`创建${spec.label}失败`);
    }
  };
}

export function crudGet(spec: CrudSpec) {
  return async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
    const guard = await requireAuth(request, `${spec.permission}:list`);
    if (!guard.ok) return guard.response;
    const { id: rawId } = await ctx.params;
    const parsedId = idParamSchema.safeParse(rawId);
    if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
    try {
      const row = await delegate(spec.model).findUnique({ where: { id: parsedId.data }, include: spec.include });
      if (!row) return notFound(`${spec.label}不存在`);
      return success(row, `获取${spec.label}成功`);
    } catch (err) {
      console.error(`[${spec.model}/GET:id] 查询失败：`, err);
      return serverError(`获取${spec.label}失败`);
    }
  };
}

export function crudUpdate(spec: CrudSpec) {
  return async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
    const guard = await requireAuth(request, `${spec.permission}:edit`);
    if (!guard.ok) return guard.response;
    const { id: rawId } = await ctx.params;
    const parsedId = idParamSchema.safeParse(rawId);
    if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("请求体不是合法 JSON");
    }
    if (!spec.updateSchema && !spec.createSchema) return error(`${spec.label}不支持更新`, 400);
    const updateSchema = spec.updateSchema ?? spec.createSchema!.partial();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues);
    try {
      const existing = await delegate(spec.model).findUnique({ where: { id: parsedId.data } });
      if (!existing) return notFound(`${spec.label}不存在`);
      let data = parsed.data as AnyRecord;
      if (spec.beforeUpdate) data = await spec.beforeUpdate(data, existing as AnyRecord);
      const row = await delegate(spec.model).update({
        where: { id: parsedId.data },
        data,
        include: spec.include,
      });
      await logOperation({
        userId: guard.session.id,
        username: guard.session.username,
        module: spec.logModule ?? spec.permission,
        action: "update",
        title: String((row as AnyRecord).title ?? (row as AnyRecord).name ?? parsedId.data),
        before: { id: parsedId.data },
        after: { id: parsedId.data },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return success(row, `更新${spec.label}成功`);
    } catch (err) {
      console.error(`[${spec.model}/PUT:id] 更新失败：`, err);
      if (isUniqueViolation(err)) return error(`${spec.label}已存在（唯一字段冲突）`, 400);
      if (isForeignKeyViolation(err)) return error("关联数据不存在", 400);
      return serverError(`更新${spec.label}失败`);
    }
  };
}

export function crudDelete(spec: CrudSpec) {
  return async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
    const guard = await requireAuth(request, `${spec.permission}:delete`);
    if (!guard.ok) return guard.response;
    const { id: rawId } = await ctx.params;
    const parsedId = idParamSchema.safeParse(rawId);
    if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
    try {
      const existing = await delegate(spec.model).findUnique({ where: { id: parsedId.data } });
      if (!existing) return notFound(`${spec.label}不存在`);
      await delegate(spec.model).delete({ where: { id: parsedId.data } });
      await logOperation({
        userId: guard.session.id,
        username: guard.session.username,
        module: spec.logModule ?? spec.permission,
        action: "delete",
        title: String((existing as AnyRecord).title ?? (existing as AnyRecord).name ?? parsedId.data),
        before: { id: parsedId.data },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return success({ id: parsedId.data }, `删除${spec.label}成功`);
    } catch (err) {
      console.error(`[${spec.model}/DELETE:id] 删除失败：`, err);
      if (isForeignKeyViolation(err)) return error("存在关联数据，无法删除", 400);
      return serverError(`删除${spec.label}失败`);
    }
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2003";
}
