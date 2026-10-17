/**
 * E-03 e2e：首页区块配置（ADR-024）——禁用区块 → 前台不渲染 → 恢复默认恢复渲染 + 权限门禁。
 * 前台页面 force-dynamic（无缓存），禁用立即生效；升级条件预置：若 D-06 引入前台缓存，
 * 本用例「前台回读」段已带 ≤5s 重试等待。
 * 依赖：admin storageState（globalSetup）；e2e.db 种子含 home 模板 + 12 区块 TemplateBlock。
 */
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminState, viewerState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

const TARGET_BLOCK = "home-intro";

test("禁用区块 → 前台不渲染 → 恢复默认恢复渲染", async ({ page, request }) => {
  // 1. 编辑 home-intro：关闭启用开关
  await page.goto("/manager/home-blocks");
  const rows = page.getByTestId("home-blocks-table").locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  const targetRow = rows.filter({ hasText: TARGET_BLOCK });
  await expect(targetRow).toHaveCount(1);
  await targetRow.getByRole("button", { name: "编辑" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByTestId("home-block-enabled").click();
  await dlg.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("区块已更新")).toBeVisible({ timeout: 10_000 });
  await expect(dlg).toBeHidden();

  // 2. 前台不再渲染该 data-block（≤5s 重试等待，预置 D-06 缓存升级条件）
  await page.goto("/");
  await expect(page.locator(`[data-block="${TARGET_BLOCK}"]`)).toHaveCount(0, { timeout: 5_000 });

  // 3. 恢复默认（破坏性操作二次确认）→ 前台恢复渲染
  await page.goto("/manager/home-blocks");
  await page.getByTestId("home-blocks-reset").click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog"));
  await confirm.getByRole("button", { name: "恢复默认" }).click();
  await expect(page.getByText("已恢复默认")).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  await expect(page.locator(`[data-block="${TARGET_BLOCK}"]`).first()).toBeVisible({ timeout: 5_000 });
});

test("权限门禁：未登录 registry 401；viewer（block:list 只读）200", async ({ request }: { request: APIRequestContext }) => {
  // 未登录 → 401
  const anon = await request.get("/api/home-blocks/registry");
  expect(anon.status()).toBe(401);

  // viewer 角色按 P04 补齐 block:list（只读）→ 200 是正确行为；
  // 「无 block 权限 → 403」由 p03-endpoints.test.ts 的 NOPERM 模式单测覆盖（种子无无 block:list 角色）。
  const login = await request.post("/api/auth/login", { data: { username: "e2e-viewer", password: "viewer123" } });
  const body = await login.json();
  expect(body.code).toBe(200);
  const viewerRes = await request.get("/api/home-blocks/registry", { headers: { Authorization: `Bearer ${body.data.token}` } });
  expect(viewerRes.status()).toBe(200);
});
