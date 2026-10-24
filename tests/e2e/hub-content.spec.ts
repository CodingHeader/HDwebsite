/**
 * V11-HUB-01 e2e：内容中枢 新建 → 提交审核 → 审核（通过/拒绝）→ 预览渲染 闭环。
 * admin 为超管（审核权独享 ADR-017）；预览走 ContentMarkdown（markdown 渲染非裸文本）。
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

const TITLE = `e2e-hub-${Date.now()}`;
const MARKDOWN = "# 部门标题\n\n正文段落，包含**加粗**与列表：\n\n- 项一\n- 项二\n";

test("内容中枢：新建 → 提交审核 → 审核通过 → 预览 markdown 渲染", async ({ page }) => {
  await page.goto("/manager/content-hub");
  await expect(page.getByTestId("content-hub-table")).toBeVisible({ timeout: 20_000 });

  // 新建
  await page.getByTestId("hub-new").click();
  await page.getByTestId("hub-edit-title").fill(TITLE);
  await page.getByTestId("hub-edit-content").fill(MARKDOWN);
  await page.getByRole("button", { name: "创建" }).click();
  await expect(page.getByText("草稿已入库")).toBeVisible();

  const row = page.getByTestId("content-hub-table").locator("tbody tr").filter({ hasText: TITLE });
  await expect(row).toContainText("draft");

  // 提交审核
  await row.getByRole("button", { name: "提交审核" }).click();
  await expect(row).toContainText("pending_review");

  // 审核（通过）
  await row.getByRole("button", { name: "审核" }).click();
  await page.getByTestId("hub-review-approved").check();
  await page.getByRole("button", { name: "提交审核结论" }).click();
  await expect(page.getByText("审核完成")).toBeVisible();
  await expect(row).toContainText("approved");

  // 预览：markdown 渲染成结构化 HTML（h1 + strong + li），非裸文本
  await row.getByRole("button", { name: "预览" }).click();
  const preview = page.getByTestId("hub-preview-website");
  await expect(preview.locator("h1")).toContainText("部门标题");
  await expect(preview.locator("strong")).toContainText("加粗");
  await expect(preview.locator("li")).toHaveCount(2);
});

test("内容中枢：审核拒绝流程（备注理由）", async ({ page }) => {
  const title = `${TITLE}-rej`;
  await page.goto("/manager/content-hub");
  await page.getByTestId("hub-new").click();
  await page.getByTestId("hub-edit-title").fill(title);
  await page.getByTestId("hub-edit-content").fill("待拒内容");
  await page.getByRole("button", { name: "创建" }).click();
  await expect(page.getByText("草稿已入库")).toBeVisible();

  const row = page.getByTestId("content-hub-table").locator("tbody tr").filter({ hasText: title });
  await row.getByRole("button", { name: "提交审核" }).click();
  await expect(row).toContainText("pending_review");

  await row.getByRole("button", { name: "审核" }).click();
  await page.getByTestId("hub-review-rejected").check();
  await page.getByTestId("hub-review-remark").fill("内容与站点定位不符");
  await page.getByRole("button", { name: "提交审核结论" }).click();
  await expect(page.getByText("审核完成")).toBeVisible();
  await expect(row).toContainText("rejected");
});
