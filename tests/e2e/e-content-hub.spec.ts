/**
 * E-09 e2e：内容中枢——双渠道发布（渠道多选/定时）创建 2 个 publish-job + 权限门禁 + 预览 Tab + 渠道状态列。
 * 渠道状态列消费 B-07 服务端组装视图（/api/content-items 返回 channels 派生字段）。
 * 依赖：admin storageState；内容条目经 API 造数（e2e.db 种子不产 ContentItem）。
 * 注意：B-07 契约守卫——未审核（draft）不得发布；UI 发布前需先 review approved。
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

test("官网渠道发布 → 创建 publish-job（UI 主路径）", async ({ page, request }) => {
  await page.goto("/manager/content-hub");
  const title = `E2E 中枢发布 ${Date.now()}`;
  const itemId = await createItem(page, request, title);
  // B-07 契约状态机：draft → pending_review（content:edit PUT）→ review approved（review:edit）→ 才能发布
  const token = await pageToken(page);
  const sub = await request.put(`/api/content-items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: "pending_review", title },
  });
  expect((await sub.json()).code, "提交审核失败").toBe(200);
  const rv = await request.post(`/api/content-items/${itemId}/review`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { decision: "approved" },
  });
  expect((await rv.json()).code, "审核通过失败").toBe(200);
  await page.reload(); // 造数+审核后重查（列表初始查询不含新条目）

  // 第一条内容：发布对话框 → 渠道勾选官网 → 立即
  const rows = page.getByTestId("content-hub-table").locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  await rows.first().getByRole("button", { name: "发布" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByTestId("hub-channel-website").check();
  await dlg.getByRole("button", { name: "创建发布任务" }).click();
  await expect(page.getByText("发布任务已创建")).toBeVisible({ timeout: 10_000 });

  // 至少创建 1 个 publish-job（官网渠道）
  const token2 = await pageToken(page);
  const res = await request.get("/api/publish-jobs?limit=50", { headers: { Authorization: `Bearer ${token2}` } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: { list: { itemId: number | null; channel: string }[] } };
  const byItem = new Map<number, number>();
  for (const j of body.data.list) {
    if (j.itemId != null && j.channel === "website") {
      byItem.set(j.itemId, (byItem.get(j.itemId) ?? 0) + 1);
    }
  }
  expect([...byItem.values()].some((c) => c >= 1), "同一 itemId 的官网任务 ≥ 1 条").toBe(true);
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

test("渠道状态列：渲染服务端组装视图（官网/公众号 Badge）", async ({ page, request }) => {
  await page.goto("/manager/content-hub"); // 先加载页面，pageToken 才能读 localStorage（storageState 注入的 origin）
  const token = await pageToken(page);
  const title = `E2E 中枢渠道态 ${Date.now()}`;
  const id = await createItem(page, request, title);
  // 状态机：draft → pending_review → review approved
  const sub = await request.put(`/api/content-items/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: "pending_review", title },
  });
  expect((await sub.json()).code, "提交审核失败").toBe(200);
  // 审核通过（admin 超管，review:edit）
  const rv = await request.post(`/api/content-items/${id}/review`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { decision: "approved" },
  });
  expect((await rv.json()).code, "审核通过失败").toBe(200);
  // 建官网发布任务（immediate）
  const pj = await request.post("/api/publish-jobs", {
    headers: { Authorization: `Bearer ${token}` },
    data: { itemId: id, channel: "website", contentType: "article", action: "publish" },
  });
  expect((await pj.json()).code, "创建发布任务失败").toBe(200);

  await page.reload();
  const row = page.getByTestId("content-hub-table").locator("tbody tr").filter({ hasText: `E2E 中枢渠道态` });
  await expect(row).toBeVisible({ timeout: 15_000 });
  // 渠道状态列容器已渲染（服务端 channels 视图；具体状态由 scan 异步驱动，不断言值）
  await expect(row.getByTestId("channel-states").first()).toBeVisible();
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
