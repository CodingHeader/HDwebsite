/**
 * E-08 响应式（P13 目标 4 / M-3）：管理端代表页在 375/768/1440 下不横向溢出
 * 断言：documentElement.scrollWidth ≤ window.innerWidth（允许 1px 取整误差）
 * 运行：npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-responsive.spec.ts
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

const PAGES = [
  { path: "/manager", name: "仪表盘" },
  { path: "/manager/articles", name: "文章管理" },
  { path: "/manager/media", name: "媒体库" },
  { path: "/manager/content-hub", name: "内容中枢" },
  { path: "/manager/llm-providers", name: "模型供应商" },
  { path: "/manager/settings", name: "站点设置" },
];

for (const vp of VIEWPORTS) {
  test.describe(`响应式 @${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const p of PAGES) {
      test(`${p.name} @${vp.name} 不横向溢出`, async ({ page }) => {
        await page.goto(p.path, { waitUntil: "load" });
        await page.waitForTimeout(1200);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          scrollWidth,
          `${p.path} @${vp.name}：scrollWidth=${scrollWidth} > innerWidth=${innerWidth}（横向溢出）`
        ).toBeLessThanOrEqual(innerWidth + 1);
      });
    }
  });
}
