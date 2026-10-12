---
id: REQ-F-015
type: requirement
title: 管理端（/manager）顶级设计、极度友好
status: accepted
priority: MUST
owner: 产品所有者
created: 2026-10-12
updated: 2026-10-12
source: 用户本轮原意（"管理端 UI 顶级设计、极度友好"）；基础目标"统一风格、标准组件、完整 CRUD、全动态数据、交互可用"
related: [PLAN-CURRENT, REQ-F-013, REQ-F-014, REQ-NF-003]
---

# REQ-F-015：管理端顶级体验

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional（体验）/ accepted |
| 优先级 | MUST（current-plan §3.2 M-3、M-4、M-5、M-6） |
| 适用范围 | `/manager/**` 全部页面、`src/components/ui/**`、`src/components/manager/**` |

## 2. 背景

upgrade 管理端为手写侧栏（`manager/layout.tsx` 121 行，`import * as Lucide`）、24 个 8 行 CrudPage 包装页、`window.confirm`/`alert()` 反馈（CrudPage.tsx:146、210；crud-specs.tsx:27），无设计系统、无响应式、无五态组件（current-plan §2.1 #7）。用户要求管理端达到顶级设计、极度友好。

### 用户故事

作为运营/管理员，我在任何一个后台页面都能用同一套直观的方式查找、筛选、批量处理、编辑与发布内容，操作有即时反馈、误操作可防、在手机上也能应急处理，以便少培训、少出错。

## 3. 需求描述

1. **统一风格**：P02 管理端设计系统（作用域令牌 `[data-theme="manager"]`，品牌红为强调色、中性灰为主，A-4）为唯一规范。
2. **标准组件**：页面只用 `src/components/ui/**`（基础件）与 `src/components/manager/**`（业务件：PageHeader、DataTable、ResourceForm、字段件、StatusBadge、DetailDrawer、ConfirmDialog 等，P07 清单）。
3. **完整 CRUD**：每个可写资源有列表（排序/筛选/搜索/分页/批量）、详情、新建、编辑、删除；字段级错误提示；未保存离开提示。
4. **全动态数据**：页面上的选项、文案、菜单来自 DB/Setting/契约，不硬编码业务数据。
5. **交互可用**：五态（空/加载/错误/无权限/成功）组件化；toast + 确认对话框替代原生弹窗；键盘可达（焦点陷阱、Esc、⌘/Ctrl+S）。
6. **友好**：AppShell（可折叠分组侧栏、面包屑、命令面板、用户菜单、移动端抽屉）；375px 下可完成核心操作。
7. 新增的管理功能（首页区块配置、交互点配置、知识库/文件管理〔Coze〕、通知规则、操作日志、对话日志）均遵守以上规范。

## 4. 范围

### In Scope
- /manager 全部页面与登录页、管理端组件库、管理端响应式与可访问性。

### Out of Scope
- 前台外观（REQ-F-014 冻结）。

## 5. 验收标准

- [ ] （自动）`grep -rn "window.confirm\|alert(" src/app/manager src/components/manager` 为 0（P05 起）。
- [ ] （自动）`grep -rnE "<table|<input |<select|<button " src/app/manager` 为空（P07 起：页面层不直接写原生控件）。
- [ ] （自动）axe 扫描 /manager 代表页 serious/critical = 0（`tests/a11y/manager.spec.ts`，P07）。
- [ ] （自动）375px 视口下 E2E 主路径（登录→列表→新建→编辑→删除）通过（`tests/e2e/responsive.spec.ts`，P13）。
- [ ] （自动）每个可写资源的 CRUD 契约测试含未登录 401、无权限 403（P03/P13）。
- [ ] （人工）独立验证者按 P02 设计系统节逐页核对统一性（抽查 ≥10 页）。

## 6. 方向归属

P02（令牌 + AppShell + 登录页）→ P05（五态与反馈）→ P07（组件库与全部页面迁移）→ P08（规格单源派生）→ P13（响应式与契约测试）。

## 7. 关联

- current-plan §3.2 M-3~M-6、§3.4 A-4/A-5；P02 提示词"管理端设计系统"节；P05、P07、P13 提示词。
