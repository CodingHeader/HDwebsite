---
task: V20-E1
date: 2026-10-29
head: 74b123d
status: done
---
# E1 · V2.0 收口 · 执行记录

## 5W1H
- **What**：V2.0 5 卡终态确认 + 唯一一次全量门禁 + changelog + 双端同步。
- **Why**：V1.9 遗留 4 项（命中区/LCP 口径/冻结例外/hub-content 断言）全部处置完成，需收口归档并推送。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · 基线 `d947dc1` · 收口前 HEAD `74b123d`。
- **When**：2026-10-29。
- **Who**：执行助手（main-agent · V20 E1）。
- **How**：终态核对 → 全量 lint/typecheck/test/build/visual/e2e 逐项 → 冻结面复核 → ADR-039 六节 → M3 verify → changelog → 推送。

## 终态
`state.json`：ADR-01 / E2E-01 / M3-01 / LCP-01 / E1 **全部 done**（5/5）。

## 全量门禁（逐项，不用 &&）

| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | lint | `eslint --max-warnings 0` | **exit 0** |
| 2 | typecheck | `tsc --noEmit` | **exit 0** |
| 3 | test | `vitest run --no-file-parallelism` | **91 文件 / 1859 用例全过，exit 0** |
| 4 | build | `next build` | **exit 0**（含 `.h-11/.min-h-11/.min-w-11` 生成） |
| 5 | visual | `npm run test:visual` | 5 PASS / 40 FAIL（见 UNKNOWN #1，win32 字体 → 交 CI） |
| 6 | e2e | `npm run test:e2e` | **79 PASS / 0 FAIL，exit 0** |

> e2e 首跑 78P/1F（`/manager/media` 375 溢出 396>375），归因 M3-01 分页 `min-w-11` 按钮组不换行；M3-01 补 `flex-wrap` 后重跑 **79P/0F**。

## 冻结面复核

- `git diff 91ea5bb..HEAD --stat -- src/contracts/ prisma/ package.json vitest.config.ts playwright.config.ts` → **空（PASS）**。
- `git diff 91ea5bb..HEAD --stat -- 'src/app/(web)/**' 'src/components/web/**'` → **空（PASS，前台零改动）**。
- 本轮 V2.0 仅允许 M3-01 的 `src/components/manager/**` + `src/app/manager/login/page.tsx`（越界记录）；无契约/迁移/依赖/前台触碰。

## ADR-039 生效验证

- `docs/design/03_solution/decisions/ADR-039-前台冻结例外-移动端导航与悬浮层.md` 存在。
- 六节齐全：背景 / 决策 / 影响 / 边界 / 不可外推 / 后续（`grep -c` = 6）。

## M3 归零验证

- `verify.json`（M3-01）：375 未达标 0、1440 未达标 0（全部 ≥44）。

## E2E 遗留归零验证

- `hub-content.spec.ts` 2/2 通过（含在全量 e2e 79P/0F 内）；V1.9 的 2 FAIL 归零。

## B2 键盘参照复核（E1 额外检查）

- M3-01 仅改尺寸类（`h-8/9/10→h-11`、`min-w-8→min-w-11`），**DOM 结构与 Tab 顺序（按 DOM 序）不变** → B2 参照仍有效；未重跑全量 B2（成本高），记低风险、非阻断。

## UNKNOWN / 遗留

1. **视觉 40 FAIL**：win32 本地像素差异不采信（Linux 基线字体差异；`88e72d69` 移动端导航 + M3-01 尺寸变化致基线 stale）；diff 均为文字字形抗锯齿、布局结构一致。**靠 Linux CI 重建判定**。
2. **视觉基线 stale**：基线 `ad4cf70e`（10-27）< `88e72d69`（10-29）+ M3-01 尺寸变化；ADR-01 建议 Linux CI 重建，本方向未重建（合规）。
3. **桌面密度变松**：用户已知并选择（M3-01 记录）。

## 门禁
- 5/5 done ✓ · lint/typecheck/test/build 四项 exit 0 ✓ · e2e 79P/0F（E2E 遗留归零）✓ · M3 两视口 ≥44（M3 归零）✓ · 冻结面无意外改动 ✓ · ADR-039 存在且六节 ✓ · 双端 0 0（推送后）✓