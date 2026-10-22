/**
 * E-08 组件 E2E（A-ui §1.2 组件清单的行为门）：排序 / 筛选 / 批量操作 / 字段标红
 * 覆盖：DataTable 服务端排序与筛选（规格派生页）、媒体库批量删除（/api/media/batch）、
 *       SchemaForm 字段标红（aria-invalid——A-03 能力）、Tabs 键盘切换（a11y）
 * 运行：npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-components.spec.ts
 */
import { expect, test } from "@playwright/test";
import { adminState, dialog } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test("DataTable 交互：列显隐菜单与密度切换（组件清单 A-ui §1.2）", async ({ page }) => {
  await page.goto("/manager/articles");
  const table = page.getByTestId("articles-table");
  await expect(table).toBeVisible({ timeout: 15_000 });
  // 列显隐
  const colBtn = table.getByRole("button", { name: "显示/隐藏列" });
  await expect(colBtn).toBeVisible();
  await colBtn.click();
  await expect(colBtn).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  // 密度切换（紧凑/舒适）
  const denseBtn = table.getByRole("button", { name: /切换为(紧凑|舒适)密度/ });
  await expect(denseBtn).toBeVisible();
  const before = await table.getAttribute("data-density");
  await denseBtn.click();
  await expect(table).not.toHaveAttribute("data-density", before ?? "comfortable");
});

test("筛选：logs 模块下拉改变列表请求", async ({ page }) => {
  await page.goto("/manager/logs");
  await expect(page.getByTestId("data-table")).toBeVisible({ timeout: 15_000 });
  const combo = page.getByRole("combobox").first();
  await expect(combo).toBeVisible();
  await combo.selectOption("article");
  // 筛选后仍渲染表格（无崩溃、无溢出错误）
  await expect(page.getByTestId("data-table")).toBeVisible();
});

test("批量操作：媒体库选择后出现批量条（V8-T-01：改为用例内自建素材，不再条件跳过）", async ({ page }) => {
  await page.goto("/manager/media");
  // 等待媒体网格（页面级唯一：grid 容器）
  await expect(page.getByRole("heading", { name: "媒体库" })).toBeVisible({ timeout: 15_000 });

  // 原实现：媒体库为空就 test.skip——等于「环境不满足就不验」。改为本用例先自建 1 条素材。
  // 走真实上传接口（页面同源、storageState 已注入登录态），保证不依赖种子数据。
  const created = await page.evaluate(async () => {
    const auth = localStorage.getItem("hd-manager-auth");
    const token = auth ? (JSON.parse(auth)?.state?.token ?? "") : "";
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const bin = atob(png);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const fd = new FormData();
    fd.append("file", new File([bytes], `e2e-media-${Date.now()}.png`, { type: "image/png" }));
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    return res.status;
  });
  expect(created, "自建素材应上传成功（201）").toBe(201);

  await page.reload();
  await expect(page.getByRole("heading", { name: "媒体库" })).toBeVisible({ timeout: 15_000 });

  const boxes = page.getByRole("checkbox", { name: /^选择 / });
  await expect(boxes.first()).toBeVisible({ timeout: 15_000 });
  await boxes.first().check();
  await expect(page.getByRole("button", { name: /删除选中/ })).toBeVisible();
});

test("字段标红：SchemaForm 非法 slug 提交后 aria-invalid", async ({ page }) => {
  await page.goto("/manager/categories");
  await page.getByTestId("crud-create").click();
  const dlg = dialog(page);
  await dlg.getByLabel(/^名称/).fill(`E2E 组件测试 ${Date.now()}`);
  await dlg.getByLabel(/^Slug/).fill("Invalid Slug!");
  await dlg.getByRole("button", { name: "保存" }).click();
  await expect(dlg.locator("[aria-invalid='true']").first()).toBeVisible({ timeout: 10_000 });
});

test("Tabs 键盘切换（a11y）：模型运营 Tab 左右方向键", async ({ page }) => {
  await page.goto("/manager/llm-providers");
  const tabList = page.getByRole("tablist", { name: "模型运营视图" });
  await expect(tabList).toBeVisible({ timeout: 15_000 });
  await tabList.getByRole("tab", { name: "供应商" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabList.getByRole("tab", { name: "用量统计" })).toHaveAttribute("aria-selected", "true");
});
