---
id: TASK-M1-005
type: task
title: 统一响应包与后台 fetch 解包
status: done
plan-ref: master-plan.md §4 契约②
milestone: M1
requires: [REQ-NF-001]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-005：统一响应包与后台 fetch 解包

## 归属
- 所属切片：S1
- 来源需求：基础目标「交互正常」
- 来源方案：13-响应设计 §1/§7

## 目标
全部 API 走 ApiResponse 信封；前端解包单点 + 401 自动登出。

## 输入
- 契约：contracts/common.ts
- 前置任务：TASK-M1-002

## 输出
- src/lib/api-response.ts（success/created/error/unauthorized/forbidden/notFound/serverError/validationError）
- src/lib/manager-fetch.ts（ApiError + 401 清会话跳登录）

## Execution Steps
1. [x] 工厂函数与 HTTP 状态并行设置
2. [x] validationError 取 zod 首条中文 issue

## 验收标准
- [x] 错误响应 data 恒为 null
- [x] managerFetch 对非 200 code 抛 ApiError(message)

## 验证命令
```bash
curl -s localhost:6789/api/auth/me && curl -s -X POST localhost:6789/api/articles -H "Content-Type: application/json" -d '{}'
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/lib/api-response.ts、src/lib/manager-fetch.ts

## 禁止修改
- src/contracts/**

## 依赖与阻塞
- Depends on：TASK-M1-002
- Blocks：API/页面各卡
- 阻塞条件：无

## 建议执行档位
sonnet。

## 升级条件
无需。

## 预估规模
小。已完成。
