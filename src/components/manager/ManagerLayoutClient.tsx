"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/manager/Sidebar";
import { Header } from "@/components/manager/Header";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface User {
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

export function ManagerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isAuthenticated, hasHydrated, user: storeUser, logout } = useAuthStore();
  const [user, setUser] = useState<typeof storeUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (pathname === "/manager/login") {
      return;
    }

    if (!hasHydrated) {
      return;
    }

    if (hasVerifiedRef.current && user) {
      return;
    }

    const verifyAuth = async () => {
      setIsVerifying(true);

      if (!isAuthenticated || !token) {
        logout();
        router.push("/manager/login");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();

        if (result.code === 200) {
          setUser(result.data);
          hasVerifiedRef.current = true;
          return;
        }

        hasVerifiedRef.current = false;
        logout();
        router.push("/manager/login");
      } catch (error) {
        console.error("Auth verification failed:", error);
        hasVerifiedRef.current = false;
        logout();
        router.push("/manager/login");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [hasHydrated, isAuthenticated, token, logout, router, user, pathname]);

  if (pathname === "/manager/login") {
    return (
      <div className="dark min-h-screen bg-[#0f1117]">
        {children}
      </div>
    );
  }

  if (!hasHydrated || isVerifying) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#0f1117]">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="dark flex min-h-screen bg-[#0f1117]">
      <Sidebar user={user as User} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user as User} />
        <main className="flex-1 p-8 overflow-auto bg-[#0f1117]">
          {children}
        </main>
      </div>
    </div>
  );
}
