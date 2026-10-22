import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ── W2-08：架构边界规则（error，不再只是 warning） ──────────────────
    // 目标 1：src/lib 不得反向依赖 src/app（分层单向：app → lib，绝不回指）。
    //   背景：D-09 期曾出现 collect-engine.ts 反向 import @/app 的实现细节，
    //   使 lib 层无法脱离 Next 路由单独测试。
    //   豁免：__tests__ 下允许（契约测试需要直接 import route handler 调用，
    //   这是 W2-02 全路由契约套件的核心机制，属预期用法而非分层破坏）。
    files: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
    // 豁免 __tests__：契约测试必须直接 import route handler 并在进程内调用
    //（W2-02 全路由契约套件 865 用例的核心机制），属预期用法，不是分层破坏。
    ignores: ["src/lib/**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/app/**", "**/app/api/**"],
              message:
                "src/lib 不得依赖 src/app（分层单向：app → lib）。若确需共享逻辑，请下沉到 src/lib 或 src/contracts。",
            },
          ],
        },
      ],
    },
  },
  {
    // 目标 2：路由内不得自行定义请求体 zod schema（DTO 唯一源是 src/contracts/**）。
    //   背景：ADR 契约唯一源——路由内重复定义会导致「契约改了、路由没改」的静默漂移。
    //   CCR-W2-08-01 已落地：原唯一存量违例 src/app/api/apply/route.ts 的 applySchema
    //   已迁至 src/contracts/resources.ts 的 applySubmitSchema，故此处**不再有任何豁免**，
    //   规则对全部路由 100% 生效。
    files: ["src/app/api/**/route.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "VariableDeclarator > CallExpression[callee.object.name='z'][callee.property.name='object']",
          message:
            "路由内不得定义请求体 zod schema；请在 src/contracts/** 定义后 import（DTO 唯一源）。",
        },
        {
          selector: "VariableDeclarator > CallExpression[callee.object.name='z'][callee.property.name=/^(string|number|boolean|enum|array|union|record|literal)$/]",
          message:
            "路由内不得定义请求体 zod schema；请在 src/contracts/** 定义后 import（DTO 唯一源）。",
        },
      ],
    },
  },
  {
    // V8-T-03：`_` 前缀约定。
    // 项目里有大量「解构剥离字段」的写法，例如
    //     const { passwordHash: _ph, ...safe } = user;
    // 目的是**移除敏感字段后返回**，`_ph` 天然不会被使用。
    // 同理还有未使用的回调参数（`(_req, res)`）与故意丢弃的返回值。
    // 这些不是遗漏，强制删除反而会改变语义或引入冗余代码。
    // 约定：以 `_` 开头的标识符不报 no-unused-vars（与 TS/社区通行做法一致）。
    files: ["**/*.ts", "**/*.tsx", "**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // V8-T-03：Markdown 渲染器里的原生 <img> 是**必要例外**。
    // ArticleContent 渲染的是后台富文本/Markdown 转换后的任意图片 URL，
    // next/image 需要固定 width/height 与 remotePatterns 白名单，
    // 换成它会导致外部图（采集来的、公众号的）被挡掉或变形。
    // 已加 loading="lazy" 缓解 LCP，属可接受的取舍。
    files: ["src/components/web/ArticleContent.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
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
    // V8-T-03：AI 助手的临时探查脚本目录（非项目代码，且已被 .gitignore 忽略）。
    // 不忽略会让 lint 计数随会话临时文件漂移，与 W0-11 忽略 .cache 同理。
    ".box-agent-scratch/**",
    ".box-agent/**",
  ]),
]);

export default eslintConfig;
