---
task: V20-M3-01
date: 2026-10-29
head: a48d806
status: done
---
# M3-01 · 命中区 ≥44px（方案 A 全局提升）· 执行记录

## 5W1H
- **What**：管理端可交互控件命中区高度统一至 44px（`h-11` / `min-h-11` / `min-w-11`）。
- **Why**：V1.9 B3 的 40 个 M3 FAIL 全为 76×36（36px 高度，纯尺寸问题）；用户 2026-10-29 裁决方案 A「全局提升至 44px，桌面端同样生效」。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `a48d806`。
- **When**：2026-10-29。
- **Who**：执行助手（main-agent · V20 M3-01）。
- **How**：34 处 `h-7/8/9/10` → `h-11`（19 个授权文件）+ login 页 2 处越界修复 → `tsc`/`build`/`mobile-375`/单测/两视口实测。

## 改动（34 处 / 19 文件，授权清单）

| 文件 | 处数 | 说明 |
|---|---|---|
| `ui/button-class.ts` | 3 | sm/md/lg 三档统一 `h-11` |
| `ui/button.tsx` | 1 | `:64` 图标按钮 → `h-11 w-11` |
| `ui/input.tsx` | 4 | `:18/:41/:151/:172` → `h-11` |
| `ui/dialog.tsx` | 1 | `:36` 关闭 → `h-11 w-11` |
| `ui/form-field.tsx` | 1 | `:73` `min-h-9` → `min-h-11` |
| `ui/misc.tsx` | 1 | `:100` → `h-11` |
| `feedback/styles.ts` | 3 | `:8/:13` 旧 btn、`:34` `inputCls`（SearchInput 直接引用）→ `h-11` |
| `DataTable.tsx` | 1 | `:212` 行内操作 → `h-11` |
| `Pagination.tsx` | 1 | `:27` `h-8 min-w-8` → `h-11 min-w-11` |
| `DetailDialog.tsx` | 1 | `:34` → `h-11 w-11` |
| `FormDialog.tsx` | 1 | `:106` → `h-11 w-11` |
| `fields/RelationField.tsx` | 1 | `:113` → `h-11` |
| `fields/MarkdownField.tsx` | 2 | `:22/:38` → `h-11` |
| `fields/RichTextEditorCore.tsx` | 1 | `:35` → `h-11 w-11` |
| `FilterTabs.tsx` | 1 | `:36` → `h-11` |
| `shell/Sidebar.tsx` | 3 | `:59/:71/:189` → `h-11` |
| `shell/Topbar.tsx` | 3 | `:39/:52/:62` → `h-11` |
| `shell/UserMenu.tsx` | 4 | `:55/:90/:107/:116` → `h-11` |
| `shell/AppShell.tsx` | 1 | `:92` → `h-11 w-11` |

合计 **34 处**。`git diff --stat` = 19 文件（+34/-34）。

## 越界（1 文件 / 2 处，必要且已记录）

- `src/app/manager/login/page.tsx`：`fieldClass`（`:16`）与登录按钮（`:160`）`h-10` → `h-11`。
- **理由**：用户裁决「全局提升至 44px，桌面端同样生效」；login 用户名/密码输入框与登录按钮为**可交互控件**，实测 40px（334×40）不达标；该文件位于 `src/app/manager/`（**非**前台冻结面 `src/app/(web)/**`），不在 19 文件白名单内，属**必要越界**，故在本证据说明并只改 2 处。
- **未动**：`:68/:87` 的「弘」logo 装饰 `<span class="h-10 w-10">`（非交互、纯装饰）。
- **处置**：按 AGENTS.md §4「必须越界时在证据中写明文件与理由」执行，随本卡提交。

## 跳过（2 处非交互，卡定义明示）

- `DataTable.tsx:444` 表头单元格（非按钮/输入，无点击区要求）。
- `ConfirmDialog.tsx:81` `aria-hidden` 装饰图标（纯装饰，无交互）。

## 验证逐条

| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 类型 | `npx tsc --noEmit` | **exit 0** |
| 2 | 构建（h-11 生成） | `npm run build`（`DATABASE_URL=file:./prisma/e2e.db`） | **exit 0**；`.next/static/chunks/*.css` 含 `.h-11,.min-h-11,.min-w-11` |
| 3 | 无残留交互 h-9/h-8 | grep `ui/*` `DataTable` `Pagination` 排除 `min-h-11|h-11|w-8|w-9` | **无残留** |
| 4 | 375 无横向溢出回归 | `npx playwright test -c tests/e2e/playwright.config.ts mobile-375` | **4 passed**（含「整页无横向溢出 scrollWidth=375」） |
| 5 | 管理端单测 | `npm test -- --no-file-parallelism src/components/manager/__tests__/` | **20 passed / 3 files** |
| 6 | 两视口命中区实测 | `npx tsx .cache/v20-m3/measure.mjs` | 见 `verify.json`，**全部 ≥44** |

## 命中区实测（verify.json，375 与 1440）

| 视口 | 控件 | 宽×高 | ≥44×44 |
|---|---|---|---|
| 375 | 新建按钮（/manager/tags） | 76×44 | ✅ |
| 375 | 搜索框（/manager/tags） | 343×44 | ✅ |
| 375 | 分页按钮（/manager/media，366 行） | 44×44 | ✅ |
| 375 | content-hub 新建内容 | 68×44 | ✅ |
| 375 | login 用户名输入框 | 293×44 | ✅ |
| 375 | login 登录按钮 | 293×44 | ✅ |
| 1440 | 新建按钮（/manager/tags） | 76×44 | ✅ |
| 1440 | 搜索框（/manager/tags） | 240×44 | ✅ |
| 1440 | 分页按钮（/manager/media） | 44×44 | ✅ |
| 1440 | content-hub 新建内容 | 68×44 | ✅ |
| 1440 | login 用户名输入框 | 334×44 | ✅ |
| 1440 | login 登录按钮 | 334×44 | ✅ |

**两视口全部 ≥44**。M3 原 40 FAIL（76×36）→ 关键控件全部 44，**M3 归零**。


## 后续修复（E1 全量 e2e 发现 · 分页 375 溢出）

全量 e2e 首跑 **78P/1F**：`mobile-375`「整页无横向溢出」在 `/manager/media` 报 `scrollWidth=396>375`。
**归因**：`Pagination` 按钮组 `min-w-8→min-w-11`（44px）后，页 1-7 共 7 个按钮所在 `div.flex.items-center.gap-1` 不换行 → 实测 428px > 375（卡定义「陷阱 3 · 表格行高/分页变宽可能引发 M1 回归」的预警场景）。
**修复**：按钮组容器加 `flex-wrap`（`Pagination.tsx:34`，同卡允许文件内的必要配套；44px 按钮不变、375 下换行至两行）。
**复测**：`/manager/media` 375 → `scrollWidth=375`（无溢出）；两视口命中区仍全 ≥44（见 `verify.json`）；全量 e2e 重跑 **79 passed / 0 failed**。


## 门禁
- 34 处授权改动 ✓ · login 越界已记录（2 处）✓ · 2 处非交互跳过已说明 ✓ · tsc/build/单测/回归全绿 ✓ · 两视口 ≥44 ✓ · 前台冻结面（`src/app/(web)/**`、`src/components/web/**`）零改动 ✓ · 未加 `md:` 前缀 ✓

## UNKNOWN / 遗留
- **B2 键盘验收参照失效**：36px → 44px 尺寸变化可能改变 Tab 顺序/可见性，需 E1 复核（卡定义明示，本卡不处理）。
- **视觉基线需重建**：尺寸变化必然影响像素对比，交 Linux CI（卡定义明示，本卡不处理）。
- **桌面密度变松**：用户已知并选择（卡定义记录）。
- 分页按钮实测改在 `/manager/media`（366 行，确有分页）；`/manager/tags` 仅 3 行单页无分页控件，卡定义量化证据中的「分页按钮」以有分页的列表页实测为准。