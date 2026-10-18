/**
 * E-10 e2e：模型运营——优先级拖拽/键盘排序保存后刷新顺序保持 + 用量 Tab 错误态。
 * 排序保存走逐条 PUT /api/llm/providers/[id]（现有端点）；C-11 合并后可切 PUT /api/llm/providers/order 单请求（W2 复跑调整口径）。
 * 用量 Tab：GET /api/llm/usage 属 C-11（未合并前端点 404 → 错误态——本用例断言错误态可跑；
 *   用量数据断言（按模型/按日聚合）待 C-11 合并后 W2-05 复跑）。
 * 依赖：admin storageState；global-setup 建 1 个 mock provider，用例 API 造第 2 个。
 */
import { expect, test } from "@playwright/test";
import { adminState, pageToken } from "./fixtures/helpers";

test.use({ storageState: adminState() });

/** 造供应商（llm:create） */
async function createProvider(page: import("@playwright/test").Page, name: string, priority: number): Promise<void> {
  const token = await pageToken(page);
  const res = await page.request.post("/api/llm/providers", {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, kind: "openai", endpoint: "https://e2e-mock.local/v1", apiKey: "e2e-key", model: "e2e-model", priority, status: "active" },
  });
  const body = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
  expect([200, 201], `创建供应商失败：${body.message ?? res.status}`).toContain(body.code ?? res.status);
}

test("键盘排序 → 保存 → 刷新顺序保持", async ({ page }) => {
  await page.goto("/manager/llm-providers");
  await createProvider(page, `E2E Provider A ${Date.now()}`, 10);
  await createProvider(page, `E2E Provider B ${Date.now()}`, 20);
  await page.reload();

  // 排序面板：两行；键盘（Tab 聚焦 + Enter 触发按钮）完成排序——a11y 可完成
  const panel = page.getByTestId("llm-order-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  // 数量无关（e2e.db 跨轮累积供应商）：≥2 行即可，取第 2 行上移验证
  await expect(panel.locator("li").first()).toBeVisible();
  const rowCount = await panel.locator("li").count();
  expect(rowCount).toBeGreaterThanOrEqual(2);
  const secondRow = panel.locator("li").nth(1);
  const secondName = (await secondRow.locator("span").nth(1).innerText()).trim();
  await secondRow.getByRole("button", { name: `上移 ${secondName}` }).focus();
  await page.keyboard.press("Enter"); // 键盘触发（a11y：不依赖鼠标）
  // 顺序已变（第 2 个上移到第 1 位）
  expect((await panel.locator("li").first().locator("span").nth(1).innerText()).trim()).toBe(secondName);

  // 保存 → 刷新 → 顺序保持
  await panel.getByTestId("llm-order-save").click();
  await expect(page.getByText("优先级已保存")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  const panelAfter = page.getByTestId("llm-order-panel");
  await expect(panelAfter).toBeVisible({ timeout: 15_000 });
  expect((await panelAfter.locator("li").first().locator("span").nth(1).innerText()).trim()).toBe(secondName);
});

test("用量 Tab：C-11 未合并 → 错误态（用量数据断言待 C-11，W2-05 复跑）", async ({ page }) => {
  await page.goto("/manager/llm-providers");
  await page.getByRole("tab", { name: "用量统计" }).click();
  // C-11 未合并：/api/llm/usage 404 → ErrorState（可跑）；用量聚合数据断言待 C-11 合并后复跑
  await expect(page.getByTestId("error-state").first()).toBeVisible({ timeout: 15_000 });
});
