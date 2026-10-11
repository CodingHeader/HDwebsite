"use client";

/**
 * 后台会话状态（zustand + persist 落 localStorage，原项目口径）
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionUser } from "@/contracts";

type AuthState = {
  token: string | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (token: string, user: SessionUser) => void;
  clear: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      clear: () => set({ token: null, user: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "hd-manager-auth",
      partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
