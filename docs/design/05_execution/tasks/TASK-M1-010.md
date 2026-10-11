---
id: TASK-M1-010
type: task
title: UserAction 最小埋点（表单提交 + 关键页浏览）
status: done
plan-ref: master-plan.md §4 契约⑥
milestone: M1
requires: [REQ-F-011, ASM-008]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-010：UserAction 最小埋点

## 归属
- 所属切片：S1
- 来源需求：ASM-008（UserAction 最小接通，Q7 轮落定）
- 来源方案：05-交互设计 §4（死管道接线方案①）

## 目标
前台关键页浏览（page_view，800ms 去抖）与表单提交（window.__hdTrack.submit）写入 UserAction；session 落 localStorage。

## 输入
- 契约：contracts/user-action.ts
- 前置任务：TASK-M1-002/003

## 输出
- src/components/web/UserActionTracker.tsx（挂载于 (web)/layout）
- src/app/api/user-actions/route.ts（公开 POST + zod）

## Execution Steps
1. [x] 全局暴露 window.__hdTrack.submit（报名表单 R0 接线时调用）
2. [x] 失败静默（keepalive + catch）

## 验收标准
- [x] POST /api/user-actions 返回 code 200（冒烟已验 id=1 记录）
- [x] 非法 actionType 被 zod 拒绝（400）

## 验证命令
```bash
curl -s -X POST localhost:6789/api/user-actions -H "Content-Type: application/json" -d '{"actionType":"view","actionTarget":"page_view","sessionId":"e2e-test-0001"}'
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/components/web/UserActionTracker.tsx、src/app/api/user-actions/**

## 禁止修改
- —

## 依赖与阻塞
- Depends on：TASK-M1-002/003
- Blocks：R0 报名表单接线、M1 验收数据核对
- 阻塞条件：无

## 建议执行档位
sonnet。

## 升级条件
无需。

## 预估规模
小。已完成。
