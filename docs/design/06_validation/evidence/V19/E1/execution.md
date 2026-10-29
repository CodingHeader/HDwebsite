---
task: V19-E1
date: 2026-10-29
head: 88e72d69
status: done
---
# E1 · V1.9 收口 · 执行记录

## 5W1H
- **What**：V1.9 7 卡终态确认 + 唯一一次全量门禁 + changelog + 冻结面复核 + 双端同步记录。
- **Why**：V1.9 收口卡（取代 V1.8 E1，因 V1.8 E1 依赖未含 B1 暴露的 FIX-01/02/03）。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `88e72d69`
- **When**：2026-10-29
- **Who**：执行助手（main-agent · V19 E1）
- **How**：终态核对（node state.json）→ 串行全量（lint/typecheck/test --no-file-parallelism/build）→ visual → e2e → 冻结面复核 → changelog。

## 终态核对
- `node -e` state.json：7 卡，FIX-01/02/03+B2+B3+D1-FIX done，E1 本卡完成后 done → **7/7 done**。
- 每卡 commits 齐备：fd64d5d / 7567581 / 7e01458 / 87dd2c7 / 9486a5b / 0ec340b / （E1 本卡）。

## 唯一一次全量门禁（串行，不并行）

| 项 | 命令 | 结果 |
|---|---|---|
| lint | `npm run lint` | **exit 0**（eslint --max-warnings 0） |
| typecheck | `npm run typecheck` | **exit 0**（tsc --noEmit） |
| test | `npm test -- --no-file-parallelism` | **91 文件 / 1859 用例全过，exit 0**（172.6s） |
| build | `npm run build` | **exit 0**（Next 16.4.2 Turbopack） |

> 注：构建首次报「Another next build process is already running」——残留 `next build`（PID 1844/31644）占用锁，已终止并清锁后重跑，exit 0。源内容与构建一致（git diff 空），BUILD_ID 12:52 > src 12:49。

## 视觉门禁
- `npm run test:visual`（VISUAL_BASE_URL=http://127.0.0.1:6791，生产构建）
- 结果：**4 PASS / 42 FAIL**（46 用例，stats expected 4 / unexpected 42）。
- **判定 UNKNOWN（不采信）**：win32 本地像素 vs Linux 基线字体差异。抽查 `about-1440-diff.png` 证实差异全部为文字字形抗锯齿，布局结构一致（非结构断裂）。靠 CI 判定。

## E2E
- `npm run test:e2e`（global-setup 重建 e2e.db + 自起 mock 6799 / 被测 6791）
- 结果：**77 PASS / 2 FAIL**（3.5m）。
- 2 FAIL 均在 `tests/e2e/hub-content.spec.ts`（第 22/53 行）：`getByText('草稿已入库')` 不可见。
- **归因（非功能回归）**：FIX-02（7567581）将 content-hub 创建 toast 由 `toast.success("已创建","草稿已入库，可提交审核。")` 改为 `toast.success("已创建","「${title}」已入库，可提交审核。")`；E2E 仍断言旧子串「草稿已入库」。E1 禁止改 `tests/**` → 记为遗留，不阻断收口。

## 契约与冻结面复核（90eb97d..HEAD）

### V19 卡自身（13bbcbd..88e72d69^）
| 冻结面 | 是否触碰 |
|---|---|
| src/contracts/** | 无 |
| prisma/schema.prisma + migrations | 无 |
| package.json / package-lock.json | 无 |
| vitest.config.ts / playwright.config.ts | 无 |
| src/app/(web)/** · src/components/web/** · src/app/layout.tsx | 无（D1-FIX Header 试验已还原） |
| tests/** | 仅 B3 的 tests/e2e/mobile-375.spec.ts 路由数组（B3 允许） |

**结论：V19 各卡冻结面零触碰。** FIX-03 仅改 `src/lib/crud-resources/collect.ts`（非冻结面），符合卡预期。

### 分支级发现：外部提交 88e72d69
- `88e72d69 fix(web): 手机端导航竖排 + 悬浮层遮挡 + 导航对齐 main + 院校 13 家`（作者 CodingHeader，2026-10-29 12:50，**用户 2026-10-29 裁决**）。
- 触碰：`src/components/web/{Navbar,FloatingContact}.tsx`（仅 md:hidden 移动分支 + 悬浮层，桌面 ≥768px 零变化）、`src/components/web/data/home.ts`（院校 take 8→13）、`prisma/seed.ts`（导航种子，非契约/迁移）、`public/site.webmanifest`。
- **非本 V19 卡**。冻结面「复核」发现此外部改动，建议规划者知悉（是否按用户裁决豁免 / 需 CCR）。
- 该提交同时是 B3 移动端 40 FAIL（触达区<44px）的部分回应（手机导航竖排/遮挡），但 B3 矩阵已按原样记录。

## 判定（诚实）
| 判据 | 结果 |
|---|---|
| 7/7 done | PASS |
| 全量 4 项 exit 0 | PASS（lint/typecheck/test/build） |
| 契约与冻结面（V19 卡自身） | PASS（零触碰） |
| 双端 0 0 | 未达（本地领先 11，commit-only 未推送） |
| 视觉 / E2E | 记录不阻断（UNKNOWN #1 / #2） |

## UNKNOWN / 遗留
1. 视觉 42 FAIL（win32 字体）→ 靠 CI。
2. E2E 2 FAIL（FIX-02 改 toast 文案 vs E2E 旧断言）→ 建议后续更新 `tests/e2e/hub-content.spec.ts` 断言。
3. D1-FIX PARTIAL（LCP 模拟未达，真实优秀）。
4. 外部 88e72d69 触及前台/种子，需规划者知悉。

## 越界检查
- 本卡仅写：`docs/V1.9-20261029/CHANGELOG.md`、`docs/V1.9-20261029/state.json`、`docs/design/06_validation/evidence/V19/E1/**`。
- 未改 src/**、tests/**、prisma/**、package.json；未改 V18 证据。