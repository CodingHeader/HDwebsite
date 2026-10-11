---
id: TASK-M1-007
type: task
title: 调度基座（CronJob 扫描循环 + 注册表 + 锁 + backup）
status: done
plan-ref: master-plan.md §4 契约⑤
milestone: M1
requires: [REQ-NF-004, REQ-C-003]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-007：调度基座

## 归属
- 所属切片：S1
- 来源需求：采集/发布/提醒/余额/备份共用底座
- 来源方案：SOL-001 §3.1 / TN-007 / TN-009

## 目标
进程内每分钟扫描 CronJob 表，任务注册表 SSOT，lockedAt 心跳锁（10 分钟僵死释放），PM2 重启自动恢复，backup 每日 03:00。

## 输入
- 文档：SOL-001、16-新增 §10
- 前置任务：TASK-M1-003

## 输出
- src/lib/scheduler.ts（registerJob/execute/scanOnce/startScheduler/isDue）
- src/lib/jobs/index.ts（注册表 SSOT）+ jobs/backup.ts（保留 14 份）
- src/instrumentation.ts（Next 16 启动钩子，nodejs runtime 门禁）
- seed：6 个 CronJob 行（backup/collect.run/publish.scan/notify.scan/retry.failed/llm.balance-check）

## Execution Steps
1. [x] cron 判定语义：调度点落在 (lastRunAt, now] → 到期（补跑语义）
2. [x] 抢锁 updateMany(where lockedAt:null) 防并发双跑
3. [x] 未注册任务行跳过（S2~S6 启用前不报错）

## 验收标准
- [x] cron-parser v5 CronExpressionParser 接线正确（单测 6 用例含非法表达式）
- [x] dev 热重载 globalThis 防重入
- [x] build 通过且 instrumentation 被识别

## 验证命令
```bash
npx vitest run src/lib/__tests__/scheduler-cron.test.ts && npm run build 2>&1 | tail -3
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/lib/scheduler.ts、src/lib/jobs/**、src/instrumentation.ts

## 禁止修改
- prisma/schema.prisma（表结构变更走迁移）

## 依赖与阻塞
- Depends on：TASK-M1-003
- Blocks：S3 llm.balance-check、S4 collect.run、S5 publish/notify/retry
- 阻塞条件：SQLite 写锁冲突高频出现（RISK-007 触发）

## 建议执行档位
sonnet（实现）；锁语义已在卡内定死。

## 升级条件
出现分布式/多实例部署需求 → opus 重新评估（当前 REQ-C-003 单机）。

## 预估规模
中。已完成。
