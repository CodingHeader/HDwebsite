---
id: PLAN-V015-05
title: V1.5 依赖 DAG · 所有权矩阵 · 档位
status: active
module: planning
owner: main-agent
created: 2026-10-27
related: [PLAN-V015, PLAN-V015-04]
---

# 05 · 依赖 DAG · 所有权矩阵 · 档位与成本

## 一、依赖 DAG

```text
V15-LEDGER-01（台账归位，S0）
     │
     └──►（无下游依赖，但必须先做：它是取卡循环的输入）

V15-AUDIT-FIX-01（审计修正，S1）──┐
V15-TOKEN-01（令牌白名单，S1）────┤（两者可并行）
                                  │
                                  ▼
              ┌───────────────────┴───────────────────┐
              │                                       │
   V15-UX-STATES-01 ──┐                  V15-KEYBOARD-01 ──┐
                      ├──（三卡可并行，同批 42 页）─────────┤
   V15-MOBILE-375-01 ─┘                                    │
                                                            ▼
                                                  V15-CLOSE-01（S3 收口）
```

**精确依赖表**：

| 卡 | depends_on | blocks |
|---|---|---|
| V15-LEDGER-01 | — | 无（但作为第一刀，实务上先做） |
| V15-AUDIT-FIX-01 | — | V15-UX-STATES-01、V15-KEYBOARD-01、V15-MOBILE-375-01 |
| V15-TOKEN-01 | — | 无 |
| V15-UX-STATES-01 | V15-AUDIT-FIX-01 | V15-CLOSE-01 |
| V15-KEYBOARD-01 | V15-AUDIT-FIX-01 | V15-CLOSE-01 |
| V15-MOBILE-375-01 | V15-AUDIT-FIX-01 | V15-CLOSE-01 |
| V15-CLOSE-01 | 上述全部 | — |

## 二、环检测

对 7 张卡做 DFS（按上表 depends_on 遍历）：

```text
LEDGER      → (无依赖)                     ✓ 终结
AUDIT-FIX   → (无依赖)                     ✓ 终结
TOKEN       → (无依赖)                     ✓ 终结
UX-STATES   → AUDIT-FIX → (无)             ✓ 终结
KEYBOARD    → AUDIT-FIX → (无)             ✓ 终结
MOBILE-375  → AUDIT-FIX → (无)             ✓ 终结
CLOSE       → UX-STATES/KEYBOARD/MOBILE-375 → AUDIT-FIX → (无)  ✓ 终结
```

**结论：无环。** 最长路径 = `AUDIT-FIX → UX-STATES → CLOSE`（3 层）。

## 三、可并行组（机械依据，逐条附规则）

### 组 P1：`V15-LEDGER-01` ‖ `V15-AUDIT-FIX-01` ‖ `V15-TOKEN-01`

| 机械规则 | 满足 | 依据 |
|---|---|---|
| ① 无共享可变状态 | ✅ | LEDGER 只写 `docs/V1.4-20261027/state.json`；AUDIT-FIX 只写 `scripts/audit-manager-ui.mjs`；TOKEN 只写 `evidence/V14/UI-CONSIST-01/**` |
| ② 依赖契约已冻结 | ✅ | 本轮 0 契约变更（`02` 文首） |
| ③ 文件所有权不相交 | ✅ | 三者路径集合交集为空 |
| ④ 不共用迁移版本号 | ✅ | 本轮 0 迁移 |

### 组 P2：`V15-UX-STATES-01` ‖ `V15-KEYBOARD-01` ‖ `V15-MOBILE-375-01`

| 机械规则 | 满足 | 依据 |
|---|---|---|
| ① 无共享可变状态 | ✅ | 各写 `evidence/V15/<卡号>/**` 独立目录 |
| ② 依赖契约已冻结 | ✅ | 五态契约见 `02 §⑥` |
| ③ 文件所有权不相交 | ✅ | 三个 evidence 目录互不相交 |
| ④ 不共用迁移版本号 | ✅ | 0 迁移 |

### 串行链（不可并行）

| 链 | 原因（共享可变状态） |
|---|---|
| `AUDIT-FIX → UX-STATES / KEYBOARD / MOBILE-375` | 后三者以"修正后的审计矩阵"为判定前提（数据依赖） |
| `UX-STATES / KEYBOARD / MOBILE-375 → CLOSE` | CLOSE 需引用三者证据（数据依赖） |

## 四、关键路径

```text
V15-AUDIT-FIX-01 → V15-UX-STATES-01 → V15-CLOSE-01
```

**理由**：三张验收卡中 `UX-STATES` 判定面最广（42 页 × 5 态），工期最长；CLOSE 必须等它。

## 五、所有权矩阵（Agent × 路径）

| 路径 | LEDGER | AUDIT-FIX | TOKEN | UX-STATES | KEYBOARD | 375 | CLOSE |
|---|---|---|---|---|---|---|---|
| `docs/V1.4-20261027/state.json` | **W** | | | | | | |
| `scripts/audit-manager-ui.mjs` | | **W** | | | | | |
| `docs/design/06_validation/evidence/V14/UI-CONSIST-01/**` | | | **W** | | | | |
| `docs/design/06_validation/evidence/V15/UX-STATES-01/**` | | | | **W** | | | |
| `docs/design/06_validation/evidence/V15/KEYBOARD-01/**` | | | | | **W** | | |
| `docs/design/06_validation/evidence/V15/MOBILE-375-01/**` | | | | | | **W** | |
| `docs/V1.5-20261027/state.json` | | | | | | | **W** |
| `docs/design/07_release/changelog.md` | | | | | | | **W** |
| `src/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `src/app/(web)/**`、`src/components/web/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `src/contracts/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `prisma/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `package.json` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `tests/**` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `playwright.config.ts` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

图例：**W** = 可写；✗ = 禁止。

### 重叠检查

| 潜在重叠 | 处置 |
|---|---|
| 无 | ✅ 7 卡写入路径两两不相交，矩阵无重叠 |

> **与 V1.4 的关键差异**：V1.4 有 `ci.yml` 被 A11Y 与 FROZEN 同时写、`components/manager/**` 被 UI-HUB 与 CONSIST 同时写两处重叠，靠串行解决。**V1.5 无任何重叠** —— 因为本轮不改代码，只写文档与一个脚本。

## 六、档位分配

按「决策不可逆性 + 影响范围」，不按步骤号。

| 卡 | 档位 | 理由 | 禁止 |
|---|---|---|---|
| V15-LEDGER-01 | `haiku` | 纯 JSON 转录，无判断 | 不得改状态语义（只能 ready→done） |
| V15-AUDIT-FIX-01 | `sonnect` | 正则逻辑修改，规则明确 | 不得顺带改其它判定项 |
| V15-TOKEN-01 | `sonnect` | 枚举登记 + 理由撰写 | 不得改任何 `className` |
| **V15-UX-STATES-01** | **`opus`** | 42 页 × 5 态验收判断，判错会放行真缺陷 | 不得只为"通过"而降标准 |
| **V15-KEYBOARD-01** | **`opus`** | 需裁定"最小达标集"（`01 §B1`），口径不可逆 | 不得要求重做整个管理端 |
| **V15-MOBILE-375-01** | **`opus`** | 触屏可用性判断 + 命中区测量 | 不得改 `layout` 或断点 |
| V15-CLOSE-01 | `haiku` | 台账收口 + 模板填空 | 不得改需求正文 |

**默认档 = opus**（项目要求）。以上 4 卡下调属显式决策：3 张验收卡保持 opus（它们才是真判断），其余下调。

## 七、成本预算表

| 切片 | 卡数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S0 台账 | 1 | 1 | 0 | 0 | 0 |
| S1 审计可信 | 2 | 0 | 2 | 0 | 0 |
| S2 人工验收 | 3 | 0 | 0 | 3 | 0 |
| S3 收口 | 1 | 1 | 0 | 0 | 0 |
| **合计** | **7** | **2** | **2** | **3** | **0** |

**券制度**：
- `opus` 每切片 ≤3 次 → S2 用 3 次，**正好在额度内**
- `fable` 每切片 ≤1 次 → 本轮 0 次（不需动需求或冻结契约）
- 超出需人批准

## 八、熔断规则

```text
同一张卡连续 2 次验收失败 → 停止，改走：
  a) 重写任务卡（判据不清）
  b) 升级档位
  c) 标记 blocked + 上报
禁止换提示词硬撞第 3 次
```

### 本轮重点防守的两处

| # | 风险点 | 防守 |
|---|---|---|
| 1 | **验收标准被"凑通过"**：42 页 × 3 项工作量大，容易把"待核"直接改成"PASS" | 每格必须写判据（做了什么操作、看到什么结果），无判据的 PASS 视为 FAIL |
| 2 | **审计脚本修过火**：为让 PageHeader 显示 0，把正则改成什么都匹配 | 必须保留负向验证：造一个真缺头部的页面 → 脚本仍报 FAIL |

## 九、执行者可见的并行纪律

```text
✅ 允许并行：不同 evidence 目录、同一冻结契约、0 迁移
❌ 禁止并行：
   - 同时改 scripts/audit-manager-ui.mjs（只有 AUDIT-FIX 能改）
   - 同时改 docs/V1.4-20261027/state.json（只有 LEDGER 能改）
   - 改 src/**（本轮所有卡都禁止）
   - 一边修脚本、一边用旧矩阵做人工判定
```
