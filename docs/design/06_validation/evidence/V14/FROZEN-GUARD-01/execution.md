---
card: V14-FROZEN-GUARD-01
title: 冻结面自动守卫
date: 2026-10-27
executor: external-assistant
base: upgrade@675c6a3
status: PASS
---
# V14-FROZEN-GUARD-01 执行证据：冻结面自动守卫
> 执行时间：2026-10-27
> 执行者：external-assistant（外围卡 S7）
> 起点：`upgrade@675c6a3`
## 5W1H 简版
- **What**：把 `AGENTS.md §4` 的“冻结面只读”从人工纪律变成 CI 可执行门禁。
- **Why**：此前 `src/contracts/**`、`prisma/schema.prisma`、迁移、依赖锁与测试配置只能靠人读规则；一旦出现跨所有权提交，CI 不会主动拦截。
- **Where**：新增 `.frozen-baseline`、`scripts/check-frozen.mjs`；修改 `.github/workflows/ci.yml`、`scripts/check-root.mjs`；新增本证据文件。
- **Who**：external-assistant。
- **How**：以 `.frozen-baseline=3e6a6b5` 为基线计算冻结路径变更集；非空时要求 CCR 豁免双条件同时成立：提交 message 含 `CCR-<数字>`，且仓库内存在对应 `docs/**/CCR-<数字>.md`。CI 使用裸 `node` 调用，避免为加 npm script 修改冻结的 `package.json`。
- **What if**：浅克隆仓库缺少基线对象时，脚本按提示词要求打印 SKIP 并 `exit 0`；本地全量仓库与真实门禁场景正常判定。
## 一、改动文件
- `.frozen-baseline`：新增，内容为 `3e6a6b5`。
- `scripts/check-frozen.mjs`：新增，冻结面守卫脚本，冻结路径 7 条。
- `.github/workflows/ci.yml`：在 `Asset / root guards` 后新增 `Frozen surface guard` 步骤，命令为 `node scripts/check-frozen.mjs`。
- `scripts/check-root.mjs`：把 `.frozen-baseline` 加入根目录白名单。
- `docs/design/06_validation/evidence/V14/FROZEN-GUARD-01/execution.md`：新增本执行证据。
## 二、CI 归因补充（run 40470038272）
首次推送后 CI 的 `gate` job 在 `npm run check:root` 失败，原因是新增根目录文件 `.frozen-baseline` 尚未进入 `scripts/check-root.mjs` 白名单，流程未执行到 `Frozen surface guard`。已补白名单并推送修复提交。`visual` job 仍失败，但该 job 不属于本卡范围，本卡未改 `tests/` 或 `src/`。
## 三、冻结路径清单
脚本检查以下 7 条路径：
- `src/contracts`
- `prisma/schema.prisma`
- `prisma/migrations`
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `playwright.config.ts`
## 四、验收结果
| 验收条目 | 结果 | 证据 |
|---|---:|---|
| 冻结路径为 7 条且与 AGENTS.md §4 对齐 | PASS | 见上表；脚本内 `FROZEN_PATHS.length` 为 7 |
| 冻结面无变更时通过 | PASS | `node scripts/check-frozen.mjs` → `EXIT=0` |
| 触碰 `src/contracts/**` 时失败 | PASS | 临时追加空行后 → `EXIT=1`，随后 `git checkout -- src/contracts/common.ts` 还原 |
| 触碰 `prisma/schema.prisma` 时失败 | PASS | 临时追加空行后 → `EXIT=1`，随后 `git checkout -- prisma/schema.prisma` 还原 |
| CCR 豁免为双条件 | PASS | 检查①读取 baseline..HEAD 提交 message 中的 `CCR-<数字>`；检查②用 `git ls-files docs` 核对对应 `CCR-<数字>.md` 是否真实存在 |
| 浅克隆缺基线对象时 SKIP 且不失败 | PASS | `git clone --depth=1` 临时仓库运行 → `SKIP: baseline unavailable (shallow clone)`，`EXIT=0` |
| CI 在 Asset/root guards 后接入 | PASS | `Frozen surface guard` 步骤位于 `Asset / root guards` 后 |
| 根目录守卫接受 `.frozen-baseline` | PASS | `npm run check:root` → `EXIT=0` |
| 未改 `package.json` | PASS | 本次只新增/修改脚本、CI、根目录白名单、基线与证据文件 |
| 白空格检查 | PASS | `git diff --check` 无输出 |
## 五、命令输出摘要
```text
--- positive ---
check-frozen PASS：冻结面自 3e6a6b5 起无改动（冻结路径 7 条）。
EXIT=0
--- negative contracts ---
check-frozen：检测到冻结面改动 1 个文件（基线 3e6a6b5）：
  ✗ src/contracts/common.ts
✗ 检查①失败：baseline..HEAD 中触及冻结面的提交，没有任何一条 message 含 `CCR-<数字>`。
EXIT=1
--- negative prisma ---
check-frozen：检测到冻结面改动 1 个文件（基线 3e6a6b5）：
  ✗ prisma/schema.prisma
✗ 检查①失败：baseline..HEAD 中触及冻结面的提交，没有任何一条 message 含 `CCR-<数字>`。
EXIT=1
--- shallow ---
SKIP: baseline unavailable (shallow clone) — 无法取出 3e6a6b5，跳过冻结面比对。
EXIT=0
--- root guard ---
check-root PASS：根目录 49 条全部在白名单内。
EXIT=0
```
## 六、UNKNOWN
- UNKNOWN：CCR 成功豁免路径未用真实 CCR 文档做正向演练；原因是当前基线之后没有正式 CCR 变更。现有负向验证已证明“只有 commit message、无真实 CCR 文档/无 message”会被拒绝；成功路径需等待真实 CCR 卡执行时验证。
- UNKNOWN：本卡未执行全量 `npm run lint/typecheck/test/build/test:visual/test:e2e`；本卡仅新增 Node 脚本、CI 步骤、根目录白名单与文档，未改 `src/`、`tests/` 或 `package.json`。