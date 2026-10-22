# 06 依赖 DAG · 所有权矩阵 · 档位与成本

## 1. 并行组（拓扑层；同层卡满足：无共享可变状态 ∧ 契约冻结且由 zod 机器校验 ∧ 允许路径不相交（gen_tasks.py 检测为 0） ∧ 本轮 0 迁移）

- **L1**：V8-G-01(P3)
- **L2**：V8-INT-01(P1)、V8-SEC-01(Hark)、V8-SEC-04(P3)、V8-T-01(P2)、V8-T-02(P2)、V8-T-04(P1)、V8-VIS-01(P1)
- **L3**：V8-PERF-01(P1)、V8-SEC-02(P1)、V8-VIS-02(P3)
- **L4**：V8-REL-01(P3)、V8-SEC-03(P2)、V8-UI-01(Hark)、V8-VIS-03(Hark)
- **L5**：V8-T-03(P3)
- **L6**：V8-V-01(P2)
- **L7**：V8-REL-02(Hark)

## 2. 关键路径（5.75 人天）

`V8-G-01 → V8-SEC-01 → V8-PERF-01 → V8-UI-01 → V8-T-03 → V8-V-01 → V8-REL-02`

必须串行的链：
- 依赖冻结面：SEC-01 → SEC-02 → SEC-03（同改 package.json）
- 视觉：VIS-01 → VIS-02 → VIS-03（数据 → CI → 修复）
- 收尾：T-03 位于所有改 src 的卡之后（src/** 写权限）→ V-01 → REL-02

**方案 B（Q1 不授权）**：SEC-01/02/03、PERF-01、UI-01、T-03、REL-01 标 blocked；其余 11 张卡照常推进（G-01、SEC-04、T-01、T-02、T-04、VIS-01、VIS-02、VIS-03、INT-01、V-01 的部分验收、REL-02 的同步部分）。

环检测：gen_tasks.py 递归检测，0 环。

## 3. 所有权矩阵（执行者 × 路径；gen_tasks.py 检测重叠 = 0）

| 执行者 | 卡 | 允许路径 |
|---|---|---|
| P3 | V8-G-01 | `AGENTS.md`<br>`CLAUDE.md`<br>`docs/design/04_planning/current-plan.md` |
| Hark | V8-SEC-01 | `package.json`<br>`package-lock.json`<br>`next.config.ts`<br>`src/app/layout.tsx`<br>`docs/design/06_validation/evidence/V8/SEC-01/**` |
| P1 | V8-SEC-02 | `package.json`<br>`package-lock.json`<br>`src/lib/storage/**`<br>`docs/design/06_validation/evidence/V8/SEC-02/**` |
| P2 | V8-SEC-03 | `package.json`<br>`package-lock.json`<br>`vitest.config.ts`<br>`docs/design/06_validation/evidence/V8/SEC-03/**` |
| P3 | V8-SEC-04 | `.github/workflows/**`<br>`scripts/audit-gate.mjs`<br>`docs/design/06_validation/evidence/V8/SEC-04/**` |
| P2 | V8-T-01 | `tests/e2e/e-knowledge.spec.ts`<br>`tests/e2e/e-notify-rules.spec.ts`<br>`tests/e2e/fixtures/**`<br>`docs/design/06_validation/evidence/V8/T-01/**` |
| P2 | V8-T-02 | `tests/contract/**`<br>`docs/design/06_validation/evidence/V8/T-02/**` |
| P3 | V8-T-03 | `eslint.config.mjs`<br>`package.json#scripts.lint`<br>`src/**/*.ts`<br>`src/**/*.tsx` |
| P1 | V8-T-04 | `src/app/api/upload/route.ts`<br>`src/app/api/file/[...path]/route.ts`<br>`src/app/api/wechat/callback/route.ts`<br>`src/app/api/health/route.ts`<br>`src/app/api/route.ts`<br>`docs/design/03_solution/decisions/ADR-037-withApi豁免清单.md` |
| P1 | V8-VIS-01 | `prisma/seed-visual.ts`<br>`prisma/fixtures/visual/**`<br>`public/uploads/visual-fixtures/**`<br>`docs/design/06_validation/evidence/V8/VIS-01/**` |
| P3 | V8-VIS-02 | `.github/workflows/**`<br>`docs/design/06_validation/evidence/V8/VIS-02/**` |
| Hark | V8-VIS-03 | `src/app/(web)/**`<br>`src/components/web/**`<br>`src/styles/**`<br>`tests/visual/__screenshots__/**`<br>`docs/design/06_validation/evidence/V8/VIS-03/**` |
| P1 | V8-PERF-01 | `next.config.ts`<br>`src/components/manager/**`<br>`src/app/manager/**`<br>`docs/design/06_validation/evidence/V8/PERF-01/**` |
| Hark | V8-UI-01 | `src/components/manager/**`<br>`src/app/manager/**`<br>`tests/e2e/ux-states.spec.ts`<br>`docs/design/06_validation/evidence/V8/UI-01/**` |
| P1 | V8-INT-01 | `scripts/smoke/**`<br>`docs/design/07_release/真实联调手册.md`<br>`docs/design/06_validation/evidence/V8/INT-01/**` |
| P3 | V8-REL-01 | `.github/workflows/**`<br>`Dockerfile`<br>`docker-compose.yml`<br>`docs/design/06_validation/evidence/V8/REL-01/**` |
| P2 | V8-V-01 | `docs/design/06_validation/evidence/V8/**/verify.md` |
| Hark | V8-REL-02 | `docs/design/07_release/changelog.md`<br>`docs/design/02_requirements/parity-matrix.md`<br>`docs/V0.8-20261022/EXEC-*.md` |

## 4. 负载

| 执行者 | 卡数 | 人天 |
|---|---|---|
| P3 | 5 | 2.25 |
| Hark | 4 | 4.5 |
| P1 | 5 | 3.75 |
| P2 | 4 | 3.25 |


## 5. 成本预算（按切片）

| 切片 | 任务数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S0 | 1 | 1 | 0 | 0 | 0 |
| S1 | 4 | 0 | 2 | 2 | 0 |
| S2 | 4 | 1 | 1 | 2 | 0 |
| S3 | 3 | 0 | 2 | 1 | 0 |
| S4 | 1 | 0 | 0 | 1 | 0 |
| S5 | 1 | 0 | 0 | 1 | 0 |
| S6 | 2 | 0 | 2 | 0 | 0 |
| S7 | 2 | 0 | 0 | 2 | 0 |

券制度：opus 每切片 ≤3 次（卡本身占用计入）；fable 每切片 ≤1 次，仅限推翻冻结契约；超出需用户批准。熔断：同卡连续 2 次 FAIL → 停止改代码 → 升档并重写任务书。

