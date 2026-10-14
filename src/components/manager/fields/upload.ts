"use client";

/** 统一上传：POST /api/upload（multipart），返回文件 URL；失败抛出可读错误 */
import { useAuthStore } from "@/store/authStore";

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const token = useAuthStore.getState().token;
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error("网络异常，请检查网络后重试");
  }
  const body = (await res.json().catch(() => null)) as { code: number; data: { url: string } | null; message: string } | null;
  if (!body) throw new Error(`服务器异常（HTTP ${res.status}）`);
  if (body.code !== 200 || !body.data) throw new Error(body.message || "上传失败");
  return body.data.url;
}
