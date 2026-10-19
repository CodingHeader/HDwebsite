/**
 * E-09 e2e：内容中枢——双渠道发布（渠道多选/定时）创建 2 个 publish-job + 权限门禁 + 预览 Tab。
 * 渠道状态列当前为前端聚合（GET /api/publish-jobs）；B-07 合并后切契约聚合视图 /api/content-hub——W2 复跑调整口径。
 * 依赖：admin storageState；内容条目经 API 造数（e2e.db 种子不产 ContentItem）。
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminState, viewerState, pageToken } from "./fixtures/helpers";

test.use({ storageState: adminState() });

/** 造一条内容条目（content:create；返回 id） */
async function createItem(page: Page, request: APIRequestContext, title: string): Promise<number> {
  const token = await pageToken(page);
  const res = await request.post("/api/content-items", {
    headers: { Authorization: `Bearer ${token}` },
    data: { title, content: `# ${title}\n\n这是 E2E 测试写入的 Markdown 正文。`, contentType: "markdown", tags: ["e2e"] },
  });
  const body = (await res.json()) as { code: number; data?: { id: number }; message?: string };
  expect(body.code, `创建内容条目失败：${body.message}`).toBe(200);
  return body.data!.id;
}

test("双渠道发布 → 创建 2 个 publish-job", async ({ page, request }) => {
  await page.goto("/manager/content-hub");
  await createItem(page, request, `E2E 中枢双渠道 ${Date.now()}`);
  await page.reload(); // 造数后重查（列表初始查询不含新条目）

  // 第一条内容：发布对话框 → 渠道多选（官网 + 公众号）→ 立即
  const rows = page.getByTestId("content-hub-table").locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  await rows.first().getByRole("button", { name: "发布" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByTestId("hub-channel-website").check();
  await dlg.getByTestId("hub-channel-wechat").check();
  await dlg.getByRole("button", { name: "创建发布任务" }).click();
  await expect(page.getByText("发布任务已创建")).toBeVisible({ timeout: 10_000 });

  // 双渠道 → 2 个 publish-job（后端多渠道映射：每渠道一条）
  const token = await pageToken(page);
  const res = await request.get("/api/publish-jobs?limit=50", { headers: { Authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: { list: { itemId: number | null; channel: string }[] } };
  const byItem = new Map<number, number>();
  for (const j of body.data.list) {
    if (j.itemId != null && (j.channel === "website" || j.channel === "wechat")) {
      byItem.set(j.itemId, (byItem.get(j.itemId) ?? 0) + 1);
    }
  }
  expect([...byItem.values()].some((c) => c >= 2), "同一 itemId 的双渠道任务 ≥ 2 条").toBe(true);
});

test("渠道预览 Tab：官网与公众号渲染", async ({ page, request }) => {
  await page.goto("/manager/content-hub");
  await createItem(page, request, `E2E 中枢预览 ${Date.now()}`);
  await page.reload();

  const rows = page.getByTestId("content-hub-table").locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  await rows.first().getByRole("button", { name: "预览" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  // 官网 Tab（默认）渲染内容
  await expect(dlg.getByTestId("hub-preview-website")).toBeVisible({ timeout: 10_000 });
  // 切公众号 Tab → 简化样式预览
  await dlg.getByRole("tab", { name: "公众号预览" }).click();
  await expect(dlg.getByTestId("hub-preview-wechat")).toBeVisible();
});

test.describe("权限门禁（viewer）", () => {
  test.use({ storageState: viewerState() });
  test("无 publish 权限时发布入口不可见", async ({ page }) => {
    await page.goto("/manager/content-hub");
    // viewer（只读）→ 列表可渲染（content:list），发布按钮不渲染（无 publish:create）
    await expect(page.getByTestId("content-hub-table")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "发布" })).toHaveCount(0);
  });
});
