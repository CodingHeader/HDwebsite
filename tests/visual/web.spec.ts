/**
 * 前台视觉回归（P02 / REQ-F-014）：upgrade 前台与 main 参照截图逐像素比对，maxDiffPixelRatio ≤ 0.01。
 * 稳定化：固定时间与时区、禁用动画、隐藏光标、滚动触发懒加载后回顶、等待字体与图片、
 * 隐藏 upgrade 新增的悬浮元素（[data-visual-ignore]，如 ChatWidget）。
 */
import { expect, test, type Page } from "@playwright/test";
import { MAIN_HOME_BLOCK_ORDER, ROUTES, VIEWPORTS, resolvePath } from "./routes";

const IS_REF = process.env.VISUAL_REF === "1";
const FIXED_TIME = new Date("2026-05-01T10:00:00+08:00");

async function settle(page: Page) {
  await page.addStyleTag({
    content: `[data-visual-ignore]{visibility:hidden !important}
      *,*::before,*::after{transition:none !important;animation:none !important;caret-color:transparent !important}
      html{scroll-behavior:auto !important}`,
  });
  // 触发懒加载：逐屏滚动到底再回顶
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  // 有限等待网络空闲（Link 预取不存在的路由可能长时间挂起，不能无限等待）
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // V9-VIS-03 补强（run 39990249476 实证）：懒加载 + next/image 优化器冷启动在 CI 上
  // 偶发超过下方逐图 3s 兜底 → 截图里图片区空白、像素门禁假红（home@1440 的 gallery/
  // campus 图块 10% 像素差）。这里在 Node 侧确定性等待所有非忽略图片**解码完成**
  // （naturalWidth>0），15s 上限；真加载失败时走超时→截图空白→diff 失败，仍是响亮的失败信号。
  await page
    .waitForFunction(
      () =>
        Array.from(document.images)
          .filter((img) => !img.closest("[data-visual-ignore]"))
          .every((img) => img.complete && img.naturalWidth > 0),
      undefined,
      { timeout: 15_000 }
    )
    .catch(() => undefined);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 3000); }))
    );
  });
  await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
  test.describe(`web @${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.name} @${vp.name}`, async ({ page }) => {
        await page.clock.setFixedTime(FIXED_TIME);
        const target = await resolvePath(page, route);
        await page.goto(target, { waitUntil: "load" });
        await settle(page);
        await expect(page).toHaveScreenshot(`${route.name}-${vp.name}.png`, { fullPage: true });
        // 可选：保存实际截图，供 scripts 外的差异比例统计（证据表）使用
        if (process.env.VISUAL_SAVE_ACTUAL && !IS_REF) {
          await page.screenshot({
            path: `.cache/visual/actual/${route.name}-${vp.name}.png`,
            fullPage: true,
            animations: "disabled",
            caret: "hide",
          });
        }
      });
    }
  });
}

test("首页含 Banner 轮播且区块顺序与 main 一致（data-block 锚点）", async ({ page }) => {
  test.skip(IS_REF, "main 参照站点无 data-block 锚点，仅在 upgrade 上断言");
  await page.goto("/", { waitUntil: "load" });
  const codes = await page.$$eval("[data-block]", (els) => els.map((e) => e.getAttribute("data-block")));
  expect(codes).toEqual(MAIN_HOME_BLOCK_ORDER);
  // Banner 轮播区块在首位且有可见内容
  await expect(page.locator('[data-block="home-banner"] section').first()).toBeVisible();
});
