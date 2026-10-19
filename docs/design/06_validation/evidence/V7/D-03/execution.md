# D-03 · env 集中校验（V7 第 2 轮）

## 卡号
D-03（V7-SEC-03 对等，D 线 · 部署/环境）

## 结论
PASS（静态 + 单测）。完成度 **95%**（子代理复审建议补齐的 evidence 目录、e2e 场景、commit 三项，本文件已落盘；e2e 场景 D-03 属非用户可见路径，按卡边界不扩）。

## 验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| D-03-1 | 新增 `src/lib/env.ts`：`collectEnvIssues` / `assertProductionEnv` / `productionPort` / `dataDir` | PASS | 文件存在；`collectEnvIssues` 纯函数返回键名列表 |
| D-03-2 | 生产缺失调用 `assertProductionEnv` 时 `process.exit(1)` | PASS | `src/lib/env.ts` `process.exit(1)` 分支；单测 spyOn exit |
| D-03-3 | 错误信息只打印键名、**不打印值** | PASS | `env.ts` `console.error` 仅 `key`；单测断言不含密钥值 |
| D-03-4 | `src/instrumentation.ts` 在 `register()` 调用 `assertProductionEnv()` | PASS | `register()` 首行 `await import("@/lib/env")` → `assertProductionEnv()` |
| D-03-5 | `.env.example` 移除死键 `CRON_SECRET` | PASS | grep `CRON_SECRET` 0 命中；ADR-031 已记录 |
| D-03-6 | 非生产 env 缺失仅 `console.warn` 不退出 | PASS | `env.ts` 分支 |
| D-03-7 | 测试覆盖 | PASS | `src/lib/__tests__/lane-d/env.test.ts` 13 tests，`npx vitest run` EXIT=0 |
| D-03-8 | 冻结面未触碰 | PASS | `git diff --name-only` 无 `src/contracts/**` / `prisma/**` / `vitest.config.ts` / `package.json` |

## 证据链
- `docs/design/03_solution/decisions/ADR-031-remove-cron-secret.md`（死键移除记录）
- `src/lib/env.ts`（新增）
- `src/instrumentation.ts`（修改）
- `.env.example`（修改）
- `src/lib/__tests__/lane-d/env.test.ts`（新增，13 tests）

## 验证命令（2026-10-19 本地）
```bash
$ npx vitest run src/lib/__tests__/lane-d/env.test.ts
EXIT=0
 ✓ src/lib/__tests__/lane-d/env.test.ts (13 tests)  # passed
$ npx tsc --noEmit
EXIT=0
$ npx eslint src/lib/env.ts src/instrumentation.ts .env.example
EXIT=0
```

## UNKNOWN / 后续
- 生产缺失 env 的运行时表现仅由单测覆盖；`next start` 实际行为未在 e2e 验证（D-03 卡边界不含 UI e2e）。
- `.env.local` 未提交（安全铁律）。

## 关键设计
- import 时不抛错（测试/构建期安全），由 instrumentation 显式调用。
- JWT_SECRET / ENCRYPTION_KEY ≥32、DATABASE_URL、APP_ORIGIN、PORT / HOSTNAME / DATA_DIR 校验。
- CRON_SECRET 0 引用 → ADR-031 记录移除。