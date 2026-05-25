/**
 * 认证相关类型定义
 * Auth Type Definitions
 */

/**
 * 用户角色信息
 */
export interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  isSuper: boolean;
}

/**
 * 用户信息
 */
export interface User {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  role: Role;
}

/**
 * 认证状态
 */
export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
}

/**
 * 认证操作
 */
export interface AuthActions {
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  updateToken: (token: string) => void;
  clearAuth: () => void;
}

/**
 * 登录凭证
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  code: number;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

/**
 * 认证错误
 */
export interface AuthError {
  code: number;
  message: string;
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
}
