# A3 执行证据：组件 props 恢复

## 5W1H

- **What**：为 9 个首页区块组件恢复被裁撤的 props（6 个 `showOverlay` + TopBanner 3 项 + StatsBanner 3 项 + FourCards 4+7 项 + Banner 3 项）。
- **Why**：V1.7 实证这些 props 在原版存在且被真实消费（`grep -c showOverlay` 原版 4/7/5/4/4/4，新版全 0），但重构时无 ADR 无 changelog 地被裁撤；`parity-matrix` 因以「文件存在」为判据未发现。A2 已注册 11 个配置键，本卡让组件能接收。
- **Where**：`src/components/web/` 下 10 个文件。
- **Who**：main-agent（触碰 REQ-F-014 前台冻结面，不可外包）。
- **How**：严格照原版三处模式（interface 声明 / 解构默认值 / JSX 条件包裹），**默认值与原版逐一核对**；只搬结构与默认值，className 值一字不动。
- **What if**：默认值写错会立即改变前台视觉（不可逆）；已在提交前用「className 值比对 + 默认值 grep + tsc」三重校验拦截。

## 改动文件（10 个）

| 组件 | 新增 props | showOverlay 处数 |
|---|---|---:|
| NewsCenter.tsx | `showOverlay` | 4 |
| CampusSection.tsx | `showOverlay` | 3 |
| CourseSectionNew.tsx | `showOverlay` | 4 |
| CompanyIntro.tsx | `showOverlay` | 3 |
| CertificateGallery.tsx | `showOverlay` | 4 |
| PartnerUniversities.tsx | `showOverlay` | 3 |
| TopBanner.tsx | `showContent` / `bgImage` / `showOverlay` | 3 |
| StatsBanner.tsx | `showContent` / `bgImage` / `showOverlay` | 3 |
| FourCards.tsx | `showSection` / `bgColor` / `bgImage` / `containerAlign` + 7 个 CardData 字段 | 1 |
| Banner.tsx | `showExtraBtn` / `extraBtnText` / `extraBtnLink` | — |

## 验收逐条

| # | 条目 | 命令 | 结果 |
|---|---|---|---|
| 1 | 6 组件各含 showOverlay ≥3 | `grep -c showOverlay` × 6 | PASS（4/3/4/3/4/3） |
| 2 | TopBanner 含 3 props | `grep -cE 'showContent\|bgImage\|showOverlay'` | PASS（10） |
| 3 | StatsBanner 含 3 props | 同上 | PASS（10） |
| 4 | FourCards 含 4 props + 7 字段 | `grep -c` 逐项 | PASS（16） |
| 5 | Banner 含 3 字段 | `grep -cE 'showExtraBtn\|extraBtnText\|extraBtnLink'` | PASS（12） |
| 6 | 默认值与原版一致 | `grep "showOverlay = true"` 等 | PASS（9 处 true / showSection true / containerAlign center） |
| 7 | 类型检查 | `npx tsc --noEmit` | PASS（exit 0） |
| 8 | className 值零变更 | 见 §默认态验证 | PASS |
| 9 | 未越界 | `git status --short src` | PASS（仅 10 个组件） |

## 默认态验证（关键：证明零视觉变化）

### 1. 默认值逐一核对

```
NewsCenter           showOverlay = true
CampusSection        showOverlay = true
CourseSectionNew     showOverlay = true
CompanyIntro         showOverlay = true
CertificateGallery   showOverlay = true
PartnerUniversities  showOverlay = true
TopBanner            showOverlay = true / showContent = true
StatsBanner          showOverlay = true / showContent = true
FourCards            showOverlay = true / showSection = true / containerAlign = "center"
```

全部与原版一致（原版默认 `= true`，`containerAlign = "center"`）。

### 2. className 值零变更

`git diff -U0 -- src/components/web` 提取增删两侧的 `className="..."` 值做集合差：

- 被删除但未在新增侧出现的值：**仅 2 个**
  1. `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto`
  2. `relative flex-1`

- 二者均为**模板字面量拼接**，已实测默认输出逐字一致：

```
grid : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
原文 : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
一致 : true

text : "relative flex-1"
一致 : true
```

**结论**：默认态渲染的 className 与改动前**逐字相同**。

### 3. 关键类名保留

| 类名 | 位置 | 结果 |
|---|---|---|
| `bg-gray-50 py-6` | FourCards section | 保留（style 仅在 bgColor/bgImage 非空时生成） |
| `bg-gradient-to-r from-[#0d47a1] ...` | TopBanner | 保留 |
| `bg-gradient-to-r from-[#1a237e] ...` | StatsBanner | 保留 |

## 执行中的自我修正

**修正 1**：CourseSectionNew 首处包裹漏了 `)}` 闭合，导致 JSX 不配平；`tsc` 未报（因为语法仍合法但结构错位），是我回读 `:55-95` 时发现并修正。

**修正 2**：FourCards 的 `textAlign` 初版取 `"text-left"`（照抄原版），但新版原本**不追加任何类** —— 追加 `text-left` 会改变 className 值。已改为未设时返回空串，并改用条件拼接 `relative flex-1${cls ? " " + cls : ""}`，保证默认输出逐字一致。

## UNKNOWN

- `test:visual` 未跑（win32 无法生成 Linux 基线）：留 A5 统一处理，本机将记 `UNKNOWN(需 Linux CI)`。

## 提交

`feat(V18/A3): 9 组件 props 恢复（showOverlay/showContent/bgImage/extraBtn）`