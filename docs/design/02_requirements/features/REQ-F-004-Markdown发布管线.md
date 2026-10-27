---
id: REQ-F-004
type: requirement-feature
title: 官网信息发布支持 Markdown，自动转成网页
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-004：Markdown 发布管线

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 4 条） |
| 对应原编号 | N4 |
| 优先级 | P0（M1） |

## 2. 背景

现有内容为 TipTap 富文本（html），编辑排版成本高，且与采集产出的 markdown、公众号图文格式不统一，一稿多发需反复转换。

## 3. 目标

官网信息发布支持 markdown 原文存储，自动渲染为网页；存量 html 内容零迁移原样兼容。

### 用户故事

作为内容编辑，我想直接用 markdown 写稿并自动成页，以便省去富文本排版成本、素材跨渠道复用。

## 4. 需求描述

Article/ContentItem 增加 `contentType`（html=存量 TipTap / markdown=新内容）；`MarkdownRenderer` 组件实现 GFM 渲染（表格/任务列表/代码高亮/图片懒加载/锚点目录）；入库时自动截取纯文本前 200 字为 excerpt（可覆盖）、正文首图自动提取为 coverImage（可覆盖）；编辑器双模（markdown 新编辑器 + TipTap 存量编辑）按 contentType 切换；ServiceGuide.content 同管线下沉。

## 5. 范围

### In Scope

- contentType 字段与迁移默认值（存量=html）
- MarkdownRenderer 组件（文章详情/服务指南/知识库预览/公众号预览共用，08-复用 §3）
- markdown 编辑器（新管理页与内容中枢使用）

### Out of Scope

- 所见即所得（WYSIWYG）markdown 编辑（纯文本编辑 + 实时预览即可）
- md 之外格式（org/rst）

## 6. 约束与依赖

- 图片语法 `![](url)` 走站内 uploads 或外链白名单（REQ-NF-002）
- ASM-005：GFM 满足中文排版

## 7. 验收条件

- [x] markdown 类型内容在前台详情页正确渲染（表格/代码块/图片/锚点目录）（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）
- [x] 存量 html 内容零迁移、渲染行为与重构前一致（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）
- [x] 入库自动生成 excerpt（前 200 字）与 coverImage（首图），均可人工覆盖（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）
- [x] 编辑器按 contentType 自动切换 markdown/TipTap 模式（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）
- [x] 渲染输出经过 XSS 净化（与 REQ-NF-002 统一入口）（证据：docs/design/06_validation/evidence/V14/BASE-01/execution.md）

## 8. 影响分析

- 前台 ArticleContent 组件分支渲染；服务指南详情页接入
- 为 REQ-F-001（渠道预览）、REQ-F-005（公众号正文）、知识库在线编辑提供公共渲染基座

## 9. 关联文档

- Solution：SOL-001
- 设计提取：16-新增设计 §4
- Plan：M1（S1）
