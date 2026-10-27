# STEP-S1：a11y 成为真门禁

## 目标
把已存在但不在任何流水线的 a11y 测试接进 CI，并为前台补最小 axe 扫描。

## 卡
- `V14-A11Y-01`（main-agent，`opus`，中）

## 现状（实测）
- `tests/a11y/manager.spec.ts`（11 页）+ `smoke.spec.ts`（登录页）= 12 例本地全绿
- `package.json` **无 a11y script**；`.github/workflows/ci.yml` **无 a11y 步骤**
- 前台（`(web)`）**无任何 axe 用例** → 覆盖 0

## 执行步骤
1. **不改 `package.json`**（冻结面）：CI 步骤直接写 `npx playwright test -c tests/a11y/playwright.config.ts`
2. 在 gate job 的 `E2E (Linux)` 之后追加 a11y 步骤，复用已装 chromium
3. 管理端 11 页 + 登录页保持**阻断**（不设 `continue-on-error`）
4. 新增 `tests/a11y/web.spec.ts`：`/`、`/articles`、`/courses`、`/apply`、`/contact` 五页
   - 违规若必须改样式才能修 → 只改 `aria-*`/`role`/`label`；仍不行则 `test.fixme` + 写原因
   - 逐条违规记入证据，标"可修 / 需改样式（上报）"
5. 本地跑至全绿（期望 ≥17 例）
6. 推送后核对 CI run 的 a11y 步骤 PASS

## 完成判据
- [ ] `ci.yml` 含 a11y 步骤且非 `continue-on-error`
- [ ] 本地用例 ≥17 且全绿
- [ ] `git diff --exit-code package.json` 通过
- [ ] 前台豁免项逐条附原因
- [ ] CI run 链接入证据

## 关键约束
- **前台只允许改 aria/role/label**，禁改 `className`/JSX 结构/`public`/`globals.css`
- 若必须改样式 → 标 `blocked` 上报（B2），不得自行决定

## 验证命令
```bash
grep -n "a11y" .github/workflows/ci.yml
npx playwright test -c tests/a11y/playwright.config.ts
git diff --exit-code package.json
```

## 证据落点
`docs/design/06_validation/evidence/V14/A11Y-01/execution.md`
