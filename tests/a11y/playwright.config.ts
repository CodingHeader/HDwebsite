/**
 * A11y 冒烟配置（CCR-1 / W0-11 新增；REQ-NF-003）
 * - 复用 e2e 的 globalSetup 与端口约定（同一套被测服务与数据库），testDir=tests/a11y
 * - W1 的 E-08 / A-08 在此目录追加用例；本文件提供 0 critical 的守卫基线
 */
import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "../e2e/fixtures/env";

export default defineConfig({
  testDir: ".",
  globalSetup: "../e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: "../../.cache/a11y/test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: E2E_BASE_URL,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  },
});
