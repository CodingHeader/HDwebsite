# D-15 · 文章详情 NewsArticle JSON-LD（V7 第 2 轮）

## 卡号
D-15（V7-D-15 对等，D 线 · SEO/结构化数据）

## 结论
PASS（静态 + 单测 + e2e）。完成度 **98%**（子代理复审建议补齐的 evidence 目录、e2e spec 已全部落盘并通过）。

## 验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| D-15-1 | 新增 `src/app/(web)/articles/[id]/json-ld.ts` | PASS | 文件存在；纯函数 buildArticleJsonLd / buildArticleJsonLdScript / escapeScriptClosing |
| D-15-2 | NewsArticle 必需字段齐全（headline / datePublished / dateModified / author / image / mainEntityOfPage） | PASS | `jsonld.test.ts` 8 tests；e2e 断言 5 字段 |
| D-15-3 | `escapeScriptClosing` 转义 `</` 与 `<!--` | PASS | 单测：标题含 `</script><script>alert(1)</script>` 不产生注入 |
| D-15-4 | `page.tsx` 只追加 script，不改可见像素 | PASS | `git diff src/app/(web)/articles/[id]/page.tsx` 只增 script 段；e2e 断言 H1 唯一 |
| D-15-5 | 前台风格冻结（REQ-F-014） | PASS | 未改 JSX/className；e2e 断言 `article/.prose-mgr/main` 存在 |
| D-15-6 | 冻结面未触碰 | PASS | `git diff --name-only` 无 `src/contracts/**` / `prisma/**` / `vitest.config.ts` / `package.json` |
| D-15-7 | 测试覆盖 | PASS | 单测 8 tests + e2e 1 test |
| D-15-8 | e2e 场景（子代理建议补齐） | PASS | `tests/e2e/d-jsonld.spec.ts` 新增，`npx playwright test -c tests/e2e/playwright.config.ts d-jsonld` EXIT=0 |

## 证据链
- `src/app/(web)/articles/[id]/json-ld.ts`（新增）
- `src/app/(web)/articles/[id]/page.tsx`（修改，容器顶部追加 script）
- `src/lib/__tests__/lane-d/jsonld.test.ts`（新增，8 tests）
- `tests/e2e/d-jsonld.spec.ts`（新增，e2e）

## 验证命令（2026-10-19 本地）
```bash
$ npx vitest run src/lib/__tests__/lane-d/jsonld.test.ts
EXIT=0
 ✓ src/lib/__tests__/lane-d/jsonld.test.ts (8 tests)  # passed
$ npm run build
EXIT=0
$ npx playwright test -c tests/e2e/playwright.config.ts d-jsonld
EXIT=0
 Running 1 test using 1 worker
  ok 1 tests\e2e\d-jsonld.spec.ts:13:5 › 文章详情页输出 NewsArticle JSON-LD 且与可见内容一致 (500ms)
  1 passed (9.8s)
$ npx tsc --noEmit
EXIT=0
```

## UNKNOWN / 后续
- `mainEntityOfPage` 当前实现为**相对路径字符串**（`/articles/{id}`）；Google Rich Result 更倾向绝对 URL。schema.org 允许 Text，但如需严格兼容建议改为绝对 URL（需引入 `APP_ORIGIN` 或 `headers()`，属后续卡）。
- `image` 仅在 `coverImage` 存在时输出；seed 数据无封面 → e2e 断言按"可选"处理。若后续要 image 必填，需在 seed 补封面。
- `author` 输出为 Person 数组（schema.org 允许）；`creator` 同步输出。

## 关键设计
- 纯函数，无 IO / 无 prisma / 无副作用，便于单测。
- 只追加 `<script type="application/ld+json">`，不改可见像素（REQ-F-014 冻结）。
- XSS 防护：`escapeScriptClosing` 在 JSON.stringify 之后转义 `</` 与 `<!--`。