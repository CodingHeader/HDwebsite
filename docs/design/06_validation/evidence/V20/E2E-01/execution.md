---
task: V20-E2E-01
date: 2026-10-29
head: ecd735d
status: done
---
# E2E-01 · hub-content 断言同步 · 执行记录

## 5W1H
- **What**：把 `tests/e2e/hub-content.spec.ts` 两处旧文案断言「草稿已入库」同步为 FIX-02 新文案。
- **Why**：FIX-02（7567581）把 content-hub 创建 toast 由 `"已创建","草稿已入库，可提交审核。"` 改为 `"已创建","「${title}」已入库，可提交审核。"`；E2E 仍断言旧子串 → 2 FAIL（V1.9 E1 记录遗留）。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `ecd735d`
- **When**：2026-10-29
- **Who**：执行助手（main-agent · V20 E2E-01）
- **How**：读 FIX-02 新文案 → 两处断言分别改为 `「${TITLE}」已入库`（首用例，模块级 `TITLE`）与 `「${title}」已入库`（次用例，局部 `title`）→ 跑 spec 验证。

## 改动
`tests/e2e/hub-content.spec.ts` 仅 2 行：
- L22（首用例，`TITLE`）：`getByText("草稿已入库")` → `` getByText(`「${TITLE}」已入库`) ``
- L53（次用例，`title`）：`getByText("草稿已入库")` → `` getByText(`「${title}」已入库`) ``

**变量名未混**（TITLE 大写模块级 / title 小写局部）。**未弱化断言**（保留实体名「...」已入库，未缩成「已入库」）。

## 验证逐条

| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 只改该文件 | `git status --short tests/` | PASS（仅 hub-content.spec.ts） |
| 2 | spec 全绿 | `npx playwright test -c tests/e2e/playwright.config.ts hub-content` | **2 passed**（14.6s，原 2 FAIL 归零） |
| 3 | 断言未弱化 | `git diff tests/e2e/hub-content.spec.ts` | PASS（含实体名，非「已入库」短子串） |

## 门禁
- 2 passed ✓ · 只改该文件 ✓ · 断言含实体名未弱化 ✓

## UNKNOWN / 遗留
- 无。