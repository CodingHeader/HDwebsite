# D-13 执行记录（证据）

## 5W1H 简版
- **What**：在 `.github/workflows/ci.yml` 建立 CI，push 到 `upgrade` 或指向 `upgrade` 的 PR 时在 Ubuntu 上跑全门禁（lint/typecheck/test/build/check:assets/check:root + e2e）；不跑 visual；不含 secrets。
- **Why**：规划 S4「CI 在 PR 上跑全门禁」，需求基线 SHOULD「CI 在 Linux 跑全门禁（D-13）」。此前 `V7-Q3`/`R7` 均依赖 Hark 的 Docker，D-13 落地后以 CI 为准。
- **Where**：`.github/**`（D-13 允许路径）。
- **Who**：D-13（P3·sonnect·L1），依赖 V7-T-01。
- **How**：编写 workflow → 本地跑通用门禁（模拟 CI 步骤）→ 密钥扫描用 `git grep -nE`。
- **When**：2026-10-20。

## 改动文件
- **新增** `.github/workflows/ci.yml`（77 行）：
  - 触发：`push: branches: [upgrade]` + `pull_request: branches: [upgrade]`；`concurrency.cancel-in-progress`。
  - Node 24 + `npm ci` → `npx prisma generate`（Prisma 7 需显式 generate）→ lint → typecheck → test → build → `check:assets` + `check:root` → 密钥扫描 → `playwright install --with-deps chromium` → `npm run test:e2e` → 上传 `.cache/e2e/**` artifact。
  - **secrets**：全 workflow 不使用 `secrets.*` / `.env`；`NODE_ENV=test` 由 job 级 env 给出，JWT/ENCRYPTION 由 `tests/e2e/global-setup.ts` 内部生成（`e2e-*` 测试值，非真实凭据）。
  - **visual 不在 CI**：参照机是 Windows，Linux 字体渲染会出现 11 处固定差异（V0.4 门禁证据）。
  - **密钥扫描步骤**（V0.7 追加验收）：`git grep -nE '(sk-...|ghp_...|github_pat_|AKIA...)' -- ':!docs/**'`，有输出即 exit 1。
- **改** `scripts/check-root.mjs`：`WHITELIST` 新增 `.github`（D-13 新增的 CI 工程文件，属根目录守卫必要登记）。

## 验收逐条结果
| 项 | 结果 | 证据 |
|---|---|---|
| 5.7.6.1 workflow 在 upgrade 首次全绿 | UNKNOWN | 需 push 到 GitHub 触发（本轮未推送，见 UNKNOWN 说明） |
| 5.7.6.2 workflow 无真实密钥 / .env 内容 | PASS | `grep -n "secrets\." ci.yml` 空；`grep -n '\.env' ci.yml` 仅注释提到「.env 内容由 e2e-* 值」；`node -e` 检查 `no secrets ref: true` |
| 5.7.6.3 密钥扫描步骤 | PASS | `grep -n "git grep -nE" ci.yml` 命中；本地 `git grep -nE '(sk-...|ghp_...|github_pat_|AKIA...)' -- ':!docs/**'` 无命中（exit 1） |
| 5.7.6.4 visual 不在 CI | PASS | `grep -c "test:visual" ci.yml` = 0 |
| 5.7.6.5 通用门禁 | PASS（本地等价） | lint 0 errors / typecheck 0 / test 702 passed（56 files）/ build exit 0 |
| CI 内 guards | PASS（本地等价） | `npm run check:assets` exit 0（仅 video-poster.jpg 已登记 W2-09）；`npm run check:root` exit 0（42 条全在白名单） |

## 关键设计决策与理由
- **e2e 走 `npm run test:e2e`**：该配置 `tests/e2e/playwright.config.ts` 的 global-setup 会自建 `prisma/e2e.db`（`migrate deploy` + seed），不触碰 dev.db；mock LLM/采集站点在 6799 端口起，被测应用 6791，均绑定 127.0.0.1，Linux 与 win32 均已适配（E-12）。
- **Node 24**：`package.json.engines.node = '>=24'`。
- **artifact 保留 `.cache/e2e/**`**：trace/screenshot/results.json 便于失败回溯；`retention-days: 7`。

## 未覆盖 / UNKNOWN
- **5.7.6.1 首次运行全绿**：必须 push 到 GitHub 才能验证。按 git-push 纪律，本轮不主动推送；待用户批准推送后核对 Actions run。**口径修正**：大纲写"e2e 8/8"来自 P05 时仅 8 个 spec；当前 `tests/e2e/*.spec.ts` 实为 **16 个**，CI 跑 `npm run test:e2e` 会覆盖全部 spec，验收口径按「全部 spec 通过」判定。
- 本地 `npm run test:e2e` 依赖真实浏览器（当前会话无 Playwright 工具），未在本机复跑；门禁等价性由 CI 承担。
- **build 无 env 兜底风险（复审 P0）已复核排除**：实测 `mv .env.local` 后 `env -u JWT_SECRET/ENCRYPTION_KEY/DATABASE_URL/APP_ORIGIN npm run build` 依然 exit 0（Next 16 build 不执行 `instrumentation.register()`）。仍在 job env 补入 e2e-* 占位，作为零风险防御（同时避免 `assertProductionEnv` 在 CI 首次运行 e2e server 时因缺键而误退）。
- e2e 测试账号 `admin123` / `viewer123`（tests/e2e/fixtures/env.ts）为本地/CI 测试用明文账号，非生产凭据；上线前按 AGENTS 规则替换默认管理员密码。