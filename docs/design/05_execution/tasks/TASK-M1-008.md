---
id: TASK-M1-008
type: task
title: Markdown 管线（入库钩子 + MarkdownRenderer + 净化单点）
status: done
plan-ref: master-plan.md §4 契约⑥
milestone: M1
requires: [REQ-F-004, REQ-NF-002]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-008：Markdown 管线

## 归属
- 所属切片：S1
- 来源需求：REQ-F-004（contentType 双模 + 自动摘要/首图）
- 来源方案：SOL-001 §3.2/§3.3

## 目标
Article/ServiceGuide 支持 contentType=markdown|html；markdown 经 RSC 渲染（GFM+高亮+懒加载），html 经统一净化；excerpt/coverImage 入库钩子自动生成。

## 输入
- 文档：SOL-001、xss-filter（复用 sanitizeHtmlServer）
- 前置任务：TASK-M1-003

## 输出
- src/lib/markdown.ts（extractFirstImage/markdownExcerpt/applyContentHooks/sanitizeRichContent）
- src/components/web/MarkdownRenderer.tsx（react-markdown + remark-gfm + rehype-highlight）
- src/app/api/articles/route.ts(+[id])：创建/更新走 applyContentHooks
- src/app/(web)/articles/[id]/page.tsx：双模渲染（html 分支 dangerouslySetInnerHTML 必经净化）
- 依赖：react-markdown/remark-gfm/rehype-highlight

## Execution Steps
1. [x] 钩子语义：显式值 > 自动生成（excerpt 前 200 字、cover 首图）
2. [x] 详情页按 contentType 分支渲染
3. [x] 编辑器双模 UI 随 R0 文章编辑页接入（本卡不含）

## 验收标准
- [x] XSS 用例（script/onclick）被净化（单测 7 用例全过）
- [x] seed 示例含 markdown+html 双型文章，详情页均可渲染（冒烟已验）

## 验证命令
```bash
npx vitest run src/lib/__tests__/markdown.test.ts
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/lib/markdown.ts、src/components/web/MarkdownRenderer.tsx、相关 API/页面渲染分支

## 禁止修改
- src/lib/security/xss-filter.ts 白名单变更需独立安全 review

## 依赖与阻塞
- Depends on：TASK-M1-003
- Blocks：S4 采集 contentMd、S5 发布管线、S6 公众号草稿
- 阻塞条件：无

## 建议执行档位
sonnet。

## 升级条件
净化白名单需扩展（如 iframe）→ opus 安全 review。

## 预估规模
中。已完成。
