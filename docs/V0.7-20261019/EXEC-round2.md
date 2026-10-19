# V0.7 执行记录 · 第 2 轮（2026-10-19）

> 分支 `upgrade` 单主线。本轮完成 D 线三张卡：D-03（env 集中校验）、D-07（next.config 清理 + redirects 回归）、D-15（文章 JSON-LD）。
> 已提交：`69c814c`（D-03）、`9f01125`（D-07）、`7307373`（D-15）。

## 1. V7-SEC-01 / V7-T-01 / V7-G-01 状态（第 1 轮已完成）
- SEC-01 `301b135`；T-01 `2e8de69`；G-01 `bc4427b`；证据 `1c086a0`。
- 四轮子代理审查迭代，最终 R4 PASS（E1~E5 全拦截 + 超管不回归）。

## 2. D-03：src/lib/env.ts 集中校验

### 2.1 改动
| 文件 | 类型 |
|---|---|
| `src/lib/env.ts` | 新增（纯函数：collectEnvIssues / assertProductionEnv / productionPort / dataDir） |
| `src/instrumentation.ts` | 修改（`register()` 先 `assertProductionEnv()`） |
| `.env.example` | 修改（移除 CRON_SECRET，加 DATA_DIR） |
| `src/lib/__tests__/lane-d/env.test.ts` | 新增（13 用例） |
| `docs/design/03_solution/decisions/ADR-031-remove-cron-secret.md` | 新增 |
| `docs/design/06_validation/evidence/V7/D-03/execution.md` | 新增 |

### 2.2 设计要点
- import 时**不抛错**（测试/构建期安全），由 instrumentation 显式调用。
- 生产缺失 `process.exit(1)` + 打印键名（**不打印值**）；非生产仅 `console.warn`。
- JWT_SECRET/ENCRYPTION_KEY ≥32、DATABASE_URL、APP_ORIGIN、PORT/HOSTNAME/DATA_DIR 校验。
- CRON_SECRET 0 引用 → ADR-031 记录移除（死键）。

### 2.3 门禁
- `npx vitest run src/lib/__tests__/lane-d/env.test.ts` EXIT=0（13 tests）。
- `npx tsc --noEmit` EXIT=0。
- 中途修复：`vi.spyOn(process, "exit")` 类型不匹配（`never`），已用 cast 修正。

## 3. D-07：next.config 清理 + redirects 回归测试

### 3.1 改动
| 文件 | 类型 |
|---|---|
| `next.config.ts` | 修改（rewrites 注释"当前为预留"→ 已接入说明） |
| `src/lib/jobs/index.ts` | 修改（头注释"后续切片注册"→ 列出已注册 6 个 job） |
| `src/lib/__tests__/lane-d/redirects.test.ts` | 新增（4 用例） |
| `docs/design/06_validation/evidence/V7/D-07/execution.md` | 新增 |

### 3.2 一致性验证
- 从 `main@94dbbbb` 提取 29 条 redirects，与 `upgrade` 的 `next.config.redirects()` 对比。
- `diff` 结果：条数 29 = 29，逐条 source/destination/permanent 全等，`MATCH=True`。
- 测试：条数一致、逐条一致、关键重定向存在、全部 307 temporary。

### 3.3 门禁
- `npx vitest run src/lib/__tests__/lane-d/redirects.test.ts` EXIT=0（4 tests）。
- 过期注释 `grep -n "当前为预留\|后续切片注册"` 0 命中。

## 4. D-15：文章详情 NewsArticle JSON-LD

### 4.1 改动
| 文件 | 类型 |
|---|---|
| `src/app/(web)/articles/[id]/json-ld.ts` | 新增（纯函数：buildArticleJsonLd / buildArticleJsonLdScript / escapeScriptClosing） |
| `src/app/(web)/articles/[id]/page.tsx` | 修改（仅在容器顶部追加 `<script type="application/ld+json">`） |
| `src/lib/__tests__/lane-d/jsonld.test.ts` | 新增（8 用例） |
| `tests/e2e/d-jsonld.spec.ts` | 新增（e2e 场景） |
| `docs/design/06_validation/evidence/V7/D-15/execution.md` | 新增 |

### 4.2 设计要点
- NewsArticle 必需字段：headline、datePublished、dateModified、author(Person)、image、mainEntityOfPage。
- 安全：`escapeScriptClosing` 转义 `</` 与 `<!--`，防 `</script>` 提前闭合注入。
- 前台像素不变：只追加 script，未改 JSX 结构（REQ-F-014 冻结）。

### 4.3 e2e 实现要点（子代理建议补齐）
- Playwright 视 `<script>` 元素恒为 hidden（无渲染框），所以**不能**用 `toBeVisible()` 断言存在性；改用 `toHaveCount(1)` + `toBeAttached()`。
- 实现输出 `mainEntityOfPage` 为**相对字符串 URL**（schema.org 允许 Text），断言需与页面 `pathname` 比较而非 `page.url()`。
- 实现把 `author` 输出为 **Person 数组**（schema.org 允许），断言需处理数组形态。
- `image` 仅在 `coverImage` 存在时输出；seed 无封面 → 断言按"可选"处理。

### 4.4 门禁
- `npx vitest run src/lib/__tests__/lane-d/jsonld.test.ts` EXIT=0（8 tests）。
- `npm run build` EXIT=0。
- `npx playwright test -c tests/e2e/playwright.config.ts d-jsonld` EXIT=0（1 passed, 500ms）。
- 标题含 `</script><script>alert(1)</script>` 不产生注入（单测覆盖）。

## 5. 通用门禁（三卡一起）
```bash
$ npm test
EXIT=0
 Test Files  47 passed (47)
      Tests  645 passed (645)   # 比基线 597/599 多 48 用例
```
- `npx tsc --noEmit` EXIT=0。
- `npx eslint src/lib/env.ts src/instrumentation.ts src/lib/__tests__/lane-d/*.test.ts "src/app/(web)/articles/[id]/*" tests/e2e/d-jsonld.spec.ts` EXIT=0。

## 6. 子代理复审（本轮已完成）
- 子代理对三卡给 PASS：D-03 95%、D-07 92%、D-15 98%（扣分项全部已补齐：evidence 目录、D-15 e2e spec、commit）。
- 本轮修复链：D-15 e2e 三次失败（script 恒 hidden / mainEntityOfPage 相对 URL / author 数组形态 / image 可选）→ 全部修正并 PASS。

## 7. 已完成卡片汇总（V0.7 累计）
| 卡 | 提交 | 状态 |
|---|---|---|
| V7-SEC-01（E1~E5 越权收口） | `301b135` | PASS |
| V7-T-01（测试隔离） | `2e8de69` | PASS |
| V7-G-01（AGENTS.md 单主线） | `bc4427b` | PASS |
| V7-D-03（env 集中校验） | `69c814c` | PASS |
| V7-D-07（next.config + redirects） | `9f01125` | PASS |
| V7-D-15（文章 JSON-LD） | `7307373` | PASS |

## 8. 待办
- D-04 Docker、D-05~D-14 存储/性能/部署/CI/审计
- B-05 publish / B-06 quietHours / B-07 uploadimg
- 32 张 W1 卡独立验收补登
- W2-03 npm audit critical/high 处置
- 门禁回归（含 test:visual 前台风格门禁）
- 推送（**push 须用户批准**）