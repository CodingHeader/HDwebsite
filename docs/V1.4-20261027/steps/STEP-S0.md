# STEP-S0：基线固化

## 目标
在 `upgrade@3e6a6b5` 上固化可复现基线，作为后续每卡比对基准；同时核对 V1.3 台账与本轮实测的差异。

## 卡
- `V14-BASE-01`（P2，`haiku`，小）

## 执行步骤
1. `git fetch origin upgrade && git pull --ff-only`；记 HEAD 与双端计数（必须 `0 0`）
2. **串行**跑七道门禁：lint → typecheck → test → build → check:assets → check:root → check:audit
   - ⚠️ 禁止把 build 与 test 并行（V13 实测产 `Hook timed out` 假红）
3. 记 `.next/BUILD_ID` mtime 与 `src` 最新 mtime（新鲜度凭证）
4. `npm run test:e2e`（期望 79）；`npx playwright test -c tests/a11y/...`（期望 12）
5. visual 只记 CI 最近一次结论（本机 Windows 不可判）
6. 核对 V1.3 台账数字，不一致逐条列出（**已知至少 1 处**：迁移目录 V1.3 记 8，实测 7）
7. 落证据 `evidence/V14/BASE-01/execution.md`

## 完成判据
- [ ] 七道门禁逐条有结果 + 命令原文
- [ ] 证据含 BUILD_ID 与 src 两个 ISO 时间戳
- [ ] e2e / a11y / visual-CI 三项计数入档
- [ ] 双端 `0 0`
- [ ] 与 V1.3 台账不一致项逐条列出

## 验证命令
```bash
git rev-list --left-right --count origin/upgrade...HEAD
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
npm run test:e2e
npx playwright test -c tests/a11y/playwright.config.ts
```

## 证据落点
`docs/design/06_validation/evidence/V14/BASE-01/execution.md`
