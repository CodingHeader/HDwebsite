/**
 * E2E · 文章 CRUD（P05）：新建（行内校验）→ 编辑（详情回填，正文不丢失）→ 删除（ConfirmDialog 取消/确认）
 * 另覆盖：接口 500 → ErrorState + 重试恢复；空搜索 → EmptyState。
 */
import { expect, test } from "@playwright/test";
import { dialog, evidenceShot, expectToast, adminState } from "./fixtures/helpers";

const TITLE = `E2E 文章 ${Date.now()}`;
const EDITED = `${TITLE}（已编辑）`;
const BODY = "# E2E 正文\n\n这是端到端测试写入的 Markdown 正文。";

// CCR-1（W0-11）：storageState 注入登录态（globalSetup 一次登录），beforeEach 不再调用登录接口
test.use({ storageState: adminState() });

test("文章新建 → 编辑 → 删除", async ({ page }) => {
  await page.goto("/manager/articles");
  await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();

  // 新建：空表单提交 → 行内必填错误，弹窗不关闭
  await page.getByTestId("article-create").click();
  const dlg = dialog(page);
  await expect(dlg).toBeVisible();
  await dlg.getByTestId("form-submit").click();
  await expect(dlg.getByText("请填写「标题」")).toBeVisible();
  await expect(dlg.getByLabel("标题")).toHaveAttribute("aria-invalid", "true");
  await evidenceShot(page, "inline-validation-article");

  await dlg.getByLabel("标题").fill(TITLE);
  await expect(dlg.getByText("请填写「标题」")).toHaveCount(0);
  await dlg.getByLabel(/^正文/).fill(BODY);
  await dlg.getByLabel("状态").selectOption("published");
  await dlg.getByTestId("form-submit").click();
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已创建");
  await evidenceShot(page, "toast-success-article-created");
  const row = page.getByRole("row").filter({ hasText: TITLE });
  await expect(row).toBeVisible();
  await expect(row.getByText("已发布")).toBeVisible();

  // 编辑：详情回填正文（不丢失），改标题后保存
  await row.getByRole("button", { name: `编辑 ${TITLE}` }).click();
  await expect(dlg.getByLabel(/^正文/)).toHaveValue(BODY);
  await dlg.getByLabel("标题").fill(EDITED);
  await dlg.getByLabel("标题").press("Control+Enter");
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已保存");
  const editedRow = page.getByRole("row").filter({ hasText: EDITED });
  await expect(editedRow).toBeVisible();

  // P05-verify:41 承接（E-05）：保存后重新 GET 断言持久化
  await page.reload();
  const persistedRow = page.getByRole("row").filter({ hasText: EDITED });
  await expect(persistedRow).toBeVisible({ timeout: 15_000 });
  await persistedRow.getByRole("button", { name: `编辑 ${EDITED}` }).click();
  await expect(dlg.getByLabel(/^正文/)).toHaveValue(BODY);
  await dlg.getByRole("button", { name: "取消" }).or(dlg.locator("[aria-label='关闭']")).first().click();

  // E-05：一键上下线（PATCH /api/articles/[id]）——先下线（published→draft）再上线（draft→published）
  await page.getByRole("row").filter({ hasText: EDITED }).getByRole("button", { name: `下线 ${EDITED}` }).click();
  await expectToast(page, "success", "已下线");
  await expect(page.getByRole("row").filter({ hasText: EDITED }).getByText("草稿")).toBeVisible();
  await page.getByRole("row").filter({ hasText: EDITED }).getByRole("button", { name: `上线 ${EDITED}` }).click();
  await expectToast(page, "success", "已上线");
  await expect(page.getByRole("row").filter({ hasText: EDITED }).getByText("已发布")).toBeVisible();

  // 删除：先取消（记录仍在），再确认（记录消失）
  const delRow = page.getByRole("row").filter({ hasText: EDITED });
  await delRow.getByRole("button", { name: `删除 ${EDITED}` }).click();
  const confirm = page.getByTestId("confirm-dialog");
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("button", { name: "取消" })).toBeFocused(); // 危险操作默认聚焦"取消"
  await evidenceShot(page, "confirm-delete-article");
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  await expect(delRow).toBeVisible();

  await delRow.getByRole("button", { name: `删除 ${EDITED}` }).click();
  await confirm.getByTestId("confirm-ok").click();
  await expectToast(page, "success", "已删除");
  await expect(page.getByRole("row").filter({ hasText: EDITED })).toHaveCount(0);
});

test("列表接口 500 → ErrorState，点击重试恢复", async ({ page }) => {
  let fail = true;
  await page.route("**/api/articles?*", async (route) => {
    if (fail) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: 500, data: null, message: "服务器内部错误（E2E 注入）" }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/manager/articles");
  // DataTable 桌面（table 内）与移动（卡片，CSS 隐藏）各渲染一份 stateBlock → 用 first() 取可见那份
  const err = page.getByTestId("error-state").first();
  await expect(err).toBeVisible();
  await expect(err).toContainText("服务器内部错误（E2E 注入）");
  await evidenceShot(page, "error-state-articles-500");
  fail = false;
  // DataTable 桌面/移动双渲染 → first() 取可见那份
  await page.getByTestId("error-retry").first().click();
  await expect(err).toBeHidden();
  await expect(page.getByRole("row").nth(1)).toBeVisible();
});

test("搜索无结果 → EmptyState", async ({ page }) => {
  await page.goto("/manager/articles");
  await page.getByRole("searchbox").fill("不存在的关键词-zzz-e2e");
  await expect(page.getByTestId("empty-state").first()).toContainText("没有找到");
  await evidenceShot(page, "empty-state-articles-search");
});
