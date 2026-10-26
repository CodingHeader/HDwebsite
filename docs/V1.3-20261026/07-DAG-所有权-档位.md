# 07 DAG · 所有权 · 档位（V1.3）

## 一、DAG

```
V13-BASE-01
    │
    ├── V13-E2E-FRESH-01 ✅done
    │        │
    ├── V13-RL-01 ────────────────┐
    │        │                    │
    ├── V13-SEEDVIS-01 ──┐        │
    │        │           │        │
    ├── V13-VIS-01 ◄─────┘        │   （SEEDVIS 先于 VIS：同碰 seed-visual.ts）
    │        │                    │
    ├── V13-GATE-A11Y-01          │
    │        │                    │
    ├── V13-UI-HUB-01 ──► V13-UI-CONSIST-01
    │                             │
    └── V13-PERF-01               │
                                  ▼
                        V13-REQ-01（需引用全部证据）──► V13-REL-01
                                                              ▲
V13-Q2-01（blocked，等用户）───────────────────────────────────┘（不阻塞 REL）
```

## 二、文件所有权（互不相交，越界即 FAIL）

| 卡 | 独占文件 / 目录 |
|---|---|
| V13-BASE-01 | `evidence/V13/BASE-01/**` |
| V13-E2E-FRESH-01 | `tests/e2e/global-setup.ts`、`evidence/V13/E2E-FRESH-01/**` |
| V13-RL-01 | `src/app/api/chat/stream/route.ts`、`src/lib/llm/guard.ts`、`src/lib/settings-registry.ts`（仅一键）、`src/lib/__tests__/v13-rl-01.test.ts`、`evidence/V13/RL-01/**` |
| V13-SEEDVIS-01 | `prisma/seed-visual.ts`、`evidence/V13/SEEDVIS-01/**` |
| V13-VIS-01 | `tests/visual/reference/**`（仅 CI 生成）、`prisma/seed-visual.ts`（**须在 SEEDVIS 之后**）、`prisma/fixtures/visual/counts.json`、`evidence/V13/VIS-01/**` |
| V13-GATE-A11Y-01 | `.github/workflows/ci.yml`、`tests/a11y/**`、`evidence/V13/GATE-A11Y-01/**` |
| V13-UI-HUB-01 | `src/app/manager/content-hub/page.tsx`、`src/components/manager/**`（仅新增件）、`evidence/V13/UI-HUB-01/**` |
| V13-UI-CONSIST-01 | `src/app/manager/**`（content-hub 除外）、`src/components/manager/**`、`evidence/V13/UI-CONSIST-01/**` |
| V13-REQ-01 | `docs/design/02_requirements/**`（仅 checkbox+证据路径）、`evidence/V13/REQ-01/**` |
| V13-PERF-01 | `scripts/measure-baseline.mjs`、`.github/workflows/ci.yml`（与 A11Y 冲突→串行）、`evidence/V13/PERF-01/**` |
| V13-REL-01 | `docs/V1.3-20261026/state.json`、`EXEC-log.md`、`docs/design/07_release/changelog.md`、`docs/design/02_requirements/parity-matrix.md`、`evidence/V13/REL-01/**` |
| V13-Q2-01 | `src/lib/llm/guard.ts`（1 常量）、`src/lib/settings-registry.ts`、`src/lib/__tests__/settings-registry.test.ts`、`REQ-F-009`（1 条）、`evidence/V13/Q2-01/**` |

### 冲突点与串行化

| 冲突对 | 冲突文件 | 处置 |
|---|---|---|
| RL-01 × Q2-01 | `guard.ts`、`settings-registry.ts` | **RL-01 先做**（取默认 10），Q2 裁决后仅微调；Q2 blocked 期间不写 |
| SEEDVIS-01 × VIS-01 | `prisma/seed-visual.ts` | **SEEDVIS 先做** |
| UI-HUB-01 × UI-CONSIST-01 | `src/components/manager/**` | **HUB 先做**，CONSIST 在其后 |
| GATE-A11Y-01 × PERF-01 | `.github/workflows/ci.yml` | 串行（A11Y 先） |

## 三、难度档位

| 档位 | 卡 | 判定依据 |
|---|---|---|
| **高（主代理自做）** | V13-RL-01、V13-VIS-01、V13-UI-HUB-01、V13-E2E-FRESH-01(已完成) | 触及风控架构 / 需证据链二分归因 / **UI 设计与实现** / 测试基建正确性 |
| 中 | V13-GATE-A11Y-01、V13-UI-CONSIST-01、V13-REQ-01、V13-PERF-01 | 需判断与横向核对，但方案确定 |
| 低 | V13-BASE-01、V13-SEEDVIS-01、V13-REL-01、V13-Q2-01 | 跑数/口径调整/台账/单常量 |

## 四、并行安全组

| 组 | 卡 | 可并行 |
|---|---|---|
| G-A | V13-RL-01、V13-GATE-A11Y-01、V13-PERF-01 | 是（文件不相交） |
| G-B | V13-UI-HUB-01 | 独立 |
| G-C | V13-SEEDVIS-01 → V13-VIS-01 | 否（串行） |
| G-D | V13-UI-CONSIST-01 | 需 HUB 完成 |
| G-E | V13-REQ-01 → V13-REL-01 | 否（串行，末段） |
