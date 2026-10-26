# V13-GATE-A11Y-01：a11y 门禁接入 CI（消灭孤儿测试）

## 归属
- 切片：S1
- 缺口：**G4、G5**
- 执行者：main-agent
- 档位：中｜规模：中

## 目标
把已存在但**不在任何流水线**的 a11y 测试接入 CI，并为前台补最小 axe 扫描，使 REQ-F-015 / REQ-NF-003 的 axe 验收条目真正有守卫。

## 输入
- `tests/a11y/manager.spec.ts`（11 页）、`tests/a11y/smoke.spec.ts`（登录页）
- `tests/a11y/playwright.config.ts`（复用 e2e globalSetup 与端口）
- 本轮实测：`npx playwright test -c tests/a11y/playwright.config.ts` → **12/12 PASS**
- `.github/workflows/ci.yml`（gate job 已有 E2E 步骤，可并列追加）

## 输出
- `.github/workflows/ci.yml`（新增 a11y 步骤）
- `tests/a11y/web.spec.ts`（前台最小 axe 用例，**新增**）
- `docs/design/06_validation/evidence/V13/GATE-A11Y-01/execution.md`

## Execution Steps
1. [ ] **不改 `package.json`**（冻结面）：CI 步骤直接写 `npx playwright test -c tests/a11y/playwright.config.ts`
2. [ ] 在 gate job 的 `E2E (Linux)` 之后追加 a11y 步骤，复用已安装的 chromium（不再 `playwright install`）
3. [ ] 管理端 11 页 + 登录页保持**阻断**（现状 0 违规，不设 `continue-on-error`）
4. [ ] 新增 `tests/a11y/web.spec.ts`：前台 5 代表页（`/`、`/articles`、`/courses`、`/apply`、`/contact`）axe 扫描
   - **只读扫描**；若发现违规，**只允许改 aria/role/label 等语义属性，严禁改 className/JSX 结构**（REQ-F-014 冻结）
   - 若无法在不改样式前提下修复 → 记入已知项清单并 `test.fixme`，附原因
5. [ ] 本地跑 `npx playwright test -c tests/a11y/playwright.config.ts` 全绿（含新用例）
6. [ ] 推送后核对 CI run：a11y 步骤 PASS

## 验收标准
- [ ] `ci.yml` 含 a11y 步骤且非 `continue-on-error`
- [ ] 本地 a11y 用例数 ≥ 17（原 12 + 前台 5）且全绿
- [ ] `package.json` 未被修改（`git diff --exit-code package.json` 通过）
- [ ] 前台用例若有豁免项，逐条附原因与需求依据
- [ ] CI run 链接入证据

## 验证命令
```bash
npx playwright test -c tests/a11y/playwright.config.ts
git diff --exit-code package.json
npm run lint && npm run typecheck
```

## 证据路径
`docs/design/06_validation/evidence/V13/GATE-A11Y-01/execution.md`

## 允许修改
- `.github/workflows/ci.yml`
- `tests/a11y/**`
- `docs/design/06_validation/evidence/V13/GATE-A11Y-01/**`
- （若必须）`src/app/(web)/**` 的**仅** aria/role/label 属性

## 禁止修改
- `package.json`、`playwright.config.ts`、`vitest.config.ts`
- 前台任何 `className` / JSX 结构 / `public/**` / `globals.css`

## 依赖与阻塞
- Depends on：V13-BASE-01
- 阻塞条件：若前台 ax 违规必须改样式才能修 → 标 blocked，交用户裁决（REQ-F-014 与 REQ-NF-003 冲突）

## 升级条件
连续 2 次 FAIL → 熔断，降级为"仅管理端接入 CI + 前台记 backlog"。
