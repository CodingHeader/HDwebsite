/**
 * Playwright 配置（P05 E2E 主路径）
 * - 独立数据库 prisma/e2e.db（每次运行由 global-setup 重建：migrate deploy + seed），不触碰 dev.db
 * - global-setup 启动 mock 上游（OpenAI 兼容 LLM + 采集用 HTML 站点）与被测应用（端口 6791）
 * - 运行：npm run test:e2e（需已 npm run build；start-next 在构建过期时会自动构建）
 */
import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "./fixtures/env";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  outputDir: "../../.cache/e2e/test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  globalSetup: "./global-setup.ts",
  reporter: [["list"], ["json", { outputFile: "../../.cache/e2e/results.json" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: E2E_BASE_URL,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
