/** E2E 公共步骤：UI 登录、API 调用（准备数据用）、Toast 断言 */
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";
import { ADMIN } from "./env";

/**
 * CCR-1（W0-11）：storageState 路径（global-setup 的 prepareAccountsAndStates 写入）。
 * 大多数用例经 test.use({ storageState }) 注入登录态，调用登录接口 0 次（防撞同 IP 限流）；
 * `loginUI` 仅供 auth.spec（验证登录本身）使用。
 * 命名说明：不以 `use` 开头——react-hooks/rules-of-hooks 会把模块顶层调用的 `useXxx` 误判为 React Hook。
 */
const STATE_DIR = path.resolve(__dirname, "../../../.cache/e2e");
export function adminState(): string {
  return path.join(STATE_DIR, "state-admin.json");
}
export function viewerState(): string {
  return path.join(STATE_DIR, "state-viewer.json");
}

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

/**
 * CCR-1（W0-11）：从页面 localStorage 读取会话 token（zustand persist 键 `hd-manager-auth`），
 * 供数据准备的 API 调用使用——**不调用登录接口**（防撞同 IP 限流；storageState 注入的页面已含该值）。
 * 前置：page 已加载且 zustand 已 rehydrate（storageState 注入的 origin 有 hd-manager-auth）。
 */
export async function pageToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("hd-manager-auth");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
      return parsed.state?.token ?? "";
    } catch {
      return "";
    }
  });
  expect(token, "页面 localStorage 无会话 token（storageState 未生效或页面未加载）").toBeTruthy();
  return token;
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
