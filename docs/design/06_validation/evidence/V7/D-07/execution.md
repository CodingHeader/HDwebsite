# D-07 · next.config 清理 + redirects 回归（V7 第 2 轮）

## 卡号
D-07（V7-D-07 对等，D 线 · 配置一致性）

## 结论
PASS（静态 + 单测）。完成度 **92%**（子代理复审建议补齐的 evidence 目录、commit；e2e 场景本卡为配置静态回归，redirects 属服务端中间件行为，单测已覆盖一致性）。

## 验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| D-07-1 | `next.config.ts` rewrites 注释"当前为预留"→ 已接入 | PASS | `grep "当前为预留"` 0 命中；注释说明 `/api/file/[:path]` |
| D-07-2 | `src/lib/jobs/index.ts` 头注释"后续切片注册"→ 列出实际 6 个 job | PASS | `grep "后续切片注册"` 0 命中；头注释列出 backup/collect.run/publish.scan/notify.scan/retry.failed/llm.balance-check |
| D-07-3 | `redirects` 与 `main@94dbbbb` 逐条一致 | PASS | `redirects.test.ts` fixture 29 条；`diff` 结果 29=29、permanent=false |
| D-07-4 | 全部 redirect 为 307 temporary | PASS | 单测 `every(r => r.permanent === false)` |
| D-07-5 | `cssChunking` 保持 false | PASS | `next.config.ts` 未改 |
| D-07-6 | 冻结面未触碰 | PASS | `git diff --name-only` 无 `src/contracts/**` / `prisma/**` / `vitest.config.ts` / `package.json` |
| D-07-7 | 测试覆盖 | PASS | `src/lib/__tests__/lane-d/redirects.test.ts` 4 tests |

## 证据链
- `src/lib/__tests__/lane-d/redirects.test.ts`（新增，4 tests）
- `next.config.ts`（修改，注释级）
- `src/lib/jobs/index.ts`（修改，头注释级）

## 验证命令（2026-10-19 本地）
```bash
$ npx vitest run src/lib/__tests__/lane-d/redirects.test.ts
EXIT=0
 ✓ src/lib/__tests__/lane-d/redirects.test.ts (4 tests)  # passed
$ npx tsc --noEmit
EXIT=0
$ npx eslint next.config.ts src/lib/jobs/index.ts
EXIT=0
```

## UNKNOWN / 后续
- redirects 的实际运行时重定向行为未在 e2e 验证（本卡属配置静态回归，未引入 e2e 场景）。
- 若后续需 `test:e2e` 全量，应加 redirects 冒烟（如 `/index.php` 307 → `/`），本卡不承担。

## 关键设计
- 只清理过期注释，不改功能配置（cssChunking、redirects 内容、image.domains 等原样保留）。
- redirects 一致性以 main 为唯一基准（REQ-F-014 前台对等）。