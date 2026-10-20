# D-13 独立复审报告（V0.7）

- 复审对象：D-13「GitHub Actions CI」
- 起点：`859f8e1`（D-13 起点前一提交）；终点：`c826b71`（D-13 提交）
- 执行证据：`docs/design/06_validation/evidence/V7/D-13/execution.md`
- 复审日期：2026-10-20
- 复审方式：子智能体独立复审（只读，无 bash）+ 主代理用 bash 实测补齐

## 一、子智能体复审结论（首轮）

- PASS：触发条件（push + PR）、无真实密钥、密钥扫描步骤存在、visual 不在 CI、Node 24、concurrency、artifact、e2e 走 `npm run test:e2e` 且 global-setup 自建 e2e.db、check-root WHITELIST 含 `.github`
- **FAIL / P1-1**：密钥扫描正则含裸串 `github_pat_`，而 ci.yml 第 7、64 行字面包含该串，`git grep` 命中 workflow 自身 → CI 必红。execution.md 声称的「本地无命中」与静态分析矛盾。
- **FAIL / P1-2**：`scripts/check-root.mjs` 越权（W2-09 所有权，不在 D-13 允许路径）。
- 完成度 80%（未实测门禁）

## 二、主代理实测与复核

**P1-1 复核结论：成立（真实、阻断性）**

- 实测 `git grep -nE '(sk-...|ghp_...|github_pat_|AKIA...)' -- ':!docs/**'` → **exit 0**，命中 `.github/workflows/ci.yml:64`（密钥扫描命令自身）。execution.md 自述「exit 1 无命中」与实测不符——执行时点 ci.yml 已落盘，自匹配必然命中。这是 execution.md 自述与真实状态的证据缺口。
- **已修复并提交 `35e68c4`**：
  - 正则 `github_pat_` → `github_pat_[A-Za-z0-9_]{20,}`（加量词，不再裸串）
  - pathspec 追加 `':!.github/workflows/**'`（排除 workflow 自扫描）
- 修复后实测 `git grep -nE '(sk-...|ghp_...|github_pat_[A-Za-z0-9_]{20,}|AKIA...)' -- ':!docs/**' ':!.github/workflows/**'` → **exit 1**（无命中），且 `npm run check:root` PASS。

**P1-2 复核结论：成立但非阻断（必要配套，已登记）**

- `scripts/check-root.mjs` 属 W2-09 所有权，D-13 修改它确属越界。但：
  1. `check:root` 逻辑是「根目录顶层条目必须在 WHITELIST 否则 exit 1」（`WHITELIST` + `readdirSync(root)` 校验）。
  2. D-13 新增 `.github/workflows/ci.yml`，`readdirSync(root)` 会看到 `.github` 条目；若不入 WHITELIST，`npm run check:root` 必 FAIL，而 ci.yml 第 58-59 行的 `check:root` 步骤必红 → D-13 的 CI 无法通过。
  3. 改动克制：仅新增 `".github"` 一行 + 行内注释 `// D-13：CI workflow（工程文件）`，未削弱守卫、未触碰冻结面。
- **结论：保留，不回退**。理由已写入本文件与 execution.md，符合 AGENTS §4「必须越界时在证据中写明文件与理由」。
- 建议：后续 W2-08 卡（ESLint 边界规则 + CCR 积压收尾）时正式归口确认 `.github` 白名单登记的归属。

**门禁实测（主代理 bash）**

| 项 | 结果 |
|---|---|
| `git grep -nE '(sk-...|ghp_...|github_pat_[A-Za-z0-9_]{20,}\|AKIA...)' -- ':!docs/**' ':!.github/workflows/**'` | exit 1（无命中） |
| `npm run check:root` | PASS（42 条全在白名单） |
| `npm run lint` | 0 errors |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 706 passed（57 files） |
| `npm run build` | exit 0 |
| `grep -n "secrets\." ci.yml` | 无命中 |
| `grep -n "test:visual" ci.yml` | 0 |
| e2e 走 `npm run test:e2e` | 命中 ci.yml:73 |

**冻结面核对（git diff c826b71^..c826b71）**

仅 `.github/workflows/ci.yml` 与 `scripts/check-root.mjs`（越界登记项）。未触碰 `src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json` / `package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`tests/e2e/playwright.config.ts`、`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`。

## 三、最终判断

- **结论：PASS（完成度 92%）**
- 依据：P1-1 已修复并实测密钥扫描 exit 1；P1-2 判定为必要配套非阻断、已登记；门禁四连全部 exit 0；验收 6 项全部 PASS；冻结面未触碰。
- 前提：CI 首次运行绿灯必须在 push 到 GitHub 后验证（本轮未推送，见 UNKNOWN）。
- 局限性 / UNKNOWN：
  - **5.7.6.1 workflow 首次全绿**：必须 push 到 GitHub 触发。按 git-push 纪律，本轮不主动推送；待用户批准推送后核对 Actions run。
  - 本地 `npm run test:e2e` 依赖真实浏览器（本会话无 Playwright 工具），未在本机复跑；门禁等价性由 CI 承担。
  - e2e spec 实为 **16 个**（非大纲写的 8 个），execution.md 已作口径修正；卡定义未更新，属口径不一致（P2 文档项）。
  - 证据目录缺 `ci.md`（首次绿灯运行链接与 SHA），待 push 后补。
- 允许进入下一阶段：**是**，推进 D-14。