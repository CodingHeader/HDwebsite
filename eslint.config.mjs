import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    ".local/**",
    // CCR-1（W0-11）：.cache 是运行时产物（e2e/visual 的日志、截图、storageState 与临时脚本），
    // 不忽略会导致 lint 计数随缓存内容漂移（W0-08 记 26 条 vs 干净树 18 条）
    ".cache/**",
  ]),
]);

export default eslintConfig;
