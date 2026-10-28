# STEP-A8-2：写 ADR-034

## 目标
记录「组件 props 被无记录裁撤」这一变更，避免未来重演。

## 文件
`docs/design/03_solution/decisions/ADR-034-首页区块组件能力对齐.md`（新建）

## 内容

```markdown
---
id: ADR-034
title: 首页区块组件能力对齐（props 恢复）
status: accepted
date: 2026-10-27
related: [REQ-F-014, REQ-F-013, PLAN-V018]
---

# ADR-034：首页区块组件能力对齐

## 背景

upgrade 分支重构时，9 个首页区块组件的 props 被裁撤：

| 组件 | 原版 props | 新版 props | 丢失 |
|---|---:|---:|---|
| TopBanner | 5 | 2 | showContent, bgImage, showOverlay |
| StatsBanner | 5 | 3 | showContent, bgImage |
| FourCards | 6 + 10 卡片字段 | 2 | showSection, bgColor, bgImage, containerAlign + 7 个 CardData 字段 |
| Banner | 14 | 13 | showExtraBtn, extraBtnText, extraBtnLink |
| NewsCenter / CampusSection / CourseSectionNew / CompanyIntro / CertificateGallery / PartnerUniversities | 各含 | 均无 | showOverlay |

**且无 ADR、无 changelog 记录。**

`parity-matrix.md` 因以「文件存在」为判据，未发现此变更（见 A8 判据强化）。

## 决策

恢复与原版对等的 props 与配置键，**默认值与原版一致**，保证默认渲染零变化。

- 新增 11 个配置键（A2）
- 10 个组件加 props（A3）
- 5 个入口文件接线（A4）
- 默认态经 A5 四道验证确认不变

## 影响

### 正面
- 运营可通过管理端配置首页各区块的标题栏显隐、背景图、卡片展示
- `parity-matrix` 判据修正后，未来同类变更可被发现

### 风险
- 若默认值写错 → 前台视觉变化（违反 REQ-F-014）
  - 缓解：A5 四道验证（className 值 / 基线图 / 阈值 / 视觉回归）
- 若条件包裹范围抄错 → 布局错位
  - 缓解：A5 视觉回归兜底

### 不做
- `HomeCard.backgroundImage`：原版数据全为 null，恢复需 CCR，已裁决延后
- 焦点陷阱：全站未实现（原版也没有），不在本次范围

## 替代方案

| 方案 | 结论 |
|---|---|
| 保持现状（不恢复） | 弃：能力确实丢失，运营无法配置 |
| 引入新组件替代 | 弃：原版组件结构可用，无需重写 |
| 完整复原原版组件 | 弃：原版含 329 行 showcase 等无关逻辑 |
```

## 验收

- [ ] 文件存在
- [ ] 含「背景 / 决策 / 影响」三节（`grep -cE "^## (背景|决策|影响)"` → 3）
- [ ] 含 9 组件对照表
- [ ] 含「不做」清单（HomeCard / 焦点陷阱）
