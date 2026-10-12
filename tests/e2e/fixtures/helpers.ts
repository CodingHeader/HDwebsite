/** E2E 公共步骤：UI 登录、API 调用（准备数据用）、Toast 断言 */
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { ADMIN } from "./env";

export async function loginUI(page: Page, user: { username: string; password: string } = ADMIN) {
  await page.goto("/manager/login");
  await page.locator("#login-username").fill(user.username);
  await page.locator("#login-password").fill(user.password);
  await page.locator("#login-password").press("Enter");
  await page.waitForURL(/\/manager\/?$/);
}

export async function apiToken(request: APIRequestContext, user: { username: string; password: string } = ADMIN): Promise<string> {
  const res = await request.post("/api/auth/login", { data: user });
  const body = await res.json();
  expect(body.code, `登录 ${user.username} 失败：${body.message}`).toBe(200);
  return body.data.token as string;
}

export async function api<T = unknown>(
  request: APIRequestContext,
  token: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: unknown
): Promise<T> {
  const res = await request.fetch(path, { method, data, headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  expect(body.code, `${method} ${path} → ${body.message}`).toBe(200);
  return body.data as T;
}

/** 断言出现成功 Toast（可选标题文本） */
export async function expectToast(page: Page, kind: "success" | "error", text?: string | RegExp) {
  const toast = page.getByTestId(`toast-${kind}`).filter(text ? { hasText: text } : {});
  await expect(toast.first()).toBeVisible();
}

/** 在当前打开的表单弹窗内按 label 填写 */
export function dialog(page: Page) {
  return page.getByTestId("form-dialog");
}

/** 证据截图：设置 E2E_EVIDENCE_DIR 时保存（P05 证据：Forbidden/Empty/Error/Toast） */
export async function evidenceShot(page: Page, name: string) {
  const dir = process.env.E2E_EVIDENCE_DIR;
  if (!dir) return;
  await page.screenshot({ path: `${dir}/${name}.png`, animations: "disabled" });
}
