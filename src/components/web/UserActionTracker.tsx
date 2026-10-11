"use client";

/**
 * UserAction 最小埋点（ASM-008）：表单提交 + 关键页浏览
 * - 本组件挂在 (web)/layout：上报 page_view（页面路径变化时）
 * - expose trackSubmit(target)：供报名等表单提交时调用（window.__hdTrack）
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function sessionId(): string {
  const KEY = "hd_session_id";
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

function send(actionType: "view" | "submit", actionTarget: string, extra?: Record<string, unknown>) {
  const payload = {
    actionType,
    actionTarget,
    sessionId: sessionId(),
    pageUrl: window.location.pathname,
    pageTitle: document.title,
    referrer: document.referrer || undefined,
    metadata: extra,
  };
  fetch("/api/user-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

declare global {
  interface Window {
    __hdTrack?: {
      submit: (target: string, extra?: Record<string, unknown>) => void;
    };
  }
}

export function UserActionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    window.__hdTrack = {
      submit: (target, extra) => send("submit", target, extra),
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const t = setTimeout(() => send("view", "page_view"), 800);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
