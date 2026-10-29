---
task: V20-ADR-01
date: 2026-10-29
head: d947dc19
status: done
---
# ADR-01 · 前台冻结例外追认 + 基线策略 · 执行记录

## 5W1H
- **What**：为 `88e72d69`（用户 2026-10-29 移动端导航裁决）追认前台冻结例外，产出 ADR-039；记录视觉基线 stale 处置策略。
- **Why**：`88e72d69` 改写了 `src/components/web/**` 的 `className` 值，违反 REQ-F-014「与 main 逐字一致」，但属用户裁决授权；缺 ADR 则无据可依，独立验证会误判 FAIL。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `d947dc19`
- **When**：2026-10-29
- **Who**：执行助手（main-agent · V20 ADR-01）
- **How**：读 `88e72d69` 完整 diff → 确认 className 改动行 → 过滤非 `md:` 差异 → 起草 ADR-039（6 节）→ 记录基线策略。

## 验证逐条

| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | ADR-039 存在 | `test -f docs/design/03_solution/decisions/ADR-039-*.md` | PASS |
| 2 | 6 节齐全 | `grep -cE "^## (背景|决策|影响|边界|不可外推|后续)" ADR-039` | PASS（6/6） |
| 3 | 白名单一致 | ADR 边界列 3 文件 = `88e72d69` 实际改动的 `src/components/web/**` 3 文件 | PASS |
| 4 | src 零改动 | `git status --short src/` | PASS（空） |
| 5 | 基线未动 | `git status --short tests/visual/reference/` | PASS（空） |

## 非 `md:` 差异判定（ADR 影响节说明）
`git show 88e72d69 -- src/components/web/** | grep -E '^\+.*className' | grep -vE 'md:|:md'`：
- 仅 1 行：`+className="relative shrink-0"`（FloatingContact 二维码图标容器）。
- 性质：非响应式 flex 工具类，防图标收缩；容器有固定尺寸（w-48），桌面渲染无视觉变化 → 属移动端修复防御性补充，在 ADR `## 影响` 中已说明。

## 基线策略
- 基线 `ad4cf70e`（10-27）< 前台改动 `88e72d69`（10-29）→ **视觉基线已 stale**。
- 处置：**方案 B（交 Linux CI 重建）**为建议；本卡只记录策略，**未执行重建**（win32 `VISUAL_REF=1` 会以不可信字体污染基线）。

## 门禁
- ADR-039 6 节 ✓ · 白名单 = 实际改动 ✓ · src 零改动 ✓ · tests/visual/reference 未动 ✓

## UNKNOWN / 遗留
- 视觉基线 stale：需用户在 Linux CI 侧 `--update-snapshots` 后提交，另立卡执行。
- `prisma/seed.ts`（院校 13 家 + 导航 9 项）非冻结面，仅记录理由，不构成冻结例外。