import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState, AuthActions } from '@/types/auth';

/**
 * 认证状态管理Store
 * 使用Zustand + persist中间件实现状态持久化
 */

// Store状态类型
interface AuthStoreState extends AuthState, AuthActions {}

// 初始状态
const initialState: Omit<AuthState, 'hasHydrated'> = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

/**
 * 认证Store
 * 管理登录状态、用户信息、Token
 * 自动持久化到localStorage
 */
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...initialState,
      hasHydrated: false,

      /**
       * 登录
       * 设置token和用户信息，标记为已认证
       * 同时设置 hasHydrated = true 以确保 useEffect 可以触发跳转
       */
      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          hasHydrated: true, // 确保 hydration 完成，可以触发跳转
        });
      },

      /**
       * 登出
       * 清除所有认证状态
       */
      logout: () => {
        set({
          ...initialState,
          hasHydrated: true,
        });
      },

      /**
       * 设置用户信息
       * 用于更新用户信息而不改变认证状态
       */
      setUser: (user: User) => {
        set({ user });
      },

      /**
       * 更新Token
       * 用于Token刷新
       */
      updateToken: (token: string) => {
        set({ token });
      },

      /**
       * 清除认证状态
       * 与logout相同，用于语义清晰的场景
       */
      clearAuth: () => {
        set({
          ...initialState,
          hasHydrated: true,
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage键名
      storage: createJSONStorage(() => localStorage),
      
      // 只持久化这些字段
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),

      // hydration完成后的回调
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

/**
 * 获取当前认证状态（非Hook方式）
 * 用于在组件外部获取状态
 */
export const getAuthState = () => {
  return useAuthStore.getState();
};

/**
 * 检查是否已登录
 * 用于快速检查认证状态
 */
export const isLoggedIn = () => {
  const state = useAuthStore.getState();
  return state.isAuthenticated && state.token !== null;
};

/**
 * 获取当前Token
 * 用于API请求
 */
export const getToken = () => {
  return useAuthStore.getState().token;
};

/**
 * 获取当前用户
 * 用于获取用户信息
 */
export const getCurrentUser = () => {
  return useAuthStore.getState().user;
};
