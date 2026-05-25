import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User, Role } from '@prisma/client';
import { prisma } from './prisma';

// JWT 密钥 - 必须显式配置，确保服务端/客户端一致性
// 使用类型断言确保 TypeScript 知道 JWT_SECRET 是 string
const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET environment variable is required.\n' +
    'Please set it in .env.local file:\n' +
    'JWT_SECRET=your-secret-key-at-least-32-characters-long\n\n' +
    'For development, you can use:\n' +
    'JWT_SECRET=dev-jwt-secret-key-change-in-production-32chars'
  );
}
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
}

export interface SessionUser {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  role: {
    id: number;
    name: string;
    slug: string;
    permissions: string[];
    isSuper: boolean;
  };
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 从 Authorization 头提取 Token
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * 密码哈希
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * 密码比对
 */
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * 检查用户是否有指定权限
 * @param role - 用户角色
 * @param permission - 要检查的权限
 * @returns 是否有权限
 */
export function checkPermission(role: Role, permission: string): boolean {
  // 超级管理员拥有所有权限
  if (role.isSuper) {
    return true;
  }

  // 解析权限数组（带容错）
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(role.permissions || '[]');
  } catch {
    permissions = [];
  }

  // 检查完全匹配
  if (permissions.includes(permission)) {
    return true;
  }

  // 检查通配符权限 (如 "article:*" 匹配 "article:create")
  const [module, action] = permission.split(':');
  if (permissions.includes(`${module}:*`)) {
    return true;
  }

  // 检查全局通配符
  if (permissions.includes('*')) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否有多个权限中的任意一个
 */
export function checkAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some(p => checkPermission(role, p));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function checkAllPermissions(role: Role, permissions: string[]): boolean {
  return permissions.every(p => checkPermission(role, p));
}

/**
 * 根据 Token 获取当前用户完整信息
 */
export async function getCurrentUser(token: string): Promise<SessionUser | null> {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });

  if (!user || !user.isActive || user.status !== 'active') {
    return null;
  }

  // 解析权限数组（带容错）
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(user.role.permissions || '[]');
  } catch {
    permissions = [];
  }

  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    role: {
      id: user.role.id,
      name: user.role.name,
      slug: user.role.slug,
      permissions,
      isSuper: user.role.isSuper,
    },
  };
}

/**
 * 验证请求是否已认证
 * 用于 API 路由中验证用户身份
 */
export async function requireAuth(authHeader: string | null): Promise<SessionUser> {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    throw new Error('未提供认证令牌');
  }

  const user = await getCurrentUser(token);
  if (!user) {
    throw new Error('认证无效或已过期');
  }

  return user;
}

/**
 * 验证请求是否有指定权限
 */
export async function requirePermission(authHeader: string | null, permission: string): Promise<SessionUser> {
  const user = await requireAuth(authHeader);

  // 创建一个符合 Role 类型的对象用于权限检查
  const roleForCheck: Role = {
    id: user.role.id,
    name: user.role.name,
    slug: user.role.slug,
    description: null,
    permissions: JSON.stringify(user.role.permissions),
    isSuper: user.role.isSuper,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!checkPermission(roleForCheck, permission)) {
    throw new Error(`权限不足：需要 ${permission}`);
  }

  return user;
}
