# STEP-S0：基线可信化

## 目标
在 `upgrade@cbaaf55` 上固化一份可复核的基线，作为后续每卡比对基准。

## 卡
- `V13-BASE-01`（P2，低档，小）

## 执行步骤
1. `git fetch origin upgrade && git pull --ff-only origin upgrade`；记录 HEAD 与双端计数（必须 `0 0`）
2. **串行**跑七道门禁：lint → typecheck → test → build → check:assets → check:root → check:audit
   - ⚠️ 禁止把 build 与 test 并行（会产 `Hook timed out` 假红）
3. 记录 `stat .next/BUILD_ID` mtime 与 `src` 最新 mtime
4. `npm run test:e2e`（79 例）；`npx playwright test -c tests/a11y/playwright.config.ts`（12 例）
5. visual 只记录 CI 状态（本机不跑）
6. 落证据 `evidence/V13/BASE-01/execution.md`

## 完成判据
- [ ] 七道门禁逐条有结果 + 命令原文
- [ ] 证据含 BUILD_ID 与 src 两个 mtime
- [ ] e2e / a11y / visual-CI 三项计数入档
- [ ] 双端 `0 0`

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
npm run test:e2e
npx playwright test -c tests/a11y/playwright.config.ts
```

## 证据落点
`docs/design/06_validation/evidence/V13/BASE-01/execution.md`
