---
id: REQ-F-014
type: requirement
title: 前台（用户端）风格冻结——沿用 main 原有红色横幅轮播风格，外观不变
status: accepted
priority: MUST
owner: 产品所有者
created: 2026-10-12
updated: 2026-10-12
source: 用户本轮硬约束（"用户端 UI 风格不得改变"）；2026-10-12 用户裁决："公开站点使用 main 原有的红色 banner 轮播风格，外观不变"
related: [PARITY-MATRIX, PLAN-CURRENT, REQ-F-013, ADR-001, ADR-010]
---

# REQ-F-014：前台风格冻结

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional（视觉约束）/ accepted |
| 优先级 | MUST（current-plan §3.2 M-2） |
| 唯一视觉标准 | `origin/main@94dbbbb` 的前台：品牌红令牌（`globals.css` `--primary: #da251d`，brand oklch hue≈27）、首页 Banner 轮播 + 11 个区块组件、多级下拉导航、Footer、FloatingContact |
| 适用范围 | `src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css` 的 web 令牌、`src/app/layout.tsx` 字体与 lang |

## 2. 背景

upgrade 前台曾被重写为蓝色简化版（`--primary:#1d4ed8`，首页蓝色渐变横幅、无轮播；parity A1~A16、A3）。用户 2026-10-12 明确裁决：公开站点用 main 原有的红色横幅轮播风格，**外观不变**；任何方向都不得把前台改离 main 风格。

### 用户故事

作为访客，我在新站看到的页面与旧站完全一致（同样的红色品牌、轮播横幅、区块与导航），以便切换无感知；作为运营，我对内容的修改照常反映在这套外观里。

## 3. 需求描述

1. 前台 15 个路由（/、about、apply、articles、articles/[id]、campus、contact、courses、courses/[id]、gallery、learning、partners、party、services/[slug]、not-found）的视觉以 main 为唯一标准。
2. 组件 JSX 结构与 className 从 main 逐字移植；允许的差异仅限：import 路径、类型、数据适配层、XSS 净化调用、Markdown 渲染、SEO/埋点（不改变可见像素）。
3. 首页保留 main 的红色 Banner 轮播（含 TopBanner 与 Banner 组件）及 11 个区块的顺序与外观；ADR-024 恢复的区块配置**默认值必须复现 main 原样**（区块配置只影响开关/排序，不引入新视觉）。
4. 管理端设计令牌只允许出现在 `[data-theme="manager"]` 作用域内，不得泄漏到前台。
5. 前台五态（空/加载/错误/404）保持 main 现状。

## 4. 范围

### In Scope
- 视觉（像素）、DOM 主要区块（data-testid / data-block 锚点，不影响样式）、交互形态（轮播、下拉、悬浮联系）。

### Out of Scope
- 数据来源（可换为 upgrade 模型，经适配层）；后端接口；管理端外观（见 REQ-F-015）。

## 5. 验收标准

- [ ] （自动，由 P02 建立，此后每个方向结束时必须重跑）`npm run test:visual` 通过：同一 seed 数据下，15 个前台路由在 1440/768/375 三个宽度的 Playwright 截图与 main 参照截图像素差 ≤1%（`maxDiffPixelRatio: 0.01`，动画禁用、字体本地化）。
- [ ] （自动）`grep -n -- '--primary' src/app/globals.css` 的 web 作用域值与 `git show origin/main:src/app/globals.css` 一致（`#da251d`）。
- [ ] （自动）首页存在 Banner 轮播（`data-testid="home-banner"` 或等价锚点）且区块顺序与 main 一致（visual 套件内断言）。
- [ ] （自动）`grep -rn 'data-theme="manager"' src/app/(web) src/components/web` 为空。

## 6. 关联

- current-plan §3.2 M-2、§3.3 K2；parity-matrix A 节；P02 提示词（落地）；所有方向提示词"前台风格保持"节；ADR-024（区块配置默认值复现 main）。
