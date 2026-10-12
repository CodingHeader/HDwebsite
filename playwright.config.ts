/**
 * Playwright 配置（P02 前台视觉回归）
 * - 参照截图（main）：VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npm run visual:reference
 * - 对比（upgrade）：VISUAL_BASE_URL=http://127.0.0.1:6789 npm run test:visual
 * 参照截图入库于 tests/visual/reference/（可复现输入），阈值 maxDiffPixelRatio ≤ 0.01。
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:6789";

export default defineConfig({
  testDir: "tests/visual",
  outputDir: ".cache/visual/test-results",
  snapshotPathTemplate: "tests/visual/reference/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"], ["json", { outputFile: ".cache/visual/results.json" }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    deviceScaleFactor: 1,
  },
});
