// W0-07：强制 NODE_ENV='test'。否则外部 shell 的 NODE_ENV=production 会让 react
// 加载生产构建，导致 React 19 的 `act` 未导出（`React.act is not a function`），
// @testing-library/react 的 render/act 全部失败。此赋值必须发生在 vite/react 解析前。
// 用 Object.assign 绕开 @types/node 对 `process.env.NODE_ENV` 的 readonly 声明（TS2540）。
Object.assign(process.env, { NODE_ENV: "test" });

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // W0-07：扩至 .tsx（组件测试，文件头 `// @vitest-environment jsdom`）与 tests/contract（契约测试）
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx", "tests/contract/**/*.test.ts"],
    env: {
      JWT_SECRET: "vitest-secret-key-0123456789abcdef-hd",
      ENCRYPTION_KEY: "vitest-encryption-key-0123456789abcdef",
      NODE_ENV: "test",
    },
  },
});