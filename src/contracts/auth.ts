/**
 * 契约：认证与身份（契约③ Identity）
 * - 用户 ID：Int 自增；角色：SuperAdmin/Editor/Viewer；权限字符串 "module:action"。
 * - JWT：HS256，7 天过期，payload { uid, username, roleId, isSuper, permissions }。
 * - 权限边界：/manager 与管理 API 需登录 + 权限点；review:edit 仅 SuperAdmin；
 *   公开接口：前台读、chat、user-actions POST、settings GET（isPublic 字段）。
 */
import { z } from "zod";

export const loginRequestSchema = z.object({
  username: z.string().min(1, "请输入用户名").max(64),
  password: z.string().min(1, "请输入密码").max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const roleSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  permissions: z.array(z.string()),
  isSuper: z.boolean(),
});

export const sessionUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  nickname: z.string().nullable(),
  email: z.string().nullable(),
  role: roleSummarySchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authPayloadSchema = z.object({
  token: z.string(),
  user: sessionUserSchema,
});

export type AuthPayload = z.infer<typeof authPayloadSchema>;

export const jwtClaimsSchema = z.object({
  uid: z.number(),
  username: z.string(),
  roleId: z.number(),
  isSuper: z.boolean(),
  permissions: z.array(z.string()),
});

export type JwtClaims = z.infer<typeof jwtClaimsSchema>;

/** 权限点全集（含新增模块，SOL-001~006；review:edit 仅 SuperAdmin） */
export const permissionCatalog = {
  // article:publish —— 一键上下线（PATCH /api/articles/[id]，main parity B3）
  article: ["list", "create", "edit", "delete", "publish"],
  category: ["list", "create", "edit", "delete"],
  tag: ["list", "create", "edit", "delete"],
  course: ["list", "create", "edit", "delete"],
  major: ["list", "create", "edit", "delete"],
  enrollment: ["list", "create", "edit", "delete"],
  student: ["list", "create", "edit", "delete"],
  banner: ["list", "create", "edit", "delete"],
  navigation: ["list", "create", "edit", "delete"],
  media: ["list", "create", "edit", "delete"],
  partner: ["list", "create", "edit", "delete"],
  gallery: ["list", "create", "edit", "delete"],
  campus: ["list", "create", "edit", "delete"],
  service: ["list", "create", "edit", "delete"],
  user: ["list", "create", "edit", "delete"],
  role: ["list", "create", "edit", "delete"],
  // setting:create/delete —— AI 场景（chat-scenes，crud 工厂 permission=setting）的新增/删除（P03 补齐）
  setting: ["list", "create", "edit", "delete"],
  // log:delete —— 删除对话日志会话（P03；比 log:list 更严，查看与删除分权）
  log: ["list", "delete"],
  // P03：以路由实际使用为准补齐（crud 工厂按 module:list/create/edit/delete 派生；只新增不改名）
  content: ["list", "create", "edit", "delete"],
  collect: ["list", "create", "edit", "delete"],
  publish: ["list", "create", "edit", "delete"],
  kb: ["list", "create", "edit", "delete"],
  llm: ["list", "edit"],
  notify: ["list", "create", "edit", "delete"],
  wechat: ["list", "edit"],
  review: ["edit"],
} as const;

export type PermissionAction =
  | `${keyof typeof permissionCatalog}:${(typeof permissionCatalog)[keyof typeof permissionCatalog][number]}`
  | "*";

/** SuperAdmin 独享权限（ADR-017） */
export const superAdminOnlyPermissions = ["review:edit"];
