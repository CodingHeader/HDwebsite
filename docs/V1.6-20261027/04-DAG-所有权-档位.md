---
id: PLAN-V016-04
title: V1.6 依赖 DAG · 所有权 · 档位
status: active
module: planning
owner: main-agent
created: 2026-10-27
related: [PLAN-V016, PLAN-V016-03]
---

# 04 · 依赖 DAG · 所有权矩阵 · 档位

## 一、依赖 DAG

```text
V15-UX-STATES-01 ──┐
V15-KEYBOARD-01  ──┼──► V15-CLOSE-01
V15-MOBILE-375-01──┘
        （三卡可并行，均无相互依赖）

已完成（前置已满足）：
V15-LEDGER-01 ✅ / V15-AUDIT-FIX-01 ✅ / V15-TOKEN-01 ✅
```

**精确依赖表**：

| 卡 | depends_on | 状态 |
|---|---|---|
| V15-UX-STATES-01 | V15-AUDIT-FIX-01 ✅ | 前置已满足，可开工 |
| V15-KEYBOARD-01 | V15-AUDIT-FIX-01 ✅ | 前置已满足，可开工 |
| V15-MOBILE-375-01 | V15-AUDIT-FIX-01 ✅ | 前置已满足，可开工 |
| V15-CLOSE-01 | 上述三卡 + 已完成三卡 | **未满足**，等三卡 done |

## 二、环检测

```text
UX-STATES    → AUDIT-FIX ✅ → (终结)
KEYBOARD     → AUDIT-FIX ✅ → (终结)
MOBILE-375   → AUDIT-FIX ✅ → (终结)
CLOSE        → {UX,KB,375,LEDGER,AUDIT,TOKEN} → AUDIT-FIX → (终结)
```

**无环。** 最长路径 = `AUDIT-FIX → UX-STATES → CLOSE`（3 层）。

## 三、可并行组（机械依据）

### 组 P3：三张验收卡

| 机械规则 | 满足 | 依据 |
|---|---|---|
| ① 无共享可变状态 | ✅ | 各写 `evidence/V15/<卡号>/**` |
| ② 契约已冻结 | ✅ | 本轮 0 契约变更（`02` 文首） |
| ③ 文件所有权不相交 | ✅ | 三目录互斥（见下表） |
| ④ 不共用迁移版本号 | ✅ | 0 迁移 |

### 组内更细的并行（阶段级）

三卡内部各有 3 个 L2 阶段，同一卡内的阶段也**可以交替做**（无共享状态），但建议按 L1 顺序推进以免上下文切换成本。

## 四、关键路径

```text
V15-UX-STATES-01 → V15-CLOSE-01
```

**理由**：五态判定面最广（42 × 5 = 210 格，约 6~8 小时），是三者中最长的。

## 五、所有权矩阵

| 路径 | UX-STATES | KEYBOARD | MOBILE-375 | CLOSE |
|---|---|---|---|---|
| `evidence/V15/UX-STATES-01/**` | **W** | | | |
| `evidence/V15/KEYBOARD-01/**` | | **W** | | |
| `evidence/V15/MOBILE-375-01/**` | | | **W** | |
| `tests/e2e/mobile-375.spec.ts` | | | **W** | |
| `docs/V1.5-20261027/state.json` | | | | **W** |
| `docs/V1.4-20261027/state.json` | | | | **W**（仅 UNKNOWN 字段） |
| `docs/design/07_release/changelog.md` | | | | **W** |
| `docs/design/02_requirements/parity-matrix.md` | | | | **W** |
| `evidence/V15/CLOSE-01/**` | | | | **W** |
| `src/**` | ✗ | ✗ | ✗ | ✗ |
| `src/app/(web)/**`、`src/components/web/**` | ✗ | ✗ | ✗ | ✗ |
| `src/contracts/**` | ✗ | ✗ | ✗ | ✗ |
| `prisma/**` | ✗ | ✗ | ✗ | ✗ |
| `package.json`、`playwright.config.ts` | ✗ | ✗ | ✗ | ✗ |

### 重叠检查

| 潜在重叠 | 处置 |
|---|---|
| `tests/e2e/mobile-375.spec.ts` 只归 MOBILE-375 | ✅ 无重叠 |
| 两张 state.json 只归 CLOSE | ✅ 无重叠 |
| **无任何重叠** | ✅ |

> **与 V1.4 对比**：V1.4 有 `ci.yml`、`components/manager/**` 两处重叠需串行化解。V1.6 零重叠 —— 因为三卡只写自己的 evidence，唯一碰测试文件的是 MOBILE-375（独占）。

## 六、档位分配

| 卡 | 档位 | 理由 | 禁止 |
|---|---|---|---|
| **V15-UX-STATES-01** | `opus` | 210 格判定，判错放行真缺陷 | 不得只为"通过"降标准 |
| **V15-KEYBOARD-01** | `opus` | 需裁定最小达标集（B1），口径不可逆 | 不得要求重做管理端 |
| **V15-MOBILE-375-01** | `opus` | 需改 `mobile-375.spec.ts`（唯一碰测试文件的卡）+ 42 页人工判定 | 不得改断点/layout |
| V15-CLOSE-01 | `haiku` | 台账 + changelog + 门禁执行，无判断 | 不得改需求正文 |

**默认档 = opus**（项目要求）。三张验收卡保持 opus 是显式决策 —— 它们是本轮唯一有判断含量的工作。

## 七、成本预算

| 切片 | 卡数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S2 人工验收 | 3 | 0 | 0 | 3 | 0 |
| S3 收口 | 1 | 1 | 0 | 0 | 0 |
| **合计** | **4** | **1** | **0** | **3** | **0** |

**券制度**：
- `opus` 每切片 ≤3 → S2 用 3，**正好在额度内**
- `fable` 每切片 ≤1 → 本轮 0

## 八、熔断规则

```text
同一卡连续 2 次验收失败 → 停止，改走：
  a) 重写判据（定义不清）
  b) 升级档位
  c) 标 blocked + 上报
禁止换提示词硬撞第 3 次
```

### 本轮重点防守

| # | 风险 | 防守 |
|---|---|---|
| 1 | **凑通过**：546 格工作量大，易把"待核"直接改 PASS | 每格必须写"做了什么 + 看到什么"；无判据的 PASS 视为 FAIL |
| 2 | **K3 全站 FAIL 引发恐慌**：Dialog 无 Esc 可能导致 42 页全 FAIL | 先做共性验证（`03 §L2-2.1`），在一处定性，避免 42 次重复描述 |
| 3 | **改测试文件越界**：MOBILE-375 要改 `mobile-375.spec.ts` | 只允许扩展路由清单，不得放宽 `toBeLessThanOrEqual(375)` 阈值 |

## 九、执行者可见的并行纪律

```text
✅ 允许并行：三张验收卡（不同 evidence 目录）
❌ 禁止并行：
   - 同时改 tests/e2e/mobile-375.spec.ts（只有 MOBILE-375 能改）
   - 同时改两份 state.json（只有 CLOSE 能改）
   - 改 src/**（全部禁止）
   - 一边改 spec、一边用旧结果做判定
```
