/**
 * D-06 e2e：前台缓存标签失效（≤5s 可见）。
 * 前置：`npm run build` + `npm run test:e2e`（global-setup 重建 e2e.db 并 seed；seed 含 active 的 home-banner TemplateBlock）。
 *
 * 断言链（覆盖验收 5.9.5.2「后台改 Banner 标题 → 5 秒内前台可见」）：
 *  1) 后台 PUT /api/settings 更新 bannerTitle（走 setSettings → invalidateWebContent(webTagsForModel("setting"))，
 *     该标签同时挂在前台 getWebSettings / getHomeData 的 unstable_cache 上）；
 *  2) 前台首次访问 `/` 触发 `revalidateTag(tag, { expire: 0 })` 的立即过期语义（下一次访问即 blocking cache miss）；
 *  3) 5 秒内重访 `/` 必须出现新标题（否则标签失效未生效）。
 *  4) 用例结束前把 bannerTitle 还原，避免污染同文件其它用例与 visual 门禁。
 *
 * 说明：不直接断言 DB 值（那会变成"自证"），而是从公开页面读 H2 文本验证端到端链路。
 */
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminState, apiToken, api } from "./fixtures/helpers";

test.use({ storageState: adminState() });

const ORIGINAL_TITLE = "弘道教育"; // seed 默认 bannerTitle（settings-registry def）

async function setBannerTitle(request: APIRequestContext, token: string, value: string): Promise<void> {
  await api<{ updated: string[]; skipped: string[] }>(request, token, "PUT", "/api/settings", { bannerTitle: value });
}

async function readHomeH2(page: import("@playwright/test").Page): Promise<string> {
  // 首页 Banner 的标题是 `<h2>`（Banner.tsx L122），取首个非空 H2 文本
  const h2s = await page.locator("h2").allTextContents();
  return h2s.map((s) => s.trim()).filter(Boolean)[0] ?? "";
}

test("后台改 bannerTitle → 5 秒内前台首页可见（标签失效）", async ({ page, request }) => {
  const token = await apiToken(request);
  const stamp = `E2E-Banner-${Date.now()}`;

  // 0) 先还原为稳定值，保证首页当前 H2 可预期（避免上一次运行残留）
  await setBannerTitle(request, token, ORIGINAL_TITLE);
  await page.goto("/");
  await expect(page.locator("h2").first()).toBeVisible();
  await expect.poll(() => readHomeH2(page)).toBe(ORIGINAL_TITLE);

  // 1) 后台改标题（触发 invalidateWebContent）
  await setBannerTitle(request, token, stamp);

  // 2) 5 秒窗口内前台必须可见（stale-while-revalidate：首次访问回放旧值，随后的重访命中刷新后的缓存）
  const deadline = Date.now() + 5_000;
  let seen = false;
  while (Date.now() < deadline) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const text = await readHomeH2(page);
    if (text.includes(stamp)) {
      seen = true;
      break;
    }
    await page.waitForTimeout(300);
  }
  expect(seen, "5 秒内前台未出现后台新设置的 bannerTitle，标签失效链路未生效").toBe(true);

  // 3) 还原，避免污染其它用例与 visual 门禁
  await setBannerTitle(request, token, ORIGINAL_TITLE);
});

test("前台首页数据可稳定缓存（首页返回 HTML 包含 banner 块）", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h2").first()).toBeVisible();
  // 首页 Banner 渲染依赖客户端挂载后的轮播切换，故只断言首屏骨架稳定存在（h2 + data-block 锚点）
  await expect(page.locator("[data-block='home-banner']").first()).toBeAttached();
});