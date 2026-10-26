# V13-BASE-01：基线固化（含 BUILD_ID 时间戳口径）

## 归属
- 切片：S0
- 缺口：无（基线卡）
- 执行者：P2
- 档位：低｜规模：小

## 目标
在 `upgrade@cbaaf55` 上固化一份**可复核**的基线：七道门禁数值 + 构建新鲜度凭证 + 用例计数，供后续每卡比对。

## 输入
- 文档：`docs/V1.3-20261026/00-事实基线.md`
- 前置：无

## 输出
- `docs/design/06_validation/evidence/V13/BASE-01/execution.md`

## Execution Steps
1. [ ] `git fetch origin upgrade && git pull --ff-only`；记录 HEAD 与 `git rev-list --left-right --count origin/upgrade...HEAD`（必须 `0 0`）
2. [ ] **串行**跑：`npm run lint`、`npm run typecheck`、`npm test`、`npm run build`、`npm run check:assets`、`npm run check:root`、`npm run check:audit`（禁止与 build 并行）
3. [ ] 记录 `stat .next/BUILD_ID` 的 mtime 与 `src` 目录最新 mtime，附进证据（新鲜度凭证）
4. [ ] `npm run test:e2e`（79 例）+ `npx playwright test -c tests/a11y/playwright.config.ts`（12 例）；记录 passed/failed 计数
5. [ ] visual 只记录 CI 状态（`gh api` 或 GitHub API run 结论），本机不跑
6. [ ] 写 evidence：命令原文 + 结果 + 用例数 + BUILD_ID 时间戳

## 验收标准
- [ ] 七道门禁逐条有结果（PASS/FAIL + 命令原文）
- [ ] 证据含 `BUILD_ID` mtime 与 `src` 最新 mtime
- [ ] e2e 79 / a11y 12 / visual CI 状态三项计数入档
- [ ] 双端 `0 0` 快照入档

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
npm run test:e2e
npx playwright test -c tests/a11y/playwright.config.ts
```

## 证据路径
`docs/design/06_validation/evidence/V13/BASE-01/execution.md`

## 允许修改
- `docs/design/06_validation/evidence/V13/BASE-01/**`

## 禁止修改
- `src/**`、`prisma/**`、`package.json`、任何配置

## 依赖与阻塞
- Depends on：无
- 阻塞条件：无（只读卡）

## 升级条件
连续 2 次 FAIL → 熔断上报。
