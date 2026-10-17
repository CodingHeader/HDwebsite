/**
 * A-03 e2e：表单字段级错误——提交非法 slug 后字段标红（aria-invalid）。
 * 依赖：admin storageState（globalSetup 注入）；分类管理页（slug 有格式校验）。
 */
import { expect, test } from "@playwright/test";
import { adminState, dialog } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test("提交非法 slug 后字段标红（fieldErrors 逐字段 aria-invalid）", async ({ page }) => {
  await page.goto("/manager/categories");
  await page.getByTestId("crud-create").click();
  const dlg = dialog(page);
  await dlg.getByLabel(/^名称/).fill(`E2E 分类 ${Date.now()}`);
  // 非法 slug：大写与空格（后端 zod 校验 400 + fieldErrors.slug；分类页 slug 字段 label 为"Slug（留空自动生成）"）
  const slugInput = dlg.getByLabel(/^Slug/);
  await slugInput.fill("Invalid Slug!");
  await dlg.getByRole("button", { name: "保存" }).click();

  // 后端 400 → fieldErrors 透传 → 字段红色描边（aria-invalid=true）
  const invalid = dlg.locator("[aria-invalid='true']");
  await expect(invalid.first()).toBeVisible({ timeout: 10_000 });
  // 字段错误文案可见
  await expect(dlg.getByTestId("field-error").first()).toBeVisible();
});
