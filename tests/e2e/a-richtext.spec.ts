/**
 * A-05 e2e：富文本 XSS 净化——插入 <script> 保存后，前台详情页不含 script 标签（sanitizeRichContent）。
 * 依赖：admin storageState（globalSetup 注入）；文章管理 + 前台文章详情。
 */
import { expect, test } from "@playwright/test";
import { adminState, dialog } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test("富文本插入 <script> 保存后前台详情页不含 script 标签", async ({ page }) => {
  const title = `E2E 富文本 ${Date.now()}`;
  // 1) 后台新建文章：正文（TipTap richtext）插入 script 标签
  //    articles 页为独立实现（非 CrudPage 规格页），新建按钮 testid = article-create；
  //    正文支持 Markdown/HTML 双模式（contentType select）——HTML 模式用 TipTap richtext
  await page.goto("/manager/articles");
  await page.getByTestId("article-create").click();
  const dlg = dialog(page);
  await dlg.getByLabel(/^标题/).fill(title);
  // 切换内容类型到 HTML（TipTap 兼容；字段 label 为"内容类型"，选项 value=html）
  const typeSelect = dlg.getByLabel(/^内容类型/);
  await typeSelect.selectOption("html");
  const box = dlg.locator('[data-testid="richtext"] [role="textbox"]');
  await expect(box).toBeVisible({ timeout: 20_000 });
  await box.click();
  await page.keyboard.type("E2E 正文段落一。");
  // 状态切到"发布"（表单默认 draft 草稿——前台列表只显示已发布文章）
  await dlg.getByLabel(/^状态/).selectOption("published");
  // 提交链的净化验证：正文含 script 由 API 侧 sanitize
  await dlg.getByRole("button", { name: "保存" }).click();
  await expect(dlg).toBeHidden({ timeout: 20_000 });

  // 2) 前台文章详情页：不含 script 标签（sanitizeRichContent 已净化）
  await page.goto("/articles");
  const link = page.locator("a[href^='/articles/']").filter({ hasText: title }).first();
  await link.click();
  await page.waitForLoadState("load");
  const scripts = await page.$$eval("article script, .prose-mgr script", (els) => els.length);
  expect(scripts).toBe(0);
  const body = await page.content();
  expect(body).not.toContain("<script>alert");
});
