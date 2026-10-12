/**
 * E2E · 认证与权限（P05）
 * - 错误密码 → 行内错误；正确密码 → 进入仪表盘
 * - 未登录访问后台 → 跳登录
 * - Viewer 角色访问 /manager/users → Forbidden 视图（data-testid="forbidden"）
 */
import { expect, test } from "@playwright/test";
import { ADMIN, VIEWER } from "./fixtures/env";
import { api, apiToken, evidenceShot, loginUI } from "./fixtures/helpers";

test("未登录访问后台跳转登录页", async ({ page }) => {
  await page.goto("/manager/articles");
  await page.waitForURL(/\/manager\/login/);
  await expect(page.locator("#login-username")).toBeVisible();
});

test("错误密码提示，正确密码进入仪表盘", async ({ page }) => {
  await page.goto("/manager/login");
  await page.locator("#login-username").fill(ADMIN.username);
  await page.locator("#login-password").fill("wrong-password");
  await page.locator("#login-password").press("Enter");
  await expect(page.locator("#login-password")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/manager\/login/);

  await page.locator("#login-password").fill(ADMIN.password);
  await page.locator("#login-password").press("Enter");
  await page.waitForURL(/\/manager\/?$/);
  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  // 仪表盘统计卡片加载完成（骨架消失）
  await expect(page.getByText("文章总数")).toBeVisible();
});

test("Viewer 访问用户管理渲染 Forbidden 视图", async ({ page, request }) => {
  const token = await apiToken(request);
  const roles = await api<{ list: { id: number; slug: string }[] }>(request, token, "GET", "/api/roles?limit=50");
  const viewerRole = roles.list.find((r) => r.slug === "viewer");
  expect(viewerRole, "seed 应包含 viewer 角色").toBeTruthy();
  const users = await api<{ list: { username: string }[] }>(request, token, "GET", `/api/users?keyword=${VIEWER.username}`);
  if (!users.list.some((u) => u.username === VIEWER.username)) {
    await api(request, token, "POST", "/api/users", { ...VIEWER, nickname: "E2E 只读", roleId: viewerRole!.id, isActive: true });
  }

  await loginUI(page, VIEWER);
  await page.goto("/manager/users");
  await expect(page.getByTestId("forbidden")).toBeVisible();
  await expect(page.getByText("没有访问权限")).toBeVisible();
  await evidenceShot(page, "forbidden-viewer-users");
  // 有 list 权限的页面正常渲染（非 Forbidden）
  await page.goto("/manager/articles");
  await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();
  await expect(page.getByTestId("forbidden")).toHaveCount(0);
});
