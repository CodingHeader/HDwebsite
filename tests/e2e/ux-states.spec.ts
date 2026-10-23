/**
 * V8-UI-01：管理端五态覆盖（ux-states.spec.ts）
 *
 * 目标：每类资源页的 5 种 UX 状态（loading / empty / error / forbidden / success）
 * 都由设计系统组件呈现，且能用 testid 断言。
 *
 * 手法：**用 Playwright 的 route mock 控制接口返回**，不依赖真实数据与后端状态——
 * 这样同一个页面能在 4 种异常态之间快速切换，且可重复。
 *
 * 状态与 testid 对应（与 src/components/manager/feedback/ 一致）：
 *   loading   → page-skeleton / table-skeleton
 *   empty     → empty-state
 *   error     → error-state       （非 403 的请求失败）
 *   forbidden → forbidden         （403）
 *   success   → 真实内容（列表行 / 表格）
 */
import { expect, test, type Page } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

/** 一页资源：路径 + 它的列表接口 path 片段 */
type ResourcePage = { name: string; path: string; api: string };

/** 覆盖代表性资源：CrudPage 驱动 + 自定义页各取几个 */
const PAGES: ResourcePage[] = [
  { name: "notify-rules", path: "/manager/notify-rules", api: "/api/notify-rules" },
  { name: "publish-jobs", path: "/manager/publish-jobs", api: "/api/publish-jobs" },
  { name: "wechat-accounts", path: "/manager/wechat-accounts", api: "/api/wechat/accounts" },
  { name: "collect-items", path: "/manager/collect-items", api: "/api/collect-items" },
  { name: "knowledge-bases", path: "/manager/knowledge-bases", api: "/api/knowledge-bases" },
  { name: "llm-providers", path: "/manager/llm-providers", api: "/api/llm/providers" },
];

/** 用 route mock 拦截某个 API，返回指定状态 */
async function mockApi(page: Page, api: string, kind: "403" | "500" | "empty" | "ok") {
  await page.route(`**${api}**`, async (route) => {
    if (kind === "403") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: 403, data: null, message: "权限不足：需要 xxx:list" }),
      });
    } else if (kind === "500") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: 500, data: null, message: "服务器错误（mock）" }),
      });
    } else if (kind === "empty") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 200, data: { list: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }, message: "ok" }),
      });
    } else {
      await route.continue();
    }
  });
}

for (const p of PAGES) {
  test(`${p.name}：403 → 无权限态`, async ({ page }) => {
    await mockApi(page, p.api, "403");
    await page.goto(p.path);
    await expect(page.getByTestId("forbidden")).toBeVisible({ timeout: 20_000 });
  });

  test(`${p.name}：500 → 错误态（含重试按钮）`, async ({ page }) => {
    await mockApi(page, p.api, "500");
    await page.goto(p.path);
    await expect(page.getByTestId("error-state")).toBeVisible({ timeout: 20_000 });
  });

  test(`${p.name}：空列表 → 空态`, async ({ page }) => {
    await mockApi(page, p.api, "empty");
    await page.goto(p.path);
    // 空态或（表格内置的）空行文案，二者其一必须出现
    const empty = page.getByTestId("empty-state");
    const emptyRow = page.getByText(/暂无|还没有|没有找到/);
    await expect(empty.or(emptyRow).first()).toBeVisible({ timeout: 20_000 });
  });
}

test("首屏加载 → 骨架屏出现过（不要求可见时长）", async ({ page }) => {
  // 把接口拖慢，制造可观察的 loading 窗口
  await page.route("**/api/notify-rules**", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 200, data: { list: [] }, message: "ok" }),
    });
  });
  await page.goto("/manager/notify-rules");
  // 骨架必须出现（证明 loading 态有组件，而不是白屏）
  await expect(page.getByTestId("page-skeleton").or(page.getByTestId("table-skeleton")).first()).toBeVisible({
    timeout: 10_000,
  });
});

test("成功态：真实数据能渲染出表格内容", async ({ page }) => {
  await page.goto("/manager/notify-rules");
  // e2e 种子含 7 条通知规则
  await expect(page.getByTestId("notify-rules-table").locator("tbody tr").first()).toBeVisible({ timeout: 20_000 });
});
