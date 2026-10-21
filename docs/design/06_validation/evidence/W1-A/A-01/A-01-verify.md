# A-01 独立验收报告

- 验证者：V7-V-A（独立于 A 线原执行者；A 线提交由 Agent-UI 执行）
- 验证方式：只看 `git show --stat 4ce9e16` diff + 运行命令结果（不复用执行者声明）
- 验证日期：2026-10-21

## 判定：PASS

基础件第一批次：diff 在 manager/ui/ 内（前台 src/components/ui/ 未改，仅 label.tsx 注释改写属 A-06 后续）；门禁 4/4 全绿；visual UNKNOWN（Windows 环境，留 Linux 实机）；单测 components.test.tsx 6/6 通过。

## 关键证据

- 提交：`4ce9e16`
- diff 范围：`git show --stat 4ce9e16`（触及文件均属 A 线允许路径，见卡定义）
- 门禁：`npm run lint` 0 errors / `npm run typecheck` exit 0 / `npm test` 823 passed / `npm run build` exit 0（2026-10-21 09:37 复核）
- 单测（本次独立跑）：`npx vitest run src/components/manager/ui src/components/manager/__tests__/data-table.test.tsx src/components/manager/__tests__/resource-form.test.tsx` → 3 files / 17 tests passed
- e2e：`npx playwright test -c tests/e2e/playwright.config.ts` → 49 pass / 3 skip / 0 fail
- a11y：`npx playwright test -c tests/a11y/playwright.config.ts` → 12 passed（页面层 serious/critical=0）

## UNKNOWN

- **visual**：前台视觉回归 `npm run test:visual` 在 Windows 环境 UNKNOWN（参照图生成于 Linux/CI，main@94dbbbb 口径）；留 Linux 实机（V7-UI-02）。
- 本卡验收原引用 `w1-base-ccr-1` / `w1-ui-kit` tag（2026-10-19 已删），按 V0.7 口径改写为提交号 `f158501` / `c6a2cb4`。

## 是否允许进入下一阶段

**允许**。PASS with UNKNOWN（visual 非本卡硬门禁；门禁/单测/e2e/a11y 均独立复核通过）。
