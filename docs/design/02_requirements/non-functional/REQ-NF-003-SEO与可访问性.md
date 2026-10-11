---
id: REQ-NF-003
type: requirement-nonfunctional
title: SEO 与可访问性
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-NF-003：SEO 与可访问性

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | non-functional / approved |
| 适用范围 | 前台站点 |

## 2. 目标

修复现状缺口（lang 属性、sitemap/robots 缺失），保持既有 meta 体系，新页面不欠新账。

## 3. 需求描述

- **lang 修正**：`src/app/layout.tsx:47` 现为 `lang="en"`，改 `zh-CN`。
- **sitemap.xml / robots.txt**：Next metadata 路由生成（Next 16 MetadataRoute API）；排除 apply（conversion 页）、manager 全部。
- **既有 meta 保留**：各页面 title/description、OpenGraph 体系（03-SEO 设计提取）随重构保留。
- **结构化数据**：Article 详情页保留/补充 JSON-LD（NewsArticle）。
- **可访问性**：新增组件（ChatWidget 等）键盘可达、对比度 AA。

## 4. 验收条件

- [ ] lang="zh-CN" 全站生效
- [ ] /sitemap.xml 与 /robots.txt 可访问且规则正确（manager 排除）
- [ ] markdown 详情页具备独立 title/description（excerpt 复用）
- [ ] 新增交互组件键盘可操作（Tab 聚焦、Enter 发送）

## 5. 关联文档

- 03-SEO设计（现状清单）、02-前端设计 §9（缺口提出）
- Solution：SOL-001（lang/SEO 基线随基础基座落地）
