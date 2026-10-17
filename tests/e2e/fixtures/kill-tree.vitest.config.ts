/**
 * kill-tree 单测专用 vitest 配置（E-12）。
 * 说明：vitest.config.ts 在 Wave 0 之后冻结，其 include 不含 tests/e2e/**；
 * 本文件仅为运行 fixtures 内单测而新建（E-12 允许修改 tests/e2e/fixtures/**），不修改冻结配置。
 * 运行：`npx vitest run -c tests/e2e/fixtures/kill-tree.vitest.config.ts`
 */
import { defineConfig, mergeConfig } from "vitest/config";
import base from "../../../vitest.config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/e2e/fixtures/kill-tree.test.ts"],
    },
  })
);
