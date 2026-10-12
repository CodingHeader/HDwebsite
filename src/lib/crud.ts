/**
 * 通用 CRUD 路由工厂（R2 收敛：25 个管理资源共用一套列表/创建/详情/更新/删除实现）
 * - 包装：withApi（P03 统一鉴权/解析/异常 → 契约 500 + onApiError 钩子）
 * - 鉴权：`${module}:action`；审核类操作用 superAdminOnly（ADR-017）
 * - 校验：契约 zod（src/contracts/resources.ts）
 * - 响应：统一 ApiResponse 信封 + 分页；keyword 走 searchFields OR 模糊
 * - 审计：写操作经 logOperation 留痕
 */
import { prisma } from "@/lib/prisma";
import { created, error, notFound, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { badRequest, parseBody, parseId, parseQuery, withApi } from "@/lib/api-handler";
import { listQuerySchema } from "@/contracts";
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

type IdParams = { id: string };

function conflictMessages(spec: CrudSpec) {
  return { unique: `${spec.label}已存在（唯一字段冲突）`, foreignKey: "关联数据不存在" };
}

export function crudList(spec: CrudSpec) {
  return withApi(
    async ({ request }) => {
      const url = new URL(request.url);
      const { page, limit, keyword } = parseQuery(request, listQuerySchema);
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
    },
    { permission: `${spec.permission}:list`, errorMessage: `获取${spec.label}列表失败`, route: `${spec.model}/GET` }
  );
}

export function crudCreate(spec: CrudSpec) {
  return withApi(
    async ({ request, session }) => {
      if (!spec.createSchema) return error(`${spec.label}不支持创建`, 400);
      const input = await parseBody(request, spec.createSchema);
      let data = input as AnyRecord;
      if (spec.beforeCreate) data = await runHook(() => spec.beforeCreate!(data, session));
      if (spec.extraCreate) data = { ...data, ...spec.extraCreate(session) };
      const row = await delegate(spec.model).create({ data, include: spec.include });
      await logOperation({
        userId: session.id,
        username: session.username,
        module: spec.logModule ?? spec.permission,
        action: "create",
        title: String((row as AnyRecord).title ?? (row as AnyRecord).name ?? (row as AnyRecord).id ?? ""),
        after: { id: (row as AnyRecord).id },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return created(row, `创建${spec.label}成功`);
    },
    {
      permission: `${spec.permission}:create`,
      errorMessage: `创建${spec.label}失败`,
      route: `${spec.model}/POST`,
      conflictMessage: conflictMessages(spec),
    }
  );
}

export function crudGet(spec: CrudSpec) {
  return withApi<IdParams>(
    async ({ params }) => {
      const id = parseId(params.id);
      const row = await delegate(spec.model).findUnique({ where: { id }, include: spec.include });
      if (!row) return notFound(`${spec.label}不存在`);
      return success(row, `获取${spec.label}成功`);
    },
    { permission: `${spec.permission}:list`, errorMessage: `获取${spec.label}失败`, route: `${spec.model}/GET:id` }
  );
}

export function crudUpdate(spec: CrudSpec) {
  return withApi<IdParams>(
    async ({ request, params, session }) => {
      const id = parseId(params.id);
      if (!spec.updateSchema && !spec.createSchema) return error(`${spec.label}不支持更新`, 400);
      const updateSchema = spec.updateSchema ?? spec.createSchema!.partial();
      const input = await parseBody(request, updateSchema);
      const existing = await delegate(spec.model).findUnique({ where: { id } });
      if (!existing) return notFound(`${spec.label}不存在`);
      let data = input as AnyRecord;
      if (spec.beforeUpdate) data = await runHook(() => spec.beforeUpdate!(data, existing as AnyRecord));
      const row = await delegate(spec.model).update({ where: { id }, data, include: spec.include });
      await logOperation({
        userId: session.id,
        username: session.username,
        module: spec.logModule ?? spec.permission,
        action: "update",
        title: String((row as AnyRecord).title ?? (row as AnyRecord).name ?? id),
        before: { id },
        after: { id },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return success(row, `更新${spec.label}成功`);
    },
    {
      permission: `${spec.permission}:edit`,
      errorMessage: `更新${spec.label}失败`,
      route: `${spec.model}/PUT:id`,
      conflictMessage: conflictMessages(spec),
    }
  );
}

export function crudDelete(spec: CrudSpec) {
  return withApi<IdParams>(
    async ({ request, params, session }) => {
      const id = parseId(params.id);
      const existing = await delegate(spec.model).findUnique({ where: { id } });
      if (!existing) return notFound(`${spec.label}不存在`);
      await delegate(spec.model).delete({ where: { id } });
      await logOperation({
        userId: session.id,
        username: session.username,
        module: spec.logModule ?? spec.permission,
        action: "delete",
        title: String((existing as AnyRecord).title ?? (existing as AnyRecord).name ?? id),
        before: { id },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return success({ id }, `删除${spec.label}成功`);
    },
    {
      permission: `${spec.permission}:delete`,
      errorMessage: `删除${spec.label}失败`,
      route: `${spec.model}/DELETE:id`,
      conflictMessage: { foreignKey: "存在关联数据，无法删除" },
    }
  );
}

/** before* 钩子抛出的普通 Error 视为业务校验失败（400，沿用原"抛错即 400"约定） */
async function runHook<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isPrisma = err instanceof Error && err.name.startsWith("PrismaClient");
    const hasCode = typeof (err as { code?: unknown })?.code === "string";
    if (err instanceof Error && !isPrisma && !hasCode) throw badRequest(err.message);
    throw err;
  }
}
