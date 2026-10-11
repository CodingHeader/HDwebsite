---
id: TASK-M1-009
type: task
title: SEO/lang 基线（zh-CN + sitemap + robots）
status: done
plan-ref: master-plan.md §6
milestone: M1
requires: [REQ-NF-003]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-009：SEO/lang 基线

## 归属
- 所属切片：S1
- 来源需求：REQ-NF-003
- 来源方案：SOL-001 §3.3

## 目标
全站 lang=zh-CN；sitemap 动态含已发布文章（C1 后单源）；robots 禁爬 manager/api。

## 输入
- 前置任务：TASK-M1-003/006

## 输出
- src/app/layout.tsx（lang + generateMetadata 读 Setting）
- src/app/sitemap.ts、src/app/robots.ts

## Execution Steps
1. [x] metadata 从 Registry（seoTitle/seoDescription）读取，DB 未就绪回退默认
2. [x] sitemap 容错（DB 失败仅静态项）

## 验收标准
- [x] /robots.txt 与 /sitemap.xml 200（冒烟已验）
- [x] 首页 <html lang="zh-CN">

## 验证命令
```bash
curl -s localhost:6789/robots.txt && curl -s localhost:6789/sitemap.xml | head -c 120
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/app/{layout,sitemap,robots}.tsx?

## 禁止修改
- —

## 依赖与阻塞
- Depends on：TASK-M1-003/006
- Blocks：R0 各页面 SEO 元数据对齐
- 阻塞条件：无

## 建议执行档位
haiku~sonnet。

## 升级条件
无需。

## 预估规模
小。已完成。
