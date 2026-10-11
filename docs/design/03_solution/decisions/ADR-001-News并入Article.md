---
id: ADR-001
type: architecture-decision
title: News 表并入 Article（channel 字段区分）
status: accepted
date: 2026-10-10
---

# ADR-001：News 并入 Article

## 状态

accepted（2026-10-10 会话决策 C1，用户确认"并入 Article"）

## 背景

克隆模板同时保留 Article 与 News 两表，字段高度同构（title/content/viewCount 等），前台双列表页双组件并存，后台双管理页，一稿多发语义下多渠道无谓膨胀模型数。

## 决策

News 表取消，统一入 Article，新增 `channel` 字段区分（news/info/sitemap 引用位平移改造）。

## 依据

- 用户多轮问答确认（talk.md Q2 → C1 ✅）
- 02-前端（sitemap/列表/组件三处引用）、14-存储 S1（双表冗余记录）

## 备选方案

| 方案 | 评估 | 结论 |
| --- | --- | --- |
| 保留 News 表 + 前台合并视图 | 双写依旧、模型冗余留存 | 弃 |
| 新建 ContentItem 统一模型、废两表 | 迁移面过大，与 S1 时间窗冲突 | 弃 |
| 并入 Article + channel 字段 | 改动最小、语义清晰 | **选定** |

## 影响

- 迁移：News → Article(channel=news)，id 保留原值或映射表；sitemap 双源改单源 channel 过滤
- 改造点：前台新闻列表组件/路由数据源、后台 News 管理页移除
- 约束：迁移放在 **S1 基础基座阶段**执行（RISK-001，计数核对验收）

## 关联

- REQ-F-003（发布写入 Article）、SOL-001（迁移实施）、RISK-001
