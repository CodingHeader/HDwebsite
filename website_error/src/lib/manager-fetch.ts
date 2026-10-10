"use client";

import { getAuthState } from "@/store/authStore";

/**
 * 后台管理端请求封装：自动附带 Authorization 头
 */
export function managerFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthState().token;
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
