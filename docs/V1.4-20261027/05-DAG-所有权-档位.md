# 05 依赖 DAG · 所有权矩阵 · 档位与成本

## 一、依赖 DAG

```text
V14-BASE-01（基线复核）
    │
    ├──► V14-UI-HUB-01 ──► V14-UI-CONSIST-01 ──┐
    │                                          │
    ├──► V14-A11Y-01 ──► V14-FROZEN-GUARD-01 ──┤
    │                                          │
    ├──► V14-PERF-01 ──────────────────────────┤
    │                                          ├──► V14-REQ-LEDGER-01 ──► V14-REL-01
    └──► V14-VIS-STAB-01 ──────────────────────┘
```

### 可并行组（附机械依据）

| 组 | 卡 | 满足的 4 条规则 |
|---|---|---|
| **P1** | V14-UI-HUB-01、V14-A11Y-01、V14-PERF-01、V14-VIS-STAB-01 | ①无共享可变状态 ②契约已冻结（zod，机器可校验）③文件所有权不相交（见下表）④0 迁移，无版本号冲突 |
| **串行** | V14-A11Y-01 → V14-FROZEN-GUARD-01 | 同改 `.github/workflows/ci.yml`（共享可变状态） |
| **串行** | V14-UI-HUB-01 → V14-UI-CONSIST-01 | 同碰 `src/components/manager/**` |
| **串行** | 以上全部 → V14-REQ-LEDGER-01 | 需引用其他卡证据（数据依赖） |
| **串行** | V14-REQ-LEDGER-01 → V14-REL-01 | 台账须在 ledger 之后定稿 |

### 关键路径

```text
V14-BASE-01 → V14-UI-HUB-01 → V14-UI-CONSIST-01 → V14-REQ-LEDGER-01 → V14-REL-01
```

理由：UI-HUB-01 是唯一需**设计判断**的卡（不确定性最高），且它阻塞 CONSIST-01；CONSIST-01 的结论被 LEDGER-01 引用；LEDGER-01 必须在 REL-01 前。

### 环检测

对 8 张卡的 `depends_on` 做 DFS，**无环**（见 `state.json` 校验脚本输出）。

## 二、所有权矩阵（Agent × 路径）

| 路径 / 卡 | BASE | UI-HUB | UI-CONSIST | A11Y | FROZEN | VIS-STAB | PERF | REQ | REL |
|---|---|---|---|---|---|---|---|---|---|
| `docs/design/06_validation/evidence/V14/BASE-01/**` | W | | | | | | | | |
| `src/app/manager/content-hub/page.tsx` | | **W** | | | | | | | |
| `src/components/manager/**`（新增控件） | | **W** | W(共享件) | | | | | | |
| `src/app/manager/**`（除 content-hub） | | | **W** | | | | | | |
| `tests/a11y/**` | | | | **W** | | | | | |
| `.github/workflows/ci.yml` | | | | **W** | **W** | | | | |
| `scripts/check-frozen.mjs` | | | | | **W** | | | | |
| `tests/visual/web.spec.ts` | | | | | | **W** | | | |
| `scripts/measure-baseline.mjs` | | | | | | | **W** | | |
| `docs/design/02_requirements/**` | | | | | | | | **W** | |
| `docs/V1.4-20261027/state.json` | | | | | | | | | **W** |
| `docs/design/07_release/changelog.md` | | | | | | | | | **W** |
| `package.json` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `src/contracts/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `prisma/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `src/app/(web)/**`、`src/components/web/**`、`public/**`、`globals.css` | ✗ | ✗ | ✗ | △ | ✗ | ✗ | ✗ | ✗ | ✗ |

图例：**W** = 可写；△ = **仅限 aria/role/label 属性**（REQ-F-014 冲突处置，见 `01` §3 X3）；✗ = 禁止。

### 重叠处理

| 潜在重叠 | 处置 |
|---|---|
| `src/components/manager/**` 被 UI-HUB 与 UI-CONSIST 同时写 | **串行**：HUB 先完成并推送，CONSIST 在其后开工（DAG 已约束） |
| `.github/workflows/ci.yml` 被 A11Y 与 FROZEN 同时写 | **串行**：A11Y 先，FROZEN 追加步骤（DAG 已约束） |
| 无其他重叠 | ✅ 矩阵无未处理重叠 |

## 三、档位分配

按「决策不可逆性 + 影响范围」，不按步骤号。

| 卡 | 档位 | 理由 | 禁止 |
|---|---|---|---|
| V14-BASE-01 | `haiku` | 只跑门禁、记数值，无决策 | — |
| **V14-UI-HUB-01** | **`opus`** | **设计判断 + 影响 e2e 稳定性**，不可逆性中 | 不得改前台样式 |
| V14-UI-CONSIST-01 | `sonnect` | 按既定 8 项核对，判断标准化 | 不得独自改设计系统 API |
| V14-A11Y-01 | `opus` | 涉及 CI 门禁策略与前台冻结冲突裁决 | 不得改 className |
| V14-FROZEN-GUARD-01 | `sonnect` | 脚本实现，规则已明确 | — |
| V14-VIS-STAB-01 | `opus` | 需判断 flake 根因（此前已误判过一轮） | 不得放宽阈值 |
| V14-PERF-01 | `sonnect` | 取数 + 逐条判定 | 不得伪造数值 |
| V14-REQ-LEDGER-01 | `sonnect` | 102 条逐条判定，规则明确但量大 | 不得无证据勾选 |
| V14-REL-01 | `haiku` | 台账收口 | — |

**默认档 = opus**（按项目要求），以上按卡下调属显式决策。

## 四、成本预算表

| 切片 | 卡数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S1 a11y 门禁 | 1 | 0 | 0 | 1 | 0 |
| S2 UI-HUB | 1 | 0 | 0 | 1 | 0 |
| S3 一致性 | 1 | 0 | 1 | 0 | 0 |
| S4 visual 稳定 | 1 | 0 | 0 | 1 | 0 |
| S5 需求台账 | 1 | 0 | 1 | 0 | 0 |
| S6 性能 | 1 | 0 | 1 | 0 | 0 |
| S7 冻结守卫 | 1 | 0 | 1 | 0 | 0 |
| S0+S8 基线收口 | 2 | 2 | 0 | 0 | 0 |
| **合计** | **9** | **2** | **4** | **3** | **0** |

**券制度**：opus 每切片 ≤3 次（本轮 3 次，正好在额度内）；fable 每切片 ≤1 次（本轮 0 次，无需动需求或已冻结契约）。

## 五、熔断规则

```text
同一张卡连续 2 次验收失败 → 停止改代码
  → 改为：重写任务卡 / 升档 / 标记 blocked
禁止换提示词硬撞第 3 次
```

**本轮已知需要重点防守的两处**（历史上均已踩过）：
1. **visual flake**：V1.3 曾 3 次 run 中失败 1 次，且一度误判为"真回归"。→ `V14-VIS-STAB-01` 要求连续 2 次绿才算完。
2. **测试基建失灵**：V1.3 曾测到陈旧构建（BUILD_ID 旧于 src）。→ 守卫已加，但 `V14-BASE-01` 仍须记录 BUILD_ID 时间戳。
